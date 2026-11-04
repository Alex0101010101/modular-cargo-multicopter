const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    if (url.pathname === "/api/contact") {
      const { name = "", email = "", message = "" } = body;
      if (
        typeof name !== "string" || name.length > 100 ||
        typeof email !== "string" || email.length > 200 ||
        typeof message !== "string" || message.length > 2000 ||
        !name.trim() || !email.trim() || !message.trim()
      ) return json({ error: "Invalid form data" }, 400);

      // Connect an email or form service here. Do not silently discard inquiries.
      // Example: forward to a reputable form provider using a server-side secret.
      console.log("Contact inquiry received", { name, email, message });
      return json({ ok: true });
    }

    if (url.pathname === "/api/chat") {
      const question = body.question;
      if (typeof question !== "string" || !question.trim() || question.length > 500) {
        return json({ error: "Invalid question" }, 400);
      }
      if (!env.OPENAI_API_KEY) return json({ error: "Chat not configured" }, 503);

      const instructions = `
You are the website Q&A assistant for an early-stage modular electric cargo multicopter project.
Use only the facts below. Be concise, honest, and cautious.
Do not invent technical specifications, performance, customers, test results, certifications,
patent status, timelines, or availability. Do not provide aircraft construction instructions,
flight-test instructions, or safety-critical engineering advice.
For technical, airworthiness, legal, or regulatory decisions, direct the visitor to qualified
professionals and the relevant aviation authority.
State clearly that this is an early-stage concept, not certified and not available for commercial
operations. The initial scope is uncrewed cargo; passenger operations are not proposed.

Approved facts:
- Inventor: Alexander Domashev.
- Project location: Los Angeles, USA.
- The concept explores a modular frame and electric propulsion for agricultural cargo logistics.
- Technical and commercial feasibility have not been established.
- The project seeks discussions with farms, buyers, logistics providers, and qualified advisers.
`;

      const apiResponse = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || "gpt-4.1-mini",
          instructions,
          input: question,
          max_output_tokens: 250
        })
      });

      if (!apiResponse.ok) return json({ error: "Assistant unavailable" }, 502);

      const result = await apiResponse.json();
      const answer =
        result.output_text ||
        result.output?.flatMap(item => item.content || [])
          .find(item => item.type === "output_text")?.text ||
        "I couldn’t generate a response. Please contact the project team.";

      return json({ answer });
    }

    return json({ error: "Not found" }, 404);
  }
};
