// LLM integration for pre-visit and post-visit summaries.
// Uses the Groq API (free tier — no credit card required, fast LPU
// inference, see https://console.groq.com). All calls are wrapped so
// that an LLM outage never breaks the booking or notes flow — callers
// get a safe fallback object/string plus a `degraded: true` flag instead
// of a throw.

const MODEL = "openai/gpt-oss-120b";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

async function callGroq(prompt, { maxTokens = 500 } = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Groq API error ${res.status}: ${text}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    return text ?? "";
  } finally {
    clearTimeout(timeout);
  }
}

function safeParseJSON(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

/**
 * Pre-visit summary: urgency level, chief complaint, 3 suggested questions.
 * Returns { urgencyLevel, chiefComplaint, suggestedQuestions, degraded }.
 */
export async function generatePreVisitSummary(symptomText) {
  const prompt = `Analyse these symptoms and return ONLY a JSON object with keys
"urgencyLevel" (one of "Low","Medium","High"), "chiefComplaint" (short string),
and "suggestedQuestions" (array of exactly 3 short strings the doctor could ask
the patient). No markdown, no preamble, JSON only.

Symptoms: ${symptomText}`;

  try {
    const raw = await callGroq(prompt, { maxTokens: 400 });
    const parsed = safeParseJSON(raw);
    if (!parsed || !parsed.urgencyLevel) throw new Error("Unparseable LLM response");
    return {
      urgencyLevel: parsed.urgencyLevel,
      chiefComplaint: parsed.chiefComplaint || symptomText.slice(0, 120),
      suggestedQuestions: Array.isArray(parsed.suggestedQuestions)
        ? parsed.suggestedQuestions.slice(0, 3)
        : [],
      degraded: false,
    };
  } catch (err) {
    console.error("Pre-visit LLM summary failed:", err.message);
    // Safe fallback: doctor still gets the raw symptoms and a default
    // "Medium" urgency so nothing is silently dropped or mis-triaged low.
    return {
      urgencyLevel: "Medium",
      chiefComplaint: symptomText.slice(0, 120),
      suggestedQuestions: [],
      degraded: true,
    };
  }
}

function stripMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1") // **bold**
    .replace(/\*(.*?)\*/g, "$1") // *italic*
    .replace(/^#{1,6}\s*/gm, "") // # headers
    .replace(/^\s*[-*]\s+/gm, "- ") // normalize bullet markers
    .replace(/\|/g, " ") // stray table pipes
    .replace(/^\s*-{2,}.*$/gm, "") // markdown table separator rows (---|---)
    .replace(/[ \t]{2,}/g, " ") // collapse extra spaces left by pipe removal
    .replace(/\n{3,}/g, "\n\n") // collapse excess blank lines
    .trim();
}

/**
 * Post-visit summary: converts clinical notes into patient-friendly text
 * with medication schedule and follow-up steps.
 * Returns { summary, degraded }.
 */
export async function generatePostVisitSummary(clinicalNotes, prescription) {
  const prompt = `Convert these clinical notes into a patient-friendly summary
with a medication schedule and follow-up steps. Use plain, reassuring language
a non-medical person can understand. Keep it under 200 words.

IMPORTANT FORMATTING RULES: Write in plain text only. Do NOT use Markdown —
no asterisks for bold/italic, no # headers, no tables, no pipe characters.
Use simple sentences and, if listing medications, a plain line per item like
"Paracetamol 500mg — once a day for 5 days." Separate sections with a blank
line, not headers.

Clinical notes: ${clinicalNotes}

Prescription (structured): ${JSON.stringify(prescription || [])}`;

  try {
    const raw = await callGroq(prompt, { maxTokens: 500 });
    if (!raw.trim()) throw new Error("Empty LLM response");
    return { summary: stripMarkdown(raw.trim()), degraded: false };
  } catch (err) {
    console.error("Post-visit LLM summary failed:", err.message);
    // Fallback: show the raw notes AND a plain listing of the prescription
    // (medication, dosage, frequency, duration) so the patient still gets
    // the medically important details even when the AI rewrite is down.
    const medLines = (prescription || [])
      .map(
        (m) =>
          `- ${m.medication} (${m.dosage}), ${m.frequencyPerDay}x/day for ${m.durationDays} day(s)`
      )
      .join("\n");
    const medicationBlock = medLines
      ? `\n\nMedication schedule:\n${medLines}`
      : "";
    return {
      summary: `Summary generation is temporarily unavailable. Your doctor's raw notes: ${clinicalNotes}${medicationBlock}`,
      degraded: true,
    };
  }
}
