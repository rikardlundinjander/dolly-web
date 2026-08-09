// Genererar favicon-uppsättningen ur Dolly-märket (public/dolly-logo-single.svg).
// Körs vid behov, inte i bygget — ikonerna checkas in som statiska filer.
import sharp from "sharp";
import { writeFileSync } from "node:fs";

const OUT = process.argv[2];
if (!OUT) throw new Error("ange utkatalog");

// Märkets faktiska bounding box i källfilens koordinatsystem (0 0 37 37).
// Formerna sträcker sig till 36.465 × 36.023, inte till 37 — att utgå från
// viewBoxen hade gett en snedcentrerad ikon.
const BBOX = { w: 36.465, h: 36.023 };
const SHAPES = `
  <rect x="0.459473" y="0" width="23.0262" height="17.1257"/>
  <path d="M24.0615 8.56281L36.0064 0L36.0064 17.1257L24.0615 8.56281Z"/>
  <ellipse cx="8.74741" cy="27.2389" rx="8.74741" ry="8.78431"/>
  <circle cx="27.6808" cy="27.2389" r="8.78431"/>`;

/** Märket centrerat i en kvadrat, skalat så det upptar `ratio` av bredden. */
const mark = (size, ratio, fill) => {
  const s = (size * ratio) / BBOX.w;
  const tx = (size - BBOX.w * s) / 2;
  const ty = (size - BBOX.h * s) / 2;
  return `<g fill="${fill}" transform="translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${s.toFixed(5)})">${SHAPES}</g>`;
};

const svg = (size, ratio, fill, bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">` +
  (bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : "") +
  mark(size, ratio, fill) +
  `</svg>`;

const png = (size, ratio, fill, bg) =>
  sharp(Buffer.from(svg(size, ratio, fill, bg))).png().toBuffer();

// --- favicon.svg: transparent, byter färg med systemets läge -------------
const faviconSvg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">\n` +
  `  <style>\n` +
  `    g { fill: #111111 }\n` +
  `    @media (prefers-color-scheme: dark) { g { fill: #ffffff } }\n` +
  `  </style>\n  ` +
  mark(32, 0.875, "currentColor").replace(' fill="currentColor"', "") +
  `\n</svg>\n`;
writeFileSync(`${OUT}/favicon.svg`, faviconSvg);

// --- favicon.ico: 16/32/48 -----------------------------------------------
// Fallback för det som inte läser svg. ICO kan inte byta färg efter systemet,
// så den fastnar i den mörka varianten — den bakgrund den oftast hamnar mot.
const sizes = [16, 32, 48];
const buffers = await Promise.all(sizes.map((s) => png(s, 0.875, "#111111")));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserverat
header.writeUInt16LE(1, 2); // typ 1 = ikon
header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const entries = sizes.map((s, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(s, 0);
  e.writeUInt8(s, 1);
  e.writeUInt8(0, 2); // palettfärger
  e.writeUInt8(0, 3); // reserverat
  e.writeUInt16LE(1, 4); // planes
  e.writeUInt16LE(32, 6); // bitar per pixel
  e.writeUInt32LE(buffers[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += buffers[i].length;
  return e;
});
writeFileSync(`${OUT}/favicon.ico`, Buffer.concat([header, ...entries, ...buffers]));

// --- Hemskärmsikoner ------------------------------------------------------
// Här går transparens inte: iOS lägger svart bakom och Android en godtycklig
// platta. Sidans egen bakgrund med vitt märke är det som hänger ihop.
const BG = "#090909";
writeFileSync(`${OUT}/apple-touch-icon.png`, await png(180, 0.62, "#ffffff", BG));
writeFileSync(`${OUT}/icon-192.png`, await png(192, 0.62, "#ffffff", BG));
writeFileSync(`${OUT}/icon-512.png`, await png(512, 0.62, "#ffffff", BG));
// Maskable klipps till valfri form; märket hålls inom den säkra mittcirkeln.
writeFileSync(`${OUT}/icon-maskable-512.png`, await png(512, 0.46, "#ffffff", BG));

console.log("klart");
