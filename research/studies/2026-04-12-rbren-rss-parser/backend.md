# rss-parser (rbren) — Backend Analysis

**Repo:** https://github.com/rbren/rss-parser  
**Version studied:** 3.13.0  
**Date:** 2026-04-12  
**Score:** 7.2  
**Relevance:** News.AI `adilflow_parser` — RSS content ingestion across 48 feeds / 12 niches

---

## What it does

Lightweight Node.js RSS/Atom parser. Takes a URL or raw XML string, returns normalized JSON with items, feed metadata, and optional custom fields. Works in both Node and browser (webpack bundle). Zero runtime dependencies beyond `xml2js` and `entities`.

---

## Pattern 1: Feed format auto-detection via version attribute sniffing

**File:** `lib/parser.js` — `parseString()`

The parser identifies the feed format purely from the xml2js object shape and version attributes, with a configurable fallback for malformed feeds:

```js
if (result.feed) {
  feed = this.buildAtomFeed(result);               // Atom
} else if (result.rss && result.rss.$.version.match(/^2/)) {
  feed = this.buildRSS2(result);                   // RSS 2.x
} else if (result['rdf:RDF']) {
  feed = this.buildRSS1(result);                   // RSS 1.0 (RDF)
} else if (result.rss && result.rss.$.version.match(/0\.9/)) {
  feed = this.buildRSS0_9(result);                 // RSS 0.9x
} else if (result.rss && this.options.defaultRSS) {
  // malformed feed missing version= attribute
  switch(this.options.defaultRSS) {
    case 2: feed = this.buildRSS2(result); break;
  }
} else {
  return reject(new Error("Feed not recognized as RSS 1 or 2."));
}
```

The `defaultRSS` option is the escape hatch for feeds that omit the version attribute — common in the wild. Without it, those feeds throw. Test confirms: `uolNoticias.rss` parses only with `{ defaultRSS: 2.0 }`.

**News.AI relevance:** When adding new sources, feeds from obscure CMS platforms (Brazilian/Indian portals) often strip `version=""`. Always instantiate the parser with `defaultRSS: 2` to avoid hard failures on 1 of 48 feeds killing the whole poll cycle.

---

## Pattern 2: Per-instance HTTP caching (ETag + Last-Modified)

**File:** `lib/parser.js` — constructor + `parseURL()`

The Parser instance keeps two in-memory maps:

```js
constructor(options={}) {
  // ...
  this.etags = {};           // feedUrl -> ETag value
  this.lastModified = {};    // feedUrl -> Last-Modified value
}

parseURL(feedUrl, callback, redirectCount=0) {
  let headers = Object.assign({}, DEFAULT_HEADERS, this.options.headers);

  // Inject conditional request headers if we've seen this feed before
  if (this.etags[feedUrl]) {
    headers['If-None-Match'] = this.etags[feedUrl];
  }
  if (this.lastModified[feedUrl]) {
    headers['If-Modified-Since'] = this.lastModified[feedUrl];
  }

  // On response: store whatever the server returns
  if (res.headers['etag']) {
    this.etags[feedUrl] = res.headers['etag'];
  }
  if (res.headers['last-modified']) {
    this.lastModified[feedUrl] = res.headers['last-modified'];
  }

  // 304 = nothing changed → resolve(null)
  } else if (res.statusCode === 304) {
    return resolve(null);
  }
}
```

When a server returns `304 Not Modified`, `parseURL` resolves with `null` (not an empty feed). Callers must guard: `if (feed === null) return; // unchanged`.

**Critical implication:** This caching only works if you **reuse the same Parser instance** across poll cycles. Recreating `new Parser()` on every cron tick loses all cached ETags.

**News.AI relevance:** `adilflow_parser` should create one Parser instance at module load, not inside the poll function. With 48 feeds polled every N minutes, ETag caching can cut bandwidth by 60-80% — most feeds don't change on every poll.

---

## Pattern 3: Declarative field-mapping with tuple syntax and per-field options

**File:** `lib/fields.js` + `lib/utils.js` — `copyFromXML()`

Fields are defined as a mixed array: strings for same-name mappings, 2-tuples for rename, 3-tuples for rename + options:

```js
// lib/fields.js
fields.item = [
  ['author', 'creator'],                                    // dc:author → creator
  ['dc:creator', 'creator'],                               // dc namespace → creator
  ['dc:date', 'date'],
  'title',
  'link',
  'pubDate',
  ['content:encoded', 'content:encoded', {includeSnippet: true}],  // also auto-generate snippet
];
```

The processor in `copyFromXML`:

```js
utils.copyFromXML = function(xml, dest, fields) {
  fields.forEach(function(f) {
    let from = f, to = f, options = {};
    if (Array.isArray(f)) {
      from = f[0];
      to = f[1];
      if (f.length > 2) options = f[2];
    }
    const { keepArray, includeSnippet } = options;
    if (xml[from] !== undefined) {
      dest[to] = keepArray ? xml[from] : xml[from][0];  // xml2js wraps everything in arrays
    }
    if (dest[to] && typeof dest[to]._ === 'string') {
      dest[to] = dest[to]._;  // unwrap CDATA nodes: { _: 'text', $: {...} } → 'text'
    }
    if (includeSnippet && dest[to] && typeof dest[to] === 'string') {
      dest[to + 'Snippet'] = utils.getSnippet(dest[to]);  // auto strip-HTML + decode entities
    }
  });
}
```

`keepArray: true` is critical for fields that legitimately have multiple values per item (e.g., `media:content` when an article has multiple images). Without it, only the first element survives.

**Custom fields usage** (from test):
```js
// Simple: pull a non-standard field by name
{ customFields: { item: ['subtitle'] } }

// Namespaced media with multiple values preserved
{ customFields: { item: [['media:content', 'media:content', {keepArray: true}]] } }

// Pull entire nested XML node as object
{ customFields: { feed: ['nested-field'] } }  // returns { nest1: ['foo'], nest2: [{ nest3: ['bar'] }] }
```

**News.AI relevance:** Guardian and similar premium sources use `media:content` with multiple images per item — must use `keepArray: true`. For article image extraction: `item['media:content'][0].$.url`.

---

## Pattern 4: Redirect following + timeout with proper cleanup

**File:** `lib/parser.js` — `parseURL()`

Manual redirect following with a counter to prevent infinite loops:

```js
parseURL(feedUrl, callback, redirectCount=0) {
  // ...
  let timeout = null;
  let prom = new Promise((resolve, reject) => {
    const requestOpts = Object.assign({headers}, urlParts, this.options.requestOptions);
    let req = get(requestOpts, (res) => {
      if (this.options.maxRedirects && res.statusCode >= 300 && res.statusCode < 400
          && res.headers['location']) {
        if (redirectCount === this.options.maxRedirects) {
          return reject(new Error("Too many redirects"));
        }
        // Resolve relative redirects properly
        const newLocation = url.resolve(feedUrl, res.headers['location']);
        return this.parseURL(newLocation, null, redirectCount + 1).then(resolve, reject);
      }

      // Timeout via req.destroy() — clean TCP teardown
      timeout = setTimeout(() => {
        let err = new Error("Request timed out after " + this.options.timeout + "ms");
        req.destroy(err);
        reject(err);
      }, this.options.timeout);
    });
    req.on('error', reject);
  }).then(
    data => { clearTimeout(timeout); return Promise.resolve(data); },
    e    => { clearTimeout(timeout); return Promise.reject(e); }
  );
}
```

Key details:
- Default timeout: 60,000ms (60s). For News.AI's 48 feeds this is too long if a feed server hangs. Reduce to 10-15s.
- `url.resolve(feedUrl, res.headers['location'])` handles relative redirect paths like `/new-location` correctly.
- `req.destroy(err)` cleanly tears down the TCP socket rather than just stopping to read. The error propagates to the `req.on('error')` handler.
- Timeout timer is stored outside the Promise and always cleared in both then/catch branches — no timer leak.

**News.AI relevance:** Some RSS servers (especially Eastern European news portals) redirect HTTP → HTTPS without telling clients. The 5-redirect default handles this. Set `timeout: 15000` in the parser constructor for the parser service to fail fast and move to the next feed.

---

## Pattern 5: Multi-format content extraction with XML fallback

**File:** `lib/utils.js` — `getContent()` + `getSnippet()` + `getLink()`

Content nodes in RSS/Atom can be plain text, CDATA strings, or full XML objects with attributes. Three-branch normalization:

```js
utils.getContent = function(content) {
  if (typeof content._ === 'string') {
    // CDATA node: xml2js produces { _: 'actual text', $: { type: 'html' } }
    return content._;
  } else if (typeof content === 'object') {
    // Embedded XML (e.g., Atom content with child elements)
    // Rebuild as <div> wrapper to preserve structure
    let builder = new xml2js.Builder({
      headless: true,
      explicitRoot: true,
      rootName: 'div',
      renderOpts: {pretty: false}
    });
    return builder.buildObject(content);
  } else {
    return content;  // plain string
  }
}

utils.getSnippet = function(str) {
  // 1. Block-level tags → newlines before stripping
  str = str.replace(/([^\n])<\/?(h|br|p|ul|ol|li|blockquote|section|table|tr|div)(?:.|\n)*?>([^\n])/gm,
    '$1\n$3');
  // 2. Strip all remaining tags
  str = str.replace(/<(?:.|\n)*?>/gm, '');
  // 3. Decode HTML entities (uses `entities` package)
  return entities.decodeHTML(str).trim();
}
```

`getSnippet` produces the `contentSnippet` field — plain readable text without HTML tags, with entities decoded (so `&amp;` becomes `&`). The block-level tag → newline step preserves paragraph separation, which matters for AI summary generation.

Atom link resolution (handles multi-link feeds):
```js
utils.getLink = function(links, rel, fallbackIdx) {
  // Prefer link with matching rel= attribute
  for (let i = 0; i < links.length; ++i) {
    if (links[i].$.rel === rel) return links[i].$.href;
  }
  // Fall back to positional index if no rel= match
  if (links[fallbackIdx]) return links[fallbackIdx].$.href;
}
```

Called as `utils.getLink(links, 'alternate', 0)` for article link, `utils.getLink(links, 'self', 1)` for feed URL.

**News.AI relevance:** `contentSnippet` is ready for direct injection into GPT-4o-mini prompts — no extra cleanup needed. `content` contains raw HTML for cases where Brain needs to extract images or structured data. Use `item.contentSnippet` for classification scoring and headline generation; use `item.content` to scrape embedded image URLs.

---

## Pattern 6: HTTP encoding detection from Content-Type header

**File:** `lib/utils.js` — `getEncodingFromContentType()`

Many non-English RSS feeds (Russian, Arabic, Eastern European) send `charset=iso-8859-1` or `charset=windows-1251` in the Content-Type header. The parser normalizes these:

```js
const ENCODING_ALIASES = {
  'utf-8': 'utf8',
  'iso-8859-1': 'latin1',
}

utils.getEncodingFromContentType = function(contentType) {
  contentType = contentType || '';
  let match = contentType.match(/(encoding|charset)\s*=\s*(\S+)/);
  let encoding = (match || [])[2] || '';
  encoding = encoding.toLowerCase();
  encoding = ENCODING_ALIASES[encoding] || encoding;
  if (!encoding || SUPPORTED_ENCODINGS.indexOf(encoding) === -1) {
    encoding = DEFAULT_ENCODING;  // 'utf8'
  }
  return encoding;
}
```

Applied immediately on response:
```js
let encoding = utils.getEncodingFromContentType(res.headers['content-type']);
res.setEncoding(encoding);
res.on('data', (chunk) => { xml += chunk; });
```

**News.AI relevance:** The `kazakhstan` niche sources (4 Kazakh-language + 2 English) may use non-UTF-8 encodings. Without this, Cyrillic characters in article titles become mojibake that breaks both display and AI processing. The parser handles this automatically — no additional work needed.

---

## Pattern 7: Dual API — Promise + callback without duplication

**File:** `lib/utils.js` — `maybePromisify()`

Both `parseString` and `parseURL` expose a unified API: if no callback passed, they return a Promise; if a callback is passed, they fire it Node-style. Zero code duplication:

```js
utils.maybePromisify = function(callback, promise) {
  if (!callback) return promise;
  return promise.then(
    data => setTimeout(() => callback(null, data)),
    err  => setTimeout(() => callback(err))
  );
}
```

The `setTimeout` (with 0ms delay) is intentional: it ensures the callback fires asynchronously even if the promise is already resolved at call time, maintaining consistent behavior.

**Usage:**
```js
// Promise style (News.AI current approach)
const feed = await parser.parseURL(url);

// Callback style (legacy, test suite uses this)
parser.parseURL(url, (err, feed) => { ... });
```

---

## Architecture summary

```
Parser (class, one instance = one HTTP cache context)
  ├── constructor(options)          — merge options, init xml2js, init etag/lastModified maps
  ├── parseURL(url)                 — HTTP fetch → encoding → parseString → feed object
  │     └── redirect loop (recursive, max 5)
  │     └── timeout via req.destroy()
  │     └── 304 → resolve(null)
  │     └── ETag/Last-Modified caching
  ├── parseString(xml)              — xml2js → format detection → build* → normalize
  │     ├── buildAtomFeed()         — Atom 1.0
  │     ├── buildRSS2()             — RSS 2.0 + optional iTunes decoration
  │     ├── buildRSS1()             — RSS 1.0 (RDF)
  │     └── buildRSS0_9()           — RSS 0.9x
  └── utils (module-level)
        ├── copyFromXML()           — field mapping with rename + options
        ├── getContent()            — CDATA / XML object → string
        ├── getSnippet()            — HTML → plain text + entity decode
        ├── getLink()               — rel-based Atom link resolution
        └── getEncodingFromContentType()  — charset normalization
```

---

## Integration recipe for News.AI adilflow_parser

```js
import Parser from 'rss-parser';

// ONE instance per service lifetime — keeps ETag cache alive across polls
const parser = new Parser({
  timeout: 15000,      // 15s, not the default 60s
  defaultRSS: 2,       // handle malformed version= attributes
  headers: {
    'User-Agent': 'AdilFlow/1.0 (+https://your-domain.com/bot)',
  },
  customFields: {
    item: [
      ['media:content', 'media:content', { keepArray: true }],  // multiple images
      ['dc:creator', 'creator'],  // author from DC namespace
    ],
  },
});

async function pollFeed(source) {
  let feed;
  try {
    feed = await parser.parseURL(source.url);
  } catch (err) {
    logger.error({ source: source.url, err: err.message }, 'feed fetch failed');
    return [];
  }

  // 304 Not Modified — nothing new
  if (feed === null) {
    logger.info({ source: source.url }, 'feed unchanged (304)');
    return [];
  }

  return feed.items.map(item => ({
    title: item.title,
    link: item.link,
    pubDate: item.isoDate,                             // always ISO 8601
    content: item['content:encoded'] || item.content,  // full HTML body
    snippet: item['content:encodedSnippet'] || item.contentSnippet,  // plain text for AI
    imageUrl: extractImageUrl(item),
    author: item.creator || item.author,
    guid: item.guid || item.link,
  }));
}

function extractImageUrl(item) {
  // Priority: media:content > enclosure > og-style image in content
  if (item['media:content']?.[0]?.$.url) {
    return item['media:content'][0].$.url;
  }
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) {
    return item.enclosure.url;
  }
  // Fallback: first <img> in HTML content
  const match = (item.content || '').match(/<img[^>]+src="([^"]+)"/);
  return match?.[1] ?? null;
}
```

**Wrap with p-retry** (News.AI already uses p-retry@6):
```js
import pRetry from 'p-retry';

const items = await pRetry(() => pollFeed(source), {
  retries: 3,
  onFailedAttempt: err => {
    logger.warn({ attempt: err.attemptNumber, source: source.url }, 'retry');
  },
});
```

---

## Gotchas

| Issue | Detail |
|---|---|
| `feed === null` on 304 | Not an error. Must handle explicitly — returning null is valid behavior, not a parse failure |
| ETag cache is per-instance | Recreating `new Parser()` inside a cron tick loses all caching. One instance at module level. |
| `keepArray: false` (default) on multi-image fields | First `media:content` only. Use `keepArray: true` for Guardian, Reuters, AP feeds |
| `defaultRSS` required for some feeds | Feeds without `version=` attribute fail silently if `defaultRSS` not set. Always set it. |
| `item.content` is HTML | Contains raw HTML tags. Use `item.contentSnippet` for AI prompts — it's already entity-decoded plain text |
| Timeout default 60s | Way too long for bulk polling. Set `timeout: 10000`-`15000` in constructor |
| `url.parse()` used internally | Deprecated but still works in Node 22+. Not your problem unless you patch the library. |
| No retry logic inside library | `got.stream()` is not used — this is raw `http/https.get`. Wrap `parseURL` calls in `p-retry` externally |

---

## Links

- Repo: https://github.com/rbren/rss-parser
- npm: https://www.npmjs.com/package/rss-parser
- Related: `C:/Users/User/Desktop/ObsidianVault/research/studies/2026-04-12-velocityzen-meta-extractor/` — HTTP meta extraction for non-RSS sources
- Project: `C:/Users/User/Desktop/news-project/adilflow_parser/`
