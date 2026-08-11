import { GoogleGenAI } from "@google/genai";

// -- Gemini client ---------------------------------------------------------------
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// -- Extraction prompt -----------------------------------------------------------
const SYSTEM_PROMPT = `You are a structured data extractor for Philippine utility advisories.

Your job: parse VECO (Visayan Electric Company) advisory text and extract EVERY individual scheduled power interruption.

Return a JSON array. Each element must have EXACTLY these fields:
  "date"         - full date string, e.g. "August 15, 2026"
  "time"         - time range, e.g. "8:00 AM to 5:00 PM (9hrs)"
  "purpose"      - reason for interruption, e.g. "To facilitate line maintenance works"
  "areas"        - full verbatim affected areas/barangay text from the advisory
  "municipality" - one of: Cebu City, Mandaue City, Talisay City, Naga City, Liloan, Consolacion, Compostela, San Fernando, Minglanilla

Rules:
  - One object per distinct scheduled interruption (one per table/section/date block)
  - A single post may contain 1 to 20+ individual interruptions -- extract ALL of them
  - Do NOT merge separate events. Do NOT skip any.
  - If a field is missing from the text, use an empty string ""
  - Return ONLY a raw JSON array. No markdown, no code fences, no explanations.
  - If no outages are found, return []

Advisory text:
`;

/**
 * Parse a raw VECO advisory post text using Gemini AI.
 *
 * @param {string} rawText   - The full innerText of the advisory post page.
 * @param {string} sourceUrl - The URL being parsed (for logging only).
 * @returns {Promise<Array<{date, time, purpose, areas, municipality}>>}
 */
export async function parseAdvisoryWithGemini(rawText, sourceUrl) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("[Gemini]  GEMINI_API_KEY not set -- skipping AI parse.");
    return [];
  }

  // Cap input to ~10k chars to stay within token limits comfortably
  const truncatedText = rawText.trim().slice(0, 10000);
  const prompt = SYSTEM_PROMPT + truncatedText;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`[Gemini] Parsing advisory from ${sourceUrl} (attempt ${attempt})...`);

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      let text = response.text.trim();

      // Defensively strip markdown code fences if the model adds them anyway
      text = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();

      const parsed = JSON.parse(text);

      if (!Array.isArray(parsed)) {
        throw new Error(`Expected JSON array but got: ${typeof parsed}`);
      }

      console.log(`[Gemini] Extracted ${parsed.length} outage event(s) from advisory.`);
      return parsed;

    } catch (err) {
      console.error(`[Gemini] Attempt ${attempt} failed: ${err.message}`);

      if (attempt < 2) {
        console.log("[Gemini] Retrying in 3 seconds...");
        await new Promise((r) => setTimeout(r, 3000));
      } else {
        console.error("[Gemini] Both attempts failed. Returning [] for this post.");
        return [];
      }
    }
  }

  return [];
}
