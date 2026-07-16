/**
 * httpSMS Service — sends SMS messages via the httpSMS API.
 * Used by scraper scripts to notify nearby subscribers of new outage reports.
 *
 * API Reference: https://api.httpsms.com/index.html
 * POST /v1/messages/send
 */

import dotenv from "dotenv";
dotenv.config();

const HTTPSMS_API_KEY = process.env.HTTPSMS_API_KEY;
const HTTPSMS_SENDER  = process.env.HTTPSMS_SENDER;
const HTTPSMS_API_URL = "https://api.httpsms.com/v1/messages/send";

/**
 * Haversine distance between two lat/lng points in kilometers.
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Send a single SMS message via httpSMS API.
 * @param {string} to - recipient phone number (e.g., +639XXXXXXXXX)
 * @param {string} content - SMS text body
 * @returns {Promise<Object>} API response
 */
export async function sendSms(to, content) {
  if (!HTTPSMS_API_KEY || !HTTPSMS_SENDER) {
    console.warn("[httpSMS] Missing API key or sender number. Skipping SMS.");
    return null;
  }

  try {
    const res = await fetch(HTTPSMS_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": HTTPSMS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content,
        from: HTTPSMS_SENDER,
        to,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error(`[httpSMS] Failed to send to ${to}:`, data);
      return null;
    }

    console.log(`[httpSMS] ✅ SMS sent to ${to}`);
    return data;
  } catch (err) {
    console.error(`[httpSMS] Error sending to ${to}:`, err.message);
    return null;
  }
}

/**
 * Format a date string into a concise display format.
 */
function formatShortDate(isoString) {
  if (!isoString) return "N/A";
  try {
    const d = new Date(isoString);
    return d.toLocaleString("en-PH", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

/**
 * Build the SMS alert message for an outage report.
 * @param {Object} report
 * @returns {string}
 */
export function buildAlertMessage(report) {
  const lines = [
    `⚡ SIGLAT PH ALERT`,
    `Outage reported near your area!`,
    `📍 ${report.barangay}, ${report.municipality}`,
    `🔧 ${report.reason || "Power interruption"}`,
    `⏰ Started: ${formatShortDate(report.startTime)}`,
  ];

  if (report.estimatedEnd) {
    lines.push(`🔄 Est. Restore: ${formatShortDate(report.estimatedEnd)}`);
  }

  lines.push(``, `Reply STOP to unsubscribe.`);

  return lines.join("\n");
}

/**
 * Send SMS alerts to all subscribers who are within range of a new report.
 *
 * @param {Object} report - the new outage report (must have latitude, longitude, barangay, municipality, etc.)
 * @param {Array} subscribers - all active subscribers from Firestore
 * @param {Object} [options]
 * @param {number} [options.defaultRadiusKm=5] - fallback radius if subscriber doesn't specify
 * @param {number} [options.delayMs=1500] - delay between SMS sends to respect rate limits
 * @returns {Promise<{sent: number, skipped: number}>}
 */
export async function notifyNearbySubscribers(report, subscribers, options = {}) {
  const { defaultRadiusKm = 5, delayMs = 1500 } = options;

  if (!HTTPSMS_API_KEY || !HTTPSMS_SENDER) {
    console.warn("[httpSMS] Skipping notifications — missing API key or sender.");
    return { sent: 0, skipped: subscribers.length };
  }

  const reportLat = parseFloat(report.latitude);
  const reportLng = parseFloat(report.longitude);

  if (isNaN(reportLat) || isNaN(reportLng)) {
    console.warn("[httpSMS] Invalid report coordinates, skipping notifications.");
    return { sent: 0, skipped: subscribers.length };
  }

  const message = buildAlertMessage(report);
  let sent = 0;
  let skipped = 0;

  for (const sub of subscribers) {
    const subLat = parseFloat(sub.latitude);
    const subLng = parseFloat(sub.longitude);
    const radius = sub.radiusKm || defaultRadiusKm;

    if (isNaN(subLat) || isNaN(subLng)) {
      console.warn(`[httpSMS] Subscriber ${sub.phone} has invalid coordinates, skipping.`);
      skipped++;
      continue;
    }

    const distance = haversineDistance(reportLat, reportLng, subLat, subLng);

    if (distance <= radius) {
      console.log(`[httpSMS] 📍 ${sub.phone} is ${distance.toFixed(1)}km away (within ${radius}km radius) — sending alert.`);
      await sendSms(sub.phone, message);
      sent++;

      // Rate limit: wait between sends
      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    } else {
      console.log(`[httpSMS] ⏭️  ${sub.phone} is ${distance.toFixed(1)}km away (outside ${radius}km radius) — skipping.`);
      skipped++;
    }
  }

  console.log(`[httpSMS] Notification summary: ${sent} sent, ${skipped} skipped.`);
  return { sent, skipped };
}
