import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ---------------------------------------------------------------------------
// Prompt — handles both post types in one shot
// ---------------------------------------------------------------------------
const PROMPT_PREFIX = `You are a structured data extractor for Philippine power utility Facebook posts.

Analyze the post and extract ALL power outage events into a JSON array.

=== POST TYPE DETECTION ===

TYPE A — Scheduled Advisory
Clues: contains "Time:", "Purpose:", "Areas Affected:", structured advisory format.
Extraction: one object per scheduled interruption block.

TYPE B — Rotational Brownout / Load Shedding Update
Clues: contains "ROTATIONAL BROWNOUT", "ONGOING", "RESTORED", time slots like "3:00PM-4:00PM",
municipality lists like "Portion of Cebu City: Apas, Basak...".
Extraction: one object per MUNICIPALITY per TIME SLOT per STATUS.
Example: if "ONGOING 4PM-5PM" lists Cebu City + Mandaue City + Naga City, that is THREE objects.

=== RETURN FORMAT ===

Return ONLY a raw JSON array, no markdown, no explanation.
Each object must have EXACTLY these fields:
  "status"       : "ongoing" | "restored" | "scheduled"
  "municipality" : e.g. "Cebu City", "Mandaue City", "City of Naga", "San Fernando"
  "barangays"    : array of barangay name strings
  "time_start"   : start time string, e.g. "3:00 PM" or "8:00 AM"
  "time_end"     : end time string, e.g. "4:00 PM" or "5:00 PM"
  "date"         : date string if found in post, e.g. "August 11, 2026", else ""
  "reason"       : one of: "Rotational brownout" | "Line maintenance" | "Transformer maintenance" | "System upgrade" | "Typhoon damage" | "Emergency line fault"
  "notes"        : the verbatim raw text snippet relevant to this entry (max 400 chars)

=== RULES ===
- For brownout updates: EVERY municipality is its own separate object even if listed in the same paragraph
- "Portion of Cebu City: Apas, Basak..." → municipality="Cebu City", barangays=["Apas","Basak",...]
- Restored and ongoing sections have different statuses — keep them separate
- For scheduled advisories: status is always "scheduled"
- If the post has no outage content, return []
- Never combine multiple municipalities into one object

=== POST TEXT ===
`;

/**
 * Parse a raw Facebook post using Gemini AI.
 *
 * Returns a normalized array of outage entries, one per
 * municipality/time-slot/status combination.
 *
 * @param {string} rawText   Raw post text scraped from Facebook.
 * @param {string} sourceUrl Source URL for logging.
 * @returns {Promise<Array>}
 */
export async function parseFacebookPostWithGemini(rawText, sourceUrl = "") {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("[FacebookParser] GEMINI_API_KEY not set — skipping AI parse.");
    return [];
  }

  const truncated = rawText.trim().slice(0, 12000);
  const prompt = PROMPT_PREFIX + truncated;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`[FacebookParser] Sending to Gemini (attempt ${attempt})...`);

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      let text = response.text.trim();
      // Strip markdown fences if model adds them
      text = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();

      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error("Response is not an array");

      console.log(`[FacebookParser] Extracted ${parsed.length} outage entry/entries.`);
      return parsed;

    } catch (err) {
      console.error(`[FacebookParser] Attempt ${attempt} failed: ${err.message}`);
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 3000));
      } else {
        console.error("[FacebookParser] Both attempts failed — skipping this post.");
        return [];
      }
    }
  }

  return [];
}

