import { handler } from "./netlify/functions/api.ts";

async function run() {
  const event = {
    httpMethod: "GET",
    path: "/.netlify/functions/api/healthz",
    headers: {},
    queryStringParameters: {},
    body: null,
  };
  
  const context = {};
  
  const response = await handler(event, context);
  console.log("Response:", response);
}

run();
