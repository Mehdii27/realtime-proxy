import type { VercelRequest, VercelResponse } from "@vercel/node";
import WebSocket from "ws";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (
    !req.headers.upgrade ||
    req.headers.upgrade.toLowerCase() !== "websocket"
  ) {
    return res.status(400).send("Expected WebSocket upgrade");
  }

  const upstream = new WebSocket(
    "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17",
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "OpenAI-Beta": "realtime=v1",
      },
    },
  );

  // @ts-ignore
  const client = new WebSocket(req);

  upstream.on("open", () => console.log("[Proxy] Connected to OpenAI"));
  upstream.on("message", (msg) => client.send(msg));
  upstream.on("close", () => client.close());
  upstream.on("error", (err) => console.error("[Upstream error]", err));

  client.on("message", (msg) => upstream.send(msg));
  client.on("close", () => upstream.close());
  client.on("error", (err) => console.error("[Client error]", err));
}
