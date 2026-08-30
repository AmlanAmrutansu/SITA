const apiKey = process.env.GROQ_API_KEY;
async function test() {
  const resp = await fetch("https://api.groq.com/openai/v1/models", {
    headers: {
      "Authorization": `Bearer ${apiKey}`
    }
  });
  const data = await resp.json();
  const models = data.data.map(m => m.id);
  console.log("All models:", models);
}
test();
