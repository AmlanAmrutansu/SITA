import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
// Transport removed to prevent Netlify serverless bundle crashes
  // (process.env.NODE_ENV check is sometimes unreliable in Lambda runtime)
  // ...(isProduction
  //   ? {}
  //   : {
  //       transport: {
  //         target: "pino-pretty",
  //         options: { colorize: true },
  //       },
  //     }),
});
