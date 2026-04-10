# meta-extractor

**URL:** https://github.com/velocityzen/meta-extractor
**License:** MIT
**Score:** 7.8/10
**For project:** News.AI
**Found by:** vault-research-agent, niche: content-media
**Date:** 2026-04-10

## What it does
Extracts rich metadata from any web page - titles, descriptions, images, and social media cards (OpenGraph, Twitter). Think of it as the tool that creates those preview cards you see when you paste a link in Slack or Facebook.

## Why it matters for Adil
News.AI currently generates articles with plain URLs that look unprofessional. This library automatically turns any URL in your content into rich preview cards with titles, descriptions, and images - instantly making your AI-generated articles look more polished and engaging. It's exactly what content sites like BuzzFeed use for link previews.

## How to start using it
1. Install: `npm install meta-extractor`
2. Add to your News.AI backend service
3. Create an endpoint that takes a URL and returns metadata
4. When generating articles, scan for URLs and automatically enrich them with preview data

Basic usage:
```javascript
const extract = require('meta-extractor');
extract({ uri: 'https://example.com' }, (err, metadata) => {
  // Get title, description, images, OpenGraph data
});
```

## What it replaces or improves
Currently News.AI probably shows raw URLs or manually adds descriptions. This automates the entire process - paste any URL and get professional preview cards with images and descriptions automatically extracted. No more manually writing summaries of linked articles.

## Risks and gotchas
Dependencies are aging (from 2020-2021) with no automated security scanning since there's no CI/CD. Run `npm audit` before adopting. The library uses older callback patterns alongside modern promises. Memory usage is well-controlled with built-in size limits, so it won't crash on large pages.

## Alternatives
- **Metascraper** - More popular with 100+ extractors but heavier dependencies
- **Open Graph Scraper** - Focused only on OpenGraph, simpler but less comprehensive
- **LinkPreview API** - Hosted service option if you prefer not to self-host