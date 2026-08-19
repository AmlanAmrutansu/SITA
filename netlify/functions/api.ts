import serverless from "serverless-http";
import express from "express";
import apiApp from "../../artifacts/api-server/src/app";

const app = express();
app.use("/.netlify/functions/api", (req, res, next) => {
  req.url = "/api" + req.url;
  apiApp(req, res, next);
});

export const handler = serverless(app);
