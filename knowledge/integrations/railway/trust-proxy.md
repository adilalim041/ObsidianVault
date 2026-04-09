# Railway + Express: trust proxy

## TL;DR

When deploying any **Express** app on **Railway**, add this near the top of your app setup:

```js
app.set('trust proxy', true);
```

Without it, Express sees the **Railway CDN's IP**, not the real client IP. Anything that depends on `req.ip` — rate limiting, geolocation, audit logs, security checks — silently breaks.

## Why

Railway routes incoming traffic through a CDN/proxy layer before it reaches your container. Express, by default, distrusts proxies (security: prevents IP spoofing via headers). With `trust proxy` off, `req.ip` returns the proxy's IP (always the same Railway IP) and `req.protocol` may report `http` even on HTTPS connections.

`trust proxy: true` tells Express "you can trust the `X-Forwarded-For` and `X-Forwarded-Proto` headers from the upstream proxy".

## When to apply

**Every** Express service you deploy to Railway. From day one. There is no scenario where you want this off on Railway.

Same fix likely applies to other CDN-fronted hosts (Heroku, Render, Vercel for serverless functions if you use Express patterns there).

## What can break without it

- `req.ip` returns wrong value
- `req.protocol` may report `http` on HTTPS, breaking cookie `secure` flag handling
- Rate limiters keyed by IP rate-limit *all* users together (since they all appear from one IP)
- Express trust-based middleware (helmet, session) can misbehave
- Audit logs are useless for forensics

## More restrictive options

If you don't want to fully trust all proxies, use the integer form:

```js
app.set('trust proxy', 1); // trust first hop only
```

For Railway, `true` or `1` both work. `true` is fine.

## Where this came from

News.AI (`news-project`) hit this across **5 subservices** (`brain`, `parser`, `publisher`, `dashboard`, plus TemplateV1's server). Each got the same fix in commits titled "Fix: add trust proxy for Railway CDN". When a 6th service joins News.AI or any new Express service is added to any other project on Railway, do this from day one.
