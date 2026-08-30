const fetch = require('node-fetch');

async function testGroq() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.log("No GROQ_API_KEY found in process.env - trying to load from .env");
    require('dotenv').config();
  }
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    console.log("No GROQ_API_KEY found after dotenv");
    return;
  }
  try {
    const aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "Hello SITA" }],
        temperature: 0.7,
        max_tokens: 100,
      }),
    });
    
    if (!aiResponse.ok) {
      console.log("Error:", aiResponse.status, await aiResponse.text());
    } else {
      const data = await aiResponse.json();
      console.log("Success! Response:", data.choices[0].message.content);
    }
  } catch(e) {
    console.error("Fetch failed:", e);
  }
}
testGroq();
