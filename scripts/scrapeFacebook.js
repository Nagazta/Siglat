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
  console.warn("⚠️ Firebase configuration missing in environment. Scraper will log posts to console instead of saving to Firestore.");
}

/**
 * Standard utility coordinates for major municipalities to seed map position.
 * Fallback values in case we can't extract coordinates from the text.
 */
const LOCATION_COORDINATES = {
  "quezon city": { lat: 14.6760, lng: 121.0967 },
  "pasig city": { lat: 14.5652, lng: 121.0659 },
  "marikina city": { lat: 14.6347, lng: 121.1010 },
  "manila": { lat: 14.5995, lng: 120.9842 },
  "taguig": { lat: 14.5176, lng: 121.0509 },
  "makati": { lat: 14.5547, lng: 121.0244 },
};

/**
 * Extract locations, dates, and reasons from raw post text using basic regex and keyword matching.
 */
function parseOutagePost(text) {
  const textLower = text.toLowerCase();
  
  // 1. Identify Status
  let status = "ongoing";
  if (textLower.includes("scheduled") || textLower.includes("maintenance") || textLower.includes("advisory")) {
    status = "scheduled";
  }
  if (textLower.includes("restored") || textLower.includes("power back") || textLower.includes("energized")) {
    status = "restored";
  }

  // 2. Extract Province & Municipality clues
  let province = "Metro Manila"; // default assumption for demo
  let municipality = "Manila";
  let barangay = "Unknown Barangay";

  // Scan text for known municipalities
  for (const city of Object.keys(LOCATION_COORDINATES)) {
    if (textLower.includes(city)) {
      municipality = city.replace(/(^|\s)\S/g, (l) => l.toUpperCase()); // Capitalize words
      break;
    }
  }

  // Extract Barangay guesses (looking for "Brgy." or "Barangay")
  const brgyMatch = text.match(/(?:brgy|barangay)\.?\s+([A-Za-z\s]+?)(?=\n|,|\.|\s+in|\s+at|\s+affected|$)/i);
  if (brgyMatch && brgyMatch[1]) {
    barangay = brgyMatch[1].trim();
  }

  // 3. Extract Reason clues
  let reason = "Scheduled Maintenance";
  if (textLower.includes("typhoon") || textLower.includes("bagyo")) {
    reason = "Typhoon damage";
  } else if (textLower.includes("transformer")) {
    reason = "Transformer maintenance";
  } else if (textLower.includes("line maintenance") || textLower.includes("post relocation")) {
    reason = "Line maintenance";
  } else if (textLower.includes("emergency") || textLower.includes("tripped")) {
    reason = "Emergency line outage";
  }

  // Determine coordinates
  const coords = LOCATION_COORDINATES[municipality.toLowerCase()] || LOCATION_COORDINATES["manila"];

  return {
    province,
    municipality,
    barangay,
    latitude: coords.lat,
    longitude: coords.lng,
    status,
    startTime: new Date().toISOString(), // Fallback to current time
    estimatedEnd: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // Fallback to +4 hours
    reason,
    notes: text.slice(0, 500), // Save raw text as notes
  };
}

/**
 * Scrape outage updates from a public Facebook page.
 * @param {string} pageName - The Facebook page slug
 */
async function scrapeFacebookPage(pageName) {
  console.log(`🚀 Starting scraping process for Facebook page: ${pageName}...`);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  });
  const page = await context.newPage();

  try {
    // Navigate to mobile basic page to bypass login prompt walls
    const url = `https://m.facebook.com/${pageName}`;
    await page.goto(url, { waitUntil: "networkidle" });
    console.log(`🔗 Navigated to: ${url}`);

    // Wait for the timeline container
    await page.waitForSelector("body");

    // Extract text and timestamps from post elements
    const posts = await page.evaluate(() => {
      const articles = document.querySelectorAll("article");
      return Array.from(articles).map(el => {
        // Facebook Mobile Basic structure extracts text content
        const text = el.innerText || el.textContent || "";
        return { text };
      }).filter(post => post.text.trim().length > 10);
    });

    console.log(`📦 Retrieved ${posts.length} raw posts from timeline.`);

    const relevantOutages = [];
    for (const post of posts) {
      const cleanText = post.text.trim();
      const hasKeywords = ["outage", "brownout", "blackout", "interruption", "maintenance", "restoration", "meralco", "electric"].some(
        keyword => cleanText.toLowerCase().includes(keyword)
      );

      if (hasKeywords) {
        const parsedData = parseOutagePost(cleanText);
        relevantOutages.push(parsedData);
      }
    }

    console.log(`🔍 Filtered ${relevantOutages.length} outage-related announcements.`);

    // Save to Firestore if available
    if (db && relevantOutages.length > 0) {
      console.log(`💾 Saving reports to Firestore database...`);
      const reportsCollection = collection(db, "reports");

      for (const report of relevantOutages) {
        // Simple deduplication check by notes (first 100 chars)
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
          console.log(`✅ Saved new report for ${report.barangay}, ${report.municipality} (ID: ${docRef.id})`);
        } else {
          console.log(`⏭️ Report for ${report.barangay}, ${report.municipality} already exists. Skipping.`);
        }
      }
    } else {
      console.log("📝 Scraped Data Output:", JSON.stringify(relevantOutages, null, 2));
    }

  } catch (error) {
    console.error("❌ Scraping process encountered an error:", error);
  } finally {
    await browser.close();
    console.log("🔒 Browser session closed.");
  }
}

// Start scraper on default demo page - e.g. Meralco Page slug
// Change to the actual targeted utility page username/slug
scrapeFacebookPage("meralco");
