# meta-extractor — Backend Analysis

**Repo:** velocityzen/meta-extractor  
**Version:** 2.1.0  
**License:** MIT  
**Score:** 7.8  
**Date analyzed:** 2026-04-12  

## Overview

Single-file Node.js library (196 lines) that extracts metadata from URLs via streaming HTTP — no full download required. Extracts title, description, Open Graph, Twitter Cards, VK, App Links, RSS/Atom feed links, all image URLs, and MIME type for binary files.

Dependencies: `got@11` (HTTP), `htmlparser2@6` (SAX parser), `file-type@16` (binary detection).

---

## Pattern 1: Stream-Based Parsing with Body Limit Guard

The core architecture is a Node.js `Transform` stream that pipes `got.stream()` directly into the HTML parser. This means HTML is parsed incrementally — the library never holds the entire response body in memory.

```js
// index.js:112-148
function createParser(opts, done) {
  const limit = opts.limit;     // default: 2 * 1024 * 1024 (2 MB)
  const res = { host, pathname, title: "" };
  let size = 0;

  return new Transform({
    transform: function (chunk, enc, cb) {
      size += chunk.length;

      if (size >= limit) {
        this.resume();                          // drain so the socket closes
        return done(new Error("Response body limit exceeded"));
      }

      // first chunk: try binary detection before creating HTML parser
      if (!parser) {
        FileType.fromBuffer(Buffer.from(chunk)).then((file) => {
          if (file) {
            res.file = file;
            this.resume();                      // drain + stop: binary, no HTML
            return done(null, res);
          }
          parser = createHtmlParser(res, opts);
          parser.write(chunk);
          cb();
        });
      } else {
        parser.write(chunk);
        cb();
      }
    },

    flush: (cb) => {
      res.title = res.title.replace(/\s{2,}|\n/gim, "");
      cb();
      done(null, res);
    },
  });
}
```

**Key insight:** `this.resume()` is called to drain the stream after a limit hit or binary detection. Without this the TCP socket hangs open. This is a non-obvious pattern specific to Node.js streams.

**News.AI relevance:** Parser service processes 48 RSS feeds. If any article URL is scraped for preview, this 2 MB default cap is exactly right — avoids downloading 50 MB news pages.

---

## Pattern 2: Lazy HTML Parser + Binary Early-Exit

The HTML parser (`htmlparser2.Parser`) is created lazily on the first chunk — only if the first chunk does not match a known binary signature.

```js
// index.js:122-137
FileType.fromBuffer(Buffer.from(chunk)).then((file) => {
  if (file) {
    // Binary file (PNG, PDF, etc.) — return MIME info immediately
    res.file = file;        // { ext: "png", mime: "image/png" }
    this.resume();
    return done(null, res);
  }
  // Only HTML paths reach here
  parser = createHtmlParser(res, opts);
  parser.write(chunk);
  cb();
});
```

The test confirms the shape:
```js
// test.js:44-53
const res = await extract({ uri: "https://.../image.png" });
t.is(res.file.ext, "png");
t.is(res.file.mime, "image/png");
```

**Key insight:** Binary detection on the first chunk (usually 4–64 bytes is enough for magic bytes) avoids ever spinning up the HTML parser. For URLs that happen to point to images, PDFs, or video files, the library returns in one round-trip packet.

---

## Pattern 3: Regex-Driven Meta Tag Filtering

Meta tags are filtered by a single regex against the `name` or `property` attribute. This is how the library stays generic while supporting OG, Twitter, VK, and App Links simultaneously.

```js
// index.js:27-33
function parseMeta(attrs, rx) {
  const name = attrs.name || attrs.property || Object.keys(attrs)[0];

  if (rx.test(name)) {
    return [fixName(name), attrs.content || attrs[name]];
  }
}

// Default regex (index.js:174-176):
rx: opts.rxMeta || /charset|description|keywords|twitter:|og:|vk:|al:|theme-color/im
```

The `fixName` function normalizes attribute names to camelCase:

```js
// index.js:21-25
function fixName(name) {
  return name.replace(/(?::|_|-)(\w)/g, (matches, letter) =>
    letter.toUpperCase()
  );
}
// "og:title"        → "ogTitle"
// "twitter:card"    → "twitterCard"
// "theme-color"     → "themeColor"
// "al:ios:url"      → "alIosUrl"
```

The caller can override with `rxMeta`:
```js
// test.js:77-84
const res = await extract({
  uri: "https://mail.ru",
  rxMeta: /msapplication/im,  // custom — extract Microsoft tile meta
});
t.truthy(res.msapplicationName);
```

**Key insight:** A single regex replaces a static allowlist of known properties. Any site-specific meta (schema.org, Slack unfurl hints, etc.) can be extracted by the caller without changing the library.

**News.AI relevance:** For article URL previews in Dashboard, pass `rxMeta: /og:|twitter:|description/im` — skip VK/AppLinks noise, keep only what matters for link cards.

---

## Pattern 4: Callback / Promise Dual API via Single Wrapper

The public `extract()` function wraps `_extract()` to support both callback and Promise styles from one implementation. The pattern is a standard Node.js bridge:

```js
// index.js:185-195
function extract(opts, done) {
  if (!done) {
    return new Promise((resolve, reject) => {
      _extract(opts, (err, res) => (err ? reject(err) : resolve(res)));
    });
  }
  _extract(opts, done);
}
```

`_extract` itself is pure callback-style — used internally in both branches. The Promise wrapper has zero overhead: it's just a thin closure.

**Key insight:** The `isDone` flag prevents double-calling `done` when the stream emits both an error event and the `flush` callback fires:

```js
// index.js:161-182
let isDone = false;

got.stream(uri, opts)
  .on("error", (err) => {
    done(getError(err));
    isDone = true;          // prevent flush from also calling done
  })
  .pipe(
    createParser({ uri, limit, rx }, (err, res) => {
      !isDone && done(err, res);
    })
  );
```

This is a critical guard — Node.js streams can fire error + flush in the same tick.

---

## Pattern 5: HTTP Error Normalization

`got` throws `got.HTTPError` for 4xx/5xx. The library unwraps it into a plain `Error` with a `statusCode` property — useful for callers that need to branch on HTTP status:

```js
// index.js:11-18
function getError(error) {
  if (error instanceof got.HTTPError) {
    let err = new Error(error.message);
    err.statusCode = error.response.statusCode;
    return err;
  }
  return error;
}
```

Test confirms the contract:
```js
// test.js:5-10
test("404 Not Found resource", (t) =>
  extract({ uri: "http://www.newyorker.com/doesnotexist" })
    .then(() => t.fail())
    .catch((err) => {
      t.is(err.statusCode, 404);
    }));
```

**Key insight:** The library does NOT retry. All retry logic must be in the caller. `got@11` is used with `got.stream()` — `got`'s built-in retry only works with the non-streaming interface. Streaming mode bypasses got's retry.

**News.AI relevance:** Wrap every `extract()` call in `p-retry` with `AbortError` on 4xx (same pattern already used in Generator/Publisher). Check `err.statusCode >= 400 && err.statusCode < 500` to abort retries on client errors.

---

## Pattern 6: RSS/Atom Feed Discovery

The library parses `<link rel="alternate" type="application/rss+xml">` tags within `<head>` — standard browser-style feed auto-discovery:

```js
// index.js:35-47
function parseFeed(attrs) {
  const match = /^application\/(atom|rss)\+xml$/i.exec(attrs.type);
  if (!match) return;
  return { type: match[1], href: attrs.href, title: attrs.title };
}

// Used inside onopentag when name === "link" AND isHead is true:
if (isHead && name === "link") {
  const feed = parseFeed(attrs);
  if (feed) {
    if (!res.feeds) res.feeds = [];
    res.feeds.push(feed);
  }
}
```

Result:
```js
res.feeds = [
  { type: "rss", href: "/rss/index.rss", title: "NYT > World News" },
  { type: "atom", href: "/feeds/atom/world", title: "NYT Atom" }
]
```

**News.AI relevance:** Parser service currently uses a static `sources.json` with 48 RSS URLs. This API could auto-discover feeds from news site homepages — useful for expanding to new niches without manually hunting RSS URLs.

---

## Pattern 7: Image Deduplication via Set + URL Resolution

Images are collected into a `Set` (automatic dedup) and resolved to absolute URLs:

```js
// index.js:63-70
} else if (name === "img") {
  const src = attrs.src;
  if (src && src.substr(0, 4) !== "data") {   // skip data: URIs
    if (!res.images) {
      res.images = new Set();
    }
    res.images.add(url.resolve(opts.uri, src)); // relative → absolute
  }
}
```

`url.resolve(base, href)` handles `../img/photo.jpg`, `/static/img/photo.jpg`, and `https://cdn.example.com/img.jpg` uniformly.

Note: `url.resolve` is from the legacy `url` module (not `URL`), but works correctly here. The result `res.images` is a `Set`, not an array — callers need `[...res.images]` to serialize.

**Gotcha:** `res.images` is `undefined` if no images found (lazy init), not an empty Set. Always guard with `res.images ? [...res.images] : []`.

---

## Result Shape

```js
{
  host: "www.nytimes.com",
  pathname: "/section/world",
  title: "World News - The New York Times",
  description: "...",
  charset: "utf-8",
  themeColor: "#ffffff",
  // Open Graph
  ogTitle: "...",
  ogDescription: "...",
  ogImage: "https://...",
  ogType: "article",
  ogUrl: "https://...",
  // Twitter
  twitterCard: "summary_large_image",
  twitterTitle: "...",
  // RSS/Atom feeds
  feeds: [{ type: "rss", href: "/rss", title: "..." }],
  // All img srcs (absolute)
  images: Set { "https://...", "https://..." },
  // Binary files only:
  file: { ext: "png", mime: "image/png" }
}
```

---

## Limitations & Production Gaps

| Issue | Impact | Mitigation |
|---|---|---|
| No built-in retry | Any transient failure fails the call | Wrap with `p-retry@6` |
| No timeout option | Slow servers hang indefinitely | Pass `timeout: { request: 5000 }` via got opts |
| `got@11` (not got@12+) | CommonJS only, no ESM | Fine for News.AI (all services are CJS) |
| `url.resolve` deprecated | Minor — works but uses legacy API | Acceptable for this use case |
| Images returned as `Set` | Can't JSON.serialize directly | `res.images ? [...res.images] : []` |
| No redirect URL in result | Can't tell if URL redirected | got opts `followRedirect: true` (default) handles it silently |
| `got.stream()` bypasses got retry | retry: {} option has no effect | Must use p-retry externally |

---

## Integration Pattern for News.AI

Minimal wrapper for Brain/Parser service — URL preview with retry + timeout:

```js
const extract = require('meta-extractor');
const pRetry = require('p-retry');

async function getUrlPreview(uri) {
  return pRetry(
    async () => {
      const res = await extract({
        uri,
        timeout: { request: 5000 },  // got timeout option
        rxMeta: /og:|twitter:|description/im,
      });
      return {
        host: res.host,
        title: res.title || res.ogTitle || null,
        description: res.description || res.ogDescription || null,
        image: res.ogImage || null,
        type: res.ogType || null,
        images: res.images ? [...res.images] : [],
      };
    },
    {
      retries: 2,
      onFailedAttempt: (err) => {
        // abort on 4xx — no point retrying
        if (err.statusCode >= 400 && err.statusCode < 500) {
          throw new pRetry.AbortError(err.message);
        }
      },
    }
  );
}
```

---

## Links

- npm: https://www.npmjs.com/package/meta-extractor
- GitHub: https://github.com/velocityzen/meta-extractor
- got@11 docs: https://github.com/sindresorhus/got/tree/v11.8.6
