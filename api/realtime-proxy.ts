import { WebSocket } from "ws";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.upgrade !== "websocket") {
    res.status(400).send("Expected WebSocket");
    return;
  }

  const upgrade = (res as any).socket.server;
  const clientSocket = (res as any).socket;

  upgrade.on("upgrade", async (request: any, socket: any, head: any) => {
    // 1. Créer une session OpenAI Realtime
    const sessionRes = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "OpenAI-Beta": "realtime=v1",
      },
    });

    const session = await sessionRes.json();
    const wsUrl = session.websocket_url;

    // 2. Ouvrir un WebSocket vers OpenAI
    const openaiWs = new WebSocket(wsUrl, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "OpenAI-Beta": "realtime=v1",
      },
    });

    // 3. Accepter le WS du client
    const clientWs = new WebSocket(null);
    (clientWs as any)._socket = socket;

    // 4. Relai bidirectionnel
    clientWs.on("message", (msg) => openaiWs.send(msg));
    openaiWs.on("message", (msg) => clientWs.send(msg));

    clientWs.on("close", () => openaiWs.close());
    openaiWs.on("close", () => clientWs.close());
  });
}
