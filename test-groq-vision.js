const apiKey = process.env.GROQ_API_KEY;
async function test() {
  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.2-11b-vision-preview", // let's try llama-3.2-90b-vision-preview
      messages: [{ role: "user", content: "hello" }]
    })
  });
  console.log("Status:", resp.status);
  console.log("Body:", await resp.text());
}
test();
