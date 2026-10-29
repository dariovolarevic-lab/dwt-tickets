import path from "node:path";
import { readFile } from "node:fs/promises";
import { Font } from "@react-pdf/renderer";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Roboto covers Croatian characters (č, ć, đ, š, ž) which the built-in PDF fonts lack.
// The TTFs live in public/fonts: a Worker has no filesystem, so it reads them from its static assets;
// plain Node (`next dev`) reads them from disk.
async function loadFont(file: string): Promise<Buffer> {
  const assets = getCloudflareContext().env.ASSETS;
  if (assets) {
    const res = await assets.fetch(new Request(`https://assets.invalid/fonts/${file}`));
    if (res.ok) return Buffer.from(await res.arrayBuffer());
  }
  return readFile(path.join(process.cwd(), "public", "fonts", file));
}

const asDataUrl = (font: Buffer) => `data:font/ttf;base64,${font.toString("base64")}`;

let registered: Promise<void> | undefined;

export function ensurePdfFonts() {
  registered ??= (async () => {
    const [regular, bold] = await Promise.all([loadFont("Roboto-Regular.ttf"), loadFont("Roboto-Bold.ttf")]);
    Font.register({
      family: "Roboto",
      fonts: [
        { src: asDataUrl(regular), fontWeight: 400 },
        { src: asDataUrl(bold), fontWeight: 700 },
      ],
    });
    Font.registerHyphenationCallback((word) => [word]);
  })().catch((e) => {
    registered = undefined;
    throw e;
  });
  return registered;
}
