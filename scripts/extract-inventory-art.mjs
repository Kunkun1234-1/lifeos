import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Extract the approved artwork, without generating new variants of its designs.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pack = path.join(root, "public/art-packs/anime-rpg-v1");
const sheet = path.join(pack, "sources/approved-inventory-sheet.png");
const slugs = [
  "gold", "gems", "fate", "freeze", "moon-tea",
  "starlit-treat", "free-time-ticket", "dream-rest", "azure-book", "sakura-voucher",
  "cloud-healing", "crystal-tool", "horizon-map", "artisan-gift", "aurora-workshop",
  "astral-pass", "frame", "crown", "book", "gift",
];
const columns = [[20, 280], [296, 554], [570, 830], [846, 1107], [1122, 1387]];
const rows = [[27, 238], [294, 503], [563, 766], [823, 1036]];
const metadata = await sharp(sheet).metadata();
if (metadata.width !== 1402 || metadata.height !== 1122) {
  throw new Error("Crop coordinates require the approved 1402 × 1122 sheet.");
}
await fs.mkdir(path.join(pack, "items"), { recursive: true });

function median(values) {
  return values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
}

const manifest = [];
for (let index = 0; index < slugs.length; index++) {
  const [left, right] = columns[index % 5];
  const [top, bottom] = rows[Math.floor(index / 5)];
  const crop = { left: left + 8, top: top + 8, width: right - left - 16, height: bottom - top - 8 };
  const { data: rgb, info } = await sharp(sheet).extract(crop).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const count = width * height;
  const distances = new Float32Array(count);
  const background = new Float32Array(count * 3);

  // Sample the empty sides of each tile. The purple backdrop varies by row;
  // interpolating those samples preserves the original painted contours.
  for (let y = 0; y < height; y++) {
    const ends = [0, width - 5].map((start) => [0, 1, 2].map((channel) => {
      const samples = [];
      for (let dy = -2; dy <= 2; dy++) {
        const sy = Math.max(0, Math.min(height - 1, y + dy));
        for (let x = start; x < start + 5; x++) samples.push(rgb[(sy * width + x) * 3 + channel]);
      }
      return median(samples);
    }));
    for (let x = 0; x < width; x++) {
      const pixel = y * width + x;
      let squared = 0;
      for (let channel = 0; channel < 3; channel++) {
        const bg = ends[0][channel] + (ends[1][channel] - ends[0][channel]) * x / (width - 1);
        background[pixel * 3 + channel] = bg;
        squared += (rgb[pixel * 3 + channel] - bg) ** 2;
      }
      distances[pixel] = Math.sqrt(squared);
    }
  }

  // Flood only the connected exterior; purple paint inside an object stays.
  // The frame and circlet also have intentional open centers.
  const removed = new Uint8Array(count);
  const queue = new Int32Array(count);
  let head = 0;
  let tail = 0;
  const add = (pixel) => {
    if (!removed[pixel] && distances[pixel] < 19) {
      removed[pixel] = 1;
      queue[tail++] = pixel;
    }
  };
  for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { add(y * width); add(y * width + width - 1); }
  if (["frame", "crown"].includes(slugs[index])) add(Math.floor(height / 2) * width + Math.floor(width / 2));
  while (head < tail) {
    const pixel = queue[head++];
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (x > 0) add(pixel - 1);
    if (x < width - 1) add(pixel + 1);
    if (y > 0) add(pixel - width);
    if (y < height - 1) add(pixel + width);
  }

  const rgba = Buffer.alloc(count * 4);
  for (let pixel = 0; pixel < count; pixel++) {
    rgb.copy(rgba, pixel * 4, pixel * 3, pixel * 3 + 3);
    if (!removed[pixel]) {
      // Keep the body opaque; soften only the antialiased exterior contour.
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      const edge = (x > 0 && removed[pixel - 1]) || (x < width - 1 && removed[pixel + 1])
        || (y > 0 && removed[pixel - width]) || (y < height - 1 && removed[pixel + width]);
      const alpha = edge ? Math.min(1, Math.max(0.2, (distances[pixel] - 12) / 22)) : 1;
      rgba[pixel * 4 + 3] = Math.round(alpha * 255);
      if (alpha < 1) {
        for (let channel = 0; channel < 3; channel++) {
          const bg = background[pixel * 3 + channel];
          rgba[pixel * 4 + channel] = Math.max(0, Math.min(255, Math.round((rgb[pixel * 3 + channel] - bg * (1 - alpha)) / alpha)));
        }
      }
    }
  }
  // Remove tiny disconnected background flecks but keep attached details.
  const visited = new Uint8Array(count);
  for (let start = 0; start < count; start++) {
    if (visited[start] || !rgba[start * 4 + 3]) continue;
    head = 0; tail = 1; queue[0] = start; visited[start] = 1;
    while (head < tail) {
      const pixel = queue[head++];
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      const neighbors = [];
      if (x > 0) neighbors.push(pixel - 1);
      if (x < width - 1) neighbors.push(pixel + 1);
      if (y > 0) neighbors.push(pixel - width);
      if (y < height - 1) neighbors.push(pixel + width);
      for (const neighbor of neighbors) {
        if (!visited[neighbor] && rgba[neighbor * 4 + 3]) { visited[neighbor] = 1; queue[tail++] = neighbor; }
      }
    }
    if (tail < 64) for (let i = 0; i < tail; i++) rgba[queue[i] * 4 + 3] = 0;
  }
  const output = path.join(pack, "items", `${slugs[index]}.webp`);
  const trimmed = await sharp(rgba, { raw: { width, height, channels: 4 } }).trim({ threshold: 2 }).png().toBuffer();
  const scaled = await sharp(trimmed).resize(224, 224, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
  const scaledInfo = await sharp(scaled).metadata();
  const horizontal = 256 - scaledInfo.width;
  const vertical = 256 - scaledInfo.height;
  await sharp(scaled).extend({
    top: Math.floor(vertical / 2), bottom: Math.ceil(vertical / 2),
    left: Math.floor(horizontal / 2), right: Math.ceil(horizontal / 2),
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  }).webp({ lossless: true }).toFile(output);
  manifest.push({ id: slugs[index], file: `items/${slugs[index]}.webp`, sourceCrop: crop });
  console.log(`${slugs[index]}: extracted from approved sheet`);
}
await fs.writeFile(path.join(pack, "sources/extraction.json"), `${JSON.stringify({ source: "approved-inventory-sheet.png", items: manifest }, null, 2)}\n`);
