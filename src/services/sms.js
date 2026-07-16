import { fetchAllSubscribers } from "./firebase/subscribers";

const HTTPSMS_API_URL = "https://api.httpsms.com/v1/messages/send";

/**
 * Haversine distance between two lat/lng points in kilometers.
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
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
 * Format date for SMS alert display.
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
 * Send an SMS from the client-side (using VITE-prefixed env keys).
 */
export async function sendSmsClient(to, content) {
  const apiKey = import.meta.env.VITE_HTTPSMS_API_KEY;
  const sender = import.meta.env.VITE_HTTPSMS_SENDER;

  if (!apiKey || !sender) {
    console.warn("[httpSMS Client] API key or Sender number not configured in .env. Skipping SMS.");
    return null;
  }

  try {
    const res = await fetch(HTTPSMS_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content,
        from: sender,
        to,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      console.log(`[httpSMS Client] ✅ Alert SMS sent successfully to ${to}`);
      return data;
    } else {
      console.error(`[httpSMS Client] Failed to send to ${to}:`, data);
      return null;
    }
  } catch (err) {
    console.error(`[httpSMS Client] Network error sending to ${to}:`, err.message);
    return null;
  }
}

/**
 * Scans active subscribers and alerts those close to the newly reported community outage.
 */
export async function notifyNearbySubscribersClient(report) {
  const apiKey = import.meta.env.VITE_HTTPSMS_API_KEY;
  if (!apiKey) {
    console.log("[httpSMS Client] No VITE_HTTPSMS_API_KEY configured. Skipping subscriber matching.");
    return;
  }

  const reportLat = parseFloat(report.latitude);
  const reportLng = parseFloat(report.longitude);

  if (isNaN(reportLat) || isNaN(reportLng)) {
    console.warn("[httpSMS Client] Invalid report coordinates. Skipping alerts.");
    return;
  }

  try {
    console.log("[httpSMS Client] Fetching active subscribers...");
    const subscribers = await fetchAllSubscribers();
    console.log(`[httpSMS Client] Found ${subscribers.length} active subscriber(s).`);

    const message = [
      `SIGLAT PH ALERT: Outage reported in your area.`,
      `Location: ${report.barangay}, ${report.municipality}`,
      `Reason: ${report.reason || "Power interruption"}`,
      `Started: ${formatShortDate(report.startTime)}`,
    ];
    if (report.estimatedEnd) {
      message.push(`Est. Restoration: ${formatShortDate(report.estimatedEnd)}`);
    }
    message.push(``, `Reply STOP to unsubscribe.`);

    const smsBody = message.join("\n");
    let sentCount = 0;

    for (const sub of subscribers) {
      const subLat = parseFloat(sub.latitude);
      const subLng = parseFloat(sub.longitude);
      const radius = sub.radiusKm || 5;

      if (isNaN(subLat) || isNaN(subLng)) continue;

      const distance = haversineDistance(reportLat, reportLng, subLat, subLng);
      if (distance <= radius) {
        console.log(`[httpSMS Client] Subscriber ${sub.phone} is within ${distance.toFixed(2)}km (limit: ${radius}km) — triggering SMS.`);
        await sendSmsClient(sub.phone, smsBody);
        sentCount++;
      } else {
        console.log(`[httpSMS Client] Subscriber ${sub.phone} is ${distance.toFixed(2)}km away (limit: ${radius}km) — skipping.`);
      }
    }

    console.log(`[httpSMS Client] Alert distribution complete. Sent to ${sentCount} subscriber(s).`);
  } catch (err) {
    console.error("[httpSMS Client] Error during proximity check & alert:", err.message);
  }
}
