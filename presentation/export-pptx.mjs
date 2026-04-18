import puppeteer from 'puppeteer';
import pptxgen from 'pptxgenjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOTAL_SLIDES = 7;
const URL = 'http://localhost:4200';
const OUTPUT = path.join(__dirname, 'CollabNotes_Presentation.pptx');
const TMP_DIR = path.join(__dirname, '_tmp_slides');

// Ensure tmp dir exists
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

console.log('🚀 CollabNotes → PPTX Exporter\n');

const browser = await puppeteer.launch({
  headless: true,
  defaultViewport: { width: 1920, height: 1080 },
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });

console.log(`📂 Opening  ${URL} …`);
await page.goto(URL, { waitUntil: 'networkidle0' });

// Wait for fonts
await page.evaluate(() => document.fonts.ready);
await new Promise(r => setTimeout(r, 1200));

const screenshots = [];

for (let i = 0; i < TOTAL_SLIDES; i++) {
  // Navigate to slide i via dot click (index i)
  await page.evaluate((idx) => {
    const dots = document.querySelectorAll('.dot');
    if (dots[idx]) dots[idx].click();
  }, i);

  // Wait for animation to finish
  await new Promise(r => setTimeout(r, 700));

  const imgPath = path.join(TMP_DIR, `slide-${i + 1}.png`);
  await page.screenshot({ path: imgPath, type: 'png', fullPage: false });
  screenshots.push(imgPath);
  console.log(`  ✅ Slide ${i + 1}/${TOTAL_SLIDES} captured`);
}

await browser.close();
console.log('\n📊 Building PPTX …');

const prs = new pptxgen();
prs.layout = 'LAYOUT_WIDE'; // 16:9 widescreen

// Slide titles for logging
const titles = [
  'Title / Hero',
  'Introduction',
  'Uniqueness',
  'Working Model',
  'Features',
  'Architecture',
  'Conclusion',
];

for (let i = 0; i < TOTAL_SLIDES; i++) {
  const slide = prs.addSlide();
  slide.addImage({
    path: screenshots[i],
    x: 0, y: 0,
    w: '100%', h: '100%',
    sizing: { type: 'contain', w: '100%', h: '100%' },
  });
  console.log(`  ✅ Slide ${i + 1}: ${titles[i]}`);
}

await prs.writeFile({ fileName: OUTPUT });
console.log(`\n🎉 Saved → ${OUTPUT}`);

// Clean up tmp screenshots
fs.rmSync(TMP_DIR, { recursive: true, force: true });
console.log('🧹 Cleaned up temporary screenshots.');
