const { handler } = require("./dist-netlify-api.cjs");

async function run() {
  const event1 = {
    path: "/api/me",
    httpMethod: "GET",
    headers: {},
    queryStringParameters: {}
  };
  const event2 = {
    path: "/api/chat",
    httpMethod: "POST",
    headers: {},
    queryStringParameters: {}
  };
  
  const res1 = await handler(event1, {});
  console.log("/api/me status:", res1.statusCode);
  
  const res2 = await handler(event2, {});
  console.log("/api/chat status:", res2.statusCode);
}
run();
