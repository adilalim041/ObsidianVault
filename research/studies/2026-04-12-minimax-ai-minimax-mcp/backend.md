# MiniMax-MCP — Backend Analysis

**Repo:** MiniMax-AI/MiniMax-MCP
**Analyzed:** 2026-04-12
**Score:** 7.2
**Language:** Python
**Relevant to:** News.AI (content generation), Nexus (media providers)

---

## What It Is

Official MCP (Model Context Protocol) server by MiniMax exposing their media generation APIs as tools:
- Text-to-speech (TTS) with emotion/voice control
- Voice cloning (upload audio -> register custom voice)
- Voice design (generate voice from text description)
- Text-to-video with camera movement instructions
- Text-to-image
- Music generation from prompt + lyrics

Transport: stdio (local) or SSE (cloud-deployable). Built on `FastMCP` (the high-level MCP framework).

---

## Pattern 1: Dual resource mode — URL vs local file

The entire server has a single `resource_mode` env var that switches output between returning a URL or downloading to local disk. Every generation tool checks this before writing:

```python
resource_mode = os.getenv(ENV_RESOURCE_MODE) or RESOURCE_MODE_URL

# In text_to_audio:
if resource_mode == RESOURCE_MODE_URL:
    payload["output_format"] = "url"

# After API call:
if resource_mode == RESOURCE_MODE_URL:
    return TextContent(type="text", text=f"Success. Audio URL: {audio_data}")

# Otherwise: hex-decode bytes and write to disk
audio_bytes = bytes.fromhex(audio_data)
with open(output_path / output_file_name, "wb") as f:
    f.write(audio_bytes)
```

**Constants:**
```python
RESOURCE_MODE_LOCAL = "local"
RESOURCE_MODE_URL = "url"
```

**Why it matters for News.AI / Nexus:** This is the exact pattern needed for `adilflow_generator`. When running on Railway (cloud), always use URL mode — the generated file is served by MiniMax's CDN, you just store the URL in the DB. When running locally/testing, download to disk. No code changes needed between environments — just flip `MINIMAX_API_RESOURCE_MODE`.

---

## Pattern 2: Async video generation with polling loop

Video generation is inherently async (takes 2-10 minutes). MiniMax implements a 3-step pipeline with a blocking poll loop:

```python
# Step 1: submit task -> get task_id
response_data = api_client.post("/v1/video_generation", json=payload)
task_id = response_data.get("task_id")

if async_mode:
    return TextContent(text=f"Task ID: {task_id}. Use query_video_generation to check.")

# Step 2: poll until done
max_retries = 30        # 10 minutes (30 * 20s)
retry_interval = 20     # seconds

if model == "MiniMax-Hailuo-02":
    max_retries = 60    # 20 minutes for premium model

for attempt in range(max_retries):
    status_response = api_client.get(f"/v1/query/video_generation?task_id={task_id}")
    status = status_response.get("status")
    
    if status == "Fail":
        raise MinimaxRequestError(f"Video generation failed for task_id: {task_id}")
    elif status == "Success":
        file_id = status_response.get("file_id")
        break
    
    time.sleep(retry_interval)

# Step 3: retrieve download URL from file_id
file_response = api_client.get(f"/v1/files/retrieve?file_id={file_id}")
download_url = file_response.get("file", {}).get("download_url")
```

**Critical flaw for production:** `time.sleep()` in a synchronous MCP handler blocks the entire process. For News.AI's `adilflow_generator`, this must be rewritten using async polling with `asyncio.sleep()` or dispatched to a background job (pg-boss/BullMQ).

**Key insight:** The API separates concerns — submit returns task_id, poll returns file_id, retrieve returns download URL. Three distinct endpoints, not one. This 3-step pattern is common in video/image generation APIs (Luma, Runway, etc.).

**`async_mode=True`** is exposed as a tool parameter — the LLM can choose to get just the task_id and poll later via `query_video_generation` tool. This is the right choice for agentic workflows where the LLM controls the loop.

---

## Pattern 3: Application-layer error code handling on top of HTTP status

MiniMax returns HTTP 200 even for business errors. The actual error is in `base_resp.status_code` in the JSON body:

```python
data = response.json()

base_resp = data.get("base_resp", {})
if base_resp.get("status_code") != 0:
    match base_resp.get("status_code"):
        case 1004:
            raise MinimaxAuthError(
                f"API Error: {base_resp.get('status_msg')}, please check your API key and API host."
                f"Trace-Id: {response.headers.get('Trace-Id')}"
            )
        case 2038:
            raise MinimaxRequestError(
                f"API Error: should complete real-name verification ..."
                f"Trace-Id: {response.headers.get('Trace-Id')}"
            )
        case _:
            raise MinimaxRequestError(
                f"API Error: {base_resp.get('status_code')}-{base_resp.get('status_msg')} "
                f"Trace-Id: {response.headers.get('Trace-Id')}"
            )
```

**Exception hierarchy:**
```
MinimaxAPIError (base)
├── MinimaxAuthError       — auth failures (1004)
├── MinimaxRequestError    — business-level failures
├── MinimaxTimeoutError    — timeout
├── MinimaxValidationError — validation
└── MinimaxMcpError        — filesystem/MCP-layer errors
```

**Why it matters:** This 2-layer error check (HTTP status + JSON body status) is a common pattern in Chinese cloud APIs (Alibaba, Tencent, MiniMax all do this). When integrating MiniMax into News.AI's generator, p-retry must distinguish `MinimaxAuthError` (never retry) from `MinimaxRequestError` (may retry on transient codes) from HTTP 5xx (retry with backoff).

The `Trace-Id` header is included in every error — essential for debugging production issues.

---

## Pattern 4: Content-Type auto-management for multipart uploads

The API client handles file uploads by dynamically removing the `Content-Type` header to let `requests` set the multipart boundary:

```python
def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
    url = f"{self.api_host}{endpoint}"
    
    files = kwargs.get('files')
    if not files:
        self.session.headers['Content-Type'] = 'application/json'
    else:
        # Remove Content-Type for multipart/form-data
        # requests library will set it automatically with the correct boundary
        self.session.headers.pop('Content-Type', None)
    
    response = self.session.request(method, url, **kwargs)
```

The voice clone tool shows the full upload flow:

```python
# URL input: stream download, pass raw to upload
response = requests.get(file, stream=True)
files = {'file': ('audio_file.mp3', response.raw, 'audio/mpeg')}
data = {'purpose': 'voice_clone'}
response_data = api_client.post("/v1/files/upload", files=files, data=data)

# Local file: open binary and pass directly
with open(file, 'rb') as f:
    files = {'file': f}
    data = {'purpose': 'voice_clone'}
    response_data = api_client.post("/v1/files/upload", files=files, data=data)

file_id = response_data.get("file", {}).get("file_id")

# Step 2: reference file_id in the clone request (no re-upload)
payload = {"file_id": file_id, "voice_id": voice_id}
response_data = api_client.post("/v1/voice_clone", json=payload)
```

**The pattern:** upload-then-reference (not inline base64 in the generation request). The `purpose` field on upload routes the file to the right processing pipeline.

**Tip:** Explicit `Content-Type: audio/mpeg` in the files tuple is important — without it requests may sniff the MIME type incorrectly from raw stream data.

---

## Pattern 5: Fuzzy filename suggestion on missing file error

When a user provides a wrong file path, instead of a bare "file not found" error, the server does fuzzy matching against the directory:

```python
def process_input_file(file_path: str, audio_content_check: bool = True) -> Path:
    path = Path(file_path)
    
    if not path.exists() and path.parent.exists():
        parent_directory = path.parent
        similar_files = try_find_similar_files(path.name, parent_directory)
        similar_files_formatted = ",".join([str(file) for file in similar_files])
        
        if similar_files:
            raise MinimaxMcpError(
                f"File ({path}) does not exist. Did you mean any of these files: {similar_files_formatted}?"
            )
        raise MinimaxMcpError(f"File ({path}) does not exist")
```

The fuzzy matching uses `fuzzywuzzy.fuzz.token_sort_ratio` with a 70% similarity threshold, filtered to audio/video extensions only:

```python
def find_similar_filenames(target_file: str, directory: Path, threshold: int = 70):
    for root, _, files in os.walk(directory):
        for filename in files:
            similarity = fuzz.token_sort_ratio(target_filename, filename)
            if similarity >= threshold:
                similar_files.append((file_path, similarity))
    similar_files.sort(key=lambda x: x[1], reverse=True)
    return similar_files

def try_find_similar_files(filename: str, directory: Path, take_n: int = 5):
    similar_files = find_similar_filenames(filename, directory)
    filtered_files = [path for path, _ in similar_files[:take_n] if check_audio_file(path)]
    return filtered_files
```

**Why it matters for MCP context:** In an LLM-driven workflow, the AI may get a filename slightly wrong (case, spacing, numbering). Returning suggestions in the error message lets the LLM self-correct in the next tool call without requiring human intervention.

---

## Pattern 6: Output path resolution with base_path override

The output path system handles 4 cases cleanly:

```python
def build_output_path(output_directory: str | None, base_path: str | None = None) -> Path:
    if base_path is None:
        base_path = str(Path.home() / "Desktop")
    
    if output_directory is None:
        output_path = Path(os.path.expanduser(base_path))          # use base_path
    elif not os.path.isabs(os.path.expanduser(output_directory)):
        output_path = Path(os.path.expanduser(base_path)) / Path(output_directory)  # relative: join with base
    else:
        output_path = Path(os.path.expanduser(output_directory))   # absolute: use as-is
    
    if not is_file_writeable(output_path):
        raise MinimaxMcpError(f"Directory ({output_path}) is not writeable")
    output_path.mkdir(parents=True, exist_ok=True)
    return output_path
```

Filenames are timestamped and tool-prefixed: `{tool}_{text_prefix}_{YYYYMMDD_HHMMSS}.{ext}`

```python
def build_output_file(tool: str, text: str, output_path: Path, extension: str, full_id: bool = False) -> Path:
    id = text if full_id else text[:10]
    output_file_name = f"{tool}_{id.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{extension}"
    return output_path / output_file_name
```

The `full_id=True` flag is used for video where the `task_id` (a full UUID-like string) is more informative than a prompt truncation.

---

## Pattern 7: Cost-warning annotations in tool descriptions

Every tool that incurs API cost has an explicit warning embedded in the MCP tool description:

```python
@mcp.tool(
    description="""Convert text to audio with a given voice...

    COST WARNING: This tool makes an API call to Minimax which may incur costs.
    Only use when explicitly requested by the user.
    ...
    """
)
```

Tools without cost (e.g. `list_voices`) have no warning. This is important because MCP clients pass tool descriptions to the LLM as part of the context — the LLM respects the warning and only calls cost-bearing tools when the user explicitly asks.

**For Nexus:** Nexus's `media_providers.py` should adopt this same pattern when exposed as MCP tools — annotate Gemini image gen, Veo 3.1 video gen, and voice cloning as cost-bearing.

---

## API Surface Reference

| Endpoint | Method | Tool |
|---|---|---|
| `/v1/t2a_v2` | POST | `text_to_audio` |
| `/v1/get_voice` | POST | `list_voices` |
| `/v1/files/upload` | POST | `voice_clone` step 1 |
| `/v1/voice_clone` | POST | `voice_clone` step 2 |
| `/v1/voice_design` | POST | `voice_design` |
| `/v1/video_generation` | POST | `generate_video` step 1 |
| `/v1/query/video_generation?task_id=X` | GET | polling / `query_video_generation` |
| `/v1/files/retrieve?file_id=X` | GET | `generate_video` step 3 |
| `/v1/image_generation` | POST | `text_to_image` |
| `/v1/music_generation` | POST | `music_generation` |

**Region split:** Global (`api.minimax.io`) vs Mainland China (`api.minimaxi.com`). Key and host must match — cross-region causes auth failure. This must be an explicit env var, not hardcoded.

**Models:**
- TTS: `speech-2.6-hd`
- T2V: `MiniMax-Hailuo-2.3`, `MiniMax-Hailuo-02` (premium, longer timeout)
- I2V: `I2V-01`, `I2V-01-Director`, `I2V-01-live`
- Image: `image-01`
- Music: `music-2.0`

---

## Relevance to Projects

### News.AI (adilflow_generator)

MiniMax is a direct alternative/supplement to Gemini for the generator service:

1. **TTS for video posts** — News.AI currently has no audio generation. MiniMax TTS could generate voiceovers for news clips: `text_to_audio(text=headline + summary, voice_id="audiobook_male_1", language_boost="Russian")`

2. **Image generation** — `text_to_image` with `aspect_ratio="16:9"` for news cover images. Alternative to Gemini when billing is unavailable. The `prompt_optimizer=True` flag auto-enhances prompts.

3. **Integration pattern:** Wrap in `p-retry` (3 retries, abort on `MinimaxAuthError`), use URL mode on Railway (avoid downloading to ephemeral disk), store the URL in Supabase `articles.generated_image_url`.

4. **Async video generation:** For future video content, submit with `async_mode=True`, store `task_id` in DB, use pg-boss to poll `query_video_generation` every 20s.

**Gotcha:** MiniMax TTS returns audio as **hex-encoded bytes in a JSON field** (not a file download or base64). `bytes.fromhex(audio_data)` is the decode. This is unusual and will surprise anyone who expects binary HTTP responses.

### Nexus.AI (media_providers.py)

Nexus's current `media_providers.py` has Gemini (images) + Veo 3.1/Luma (video). MiniMax adds:

1. **Voice cloning** — Adil could clone his own voice once, then use `text_to_audio(voice_id="adil-voice")` for all TTS in Nexus.

2. **Music generation** — For creative tasks in Nexus.

3. **Pattern adoption:** Nexus should adopt the `resource_mode` env var pattern from MiniMax — a single `MEDIA_RESOURCE_MODE=url|local` env var that all media providers respect. Currently Nexus always downloads to disk (synchronous, blocks).

4. **Voice design** — Describe a voice in natural language and get a `voice_id` back. Useful for having Nexus generate situational TTS (formal for business tasks, casual for reminders).

---

## Weaknesses / What Not to Copy

1. **Synchronous polling with `time.sleep()`** — blocks the process. In News.AI use BullMQ/pg-boss + async polling job.

2. **No retry logic in the client** — `MinimaxAPIClient._make_request()` has zero retry. For production use, wrap every call in `p-retry` (Node) or `tenacity` (Python).

3. **Requests library** (not httpx/aiohttp) — synchronous only. Fine for a desktop MCP server; wrong for Railway microservices. Nexus's `media_providers.py` already has this same problem.

4. **`fuzzywuzzy` dependency** — uses `python-Levenshtein` under the hood. The modern replacement is `rapidfuzz` (same API, faster, no C extension issues).

5. **No streaming for TTS** — the API supports `stream` on music but the server doesn't expose it. Streaming would be better for long texts (return first chunk faster).

6. **Demo API key in `mcp_server_config_demo.json`** — the demo config file has a real-looking JWT as the API key. This is a fake demo key but is bad practice in a public repo.
