import { generateSitaResponse } from "./artifacts/api-server/src/lib/ai-service";

async function main() {
  console.log("Testing generateSitaResponse directly...");
  try {
    const reply = await generateSitaResponse("You are a helpful assistant.", [{ role: "user", parts: [{ text: "Hello! What model are you running on?" }] }]);
    console.log("SUCCESS! Reply:");
    console.log(reply);
  } catch (err) {
    console.error("FAILED:", err);
  }
}
main();
