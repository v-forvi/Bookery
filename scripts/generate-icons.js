#!/usr/bin/env node

/**
 * Icon Generation Script for Bookery PWA
 *
 * This script generates PNG icons from the SVG source.
 * Requires: sharp (npm install sharp)
 *
 * Usage: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const publicDir = path.join(__dirname, '../public');
const svgPath = path.join(publicDir, 'icon.svg');

async function generateIcons() {
  console.log('🎨 Generating PWA icons...');

  // Check if sharp is installed
  let sharp;
  try {
    sharp = require('sharp');
  } catch (error) {
    console.error('❌ sharp not found. Install it with: npm install sharp');
    console.log('\n💡 Alternative: Use an online tool like https://realfavicongenerator.net/');
    console.log('   Upload icon.svg and download the generated icons.');
    process.exit(1);
  }

  // Read SVG
  const svgBuffer = fs.readFileSync(svgPath);

  // Generate each size
  for (const size of sizes) {
    const outputPath = path.join(publicDir, `icon-${size}x${size}.png`);

    await sharp(svgBuffer)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(outputPath);

    console.log(`✅ Generated icon-${size}x${size}.png`);
  }

  // Generate favicon.ico (multiple sizes in one file)
  // For simplicity, we'll just create a 32x32 favicon.png
  await sharp(svgBuffer)
    .resize(32, 32, { fit: 'cover' })
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));

  console.log('✅ Generated favicon.png');

  console.log('\n🎉 All icons generated successfully!');
  console.log('\n📝 Next steps:');
  console.log('   1. Update manifest.json if needed');
  console.log('   2. Test PWA install on mobile device');
  console.log('   3. Verify icons appear correctly');
}

generateIcons().catch(console.error);
