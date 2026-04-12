# Post4U — Backend Study
**Date:** 2026-04-12
**Repo:** `C:/Users/User/Desktop/_study_tmp/post4u/`
**Stack:** FastAPI + MongoDB (Beanie ODM) + APScheduler + Reflex frontend
**Relevance:** Highest — full SaaS social media scheduler with multi-platform posting, persistence, retry logic

---

## TL;DR Architecture

```
frontend (Reflex/Python) → POST /posts/ → FastAPI backend
                                             ↓
                                        MongoDB (Beanie ODM)
                                             ↓
                               APScheduler (MongoDBJobStore)
                                             ↓
                                     publish_with_retry()
                                             ↓
                        [X, Reddit, Telegram, Discord, Bluesky]
```

Self-hosted via `docker compose up -d` — only two containers: `api` + `mongo`. No Redis, no extra services.

---

## Pattern 1: APScheduler + MongoDB JobStore (persistent scheduling)

**The core insight:** APScheduler in-memory = jobs lost on container restart. MongoDBJobStore = jobs survive crashes with zero new infrastructure.

```python
# backend/app/services/scheduler.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.mongodb import MongoDBJobStore
from apscheduler.executors.asyncio import AsyncIOExecutor
from pymongo import MongoClient  # sync client required for jobstore

def init_scheduler() -> AsyncIOScheduler:
    mongo_client = MongoClient(settings.MONGO_URI)  # sync PyMongo, NOT motor
    jobstores = {
        "default": MongoDBJobStore(
            database=settings.DATABASE_NAME,
            collection="scheduled_jobs",
            client=mongo_client,
        )
    }
    executors = {"default": AsyncIOExecutor()}
    scheduler = AsyncIOScheduler(jobstores=jobstores, executors=executors)
    return scheduler
```

Critical detail: APScheduler's MongoDBJobStore requires **synchronous PyMongo**, not async Motor. You can use Motor for everything else, but the jobstore must use `pymongo.MongoClient`.

On startup, APScheduler automatically detects missed jobs (e.g., post was scheduled for 14:00, server restarted at 13:55 and came back at 14:05) and runs them immediately.

**Relevance — News.AI publisher:** Exact pattern for persisting scheduled article publications. Current News.AI has no persistent scheduler — if Railway restarts, all pending publishes are lost.

---

## Pattern 2: Retry only failed platforms (selective per-platform retry)

**The insight:** When posting to 3 platforms and 1 fails, don't retry all 3. Track failures per-platform and retry only those.

```python
# backend/app/services/scheduler.py
async def publish_with_retry(
    post_id: str,
    attempt: int = 1,
    retry_platforms: list[str] | None = None  # None = first attempt = use all
) -> None:
    post = await Post.get(post_id)
    platforms_to_post = retry_platforms if retry_platforms is not None else post.platforms

    results: dict = {}
    failed_platforms: list[str] = []

    for platform in platforms_to_post:
        try:
            result = await publish_to_platform(platform, post.content, post.media_paths)
            results[platform] = result
            if result.get("status") == "error":
                failed_platforms.append(platform)
        except Exception as exc:
            results[platform] = {"status": "error", "message": str(exc)}
            failed_platforms.append(platform)

    # Merge results (don't overwrite successful platforms)
    post.status = {**post.status, **results}
    await post.save()

    if failed_platforms and attempt < 3:
        delay_minutes = 3 * attempt  # 3min, 6min
        run_at = datetime.now(timezone.utc) + timedelta(minutes=delay_minutes)
        scheduler.add_job(
            publish_with_retry,
            "date",
            run_date=run_at,
            args=[post_id, attempt + 1, failed_platforms],  # pass only failed list
        )
```

Key detail: `retry_platforms=None` signals "first attempt — use all platforms from post". Subsequent retries receive `failed_platforms` as explicit list. This prevents successful platforms from getting duplicate posts.

**Relevance — News.AI publisher:** adilflow_publisher currently has no retry. Apply this exact pattern. `retry_platforms` list prevents re-publishing to Instagram if Telegram was the one that failed.

---

## Pattern 3: SchedulerService abstraction (routes never touch APScheduler directly)

```python
class SchedulerService:
    async def schedule_post(self, post_id: str, run_at: datetime) -> str:
        job = scheduler.add_job(
            publish_with_retry,
            "date",
            run_date=run_at,
            args=[post_id],
            id=post_id,           # use post_id as job_id for easy lookup
            replace_existing=True, # idempotent re-scheduling on edit
        )
        return job.id

    async def unschedule_post(self, job_id: str) -> bool:
        try:
            scheduler.remove_job(job_id)
            return True
        except Exception as e:
            logger.error("Failed to unschedule post %s, error: %s", job_id, e)
            return False

scheduler_service = SchedulerService()
```

Routes call `scheduler_service.schedule_post(...)`, never `scheduler.add_job(...)` directly. One place to change when swapping scheduler backends.

`replace_existing=True` + `id=post_id` = idempotent: editing a post just calls `schedule_post()` again with new time, old job gets replaced automatically.

---

## Pattern 4: Platform dispatcher with credential guard

```python
# backend/app/services/publisher.py
def _publish_sync(platform: str, content: str, media_paths: list[str] = None) -> dict:
    platform = platform.lower()
    if platform == "x":
        if not settings.TWITTER_API_KEY_MAIN:  # guard: fail fast if not configured
            return {"status": "error", "message": "X credentials not configured in .env"}
        return post_tweet(content, media_paths)
    elif platform == "telegram":
        if not settings.TELEGRAM_BOT_TOKEN:
            return {"status": "error", "message": "Telegram credentials not configured in .env"}
        return post_to_telegram(content, media_paths)
    # ...

async def publish_to_platform(platform: str, content: str, media_paths: list[str] = None) -> dict:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _publish_sync, platform, content, media_paths)
```

All platform SDKs (tweepy, praw, requests) are **synchronous**. The async wrapper runs them in a thread pool executor via `run_in_executor`. This is the correct pattern — never run sync blocking I/O directly in async context.

Platform libraries:
- X/Twitter: `tweepy.Client` (v2 API for posting) + `tweepy.API` (v1 for media upload — media upload still requires v1)
- Reddit: `praw.Reddit` — `submit_selfpost` / `submit_image` / `submit_video` / `submit_gallery`
- Telegram: raw `requests` to Bot API — `sendMessage` / `sendPhoto` / `sendVideo` / `sendMediaGroup`
- Discord: raw `requests` to Webhook URL — multipart for files
- Bluesky: `atproto.Client` — `send_post` / `send_images`

---

## Pattern 5: Telegram media type routing

```python
# backend/app/controllers/post_telegram.py
_VIDEO_EXTS = {".mp4", ".mov", ".avi"}
_GIF_EXTS = {".gif"}

def _get_media_type(path: str) -> str:
    ext = os.path.splitext(path)[1].lower()
    if ext in _VIDEO_EXTS: return "video"
    if ext in _GIF_EXTS: return "animation"
    return "photo"

def post_to_telegram(content: str, media_paths: list[str] = None) -> dict:
    if not media_paths:
        # sendMessage
    elif len(media_paths) == 1:
        # sendPhoto / sendVideo / sendAnimation with caption
    else:
        # sendMediaGroup (2-10 files, caption on first item only)
        # attach://{name} pattern for multipart
        media_group = [{"type": media_type, "media": f"attach://{attach_name}"}]
        # GIF → "photo" in media group (Telegram limitation)
```

Key gotcha: `sendMediaGroup` uses `attach://` protocol for local files. Caption only goes on the first item. GIFs must be typed as "photo" in media groups.

**Relevance — Omoikiri:** The wa-bridge sends WhatsApp messages. Same multi-media routing logic applies when sending images/videos back to WhatsApp customers.

---

## Pattern 6: Beanie ODM with field validators and TimestampMixin

```python
# backend/app/models/post.py
class TimestampMixin(BaseModel):
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @before_event(Insert)
    def set_created_at(self):
        self.created_at = datetime.now(timezone.utc)

class Post(TimestampMixin, Document):
    content: str
    platforms: List[str]
    scheduled_time: Optional[datetime] = None
    status: dict = {}
    media_paths: List[str] = Field(default_factory=list)

    @field_validator("platforms", mode="before")
    @classmethod
    def lowercase_platforms(cls, v):
        if isinstance(v, list):
            return [p.lower() for p in v]
        return v

    @field_validator("scheduled_time", mode="before")
    @classmethod
    def ensure_utc(cls, v):
        if v is None: return v
        if isinstance(v, datetime) and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v

    class Settings:
        name = "posts"
```

`@before_event(Insert)` = Beanie lifecycle hook, fires before document insert. `TimestampMixin` is reusable across all document models. Field validators handle normalization at model level — routes stay clean.

---

## Pattern 7: API key auth with timing-attack protection

```python
# backend/app/api/middleware/verify.py
import secrets
from fastapi.security.api_key import APIKeyHeader

API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)

async def verify_api_key(api_key: str = Security(API_KEY_HEADER)):
    if api_key is None:
        raise HTTPException(status_code=401, detail="Missing API key.")

    # secrets.compare_digest = constant-time comparison (prevents timing attacks)
    if not secrets.compare_digest(api_key, settings.POST4U_API_KEY):
        raise HTTPException(status_code=403, detail="Invalid API key.")
```

`secrets.compare_digest()` runs in constant time regardless of where strings differ. Regular `==` short-circuits on first mismatch — attackers can enumerate key chars by measuring response times.

Config-level guard: server refuses to start if `POST4U_API_KEY` is empty:
```python
# backend/app/config.py
if not settings.POST4U_API_KEY:
    raise RuntimeError("POST4U_API_KEY is not set — server refused to start.")
```

---

## Pattern 8: File upload validation with magic bytes

```python
# backend/app/api/utils/check_files.py
import magic  # python-magic — reads actual file bytes, not just extension

async def check_files(files):
    validated_files = []
    for file in files:
        # First pass: check Content-Type header (client-provided, untrusted)
        if file.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(415, ...)

        # Stream-read with size limit
        total_size = 0
        chunks = []
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk: break
            total_size += len(chunk)
            if total_size > MAX_UPLOAD_SIZE:  # 20MB
                raise HTTPException(413, ...)
            chunks.append(chunk)

        file_bytes = b"".join(chunks)

        # Second pass: magic bytes validation (server-side, trusted)
        actual_mime = magic.from_buffer(file_bytes[:2048], mime=True)
        if actual_mime not in ALLOWED_MIME_TYPES:
            raise HTTPException(415, f"File content identified as '{actual_mime}', not allowed.")

        validated_files.append({"filename": file.filename, "bytes": file_bytes})
    return validated_files
```

Double validation: Content-Type header (client claim) + magic bytes (actual content). A malicious user can't rename a `.exe` to `.jpg` — the magic bytes check catches it.

---

## Pattern 9: Rate limiting at router level

```python
# backend/app/main.py
from pyrate_limiter import Duration, Limiter, Rate
from fastapi_limiter.depends import RateLimiter

app.include_router(
    router,
    dependencies=[
        Depends(verify_api_key),
        Depends(RateLimiter(limiter=Limiter(Rate(2, Duration.SECOND * 5))))
    ]
)
```

Both auth and rate limiting applied globally to the router via `dependencies=[]`. Rate: 2 requests per 5 seconds. No per-route annotation needed.

---

## Pattern 10: Route logic — immediate vs scheduled branching

```python
# backend/app/api/routes.py
@router.post("/posts/")
async def create_post(content, platforms, scheduled_time, media):
    # ... validation, file upload, create Post document ...
    await post.insert()

    if post.scheduled_time and post.scheduled_time > datetime.now(timezone.utc):
        # Future time → schedule
        job_id = await scheduler_service.schedule_post(str(post.id), post.scheduled_time)
        return {"message": "Post scheduled", "job_id": job_id}

    # No time or past time → publish immediately
    results = {}
    for platform in post.platforms:
        results[platform] = await publish_to_platform(platform, post.content, post.media_paths)

    post.status = results
    await post.save()
    return {"message": "Post published", "results": results}
```

Single endpoint handles both "post now" and "schedule" — the branch is just the `scheduled_time` presence check. Immediate posts go synchronously; scheduled posts go through APScheduler.

---

## Pattern 11: Reddit media type routing

```python
# backend/app/controllers/post_reddit.py
def post_to_reddit(content: str, subreddit: str, media_paths: list[str] = None):
    if not media_paths:
        submission = sub.submit_selfpost(title=title, selftext=content)
    elif len(media_paths) == 1:
        if ext in _VIDEO_EXTS:
            submission = sub.submit_video(title=title, video_path=path)
        else:
            submission = sub.submit_image(title=title, image_path=path)
    else:
        # Gallery: images only, PRAW limitation
        image_paths = [p for p in media_paths if ext not in _VIDEO_EXTS]
        if image_paths:
            images = [{"image_path": p, "caption": ""} for p in image_paths]
            submission = sub.submit_gallery(title=title, images=images)
        else:
            # Mixed/video+image → fallback to self-text
            submission = sub.submit_selfpost(title=title, selftext=content)
```

PRAW limitation: galleries only support images. Mixed media (video + images) falls back to self-text post. Explicit fallback with `logger.warning` is better than silent failure.

---

## Pattern 12: Twitter dual-client (v1 for media, v2 for posting)

```python
# backend/app/services/x_client.py
def get_X_client():
    return tweepy.Client(  # API v2 — modern posting endpoint
        access_token=..., consumer_key=..., ...
    )

def get_X_v1_api():
    # API v1 — ONLY for media_upload (v2 has no media upload endpoint)
    auth = tweepy.OAuth1UserHandler(...)
    return tweepy.API(auth)

# Usage in post_x.py:
media = api_v1.media_upload(path)      # upload via v1
client.create_tweet(media_ids=[media.media_id])  # post via v2
```

Twitter quirk: media upload is v1 only. You need both clients simultaneously. This is a well-known Tweepy gotcha.

---

## Frontend Architecture (Reflex — Python-first)

Reflex compiles Python → React. The entire frontend is Python. No JavaScript written.

**State management** (`DashboardState(rx.State)`):
- Single state class with all UI state (content, platforms, scheduled_time, posts, filters, edit state)
- `@rx.var` = computed properties (pure derivations, like React useMemo)
- `@rx.event` = actions (like Redux reducers but async-capable)
- `@rx.event(background=True)` = async background task (non-blocking, yields updates)

**OG preview fetching** (background event pattern):
```python
@rx.event(background=True)
async def fetch_og_preview(self, url: str):
    async with self as state:        # acquire state lock
        state.is_fetching_og = True
    try:
        # ... httpx fetch, BeautifulSoup parse ...
        async with self as state:    # update state
            state.og_title = ...
    finally:
        async with self as state:
            state.is_fetching_og = False
```

Pattern: background tasks use `async with self as state` context manager to safely acquire/release state lock between yields.

**URL detection in content field:**
```python
@rx.event
def set_content(self, val: str):
    self.content = val
    urls = re.findall(r'https?://[^\s{}()<>]+...', val)
    if urls:
        first_url = urls[0].rstrip('.,!?;:')
        if first_url != self.og_url:
            return DashboardState.fetch_og_preview(first_url)  # trigger background event
```

**SSRF protection** on OG fetch:
```python
def _is_safe_url(self, url: str) -> tuple[bool, str]:
    parsed = urlparse(url.strip())
    if parsed.scheme != "https": return False, "Only HTTPS URLs allowed."
    if not parsed.hostname: return False, "URL has no hostname."
    return True, ""
```

Explicit redirect validation: follows redirects manually (not `follow_redirects=True`) to re-validate each hop.

**Character limits per platform:**
```python
limits = {"x": 500, "reddit": 40000, "telegram": 4096, "discord": 2000, "bluesky": 300}

@rx.var
def max_characters(self) -> int:
    if not self.platforms: return 2000
    return min([self.limits.get(p, 2000) for p in self.platforms])  # strictest limit wins
```

**Datetime UTC normalization** (frontend → backend):
```python
def _parse_to_utc(self, raw_time: str) -> str | None:
    # Handles: "2026-03-05T20:30:00.000Z" (ISO with Z)
    # And: "2026-03-06 02:00" (naive local time from picker)
    if "T" in raw_time and raw_time.endswith("Z"):
        return datetime.fromisoformat(raw_time.replace("Z", "+00:00")).astimezone(pytz.utc)
    # Naive → detect local timezone → convert to UTC
    local_tz = get_localzone()
    local_dt = pytz.timezone(str(local_tz)).localize(naive, is_dst=None)
    return local_dt.astimezone(pytz.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
```

**Per-platform preview cards** (Reflex component pattern):
```python
def platform_previews_panel() -> rx.Component:
    return rx.vstack(
        rx.cond(DashboardState.preview_platforms.contains("x"), x_preview_card()),
        rx.cond(DashboardState.preview_platforms.contains("telegram"), telegram_preview_card()),
        # ...
    )
```

Each platform card mimics the real UI (X dark theme, Telegram bubble, Discord dark channel, Reddit). OG preview card is shared across X/Reddit/Telegram; Discord has a custom left-border embed variant.

---

## Infrastructure

```yaml
# docker-compose.yml
services:
  api:   # FastAPI + uvicorn, port 8000
    build: ./backend
    env_file: .env
    depends_on: [mongo]
  frontend:  # Reflex, port 3000
    build: ./frontend
    environment:
      - API_URL=http://api:8000  # internal Docker network
    depends_on: [api]
  mongo:
    image: mongo:7
    volumes:
      - mongo_data:/data/db  # persistent
```

Single `.env` at root, shared by both services. `POST4U_API_KEY` must be identical in both.

---

## What Post4U does NOT have (gaps for our reference)

1. **No multi-account support** — one set of credentials per platform in `.env`. No per-user credentials.
2. **No auth/login** — API key only. No user accounts, no sessions.
3. **No webhook handling** — push-only, no receiving events from platforms.
4. **No content queue** — no "queue X posts and publish one per day" pattern.
5. **No AI integration** — pure manual posting, no generation.
6. **No platform-specific formatting** — same content string goes to all platforms. No hashtag injection per platform, no truncation.
7. **No image generation** — uploads only, no generation.
8. **Media stored locally** (`app/static/`) — not in object storage. Lost on container rebuild.

---

## Applicability Map

### News.AI (adilflow_publisher)
| Post4U pattern | Application |
|---|---|
| APScheduler + MongoDBJobStore | Replace current in-memory scheduling with persistent jobs |
| `publish_with_retry` with `retry_platforms` | Per-platform retry (Instagram vs Telegram failures are independent) |
| `SchedulerService` abstraction | Wrap Brain's scheduling logic behind clean interface |
| Platform dispatcher with credential guard | adilflow_publisher already has this pattern but without guards |
| `run_in_executor` for sync SDKs | If/when adding sync platform SDKs |

### Omoikiri (wa-bridge)
| Post4U pattern | Application |
|---|---|
| Telegram media type routing (sendPhoto/sendVideo/sendMediaGroup) | Sending rich media back to WhatsApp via Telegram notifications |
| `secrets.compare_digest` for API key | wa-bridge internal API auth |
| Magic bytes file validation | Any media handling in wa-bridge |
| Single status dict per post: `{platform: {status, platform_post_id}}` | Tracking multi-channel message delivery status |

---

## Libraries used (Python backend)

| Library | Purpose |
|---|---|
| `fastapi` | HTTP framework |
| `beanie` | MongoDB ODM (async, Pydantic-based) |
| `motor` | Async MongoDB driver (under Beanie) |
| `apscheduler` | Job scheduling (3.x, AsyncIOScheduler) |
| `pymongo` | Sync MongoDB client (for APScheduler jobstore only) |
| `tweepy` | Twitter/X API client (v1 + v2) |
| `praw` | Reddit API client |
| `atproto` | Bluesky AT Protocol client |
| `python-magic` | Magic bytes MIME detection |
| `pyrate-limiter` + `fastapi-limiter` | Rate limiting |
| `pydantic-settings` | Settings from .env |
| `werkzeug` | `secure_filename` for upload sanitization |
