import path from "node:path";
import { existsSync } from "node:fs";
import indexHtml from "../client/index.html";
import { handleAnalyze } from "./routes/analyze";
import { checkRateLimit, getClientKey } from "./services/rateLimiter";
import { startPeriodicCleanup } from "./services/cleanupService";

const isProduction = process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT ?? 3000);
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
const RATE_LIMIT_PER_MINUTE = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 20);
const ALLOWED_ORIGIN = process.env.CORS_ALLOWED_ORIGIN ?? "*";

const distDir = path.resolve(import.meta.dir, "../../dist");
const hasProductionBuild = isProduction && existsSync(path.join(distDir, "index.html"));

startPeriodicCleanup(UPLOAD_DIR);

function withSecurityHeaders(response: Response): Response {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data: https://*.tile.openstreetmap.org; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'",
  );
  response.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

async function serveStatic(pathname: string): Promise<Response | null> {
  if (!hasProductionBuild) return null;
  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(distDir, safePath === "/" ? "index.html" : safePath);
  if (!filePath.startsWith(distDir)) return null;

  const file = Bun.file(filePath);
  if (await file.exists()) return new Response(file);

  // SPA fallback so client-side routes (if any) still resolve.
  const fallback = Bun.file(path.join(distDir, "index.html"));
  if (await fallback.exists()) return new Response(fallback);
  return null;
}

const apiRoutes = {
  "/api/health": () => withSecurityHeaders(Response.json({ status: "ok" })),

  "/api/analyze": {
    OPTIONS: () => withSecurityHeaders(new Response(null, { status: 204 })),
    POST: async (req: Request) => {
      const clientKey = getClientKey(req, server);
      if (!checkRateLimit(clientKey, RATE_LIMIT_PER_MINUTE)) {
        return withSecurityHeaders(
          Response.json(
            { success: false, error: "Too many requests. Please try again shortly.", reasons: ["Rate limit exceeded"] },
            { status: 429 },
          ),
        );
      }
      const response = await handleAnalyze(req);
      return withSecurityHeaders(response);
    },
  },
};

const server = Bun.serve({
  port: PORT,
  routes: {
    ...apiRoutes,
    // In dev, Bun's HTML import bundles on the fly with HMR. In production,
    // `false` disables this route so every request falls through to
    // `fetch()` below, which serves the prebuilt `dist/` bundle instead.
    "/": hasProductionBuild ? false : indexHtml,
  },

  async fetch(req) {
    if (hasProductionBuild) {
      const url = new URL(req.url);
      const staticResponse = await serveStatic(url.pathname);
      if (staticResponse) return withSecurityHeaders(staticResponse);
    }
    return withSecurityHeaders(new Response("Not Found", { status: 404 }));
  },

  error(error) {
    console.error("Unhandled server error:", error);
    return withSecurityHeaders(
      Response.json({ success: false, error: "Internal server error", reasons: [] }, { status: 500 }),
    );
  },

  development: isProduction ? false : { hmr: true, console: true },
});

console.log(`Media Metadata Analyzer listening on http://localhost:${server.port}`);
if (hasProductionBuild) console.log(`Serving prebuilt static assets from ${distDir}`);
