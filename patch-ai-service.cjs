const fs = require('fs');
const path = 'artifacts/api-server/src/lib/ai-service.ts';
let code = fs.readFileSync(path, 'utf8');

code = `export async function generateSitaResponse(systemInstruction: string, contents: any[]): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("AI_PROVIDER_NOT_CONFIGURED: GROQ_API_KEY is missing from the environment.");
  }

  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

  // Transform for OpenAI/Groq format
  const messages = [
    { role: "system", content: systemInstruction },
    ...contents.map((msg) => ({
      role: msg.role === "model" || msg.role === "assistant" ? "assistant" : "user",
      content: msg.parts[0].text
    }))
  ];

  try {
    const aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": \`Bearer \${apiKey}\`,
      },
      body: JSON.stringify({
        model: model,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      const errBody = await aiResponse.text();
      console.warn(\`[SITA AI] Groq API returned error for model \${model}:\`, aiResponse.status, errBody);
      
      let errorCode = "AI_PROVIDER_ERROR";
      let errorMsg = \`AI Provider Error \${aiResponse.status}\`;

      if (aiResponse.status === 404 && (errBody.includes("does not exist") || errBody.includes("model_not_found"))) {
        errorCode = "AI_MODEL_UNAVAILABLE";
        errorMsg = \`Model \${model} not found\`;
      } else if (errBody.includes("decommissioned") || errBody.includes("model_decommissioned")) {
        errorCode = "AI_MODEL_UNAVAILABLE";
        errorMsg = "The requested AI model has been decommissioned by the provider.";
      }
      
      const error = new Error(errorCode + ": " + errorMsg);
      (error as any).status = aiResponse.status;
      (error as any).body = errBody;
      throw error;
    }

    const aiData = (await aiResponse.json()) as any;
    const reply = aiData?.choices?.[0]?.message?.content?.trim();
    return (
      reply ||
      "I hear you. While I process your thoughts, remember to prioritize your rest, hydration, and well-being today."
    );
  } catch (err: any) {
    console.error("[SITA AI] Groq fetch failed:", err);
    throw err;
  }
}
`;

fs.writeFileSync(path, code);
