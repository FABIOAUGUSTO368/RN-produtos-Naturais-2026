import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleApiRequest } from "./api-handler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getStaticDir() {
  return process.env.NODE_ENV === "production"
    ? path.resolve(__dirname, "public")
    : path.resolve(__dirname, "..", "dist", "public");
}

function normalizeBody(body: unknown) {
  if (typeof body === "string") {
    return body;
  }

  if (body === undefined) {
    return undefined;
  }

  return JSON.stringify(body);
}

async function forwardRequest(req: express.Request, res: express.Response) {
  const apiResponse = await handleApiRequest({
    method: req.method,
    url: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
    headers: req.headers as Record<string, string | string[] | undefined>,
    body: normalizeBody(req.body),
  });

  if (!apiResponse) {
    return false;
  }

  res.status(apiResponse.status).set(apiResponse.headers).send(apiResponse.body);
  return true;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  app.use(async (req, res, next) => {
    if (!req.originalUrl.startsWith("/api/")) {
      return next();
    }

    try {
      const handled = await forwardRequest(req, res);
      if (!handled) {
        next();
      }
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Erro inesperado no servidor.",
      });
    }
  });

  const staticDir = getStaticDir();
  app.use(express.static(staticDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });

  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
