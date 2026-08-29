export const config = {
  runtime: "edge",
};

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Access the secret key in Vercel Edge Runtime
  const apiKey =
    process.env.ANTHROPIC_API_KEY ||
    (globalThis as any).process?.env?.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: "Missing ANTHROPIC_API_KEY in Vercel Environment Variables.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const { messages, system, type } = await req.json();

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: type === "vision" ? 400 : 450,
        system,
        messages,
      }),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}