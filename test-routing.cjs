const express = require("express");

const app = express();

const mockApiApp = (req, res) => {
  res.json({ routedUrl: req.url, originalUrl: req.originalUrl });
};

app.use((req, res, next) => {
  if (req.url.startsWith("/.netlify/functions/api")) {
    req.url = req.url.replace("/.netlify/functions/api", "/api");
  } else if (!req.url.startsWith("/api")) {
    req.url = "/api" + (req.url.startsWith("/") ? req.url : "/" + req.url);
  }
  
  mockApiApp(req, res);
});

const http = require("http");
const server = http.createServer(app);
server.listen(0, () => {
  const port = server.address().port;
  
  const testPath = (path) => {
    return new Promise((resolve) => {
      http.get(`http://localhost:${port}${path}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      });
    });
  };

  Promise.all([
    testPath("/.netlify/functions/api/me"),
    testPath("/api/me"),
    testPath("/.netlify/functions/api/chat"),
    testPath("/api/chat")
  ]).then((results) => {
    console.log("Routing Test Results:");
    console.log(results);
    server.close();
  });
});
