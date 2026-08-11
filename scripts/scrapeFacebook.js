/**
 * scrapeFacebook.js
 *
 * Scrapes public outage posts from a utility Facebook page using
 * the desktop Facebook layout, then uses Gemini AI to intelligently
 * decompose each post into structured, per-municipality outage records.
 *
 * Replaces: Tesseract.js OCR + all regex/DOM parsers
 */

import { chromium } from "playwright";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, where } from "firebase/firestore";
import dotenv from "dotenv";
import { notifyNearbySubscribers } from "./lib/httpSmsService.js";
import { parseFacebookPostWithGemini } from "./lib/facebookParser.js";

dotenv.config();

// -- CLI flags -----------------------------------------------------------------
const args      = process.argv.slice(2);
const DRY_RUN   = args.includes("--dry-run");
const PAGE_FLAG = args.find((a) => a.startsWith("--page="));
const PAGE_SLUG = PAGE_FLAG ? PAGE_FLAG.split("=")[1] : "visayanelectriccompany";

console.log(`\n[Config] Page: ${PAGE_SLUG} | Dry-run: ${DRY_RUN}\n`);

// -- Firebase ------------------------------------------------------------------
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

// -- Municipality coordinate table --------------------------------------------
const VECO_MUNICIPALITIES = {
  "cebu city":    { lat: 10.3157, lng: 123.8854 },
  "mandaue city": { lat: 10.3446, lng: 123.9390 },
  "talisay city": { lat: 10.2500, lng: 123.8333 },
  "naga city":    { lat: 10.2092, lng: 123.7578 },
  "city of naga": { lat: 10.2092, lng: 123.7578 },
  "liloan":       { lat: 10.4003, lng: 123.9989 },
  "consolacion":  { lat: 10.3800, lng: 123.9570 },
  "compostela":   { lat: 10.4500, lng: 124.0167 },
  "san fernando": { lat: 10.1611, lng: 123.7083 },
  "minglanilla":  { lat: 10.2458, lng: 123.7972 },
};

// -- Geocode via OSM Nominatim -------------------------------------------------
async function geocode(barangay, municipality) {
  try {
    const q   = `${barangay}, ${municipality}, Cebu, Philippines`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "SiglatPH/1.0 (community outage tracker)" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    // Safety bounds: Cebu province
    if (lat >= 9.5 && lat <= 11.5 && lng >= 123.0 && lng <= 124.5) {
      return { lat, lng };
    }
  } catch (_) {}
  return null;
}

// -- Main scraper --------------------------------------------------------------
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

    // Dismiss login modal if present
    try {
      const closeButton = page.locator('div[role="dialog"] div[aria-label="Close"], div[aria-label="Accessible close"]');
      if (await closeButton.isVisible()) {
        await closeButton.click();
        console.log("[Scraper] Dismissed login popup.");
      }
    } catch (_) {}

    // Scroll to load feed
    console.log("[Scraper] Scrolling to load feed posts...");
    await page.evaluate(() => window.scrollBy(0, 1200));
    await sleep(2500);

    // Expand "See more" buttons
    try {
      const seeMoreTriggers = page.locator('div[dir="auto"] div[role="button"]:has-text("See more")');
      const count = await seeMoreTriggers.count();
      for (let i = 0; i < count; i++) {
        await seeMoreTriggers.nth(i).click().catch(() => {});
      }
      console.log(`[Scraper] Expanded ${count} "See more" blocks.`);
    } catch (_) {}

    // Extract post texts, images, and permalink URLs
    const rawPosts = await page.evaluate(() => {
      const articles = Array.from(document.querySelectorAll('div[role="article"], div[data-testid="post_container"]'));
      return articles.map((el) => {
        const msgEl  = el.querySelector('div[dir="auto"], div[data-ad-preview="message"]');
        const text   = msgEl ? msgEl.innerText : el.innerText;
        const imgEl  = el.querySelector('img[src*="fbcdn"]');
        const imgUrl = imgEl ? imgEl.src : null;

        let postUrl = null;
        for (const link of Array.from(el.querySelectorAll("a[href]"))) {
          const href = link.href;
          if (href.includes("/posts/") || href.includes("/permalink/") ||
              href.includes("/photos/") || href.includes("/story.php")) {
            postUrl = href;
            break;
          }
        }
        if (!postUrl) {
          const ts = el.querySelector('a[href*="facebook.com"][role="link"] span[id]')?.closest("a") ||
                     el.querySelector('a[href*="facebook.com/photo"]') ||
                     el.querySelector('span[id] a[href*="facebook.com"]');
          if (ts) postUrl = ts.href;
        }

        return { text: (text || "").trim(), imgUrl, postUrl };
      }).filter((p) => p.text.length > 50);
    });

    console.log(`[Scraper] Extracted ${rawPosts.length} posts from feed.`);

    const OUTAGE_KEYWORDS = [
      "outage", "brownout", "blackout", "interruption", "maintenance",
      "restoration", "advisory", "scheduled", "power supply", "electric",
      "extended", "extension", "rotational",
    ];

    const outagePosts = rawPosts.filter(({ text }) => {
      const lower = text.toLowerCase();
      return OUTAGE_KEYWORDS.some((kw) => lower.includes(kw));
    });

    console.log(`[Scraper] Identified ${outagePosts.length} outage-related posts.`);

    const reports = [];

    for (const { text, imgUrl, postUrl } of outagePosts) {
      console.log(`\n--- Processing Post ---`);
      console.log(text.slice(0, 150) + "...");

      // -- Gemini reads the entire post and returns structured entries ----------
      const geminiEntries = await parseFacebookPostWithGemini(
        text,
        postUrl || `https://www.facebook.com/${pageSlug}`
      );

      if (geminiEntries.length === 0) {
        console.log("[Parser] No structured outage entries extracted. Skipping post.");
        continue;
      }

      console.log(`[Parser] Got ${geminiEntries.length} entries from Gemini for this post.`);

      // -- Map each Gemini entry to a Firestore-ready report object ------------
      for (const entry of geminiEntries) {
        const municipality = (entry.municipality || "Cebu City").trim();
        const barangays    = Array.isArray(entry.barangays) && entry.barangays.length > 0
          ? entry.barangays.map((b) => b.trim()).filter(Boolean)
          : ["Unknown Barangay"];

        // Resolve timestamps
        const dateStr = entry.date ||
          new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
        let startTime    = new Date().toISOString();
        let estimatedEnd = new Date(Date.now() + 2 * 3600000).toISOString();
        try {
          if (entry.time_start) startTime    = new Date(`${dateStr} ${entry.time_start}`).toISOString();
          if (entry.time_end)   estimatedEnd = new Date(`${dateStr} ${entry.time_end}`).toISOString();
        } catch (_) {}

        // Geocode the first barangay in the list as the map pin
        await sleep(1100);
        const geo      = await geocode(barangays[0], municipality);
        const fallback = VECO_MUNICIPALITIES[municipality.toLowerCase()] || { lat: 10.3157, lng: 123.8854 };
        const coords   = geo ?? fallback;

        reports.push({
          province:      "Cebu",
          municipality,
          barangay:      barangays[0],
          latitude:      coords.lat,
          longitude:     coords.lng,
          status:        entry.status    || "ongoing",
          startTime,
          estimatedEnd,
          reason:        entry.reason    || "Rotational brownout",
          notes:         `[Facebook Update] ${entry.notes || text.slice(0, 500)}\n\nAll affected barangays: ${barangays.join(", ")}`,
          sourceUrl:     postUrl || `https://www.facebook.com/${pageSlug}`,
          mapImageUrl:   imgUrl && !imgUrl.includes("emoji.php") ? imgUrl : null,
          photoUrl:      null,
          confirmations: 0,
          restoredVotes: 0,
          createdAt:     new Date().toISOString(),
          updatedAt:     new Date().toISOString(),
        });
      }
    }

    console.log(`\n[Scraper] Compiled ${reports.length} structured reports.`);

    // -- Dry-run: print without saving -----------------------------------------
    if (DRY_RUN || !db) {
      console.log("\n[Dry-run] Scraped output:");
      console.log(JSON.stringify(reports, null, 2));
      return;
    }

    // -- Save to Firestore with deduplication ----------------------------------
    const col = collection(db, "reports");
    let saved = 0;
    let dupes = 0;

    for (const report of reports) {
      const q = query(
        col,
        where("municipality", "==", report.municipality),
        where("startTime",    "==", report.startTime),
        where("status",       "==", report.status),
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

    // -- SMS Notifications -----------------------------------------------------
    const newReports = reports.filter((r) => r._isNew);
    if (newReports.length > 0) {
      console.log(`\n[httpSMS] Sending alerts for ${newReports.length} new report(s)...`);
      try {
        const subsSnapshot = await getDocs(collection(db, "subscribers"));
        const subscribers  = subsSnapshot.docs
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

// -- Run ----------------------------------------------------------------------
scrapeFacebookPage(PAGE_SLUG);
