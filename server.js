import express from "express";
import cors from "cors";

const app = express();

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://vittalli.com";
app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json({ limit: "64kb" }));

app.get("/health", (req, res) => res.json({ ok: true }));

app.post("/v1/vittinho/chat", async (req, res) => {
  const { message, sessionId, pageUrl, timestamp } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ reply: "Me manda sua pergunta, por favor 😊" });
  }

  const n8nUrl = process.env.N8N_WEBHOOK_URL; // https://webhook.agentdoart.cloud/webhook/v1/vittinho/chat
  const n8nToken = process.env.N8N_BEARER_TOKEN; // só o token (sem Bearer)

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const r = await fetch(n8nUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${n8nToken}`,
      },
      body: JSON.stringify({
        message,
        sessionId,
        pageUrl,
        timestamp: timestamp || new Date().toISOString(),
      }),
      signal: controller.signal,
    });

    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}

    if (!r.ok || !json?.reply) {
      return res.status(200).json({ reply: "Não consegui responder agora. Tente novamente em instantes." });
    }

    return res.json({ reply: String(json.reply) });
  } catch {
    return res.status(200).json({ reply: "Não consegui responder agora. Tente novamente em instantes." });
  } finally {
    clearTimeout(timeout);
  }
});

const port = process.env.PORT || 80;
app.listen(port, () => console.log("Vittinho proxy on", port));
