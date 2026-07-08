import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

// Generates the Glasses app-icon + splash source images from an inline SVG.
// Run: node scripts/make-assets.mjs  (then: npx capacitor-assets generate --android)
//
// The mark is a pair of spectacles: white frame, royal-blue lenses, on black —
// the app palette exactly (black/white base, royal blue = primary).

const BLACK = "#000000";
const WHITE = "#FFFFFF";
const BLUE = "#2E5BFF";

// Glyph drawn in its own 840 x 294 coordinate box (bbox includes the stroke).
// Temples, then lenses, then the bridge arc on top.
const GLYPH_W = 840;
const GLYPH_H = 294;
const GLYPH = `
  <g fill="none" stroke="${WHITE}" stroke-width="34" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17 17 L90 60" />
    <path d="M823 17 L750 60" />
    <rect x="90" y="17" width="300" height="260" rx="70" fill="${BLUE}" />
    <rect x="450" y="17" width="300" height="260" rx="70" fill="${BLUE}" />
    <path d="M390 62 Q 420 24 450 62" />
  </g>`;

/** Square SVG with the glyph centred at `glyphWidth` px, over `bg` (or transparent). */
function svg(size, glyphWidth, bg) {
  const s = glyphWidth / GLYPH_W;
  const tx = (size - glyphWidth) / 2;
  const ty = (size - GLYPH_H * s) / 2;
  const back = bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : "";
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
       ${back}
       <g transform="translate(${tx} ${ty}) scale(${s})">${GLYPH}</g>
     </svg>`,
  );
}

const outDir = path.join(process.cwd(), "assets");
fs.mkdirSync(outDir, { recursive: true });

const write = async (name, buf) => {
  await sharp(buf).png().toFile(path.join(outDir, name));
  console.log("wrote assets/" + name);
};

// Adaptive-icon foreground must sit inside the centre ~66% safe zone
// (a 620px-wide glyph keeps every corner inside the mask circle).
await write("icon-only.png", svg(1024, 860, BLACK));
await write("icon-foreground.png", svg(1024, 620, null));
await write("icon-background.png", svg(1024, 0, BLACK));
await write("splash.png", svg(2732, 1000, BLACK));
await write("splash-dark.png", svg(2732, 1000, BLACK));
