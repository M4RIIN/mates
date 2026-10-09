import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Hono } from "hono";
import type { AppBindings } from "../types.js";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../public/app");
const types: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json" };

export function registerWebAppRoutes(app: Hono<AppBindings>): void {
  app.get("/app", (context) => context.redirect("/app/"));
  app.get("/app/*", async (context) => {
    let relative: string;
    try { relative = decodeURIComponent(context.req.path.slice("/app/".length)); } catch { return context.notFound(); }
    const asset = relative.startsWith("_expo/") || relative.startsWith("assets/") || /\.(js|css|png|jpg|svg|woff2|json)$/.test(relative);
    const file = path.resolve(webRoot, asset ? relative : "index.html");
    if (!file.startsWith(webRoot + path.sep)) return context.notFound();
    const data = await readFile(file).catch(() => null);
    if (!data) return asset ? context.notFound() : context.text("Le parcours web est indisponible. Ouvre Mates ou réessaie plus tard.", 503);
    context.header("Content-Type", types[path.extname(file)] ?? "application/octet-stream");
    context.header("X-Content-Type-Options", "nosniff");
    context.header("Cache-Control", "no-cache");
    return context.body(new Uint8Array(data));
  });
}
