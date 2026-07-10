import { chromium } from "playwright";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, where } from "firebase/firestore";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Firebase config template using local .env variables
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase if credentials exist
let db = null;
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} else {
  console.warn("⚠️ Firebase configuration missing in environment. Scraper will log advisories to console instead of saving to Firestore.");
}

/**
 * Standard utility coordinates for Metro Cebu municipalities served by VECO.
 */
const CEBU_COORDINATES = {
  "cebu city": { lat: 10.3157, lng: 123.8854 },
  "mandaue city": { lat: 10.3446, lng: 123.9390 },
  "talisay city": { lat: 10.2500, lng: 123.8333 },
  "naga city": { lat: 10.2092, lng: 123.7578 },
  "liloan": { lat: 10.4003, lng: 123.9989 },
  "consolacion": { lat: 10.3800, lng: 123.9570 },
  "compostela": { lat: 10.4500, lng: 124.0167 },
  "san fernando": { lat: 10.1611, lng: 123.7083 },
  "minglanilla": { lat: 10.2458, lng: 123.7972 },
};

/**
 * Clean up text blocks and format dates.
 */
function parseTime(dateStr, timeStr) {
  try {
    // E.g., dateStr = "July 12, 2026 (Sunday)", timeStr = "8:00 AM to 4:00 PM (8hrs)"
    const datePart = dateStr.split("(")[0].trim(); // "July 12, 2026"
    const times = timeStr.split("to");
    
    const startHourStr = times[0].trim(); // "8:00 AM"
    const endHourStr = times[1].split("(")[0].trim(); // "4:00 PM"

    const startIso = new Date(`${datePart} ${startHourStr}`).toISOString();
    const endIso = new Date(`${datePart} ${endHourStr}`).toISOString();
    
    return { startIso, endIso };
  } catch (err) {
    // Fallbacks
    return {
      startIso: new Date().toISOString(),
      endIso: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    };
  }
}

/**
 * Parser that splits raw text into detailed advisory reports.
 */
function parseAdvisoryContent(rawText) {
  const reports = [];
  
  // Split the text into segments by date lines (e.g. "July 12, 2026 (Sunday)")
  const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const lines = rawText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  
  let currentDateStr = "";
  let currentSegment = null;
  
  const segments = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLower = line.toLowerCase();
    
    // Check if line represents a date (starts with a month and contains a year)
    const isDateLine = months.some(m => lineLower.startsWith(m)) && lineLower.includes("202");
    
    if (isDateLine) {
      currentDateStr = line;
      continue;
    }
    
    if (lineLower.startsWith("time:")) {
      if (currentSegment) {
        segments.push({ date: currentDateStr, ...currentSegment });
      }
      currentSegment = {
        time: lines[i+1] || "",
        purpose: "",
        areas: ""
      };
      i++; // skip next line as it was parsed as time value
      continue;
    }
    
    if (lineLower.startsWith("purpose:") && currentSegment) {
      currentSegment.purpose = lines[i+1] || "";
      i++;
      continue;
    }
    
    if (lineLower.startsWith("areas affected:") && currentSegment) {
      currentSegment.areas = lines[i+1] || "";
      i++;
      continue;
    }
  }
  if (currentSegment) {
    segments.push({ date: currentDateStr, ...currentSegment });
  }

  // Map segments to standard database report format
  for (const seg of segments) {
    const areasLower = seg.areas.toLowerCase();
    const purposeLower = seg.purpose.toLowerCase();
    
    // Resolve municipality
    let municipality = "Cebu City"; // fallback
    for (const city of Object.keys(CEBU_COORDINATES)) {
      if (areasLower.includes(city) || purposeLower.includes(city)) {
        municipality = city.replace(/(^|\s)\S/g, (l) => l.toUpperCase());
        break;
      }
    }
    
    // Resolve Barangay
    let barangay = "Unknown Barangay";
    const brgyMatch = seg.purpose.match(/(?:brgy|barangay)\.?\s+([A-Za-z\s]+?)(?=\s+by|\s+to|\s+facilitating|$)/i) ||
                      seg.areas.match(/(?:portion of)\s+([A-Za-z\s]+?)(?:,|$)/i);
    if (brgyMatch && brgyMatch[1]) {
      barangay = brgyMatch[1].trim();
    } else {
      // Split by commas and pick first part
      const parts = seg.areas.replace(/portion of/i, "").split(",");
      if (parts[0] && parts[0].trim().length > 2) {
        barangay = parts[0].trim();
      }
    }
    
    // Format coordinates
    const coords = CEBU_COORDINATES[municipality.toLowerCase()] || CEBU_COORDINATES["cebu city"];
    const dates = parseTime(seg.date, seg.time);

    // Parse status
    let status = "scheduled"; // Visayan Electric advisories are scheduled interruptions

    // Reason
    let reason = "Line maintenance";
    if (purposeLower.includes("transformer")) {
      reason = "Transformer maintenance";
    } else if (purposeLower.includes("upgrade") || purposeLower.includes("capacity")) {
      reason = "System upgrade";
    } else if (purposeLower.includes("repositioning")) {
      reason = "Equipment failure";
    }

    reports.push({
      province: "Cebu",
      municipality,
      barangay,
      latitude: coords.lat,
      longitude: coords.lng,
      status,
      startTime: dates.startIso,
      estimatedEnd: dates.endIso,
      reason,
      notes: `VECO Advisory:\nTime: ${seg.time}\nPurpose: ${seg.purpose}\nDetails: ${seg.areas}`,
    });
  }
  
  return reports;
}

/**
 * Scrape outage updates from Visayan Electric's website.
 */
async function scrapeVisayanElectric() {
  console.log("🚀 Launching headless browser for Visayan Electric Scraper...");
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  try {
    const listUrl = "https://www.visayanelectric.com/customer-services/service-advisory";
    console.log(`🔗 Navigating to VECO list page: ${listUrl}...`);
    await page.goto(listUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    
    // Allow dynamic cards to render
    await page.waitForTimeout(5000);

    // Extract links to individual posts
    const postUrls = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll("a"));
      return anchors
        .map(a => a.href)
        .filter(href => href.includes("/post/service-interruption"));
    });

    // Remove duplicates
    const uniqueUrls = [...new Set(postUrls)].slice(0, 3); // fetch top 3 posts (recent dates)
    console.log(`📦 Found ${uniqueUrls.length} recent interruption posts:`, uniqueUrls);

    const allReports = [];

    for (const url of uniqueUrls) {
      console.log(`\n📖 Scraping detail page: ${url}...`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(3000);

      const pageText = await page.evaluate(() => {
        const bodyEl = document.querySelector("[data-testid='post-content'], article, [class*='post-content']");
        return bodyEl ? bodyEl.innerText : "";
      });

      if (pageText.trim().length > 0) {
        console.log("📄 Content retrieved. Parsing advisories...");
        const parsedReports = parseAdvisoryContent(pageText);
        console.log(`✅ Extracted ${parsedReports.length} reports from post.`);
        allReports.push(...parsedReports);
      } else {
        console.warn("⚠️ Warning: Empty content retrieved from page.");
      }
    }

    console.log(`\n🔍 Total unique outages extracted: ${allReports.length}`);

    // Save to Firestore if database is configured
    if (db && allReports.length > 0) {
      console.log(`💾 Saving reports to Firestore database...`);
      const reportsCollection = collection(db, "reports");

      for (const report of allReports) {
        // Check for duplicates by Barangay and Municipality in database
        const q = query(reportsCollection, where("barangay", "==", report.barangay), where("municipality", "==", report.municipality));
        const existingDocs = await getDocs(q);
        
        if (existingDocs.empty) {
          const docRef = await addDoc(reportsCollection, {
            ...report,
            confirmations: 0,
            restoredVotes: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          console.log(`✅ Saved new Cebu report for ${report.barangay}, ${report.municipality} (ID: ${docRef.id})`);
        } else {
          console.log(`⏭️ Report for ${report.barangay}, ${report.municipality} already exists. Skipping.`);
        }
      }
    } else {
      console.log("\n📝 Scraped Data Output:", JSON.stringify(allReports, null, 2));
    }

  } catch (error) {
    console.error("❌ Scraping process encountered an error:", error);
  } finally {
    await browser.close();
    console.log("🔒 Browser session closed.");
  }
}

// Execute scraper
scrapeVisayanElectric();
