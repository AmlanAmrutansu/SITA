import path from "node:path";
import express from "express";
import { createServer as createViteServer } from "vite";
import apiApp from "./artifacts/api-server/src/app";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Mount API routes first
  app.use(apiApp);

  // Vite dev middleware or static serving
  if (process.env.NODE_ENV !== "production") {
    const sitaRoot = path.resolve(process.cwd(), "artifacts/sita-health");
    const vite = await createViteServer({
      configFile: path.resolve(sitaRoot, "vite.config.ts"),
      root: sitaRoot,
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "artifacts/sita-health/dist/public");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
