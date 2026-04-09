# Sharp

## What it is

A high-performance Node.js image processing library. Resize, crop, rotate, composite, format-convert (PNG, JPEG, WebP, AVIF), apply filters, draw text overlays. **The fastest image library in the Node ecosystem** — uses libvips under the hood.

## License

**Apache 2.0.**

## Used for

- **News.AI TemplateV1** — composing the final image from generated background + text overlay + brand elements. Already in use.
- **Omoikiri.AI** — n/a directly, but useful for any image manipulation
- **Nexus.AI** — n/a (Python equivalent: Pillow)

## Reference patterns

### Resize and convert

```js
import sharp from 'sharp'

await sharp('input.jpg')
  .resize(1080, 1080, { fit: 'cover' })
  .webp({ quality: 85 })
  .toFile('output.webp')
```

### Composite text on image (basic — for proper text use opentype.js + svg)

```js
const svgText = `
<svg width="1080" height="200">
  <text x="50%" y="50%" font-family="Inter" font-size="64" fill="white" text-anchor="middle">
    Breaking News
  </text>
</svg>
`

await sharp('background.jpg')
  .composite([{
    input: Buffer.from(svgText),
    top: 100,
    left: 0,
  }])
  .toFile('post.jpg')
```

### Multi-step pipeline

```js
await sharp(input)
  .resize(1080, 1920)              // Instagram story size
  .composite([
    { input: 'logo.png', gravity: 'southeast' },
    { input: textBuffer, top: 800, left: 100 }
  ])
  .webp({ quality: 90 })
  .toFile('story.webp')
```

## Score: 10/10 for Adil (already using)

This is the right choice. Just use it more — it's underutilized if News.AI's template engine is doing image work.

## Common gotcha

On some hosts (Vercel serverless), Sharp's libvips binary needs to match the runtime architecture. On Railway it just works.

## Links

- https://sharp.pixelplumbing.com
