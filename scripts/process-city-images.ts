/**
 * Process City Images for City Tinder
 * 
 * This script processes raw city photos and outputs them in a consistent format
 * for use in the City Tinder feature.
 * 
 * Usage:
 *   npx tsx scripts/process-city-images.ts
 * 
 * Input:  public/cities/raw/  (place your source images here)
 * Output: public/cities/      (processed images saved here)
 * 
 * Expected input filenames (case-insensitive, any common image format):
 *   - new-york-city.jpg (or .png, .webp, .jpeg)
 *   - san-francisco.jpg
 *   - miami.jpg
 *   - denver.jpg
 *   - phoenix.jpg
 *   - boston.jpg
 *   - nashville.jpg
 *   - portland.jpg
 *   - chicago.jpg
 *   - austin.jpg
 * 
 * Output format:
 *   - 640x480 JPEG at 85% quality
 *   - Maintains aspect ratio, crops to fill
 */

import sharp from "sharp";
import * as fs from "fs";
import * as path from "path";

const RAW_DIR = path.join(process.cwd(), "public/cities/raw");
const OUTPUT_DIR = path.join(process.cwd(), "public/cities");

const TARGET_WIDTH = 640;
const TARGET_HEIGHT = 480;
const JPEG_QUALITY = 85;

// The "Dirty Dozen" - 12 cities for City Tinder
const EXPECTED_CITIES = [
  "new-york-city",
  "san-francisco",
  "miami",
  "denver",
  "boise",
  "minneapolis",
  "salt-lake-city",
  "new-orleans",
  "seattle",
  "las-vegas",
  "boston",
  "houston",
];

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".tiff"];

async function processImage(inputPath: string, outputPath: string): Promise<void> {
  await sharp(inputPath)
    .resize(TARGET_WIDTH, TARGET_HEIGHT, {
      fit: "cover",
      position: "center",
    })
    .jpeg({
      quality: JPEG_QUALITY,
      mozjpeg: true,
    })
    .toFile(outputPath);
}

function findImageFile(cityId: string): string | null {
  for (const ext of IMAGE_EXTENSIONS) {
    const filePath = path.join(RAW_DIR, `${cityId}${ext}`);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
    // Also check uppercase extensions
    const filePathUpper = path.join(RAW_DIR, `${cityId}${ext.toUpperCase()}`);
    if (fs.existsSync(filePathUpper)) {
      return filePathUpper;
    }
  }
  return null;
}

async function main() {
  console.log("🖼️  City Image Processor");
  console.log("========================\n");

  // Check if raw directory exists
  if (!fs.existsSync(RAW_DIR)) {
    console.log(`Creating raw directory: ${RAW_DIR}`);
    fs.mkdirSync(RAW_DIR, { recursive: true });
  }

  // Check if output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // List files in raw directory
  const rawFiles = fs.readdirSync(RAW_DIR);
  console.log(`Found ${rawFiles.length} file(s) in raw directory\n`);

  if (rawFiles.length === 0) {
    console.log("No files found in public/cities/raw/");
    console.log("\nPlease add your source images with these filenames:");
    EXPECTED_CITIES.forEach(city => {
      console.log(`  - ${city}.jpg (or .png, .webp)`);
    });
    console.log("\nThen run this script again.");
    return;
  }

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const cityId of EXPECTED_CITIES) {
    const inputPath = findImageFile(cityId);
    const outputPath = path.join(OUTPUT_DIR, `${cityId}.jpg`);

    if (!inputPath) {
      console.log(`⏭️  Skipping ${cityId} - no source image found`);
      skipped++;
      continue;
    }

    try {
      console.log(`🔄 Processing ${cityId}...`);
      await processImage(inputPath, outputPath);
      
      // Get file sizes for comparison
      const inputStats = fs.statSync(inputPath);
      const outputStats = fs.statSync(outputPath);
      const reduction = Math.round((1 - outputStats.size / inputStats.size) * 100);
      
      console.log(`   ✅ ${path.basename(inputPath)} → ${cityId}.jpg`);
      console.log(`      ${(inputStats.size / 1024).toFixed(0)}KB → ${(outputStats.size / 1024).toFixed(0)}KB (${reduction > 0 ? `-${reduction}%` : `+${Math.abs(reduction)}%`})`);
      processed++;
    } catch (err) {
      console.log(`   ❌ Error processing ${cityId}: ${err}`);
      errors++;
    }
  }

  console.log("\n========================");
  console.log(`✅ Processed: ${processed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);

  if (skipped > 0) {
    console.log("\nMissing images for:");
    for (const cityId of EXPECTED_CITIES) {
      if (!findImageFile(cityId)) {
        console.log(`  - ${cityId}`);
      }
    }
  }

  console.log("\nOutput location: public/cities/");
}

main().catch(console.error);
