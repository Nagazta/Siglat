import { chromium } from "playwright";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, updateDoc, getDocs, query, where } from "firebase/firestore";
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Clean up barangay name strings for accurate Nominatim indexing.
 */
function cleanBarangayName(name) {
  let clean = name.trim();
  
  // Extract parentheses first if present, e.g. "Cebu City & Mandaue City (Banilad)" -> "Banilad"
  const parenMatch = clean.match(/\(([^)]+)\)/);
  if (parenMatch && parenMatch[1]) {
    clean = parenMatch[1];
  }
  
  // Split by common separators (like & or / or and) and take the first part
  clean = clean.split(/&|and|\/|,/)[0].trim();
  
  // Remove "portion of" prefix
  clean = clean.replace(/portion of/i, "").trim();
  
  return clean;
}

/**
 * Custom overrides for Metro Cebu landmarks that Nominatim struggles to geocode.
 */
const CEBU_LANDMARK_OVERRIDES = {
  "south reclamation area": { lat: 10.2675, lng: 123.8820 },
  "srp": { lat: 10.2675, lng: 123.8820 },
  "north reclamation area": { lat: 10.3120, lng: 123.9240 },
  "nra": { lat: 10.3120, lng: 123.9240 },
  "cebu i.t. park": { lat: 10.3292, lng: 123.9061 },
  "cebu it park": { lat: 10.3292, lng: 123.9061 },
  "cebu business park": { lat: 10.3175, lng: 123.9078 },
};

/**
 * Geocode a location using OpenStreetMap Nominatim
 */
async function geocodeLocation(barangay, municipality, province) {
  try {
    const clean = cleanBarangayName(barangay);
    if (!clean || clean.toLowerCase() === "unknown" || clean.toLowerCase() === "portion") {
      return null;
    }
    
    // Check custom landmark overrides first
    const lowerClean = clean.toLowerCase();
    if (CEBU_LANDMARK_OVERRIDES[lowerClean]) {
      console.log(`🎯 Preset coordinate override matched for "${clean}".`);
      return CEBU_LANDMARK_OVERRIDES[lowerClean];
    }
    
    // Search by Barangay + Cebu province directly (letting Nominatim resolve the correct town/city)
    const query = `${clean}, Cebu, Philippines`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    
    console.log(`🔍 Geocoding OSM: "${query}"...`);
    const response = await fetch(url, {
      headers: {
        "User-Agent": "SiglatCommunityOutageTracker/1.0 (kyle@siglat.ph)"
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        
        // Safety bounds check for Cebu province (9.5 to 11.5 Lat, 123.0 to 124.5 Lng)
        if (lat >= 9.5 && lat <= 11.5 && lon >= 123.0 && lon <= 124.5) {
          return { lat, lng: lon };
        } else {
          console.log(`⚠️ Geocoded coords for "${query}" (${lat}, ${lon}) were out of Cebu bounds. Discarding.`);
        }
      }
    }
  } catch (err) {
    console.error(`⚠️ Geocoding failed for ${barangay}, ${municipality}:`, err.message);
  }
  return null;
}

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
 
     // Scroll down multiple times to trigger lazy-loading of older historical cards on the Wix page
     console.log("Scrolling down to load historical advisory cards...");
     for (let i = 0; i < 6; i++) {
       await page.evaluate(() => window.scrollBy(0, window.innerHeight));
       await page.waitForTimeout(1000);
     }
 
     // Extract links to individual posts
     const postUrls = await page.evaluate(() => {
       const anchors = Array.from(document.querySelectorAll("a"));
       return anchors
         .map(a => a.href)
         .filter(href => href.includes("/post/service-interruption"));
     });
 
     // Remove duplicates
     const uniqueUrls = [...new Set(postUrls)].slice(0, 15); // fetch up to 15 recent and historical posts
     console.log(`📦 Found ${uniqueUrls.length} total interruption posts (including historical):`, uniqueUrls);

    const allReports = [];

    for (const url of uniqueUrls) {
      console.log(`\n📖 Scraping detail page: ${url}...`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(3000);

      const parsedAdvisories = await page.evaluate(() => {
        const postContainer = document.querySelector("[data-testid='post-content'], article, [class*='post-content']");
        if (!postContainer) return [];
        
        const children = Array.from(postContainer.querySelectorAll("*"));
        const entries = [];
        let currentDate = "";
        
        const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
        
        children.forEach(el => {
          if (!el) return;
          const text = (el.innerText || "").trim();
          const tagName = el.tagName || "";
          if (!tagName) return;
          
          const isDate = (tagName.startsWith("H") || tagName === "P" || tagName === "SPAN") && 
                         months.some(m => text.toLowerCase().startsWith(m)) && 
                         text.includes("202") &&
                         text.length < 50;
                         
          if (isDate) {
            currentDate = text;
          }
          
          if (tagName === "TABLE") {
            const rows = Array.from(el.querySelectorAll("tr"));
            const entry = {
              date: currentDate,
              time: "",
              purpose: "",
              areas: "",
              mapImageUrl: ""
            };
            
            rows.forEach(row => {
              const cells = Array.from(row.querySelectorAll("td"));
              if (cells.length >= 2) {
                const label = cells[0].innerText.trim().toLowerCase();
                const valueCell = cells[1];
                const valueText = valueCell.innerText.trim();
                
                if (label.includes("time")) {
                  entry.time = valueText;
                } else if (label.includes("purpose")) {
                  entry.purpose = valueText;
                } else if (label.includes("areas")) {
                  entry.areas = valueText;
                } else if (label.includes("map")) {
                  const img = valueCell.querySelector("img");
                  if (img) {
                    let src = img.src || img.getAttribute("data-src") || img.getAttribute("src") || "";
                    if (src.includes("wixstatic.com/media/")) {
                      src = src.split("/v1/fill/")[0];
                    }
                    entry.mapImageUrl = src;
                  }
                }
              }
            });
            
            if (entry.time || entry.purpose || entry.areas) {
              entries.push(entry);
            }
          }
        });
        
        return entries;
      });

      console.log(`📄 Found ${parsedAdvisories.length} structured tables. Parsing into database reports...`);
      
      const parsedReports = [];
      for (const seg of parsedAdvisories) {
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
          const parts = seg.areas.replace(/portion of/i, "").split(",");
          if (parts[0] && parts[0].trim().length > 2) {
            barangay = parts[0].trim();
          }
        }
        
        // Format coordinates
        let coords = CEBU_COORDINATES[municipality.toLowerCase()] || CEBU_COORDINATES["cebu city"];
        
        // Dynamic geocoding to resolve exact Barangay coordinates
        await sleep(1000); // 1-second delay to comply with OSM usage policy
        const geo = await geocodeLocation(barangay, municipality, "Cebu");
        if (geo) {
          coords = geo;
        } else {
          console.log(`⚠️ Using fallback coordinates for ${barangay}, ${municipality}`);
        }
        
        const dates = parseTime(seg.date, seg.time);

        let reason = "Line maintenance";
        if (purposeLower.includes("transformer")) {
          reason = "Transformer maintenance";
        } else if (purposeLower.includes("upgrade") || purposeLower.includes("capacity")) {
          reason = "System upgrade";
        } else if (purposeLower.includes("repositioning")) {
          reason = "Equipment failure";
        }

        parsedReports.push({
          province: "Cebu",
          municipality,
          barangay,
          latitude: coords.lat,
          longitude: coords.lng,
          status: "scheduled",
          startTime: dates.startIso,
          estimatedEnd: dates.endIso,
          reason,
          notes: `VECO Advisory:\nTime: ${seg.time}\nPurpose: ${seg.purpose}\nDetails: ${seg.areas}`,
          sourceUrl: url,
          mapImageUrl: seg.mapImageUrl || null,
        });
      }

      console.log(`✅ Extracted ${parsedReports.length} reports from post.`);
      allReports.push(...parsedReports);
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
          // Update the existing document to enrich it with geocoded coordinates, notes, mapImageUrl, and sourceUrl
          const existingDoc = existingDocs.docs[0];
          await updateDoc(existingDoc.ref, {
            latitude: report.latitude,
            longitude: report.longitude,
            notes: report.notes,
            mapImageUrl: report.mapImageUrl,
            sourceUrl: report.sourceUrl,
            updatedAt: new Date().toISOString(),
          });
          console.log(`🔄 Updated existing report for ${report.barangay}, ${report.municipality} with new geocoded coords, map image & source (ID: ${existingDoc.id})`);
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
