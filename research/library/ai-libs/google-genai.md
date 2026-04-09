# Google GenAI SDK (Gemini)

## What it is

The official Node SDK for Google Gemini models, including text generation, image generation (Imagen), and the new Gemini 2.0 / 2.5 multimodal models.

## License

**Apache 2.0.**

## Used for

- **News.AI generator** — image generation (Adil's preferred provider, replacing DALL-E)
- Headline / caption generation if Gemini ends up winning that benchmark
- Anywhere multimodal input is needed (image + text)

## How to use

```bash
npm i @google/genai
```

```ts
import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// Text generation
const result = await ai.models.generateContent({
  model: 'gemini-2.0-flash',
  contents: 'Write an Instagram caption about coffee',
})
console.log(result.text)
```

## Image generation (Imagen / Gemini image)

```ts
const result = await ai.models.generateImages({
  model: 'imagen-3.0-generate-001',
  prompt: 'A photorealistic cup of coffee on a wooden table, golden hour lighting',
  config: {
    numberOfImages: 1,
    aspectRatio: '1:1',
  },
})

// result.generatedImages[0].image.imageBytes is the image data
```

## Multimodal (text + image input)

```ts
import fs from 'fs'

const imageData = fs.readFileSync('post.jpg').toString('base64')

const result = await ai.models.generateContent({
  model: 'gemini-2.0-flash',
  contents: [
    { parts: [
      { text: 'Describe this image and suggest a caption' },
      { inlineData: { mimeType: 'image/jpeg', data: imageData } },
    ]}
  ],
})
```

## Score: 10/10 for Adil

The chosen image provider for News.AI. Use the SDK directly for image gen.

## Links

- https://ai.google.dev/gemini-api/docs/quickstart
- https://github.com/googleapis/js-genai
