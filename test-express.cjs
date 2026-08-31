const express = require("express");
const apiApp = express();
const router = express.Router();
router.get("/me", (req, res) => res.json({ success: true }));
apiApp.use("/api", router);

const app = express();
app.use("/.netlify/functions/api", (req, res, next) => {
  req.url = "/api" + req.url;
  apiApp(req, res, next);
});

const http = require("http");
const server = http.createServer(app);
server.listen(0, () => {
  const port = server.address().port;
  http.get(`http://localhost:${port}/.netlify/functions/api/me`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log("Status:", res.statusCode);
      server.close();
    });
  });
});
