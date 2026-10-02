// Renders public/og.png (published as og.jpg) — the link preview for messengers and social networks (1200×630) —
// from the running app itself, so it uses the real map, glass material and font.
// Usage: pnpm dev (with dev map data), then: node scripts/render-og.mjs [http://localhost:5173]
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const base = process.argv[2] ?? 'http://localhost:5173';
const png = fileURLToPath(new URL('../public/og.png', import.meta.url));

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
  locale: 'ru-RU',
  colorScheme: 'light',
});
await page.goto(`${base}/#map=14.1/55.7525/37.6345`);
await page.waitForSelector('.maplibregl-map[data-ready="true"]');
await page.evaluate(() => {
  for (const el of document.querySelectorAll('.search-slot, .sheet, .corner, .no-detail')) {
    el.setAttribute('hidden', '');
    el.style.display = 'none';
  }
  const card = document.createElement('div');
  card.className = 'glass glass-panel';
  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:26px">
      <img src="/icons/icon-512.png" width="104" height="104" alt=""
        style="border-radius:26px;box-shadow:0 10px 30px rgb(11 79 168 / .35)">
      <div style="font-size:88px;font-weight:800;letter-spacing:-4px;line-height:1">Veil</div>
    </div>
    <div style="margin-top:30px;font-size:34px;font-weight:600;line-height:1.3">
      Приватная карта мира
    </div>
    <div style="margin-top:10px;font-size:24px;line-height:1.45;color:var(--color-text-muted)">
      Без аккаунтов, cookies и слежки.<br>Офлайн-карты · поиск · OpenStreetMap
    </div>`;
  Object.assign(card.style, {
    position: 'absolute',
    left: '64px',
    top: '72px',
    zIndex: '10',
    width: '660px',
    padding: '48px 52px',
    borderRadius: '44px',
    color: 'var(--color-text)',
    fontFamily: 'var(--font-body)',
  });
  document.body.append(card);
});
await page.waitForTimeout(800);
await page.screenshot({ path: png });
await browser.close();
console.log(
  `${png} — convert to public/og.jpg: sips -s format jpeg -s formatOptions 82 public/og.png --out public/og.jpg`,
);
