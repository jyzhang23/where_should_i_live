# City Images - Source Files

Place your raw/source city images here. The processing script will resize and optimize them.

## Expected Files

| Filename | City |
|----------|------|
| `new-york-city.jpg` | New York City, NY |
| `san-francisco.jpg` | San Francisco, CA |
| `miami.jpg` | Miami, FL |
| `denver.jpg` | Denver, CO |
| `phoenix.jpg` | Phoenix, AZ |
| `boston.jpg` | Boston, MA |
| `nashville.jpg` | Nashville, TN |
| `portland.jpg` | Portland, OR |
| `chicago.jpg` | Chicago, IL |
| `austin.jpg` | Austin, TX |

## Supported Formats

- `.jpg` / `.jpeg`
- `.png`
- `.webp`
- `.avif`
- `.tiff`

## Image Guidelines

- **Orientation**: Landscape preferred (will be cropped to 4:3)
- **Resolution**: At least 640x480 (larger is fine, will be resized)
- **Content**: Iconic city skyline or recognizable landmark
- **Licensing**: Ensure you have rights to use the images (see licenses folder)

## Processing

After adding images, run:

```bash
npx tsx scripts/process-city-images.ts
```

This will:
1. Resize to 640x480
2. Crop to fill (center focus)
3. Convert to optimized JPEG (85% quality)
4. Save to `public/cities/`
