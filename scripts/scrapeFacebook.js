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
import { notifyNearbySubscribers } from "./lib/httpSmsService.js";

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

// ── Helper to normalize mathematical alphanumeric Unicode symbols ───────────
function cleanStyledText(text) {
  return text.normalize("NFKD");
}

// ── Helper to split multi-schedule/weekly advisory posts ────────────────────
function splitMultiSchedulePost(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const dateHeaderRegex = /^\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:-\d{1,2})?,\s*\d{4}/i;
  
  const blocks = [];
  let currentDateHeader = "";
  let currentBlock = null;
  let currentState = "";

  for (const line of lines) {
    const cleanLine = line.replace(/[\u2300-\u23FF\u2600-\u27BF]/g, "").trim(); // strip clock/emoji characters
    
    if (dateHeaderRegex.test(cleanLine)) {
      currentDateHeader = cleanLine;
      continue;
    }

    if (/^Time\s*:/i.test(cleanLine)) {
      if (currentBlock) {
        blocks.push(currentBlock);
      }
      currentBlock = {
        date: currentDateHeader,
        time: cleanLine.replace(/^Time\s*:\s*/i, "").trim(),
        purpose: "",
        areas: "",
        map: "",
      };
      currentState = "time";
      continue;
    }

    if (currentBlock) {
      if (/^Purpose\s*:/i.test(cleanLine)) {
        currentState = "purpose";
        currentBlock.purpose = cleanLine.replace(/^Purpose\s*:\s*/i, "").trim();
      } else if (/^Areas\s+Affected\s*:/i.test(cleanLine)) {
        currentState = "areas";
        currentBlock.areas = cleanLine.replace(/^Areas\s+Affected\s*:\s*/i, "").trim();
      } else if (/^View\s+the\s+map\s+here\s*:/i.test(cleanLine) || /https?:\/\/tinyurl\.com/i.test(cleanLine)) {
        currentState = "map";
        currentBlock.map = cleanLine.replace(/^View\s+the\s+map\s+here\s*:\s*/i, "").trim();
      } else {
        if (currentState === "purpose") {
          currentBlock.purpose += " " + cleanLine;
        } else if (currentState === "areas") {
          currentBlock.areas += " " + cleanLine;
        } else if (currentState === "map") {
          currentBlock.map += " " + cleanLine;
        }
      }
    }
  }

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  return blocks;
}

// ── Helper to extract locations from a schedule block ────────────────────────
function extractLocations(block) {
  const textForMunicipality = `${block.areas} ${block.purpose}`.toLowerCase();
  let municipality = "Cebu City";
  let province = "Cebu";

  for (const [key, val] of Object.entries(VECO_MUNICIPALITIES)) {
    if (textForMunicipality.includes(key)) {
      municipality = key.replace(/(^\w|\s\w)/g, (c) => c.toUpperCase());
      province = val.province;
      break;
    }
  }

  const barangays = [];
  
  // 1. Try to extract from serving Brgy in purpose
  const purposeMatch = block.purpose.match(/serving Brgy\.?\s+([^]+?)(?=by|facilitating|for|\.|$)/i);
  if (purposeMatch && purposeMatch[1]) {
    const rawBrgys = purposeMatch[1].split(/,|\s+and\s+|\s*&\s*/i);
    for (const b of rawBrgys) {
      const cleanB = b.trim();
      if (cleanB.length > 2) {
        barangays.push(cleanB);
      }
    }
  }

  // 2. Fallback to areas description
  if (barangays.length === 0) {
    const brgyPatterns = [
      /(?:portion of|portions of)\s+([A-Za-z\s0-9\-&()]+?)(?=along|serving|affecting|,|\.|$)/i,
      /(?:brgy\.?|barangay)\s+([A-Za-z\s0-9\-&()]+?)(?=,|\.|\s+in\s|$)/i,
    ];

    for (const pat of brgyPatterns) {
      const m = block.areas.match(pat);
      if (m && m[1]) {
        const rawBrgys = m[1].split(/,|\s+and\s+|\s*&\s*/i);
        for (const b of rawBrgys) {
          const cleanB = b.trim();
          if (cleanB.length > 2) {
            barangays.push(cleanB);
          }
        }
        break;
      }
    }
  }

  if (barangays.length === 0) {
    barangays.push("Unknown Barangay");
  }

  return { municipality, province, barangays };
}

// ── Helper to parse start & end times from a block ───────────────────────────
function parseBlockDateTime(dateStr, timeStr) {
  let startTime = new Date().toISOString();
  let estimatedEnd = new Date(Date.now() + 4 * 3600000).toISOString();

  try {
    const complexRangeMatch = timeStr.match(/(\d{1,2}:\d{2}\s*[AP]M)\s+of\s+([A-Za-z]+)\s+(\d{1,2})\s+to\s+(\d{1,2}:\d{2}\s*[AP]M)\s+of\s+([A-Za-z]+)\s+(\d{1,2})/i);
    const yearMatch = dateStr.match(/,?\s*(\d{4})/);
    const year = yearMatch ? yearMatch[1] : new Date().getFullYear();

    if (complexRangeMatch) {
      const startT = complexRangeMatch[1];
      const startMonth = complexRangeMatch[2];
      const startDay = complexRangeMatch[3];
      const endT = complexRangeMatch[4];
      const endMonth = complexRangeMatch[5];
      const endDay = complexRangeMatch[6];

      startTime = new Date(`${startMonth} ${startDay}, ${year} ${startT}`).toISOString();
      estimatedEnd = new Date(`${endMonth} ${endDay}, ${year} ${endT}`).toISOString();
    } else {
      const timeRange = timeStr.match(/(\d{1,2}:\d{2}\s*[AP]M)\s*to\s*(\d{1,2}:\d{2}\s*[AP]M)/i);
      const singleDateMatch = dateStr.match(/([A-Za-z]+)\s+(\d{1,2})(?:-\d{1,2})?,\s*(\d{4})/);
      
      if (singleDateMatch) {
        const month = singleDateMatch[1];
        const day = singleDateMatch[2];
        const yr = singleDateMatch[3];
        
        if (timeRange) {
          startTime = new Date(`${month} ${day}, ${yr} ${timeRange[1]}`).toISOString();
          estimatedEnd = new Date(`${month} ${day}, ${yr} ${timeRange[2]}`).toISOString();
        } else {
          startTime = new Date(`${month} ${day}, ${yr} 08:00 AM`).toISOString();
          estimatedEnd = new Date(`${month} ${day}, ${yr} 05:00 PM`).toISOString();
        }
      }
    }
  } catch (_) {}

  return { startTime, estimatedEnd };
}

// ── Post text parser ──────────────────────────────────────────────────────────
function parseAdvisoryText(rawText) {
  const text = cleanStyledText(rawText);
  const lower = text.toLowerCase();

  // Determine if it is a multi-schedule post
  const timeOccurrences = (text.match(/Time\s*:/ig) || []).length;
  const purposeOccurrences = (text.match(/Purpose\s*:/ig) || []).length;

  if (timeOccurrences > 1 || purposeOccurrences > 1) {
    console.log(`[Parser] Detected multi-schedule weekly advisory post (${timeOccurrences} time blocks). Splitting...`);
    const blocks = splitMultiSchedulePost(text);
    const subReports = [];

    for (const block of blocks) {
      const { municipality, province, barangays } = extractLocations(block);
      const { startTime, estimatedEnd } = parseBlockDateTime(block.date, block.time);

      let reason = "Line maintenance";
      const purposeLower = block.purpose.toLowerCase();
      if (purposeLower.includes("transformer")) reason = "Transformer maintenance";
      else if (purposeLower.includes("upgrade") || purposeLower.includes("capacity")) reason = "System upgrade";
      else if (purposeLower.includes("typhoon") || purposeLower.includes("bagyo")) reason = "Typhoon damage";
      else if (purposeLower.includes("emergency") || purposeLower.includes("tripped")) reason = "Emergency line fault";

      for (const barangay of barangays) {
        subReports.push({
          status: "scheduled",
          startTime,
          estimatedEnd,
          municipality,
          province,
          barangay,
          reason,
          notes: `Purpose: ${block.purpose}\nAreas Affected: ${block.areas}`,
          isMultiSchedule: true,
          blockMapUrl: block.map || null,
        });
      }
    }
    return subReports;
  }

  // Fallback for single-advisory posts
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

  return { status, startTime, estimatedEnd, municipality, province, barangay, reason, notes, isMultiSchedule: false };
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

        // Extract the specific post permalink URL
        // Facebook post links contain /posts/, /permalink/, or /photos/ in the href
        let postUrl = null;
        const allLinks = Array.from(el.querySelectorAll('a[href]'));
        for (const link of allLinks) {
          const href = link.href;
          if (
            href.includes('/posts/') ||
            href.includes('/permalink/') ||
            href.includes('/photos/') ||
            href.includes('/story.php')
          ) {
            postUrl = href;
            break;
          }
        }
        // Fallback: look for timestamp links which are typically post permalinks
        if (!postUrl) {
          const timestampLink = el.querySelector('a[href*="facebook.com"][role="link"] span[id]')?.closest('a') ||
                                el.querySelector('a[href*="facebook.com/photo"]') ||
                                el.querySelector('span[id] a[href*="facebook.com"]');
          if (timestampLink) {
            postUrl = timestampLink.href;
          }
        }

        return { text: (text || "").trim(), imgUrl, postUrl };
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
    for (const { text, imgUrl, postUrl } of outagePosts) {
      console.log(`\n--- Parsing Outage Post ---`);
      console.log(text.slice(0, 150) + "...");

      let parsedResult = parseAdvisoryText(text);
      let parsedReports = Array.isArray(parsedResult) ? parsedResult : [parsedResult];

      for (const parsed of parsedReports) {
        // Perform OCR if there is an advisory image attached and NOT a multi-schedule text-heavy post
        if (imgUrl && !imgUrl.includes("emoji.php") && !parsed.isMultiSchedule) {
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

        // Use specific tinyurl map if available, otherwise post permalink
        const resolvedSourceUrl = parsed.blockMapUrl || postUrl || `https://www.facebook.com/${pageSlug}`;
        if (parsed.blockMapUrl) {
          console.log(`[Link] Using block map URL: ${parsed.blockMapUrl}`);
        } else if (postUrl) {
          console.log(`[Link] Post permalink: ${postUrl}`);
        }

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
          sourceUrl:    resolvedSourceUrl,
          mapImageUrl:  imgUrl && !imgUrl.includes("emoji.php") ? imgUrl : null,
          photoUrl:     null,
          confirmations:  0,
          restoredVotes:  0,
          createdAt:    new Date().toISOString(),
          updatedAt:    new Date().toISOString(),
        });
      }
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
        report._firestoreId = ref.id;
        report._isNew = true;
        saved++;
      } else {
        console.log(`  [Skip]    ${report.barangay}, ${report.municipality} — already exists`);
        dupes++;
      }
    }

    console.log(`\n[Done] Saved: ${saved}  |  Skipped (duplicates): ${dupes}`);

    // ── SMS Notifications ─────────────────────────────────────────────────
    const newReports = reports.filter((r) => r._isNew);
    if (newReports.length > 0) {
      console.log(`\n[httpSMS] Sending alerts for ${newReports.length} new report(s)...`);
      try {
        // Fetch all subscribers from Firestore
        const subsSnapshot = await getDocs(collection(db, "subscribers"));
        const subscribers = subsSnapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((s) => s.active !== false);

        console.log(`[httpSMS] Found ${subscribers.length} active subscriber(s).`);

        for (const report of newReports) {
          await notifyNearbySubscribers(report, subscribers);
        }
      } catch (smsErr) {
        console.error("[httpSMS] Notification error:", smsErr.message);
      }
    }

  } catch (err) {
    console.error("[Error]", err.message);
  } finally {
    await browser.close();
    console.log("[Browser] Closed.");
  }
}

// ── Run scraper ──────────────────────────────────────────────────────────────
scrapeFacebookPage(PAGE_SLUG);
