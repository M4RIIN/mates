import { createServer } from "node:http";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const isDev = process.argv.includes("--dev");
const baseDir = path.join(rootDir, isDev ? "src" : "dist");
const port = Number.parseInt(process.env.PORT ?? (isDev ? "4321" : "8080"), 10);

await access(baseDir);

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"]
]);

createServer(async (request, response) => {
  try {
    const requestPath = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`).pathname;
    const safePath = requestPath === "/" ? "/index.html" : requestPath;
    const filePath = path.join(baseDir, safePath);
    const extension = path.extname(filePath);
    const contentType = mimeTypes.get(extension) ?? "application/octet-stream";
    const file = await readFile(filePath).catch(() => null);

    if (file === null) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, { "content-type": contentType });
    response.end(file);
  } catch (error) {
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end(`Server error: ${error instanceof Error ? error.message : "unknown error"}`);
  }
}).listen(port, () => {
  console.log(`Landing server running on http://localhost:${port} from ${baseDir}`);
});
