/**
 * scrapeFacebook.js
 *
 * Scrapes public outage posts from a utility's Facebook page
 * using the desktop Facebook layout.
 *
 * Performs OCR (Optical Character Recognition) on advisory images using tesseract.js
 * to extract precise location and schedule details from the image itself.
 */

import { chromium } from "playwright";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { createWorker } from "tesseract.js";
import dotenv from "dotenv";

dotenv.config();

// ── CLI flags ────────────────────────────────────────────────────────────────
const args       = process.argv.slice(2);
const DRY_RUN    = args.includes("--dry-run");
const PAGE_FLAG  = args.find((a) => a.startsWith("--page="));
const PAGE_SLUG  = PAGE_FLAG ? PAGE_FLAG.split("=")[1] : "visayanelectriccompany";

console.log(`\n[Config] Page: ${PAGE_SLUG} | Dry-run: ${DRY_RUN}\n`);

// ── Firebase ─────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            process.env.VITE_FIREBASE_API_KEY,
  authDomain:        process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.VITE_FIREBASE_APP_ID,
};

let db = null;
if (!DRY_RUN && firebaseConfig.apiKey && firebaseConfig.projectId) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log("[Firebase] Connected to Firestore.");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Location lookup ───────────────────────────────────────────────────────────
const VECO_MUNICIPALITIES = {
  "cebu city":    { lat: 10.3157, lng: 123.8854, province: "Cebu" },
  "mandaue city": { lat: 10.3446, lng: 123.9390, province: "Cebu" },
  "talisay city": { lat: 10.2500, lng: 123.8333, province: "Cebu" },
  "naga city":    { lat: 10.2092, lng: 123.7578, province: "Cebu" },
  "liloan":       { lat: 10.4003, lng: 123.9989, province: "Cebu" },
  "consolacion":  { lat: 10.3800, lng: 123.9570, province: "Cebu" },
  "compostela":   { lat: 10.4500, lng: 124.0167, province: "Cebu" },
  "san fernando": { lat: 10.1611, lng: 123.7083, province: "Cebu" },
  "minglanilla":  { lat: 10.2458, lng: 123.7972, province: "Cebu" },
};

// ── Geocode via Nominatim ─────────────────────────────────────────────────────
async function geocode(barangay, municipality) {
  try {
    const q = `${barangay}, ${municipality}, Cebu, Philippines`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "SiglatPH/1.0 (community outage tracker)" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    if (lat >= 9.5 && lat <= 11.5 && lng >= 123.0 && lng <= 124.5) {
      return { lat, lng };
    }
  } catch (_) {}
  return null;
}

// ── OCR Optical Character Recognition ─────────────────────────────────────────
async function performOCR(imageUrl) {
  if (!imageUrl) return "";
  try {
    console.log(`[OCR] Initializing worker for image: ${imageUrl.slice(0, 60)}...`);
    const worker = await createWorker("eng");
    const ret = await worker.recognize(imageUrl);
    await worker.terminate();
    console.log("[OCR] Analysis complete.");
    return ret.data.text;
  } catch (err) {
    console.error("[OCR Error]", err.message);
    return "";
  }
}

// ── Parse OCR Text ────────────────────────────────────────────────────────────
function parseOCRText(ocrText, original) {
  const text = ocrText.replace(/\s+/g, " ").trim();
  console.log("[OCR] Raw recognized text:\n", ocrText);

  let municipality = original.municipality;
  let province     = original.province;
  let barangay     = original.barangay;

  // Look for WHERE block
  const whereMatch = text.match(/WHERE:?\s+([^]+?)(?=WHEN:?|WHY:?|WHAT:?|To view|$)/i);
  if (whereMatch && whereMatch[1]) {
    const whereText = whereMatch[1].trim();
    const whereLower = whereText.toLowerCase();

    // Match municipality
    for (const [key, val] of Object.entries(VECO_MUNICIPALITIES)) {
      if (whereLower.includes(key)) {
        municipality = key.replace(/(^\w|\s\w)/g, (c) => c.toUpperCase());
        province     = val.province;
        break;
      }
    }

    // Match barangay inside WHERE
    const brgyPatterns = [
      /(?:portion of|portions of)\s+([A-Za-z\s0-9\-&()]+?)(?=along|serving|affecting|,|\.|$)/i,
      /(?:brgy\.?|barangay)\s+([A-Za-z\s0-9\-&()]+?)(?=,|\.|\s+in\s|$)/i,
    ];

    let found = false;
    for (const pat of brgyPatterns) {
      const m = whereText.match(pat);
      if (m && m[1] && m[1].trim().length > 2) {
        barangay = m[1].trim().split(/\s+and\s+/i)[0].split(/&/)[0].trim();
        found = true;
        break;
      }
    }

    if (!found) {
      const parts = whereText.replace(/portion of/i, "").split(",");
      if (parts[0] && parts[0].trim().length > 2) {
        barangay = parts[0].trim();
      }
    }
  }

  return { municipality, province, barangay };
}

// ── Post text parser ──────────────────────────────────────────────────────────
function parseAdvisoryText(rawText) {
  const text = rawText.replace(/\s+/g, " ").trim();
  const lower = text.toLowerCase();

  let status = "scheduled";
  if (lower.includes("restored") || lower.includes("power is back") || lower.includes("energized")) {
    status = "restored";
  } else if (lower.includes("ongoing") || lower.includes("current outage") || lower.includes("emergency power")) {
    status = "ongoing";
  }

  let startTime = new Date().toISOString();
  let estimatedEnd = new Date(Date.now() + 4 * 3600000).toISOString();

  const dateMatch = text.match(/([A-Z][a-z]+ \d{1,2},?\s*\d{4})/);
  const timeRange = text.match(/(\d{1,2}:\d{2}\s*[AP]M)\s*to\s*(\d{1,2}:\d{2}\s*[AP]M)/i) ||
                    text.match(/from\s*(\d{1,2}:\d{2}\s*[AP]M)\s*to\s*(\d{1,2}:\d{2}\s*[AP]M)/i);

  if (dateMatch) {
    try {
      const datePart = dateMatch[1].replace(",", "");
      if (timeRange) {
        startTime    = new Date(`${datePart} ${timeRange[1]}`).toISOString();
        estimatedEnd = new Date(`${datePart} ${timeRange[2]}`).toISOString();
      } else {
        startTime    = new Date(`${datePart} 08:00 AM`).toISOString();
        estimatedEnd = new Date(`${datePart} 05:00 PM`).toISOString();
      }
    } catch (_) {}
  }

  // Check extensions: e.g., "extended until 10:00 PM"
  const extensionMatch = text.match(/extended until\s*(\d{1,2}:\d{2}\s*[AP]M)/i) ||
                         text.match(/extended until\s*(\d{1,2}\s*[AP]M)/i);
  if (extensionMatch && dateMatch) {
    try {
      const datePart = dateMatch[1].replace(",", "");
      estimatedEnd = new Date(`${datePart} ${extensionMatch[1]}`).toISOString();
      status = "ongoing";
    } catch (_) {}
  }

  let municipality = "Cebu City";
  let province     = "Cebu";
  let barangay     = "Unknown Barangay";

  for (const [key, val] of Object.entries(VECO_MUNICIPALITIES)) {
    if (lower.includes(key)) {
      municipality = key.replace(/(^\w|\s\w)/g, (c) => c.toUpperCase());
      province     = val.province;
      break;
    }
  }

  const brgyPatterns = [
    /(?:portion of|portions of)\s+([A-Za-z\s0-9\-&]+?)(?=along|serving|affecting|,|\.|$)/i,
    /(?:brgy\.?|barangay)\s+([A-Za-z\s0-9\-&]+?)(?=,|\.|\s+in\s|$)/i,
  ];

  for (const pat of brgyPatterns) {
    const m = text.match(pat);
    if (m && m[1] && m[1].trim().length > 2) {
      barangay = m[1].trim().split(/\s+and\s+/i)[0].split(/&/)[0].trim();
      break;
    }
  }

  let reason = "Line maintenance";
  if (lower.includes("transformer")) reason = "Transformer maintenance";
  else if (lower.includes("upgrade") || lower.includes("capacity")) reason = "System upgrade";
  else if (lower.includes("typhoon") || lower.includes("bagyo")) reason = "Typhoon damage";
  else if (lower.includes("emergency") || lower.includes("tripped")) reason = "Emergency line fault";

  const notes = text.slice(0, 700);

  return { status, startTime, estimatedEnd, municipality, province, barangay, reason, notes };
}

// ── Main scraper ──────────────────────────────────────────────────────────────
async function scrapeFacebookPage(pageSlug) {
  console.log(`[Scraper] Launching browser for facebook.com/${pageSlug} ...`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport:  { width: 1280, height: 960 },
    locale:    "en-US",
  });

  const page = await context.newPage();

  try {
    const url = `https://www.facebook.com/${pageSlug}`;
    console.log(`[Scraper] Navigating to ${url} ...`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector("body", { timeout: 15000 });
    await sleep(4000);

    // Dismiss login modal dialog if it's there
    try {
      const closeButton = page.locator('div[role="dialog"] div[aria-label="Close"], div[aria-label="Accessible close"]');
      if (await closeButton.isVisible()) {
        await closeButton.click();
        console.log("[Scraper] Dismissed login popup dialog.");
      }
    } catch (_) {}

    // Scroll to populate feed
    console.log("[Scraper] Scrolling to load feed posts...");
    await page.evaluate(() => window.scrollBy(0, 1200));
    await sleep(2500);

    // Click all "See more" triggers to expand description texts
    try {
      const seeMoreTriggers = page.locator('div[dir="auto"] div[role="button"]:has-text("See more")');
      const count = await seeMoreTriggers.count();
      for (let i = 0; i < count; i++) {
        await seeMoreTriggers.nth(i).click().catch(() => {});
      }
      console.log(`[Scraper] Expanded ${count} "See more" text blocks.`);
    } catch (_) {}

    const rawPosts = await page.evaluate(() => {
      const articles = Array.from(document.querySelectorAll('div[role="article"], div[data-testid="post_container"]'));
      return articles.map((el) => {
        const msgEl = el.querySelector('div[dir="auto"], div[data-ad-preview="message"]');
        const text = msgEl ? msgEl.innerText : el.innerText;
        
        // Find high-res image
        const imgEl = el.querySelector('img[src*="fbcdn"]');
        const imgUrl = imgEl ? imgEl.src : null;

        return { text: (text || "").trim(), imgUrl };
      }).filter((p) => p.text.length > 50);
    });

    console.log(`[Scraper] Extracted ${rawPosts.length} posts from timeline feed.`);

    const OUTAGE_KEYWORDS = [
      "outage", "brownout", "blackout", "interruption", "maintenance",
      "restoration", "advisory", "scheduled", "power supply", "electric",
      "extended", "extension",
    ];

    const outagePosts = rawPosts.filter(({ text }) => {
      const lower = text.toLowerCase();
      return OUTAGE_KEYWORDS.some((kw) => lower.includes(kw));
    });

    console.log(`[Scraper] Identified ${outagePosts.length} outage-related posts.`);

    const reports = [];
    for (const { text, imgUrl } of outagePosts) {
      console.log(`\n--- Parsing Outage Post ---`);
      console.log(text.slice(0, 150) + "...");

      let parsed = parseAdvisoryText(text);

      // Perform OCR if there is an advisory image attached to the post
      if (imgUrl && !imgUrl.includes("emoji.php")) {
        const ocrText = await performOCR(imgUrl);
        if (ocrText) {
          const resolvedLocation = parseOCRText(ocrText, parsed);
          parsed.barangay     = resolvedLocation.barangay;
          parsed.municipality = resolvedLocation.municipality;
          parsed.province     = resolvedLocation.province;
          console.log(`[OCR Match] Extracted: ${parsed.barangay}, ${parsed.municipality}`);
        }
      }

      // Geocode locations
      await sleep(1100);
      const geo = await geocode(parsed.barangay, parsed.municipality);
      const fallback = VECO_MUNICIPALITIES[parsed.municipality.toLowerCase()] || { lat: 10.3157, lng: 123.8854 };
      const coords   = geo ?? fallback;

      reports.push({
        province:     parsed.province,
        municipality: parsed.municipality,
        barangay:     parsed.barangay,
        latitude:     coords.lat,
        longitude:    coords.lng,
        status:       parsed.status,
        startTime:    parsed.startTime,
        estimatedEnd: parsed.estimatedEnd,
        reason:       parsed.reason,
        notes:        `[Facebook Update] ${parsed.notes}`,
        sourceUrl:    `https://www.facebook.com/${pageSlug}`,
        mapImageUrl:  imgUrl && !imgUrl.includes("emoji.php") ? imgUrl : null,
        photoUrl:     null,
        confirmations:  0,
        restoredVotes:  0,
        createdAt:    new Date().toISOString(),
        updatedAt:    new Date().toISOString(),
      });
    }

    console.log(`\n[Scraper] Compiled ${reports.length} structured reports.`);

    if (DRY_RUN || !db) {
      console.log("\n[Dry-run] Scraped output:");
      console.log(JSON.stringify(reports, null, 2));
      return;
    }

    // Save to Firestore with deduplication
    const col = collection(db, "reports");
    let saved = 0;
    let dupes = 0;

    for (const report of reports) {
      const q = query(
        col,
        where("barangay",     "==", report.barangay),
        where("municipality", "==", report.municipality),
        where("startTime",    "==", report.startTime),
      );
      const existing = await getDocs(q);

      if (existing.empty) {
        const ref = await addDoc(col, report);
        console.log(`  [Saved]   ${report.barangay}, ${report.municipality} (${ref.id})`);
        saved++;
      } else {
        console.log(`  [Skip]    ${report.barangay}, ${report.municipality} — already exists`);
        dupes++;
      }
    }

    console.log(`\n[Done] Saved: ${saved}  |  Skipped (duplicates): ${dupes}`);

  } catch (err) {
    console.error("[Error]", err.message);
  } finally {
    await browser.close();
    console.log("[Browser] Closed.");
  }
}

// ── Run scraper ──────────────────────────────────────────────────────────────
scrapeFacebookPage(PAGE_SLUG);
