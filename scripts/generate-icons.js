import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const svgPath = path.resolve('public/icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

async function generate() {
  console.log('Generating PWA PNG icons from icon.svg...');

  // 192x192 for Chrome PWA criteria
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.resolve('public/pwa-192x192.png'));
  console.log('Created public/pwa-192x192.png');

  // 512x512 for Chrome splash screen & high-res
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.resolve('public/pwa-512x512.png'));
  console.log('Created public/pwa-512x512.png');

  // 180x180 Apple Touch Icon for iOS Safari
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.resolve('public/apple-touch-icon.png'));
  console.log('Created public/apple-touch-icon.png');

  // 64x64 favicon
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.resolve('public/favicon.png'));
  console.log('Created public/favicon.png');

  // Maskable 512x512 (with safe margins)
  // Maskable icons need 10% padding so round icons don't clip the crescent or dome
  await sharp(svgBuffer)
    .resize(420, 420)
    .extend({
      top: 46,
      bottom: 46,
      left: 46,
      right: 46,
      background: { r: 7, g: 19, b: 24, alpha: 1 } // #071318 app theme background
    })
    .png()
    .toFile(path.resolve('public/pwa-maskable-512x512.png'));
  console.log('Created public/pwa-maskable-512x512.png');

  console.log('All icons generated successfully!');
}

generate().catch(console.error);
