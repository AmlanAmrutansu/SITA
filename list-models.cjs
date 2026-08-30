const fetch = require('node-fetch');
require('dotenv').config();

async function listModels() {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    console.log("No GROQ_API_KEY found");
    return;
  }
  try {
    const aiResponse = await fetch("https://api.groq.com/openai/v1/models", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${key}`,
      }
    });
    
    if (!aiResponse.ok) {
      console.log("Error:", aiResponse.status, await aiResponse.text());
    } else {
      const data = await aiResponse.json();
      console.log("Success! Models:", data.data.map(m => m.id).join(", "));
    }
  } catch(e) {
    console.error("Fetch failed:", e);
  }
}
listModels();
