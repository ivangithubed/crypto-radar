// NFR-5: сумарний JavaScript, який завантажує головний екран, ≤ 150 кБ після gzip.
// Рахує скрипти й modulepreload з dist/index.html (після `pnpm build`).
// Необов'язковий аргумент — інший ліміт у кБ (лише для перевірки, що поріг спрацьовує).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const DIST = "dist";
const BASE = "/crypto-radar/";
const LIMIT_KB = Number(process.argv[2] ?? 150);

const html = readFileSync(join(DIST, "index.html"), "utf8");
const urls = [
  ...html.matchAll(/<script[^>]*\ssrc="([^"]+\.js)"/g),
  ...html.matchAll(/<link[^>]*rel="modulepreload"[^>]*href="([^"]+\.js)"/g),
].map((match) => match[1]);

if (urls.length === 0) {
  console.error("NFR-5: у dist/index.html не знайдено жодного JS-файлу");
  process.exit(1);
}

let totalBytes = 0;
for (const url of new Set(urls)) {
  const file = join(DIST, url.startsWith(BASE) ? url.slice(BASE.length) : url);
  const gzipBytes = gzipSync(readFileSync(file)).length;
  totalBytes += gzipBytes;
  console.log(`${(gzipBytes / 1000).toFixed(2).padStart(9)} kB gzip  ${file}`);
}

const totalKb = totalBytes / 1000;
console.log(`NFR-5: JS головного екрана ${totalKb.toFixed(2)} kB gzip (ліміт ${LIMIT_KB} kB)`);
if (totalKb > LIMIT_KB) {
  console.error("NFR-5: ліміт перевищено");
  process.exit(1);
}
