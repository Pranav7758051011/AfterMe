const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '..', 'apps', 'web', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

function createSvg(size) {
  const r = size * 0.22;
  const fontSize = size * 0.52;
  return `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#3b82f6" />
        <stop offset="50%" stop-color="#4f46e5" />
        <stop offset="100%" stop-color="#1e1b4b" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="8" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <rect width="${size}" height="${size}" rx="${r}" fill="url(#bgGrad)" />
    <circle cx="${size/2}" cy="${size/2}" r="${size*0.38}" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="${size*0.02}" />
    <text x="50%" y="54%" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${fontSize}" text-anchor="middle" dominant-baseline="central">🧠</text>
  </svg>`;
}

async function generate() {
  const sizes = [192, 512, 180];
  for (const size of sizes) {
    const svg = Buffer.from(createSvg(size));
    const filename = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`;
    const dest = path.join(publicDir, filename);
    await sharp(svg).png().toFile(dest);
    console.log(`✅ Generated ${filename} (${size}x${size})`);
  }

  // Also create favicon.png (32x32)
  const faviconSvg = Buffer.from(createSvg(32));
  await sharp(faviconSvg).png().toFile(path.join(publicDir, 'favicon.png'));
  console.log('✅ Generated favicon.png');
}

generate().catch(console.error);
