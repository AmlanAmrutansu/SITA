import serverless from "serverless-http";
import express from "express";
import apiApp from "../../artifacts/api-server/src/app";

const app = express();

// Standardize the URL so it always starts with /api before handing off to apiApp
app.use((req, res, next) => {
  if (req.url.startsWith("/.netlify/functions/api")) {
    req.url = req.url.replace("/.netlify/functions/api", "/api");
  } else if (!req.url.startsWith("/api")) {
    req.url = "/api" + (req.url.startsWith("/") ? req.url : "/" + req.url);
  }
  
  apiApp(req, res, next);
});

export const handler = serverless(app);
