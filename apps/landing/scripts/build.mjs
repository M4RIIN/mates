import { cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const srcDir = path.join(rootDir, "src");
const distDir = path.join(rootDir, "dist");

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });
await cp(srcDir, distDir, {
  recursive: true,
  filter(source) {
    return !path.basename(source).startsWith("._");
  }
});
await removeAppleDoubleFiles(distDir);

console.log(`Landing build generated in ${distDir}`);

async function removeAppleDoubleFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        await removeAppleDoubleFiles(entryPath);
        return;
      }

      if (entry.name.startsWith("._")) {
        await rm(entryPath, { force: true });
      }
    })
  );
}
