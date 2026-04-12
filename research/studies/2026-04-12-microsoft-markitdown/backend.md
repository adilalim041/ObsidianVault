# MarkItDown — Backend Analysis

**Repo:** microsoft/markitdown
**Date:** 2026-04-12
**Score:** 7.3
**Stack:** Python 3.10+, no web framework, pure library

---

## What it is

A Python library that converts files (PDF, DOCX, PPTX, XLSX, images, audio, HTML, EPUB, ZIP, Jupyter notebooks, RSS, YouTube, Bing SERP) into Markdown text. Designed for LLM pipelines that need to ingest documents as plain text. Ships as a pip package, also as an MCP server.

---

## Pattern 1: Priority-based converter chain with graceful degradation

The core `_convert()` loop tries every converter in priority order. Each converter declares whether it `accepts()` the file, and if it does, `convert()` is called. Failures are accumulated (not thrown immediately). Only if every converter that accepted the file also failed does the engine raise `FileConversionException` with all failure info.

```python
# PRIORITY_SPECIFIC_FILE_FORMAT = 0.0 (most converters)
# PRIORITY_GENERIC_FILE_FORMAT = 10.0 (PlainText, HTML, Zip — tried LAST)
sorted_registrations = sorted(self._converters, key=lambda x: x.priority)
# Lower value = higher priority = tried FIRST

for stream_info in stream_info_guesses + [StreamInfo()]:
    for converter_registration in sorted_registrations:
        _accepts = converter.accepts(file_stream, stream_info, **_kwargs)
        if _accepts:
            try:
                res = converter.convert(file_stream, stream_info, **_kwargs)
            except Exception:
                failed_attempts.append(FailedConversionAttempt(...))
            finally:
                file_stream.seek(cur_pos)  # ALWAYS reset stream
```

Key: the file stream position is ALWAYS reset in `finally` after each attempt. The `accepts()` contract also must not advance the stream — if reading is needed (e.g., `IpynbConverter` reads to check `nbformat`), the position must be restored.

**OCR plugin override trick:** the `markitdown-ocr` plugin registers its converters with `priority=-1.0`, which places them BEFORE the built-ins at `0.0`. This is how plugins can replace built-in behavior without touching core code.

**Application to Nexus:** For Nexus document processing, build a chain: try specialized extractor first (e.g., pdfplumber), fall back to pdfminer, fall back to LLM OCR. Record each failure instead of bailing early.

---

## Pattern 2: Magika-based stream type detection with multi-guess fallback

MarkItDown does not rely solely on file extension or MIME type. It uses **Google Magika** (ML-based binary content classifier) on the raw stream bytes to independently guess the file type.

The `_get_stream_info_guesses()` method produces a **list** of `StreamInfo` objects:
- First guess: combined from extension/MIME + magika (when they agree)
- If they conflict: both guesses are added — the explicit one first, then magika's
- Final fallback: empty `StreamInfo()` — some converters accept everything

```python
result = self._magika.identify_stream(file_stream)
if result.prediction.output.is_text:
    stream_page = file_stream.read(4096)
    charset_result = charset_normalizer.from_bytes(stream_page).best()
    charset = self._normalize_charset(charset_result.encoding)
```

Also uses `charset-normalizer` to detect text encoding from the first 4 KB of content. This covers mislabeled files (e.g., `.txt` file that is actually JSON, or file with no extension).

The HTTP client sends `Accept: text/markdown, text/html;q=0.9, text/plain;q=0.8, */*;q=0.1` to prefer Markdown responses from servers that support content negotiation (Cloudflare Markdown-for-agents).

**Application to Nexus `web_parser.py`:** Instead of just checking URL extension, pipe downloaded bytes through magika + charset-normalizer before deciding how to parse. Handles RSS/Atom feeds served as `application/octet-stream`.

---

## Pattern 3: Frozen immutable `StreamInfo` with `copy_and_update` merging

`StreamInfo` is a frozen dataclass — all fields optional, all default None. Updates are done by creating new instances:

```python
@dataclass(kw_only=True, frozen=True)
class StreamInfo:
    mimetype: Optional[str] = None
    extension: Optional[str] = None
    charset: Optional[str] = None
    filename: Optional[str] = None
    local_path: Optional[str] = None
    url: Optional[str] = None

    def copy_and_update(self, *args, **kwargs):
        new_info = asdict(self)
        for si in args:
            new_info.update({k: v for k, v in asdict(si).items() if v is not None})
        return StreamInfo(**new_info)
```

None values are never merged over existing values — only non-None values win. This lets you layer metadata from multiple sources (file path, HTTP headers, content-disposition, magika) without losing earlier info.

**Application to Nexus:** Use this pattern for building context objects that accumulate across processing pipeline stages (intent classification, memory lookup, response generation).

---

## Pattern 4: HTML as universal intermediate format for structured converters

DOCX, XLSX, PPTX, EPUB all convert to HTML first, then use the shared `HtmlConverter` → `_CustomMarkdownify` path. This means they get table formatting, heading normalization, and link sanitization for free.

```python
# DocxConverter: DOCX → mammoth → HTML → _CustomMarkdownify → Markdown
pre_process_stream = pre_process_docx(file_stream)  # converts OMML math to LaTeX first
return self._html_converter.convert_string(
    mammoth.convert_to_html(pre_process_stream, style_map=style_map).value,
    **kwargs,
)

# XlsxConverter: each sheet → pandas → df.to_html() → HtmlConverter
html_content = sheets[s].to_html(index=False)
md += self._html_converter.convert_string(html_content, **kwargs).markdown.strip()

# PptxConverter tables: table → handwritten <table> HTML string → HtmlConverter
html_table = "<html><body><table>..."
return self._html_converter.convert_string(html_table, **kwargs).markdown.strip()
```

`_CustomMarkdownify` extends `markdownify.MarkdownConverter` with:
- Javascript link removal (only `http`, `https`, `file` schemes survive)
- data: URI truncation to `data:...` unless `keep_data_uris=True`
- Checkbox inputs converted to `[x]`/`[ ]` syntax
- Heading always starts on a new line

**DOCX math preprocessing:** Before passing to mammoth, the DOCX ZIP is unpacked in-memory, `word/document.xml` + footnotes/endnotes are parsed with BeautifulSoup, OMML (Office Math Markup Language) `<oMath>` tags are converted to LaTeX `$...$` / `$$...$$`, then re-zipped and passed to mammoth. All in-memory, no temp files.

**Application to Nexus `web_parser.py`:** Already uses BeautifulSoup — add a `convert_to_markdown()` step using markdownify after extracting the body, instead of returning raw HTML or plain text stripping.

---

## Pattern 5: Lazy import with deferred exception storage for optional dependencies

Every converter that needs optional packages uses the same pattern: import at module load time, catch ImportError, store the exc_info for later. The `MissingDependencyException` is only raised when `convert()` is actually called.

```python
_dependency_exc_info = None
try:
    import pdfminer
    import pdfplumber
except ImportError:
    _dependency_exc_info = sys.exc_info()

class PdfConverter(DocumentConverter):
    def convert(self, ...):
        if _dependency_exc_info is not None:
            raise MissingDependencyException(
                MISSING_DEPENDENCY_MESSAGE.format(...)
            ) from _dependency_exc_info[1].with_traceback(_dependency_exc_info[2])
```

The `MISSING_DEPENDENCY_MESSAGE` template includes the exact pip install command. This means: the library loads fine without any optional deps; you only get an error when you try to use a converter whose deps are missing; and the error message tells you exactly what to install.

Since `accepts()` still returns True even without the dep, the converter will be tried and raise `MissingDependencyException`. This exception is caught and stored in `failed_attempts`. If no other converter succeeds, the full `FileConversionException` with all attempts is raised. The user sees all failures, not just "no converter found."

**Application to Nexus/News.AI:** Use this pattern for AI provider deps (e.g., `import google.generativeai`). The bot can start and partially work even if one AI provider's package is missing.

---

## Pattern 6: PDF table extraction using word position clustering (no borders needed)

MarkItDown does NOT use pdfplumber's built-in `extract_tables()` (which requires visible table borders). Instead it implements a custom algorithm on word bounding boxes:

1. Extract all words with `page.extract_words(keep_blank_chars=True, x_tolerance=3, y_tolerance=3)`
2. Group by Y position (tolerance = 5pt) → rows
3. Cluster X positions across all rows with 3+ columns → global column boundaries
4. Use **adaptive tolerance** based on 70th percentile of inter-column gaps, clamped to [25, 50]
5. Classify each row as "table row" if its words align with 2+ global columns
6. Only emit as table if 20%+ of rows are table rows (prevents false positives on prose)
7. For form-style pages: detect paragraph rows by `line_width > page_width * 0.55 AND len > 60`
8. Fall back to pdfminer for whole-document extraction when no form pages detected

Per-page memory management: `page.close()` is called immediately after processing each page to free pdfplumber's cached objects. This keeps memory constant regardless of PDF page count.

**Application:** Any document parser that handles invoices, receipts, or spec sheets without predefined templates. Replaces fragile regex table detection with geometry-based clustering.

---

## Pattern 7: Entry-point plugin system with priority injection

Third-party plugins are Python packages that:
1. Declare an entry point in `pyproject.toml`: `[project.entry-points."markitdown.plugin"]`
2. Export `__plugin_interface_version__ = 1`
3. Export `register_converters(markitdown: MarkItDown, **kwargs)` function

Plugins are lazy-loaded (only when `enable_plugins=True`). Load failures are caught and emitted as warnings — a bad plugin never crashes the host.

```python
for entry_point in entry_points(group="markitdown.plugin"):
    try:
        _plugins.append(entry_point.load())
    except Exception:
        warn(f"Plugin '{entry_point.name}' failed to load ... skipping:\n{tb}")
```

The `**kwargs` threading: `MarkItDown.__init__(**kwargs)` → `enable_builtins(**kwargs)` → `register_converter(SomeConverter(...kwargs...))`. The same kwargs (e.g., `llm_client`, `llm_model`, `docintel_endpoint`) flow from construction all the way to every converter instance. Plugins receive the same kwargs in `register_converters(markitdown, **kwargs)`.

**Application to News.AI parser service:** Build a plugin-style registry for output formatters (Markdown, JSON, plain text), where each formatter declares what MIME types it handles. New output formats can be added as packages without touching core.

---

## Format-specific details

### Images
- Metadata via `exiftool` subprocess (stdin pipe, `-json -` flag, checks version >= 12.24 for CVE-2021-22204)
- LLM description via OpenAI-compatible `client.chat.completions.create()` with base64 data URI
- Without both, produces empty markdown (no error)
- PPTX images: base64 embed if `keep_data_uris=True`, else placeholder filename

### Audio
- Metadata via exiftool (Title, Artist, etc.)
- Transcription via `speech_recognition` library (Google Web Speech API)
- Supports WAV, MP3, M4A/MP4

### YouTube
- URL-based routing: `accepts()` checks `stream_info.url.startswith("https://www.youtube.com/watch?")`
- Extracts metadata from `<meta>` tags + `ytInitialData` JSON in script tags
- Transcript via `youtube-transcript-api`, with 3-retry + 2s delay built-in
- Falls back to translation if English not available

### ZIP
- Recursive: each file inside is converted by calling `self._markitdown.convert_stream()` — the parent MarkItDown instance is injected at construction
- Skips silently on `UnsupportedFormatException` and `FileConversionException`
- This creates a circular reference: ZipConverter holds MarkItDown, MarkItDown holds ZipConverter

### EPUB
- Uses `defusedxml` (not stdlib minidom) to prevent XXE attacks
- Reads `META-INF/container.xml` → finds `.opf` path → extracts spine order → converts HTML files in order
- Prepends metadata block (title, authors, language, publisher, date, description)

### Jupyter Notebooks
- Deep content check in `accepts()`: reads stream to check for `"nbformat"` and `"nbformat_minor"` strings, then resets position
- Code cells: wrapped in ` ```python ``` ` blocks
- Raw cells: wrapped in ` ``` ``` ` blocks
- First `# heading` in markdown cells extracted as document title

### Azure Document Intelligence
- Registered ONLY if `docintel_endpoint` kwarg is provided at MarkItDown construction
- Registered at default priority 0.0 but inserted at the top of the list (most recently registered = first in stable sort)
- Strips HTML comments from the AI-generated markdown output
- Office formats (DOCX, PPTX, XLSX) use the service without OCR features; PDF/images get `FORMULAS + OCR_HIGH_RESOLUTION + STYLE_FONT`

---

## Error handling taxonomy

| Exception | When |
|---|---|
| `UnsupportedFormatException` | No converter accepted the file at all |
| `FileConversionException` | At least one converter accepted but all failed — includes all error details |
| `MissingDependencyException` | Subclass of FileConversionException — raised inside convert() when optional dep absent |

Post-processing in `_convert()`: after a successful conversion, trailing whitespace is stripped per line, and 3+ consecutive blank lines are collapsed to 2. Always applied, regardless of converter.

---

## Dependencies map

| Format | Library |
|---|---|
| PDF | pdfminer.six + pdfplumber |
| DOCX | mammoth + lxml |
| XLSX/XLS | pandas + openpyxl/xlrd |
| PPTX | python-pptx |
| Audio | pydub + SpeechRecognition |
| HTML→MD | markdownify + beautifulsoup4 |
| File type detection | magika (Google ML model) |
| Charset detection | charset-normalizer |
| XML safety | defusedxml |
| Image/audio metadata | exiftool (external process) |
| Azure OCR | azure-ai-documentintelligence + azure-identity |
| YouTube | youtube-transcript-api |

Core (always installed): beautifulsoup4, requests, markdownify, magika, charset-normalizer, defusedxml.

---

## Relevance to Nexus.AI

Nexus has `web_parser.py` (Jina + BeautifulSoup fallback) and handles user-uploaded content via Telegram. Directly applicable:

1. **Document processing handler** — add `markitdown` as a dep. When user sends a file (PDF, DOCX, XLSX), run `MarkItDown().convert(BytesIO(file_bytes), stream_info=StreamInfo(extension=ext))`. Pass result to Gemini for summarization or Q&A. Replaces ad-hoc file handling in `handlers/messages.py`.

2. **README extraction for research pipeline** — `web_parser.py` currently fetches HTML. For GitHub README URLs, fetch the raw `.md` directly. For other doc pages, MarkItDown's HTML→Markdown conversion is cleaner than raw BeautifulSoup text stripping.

3. **Priority chain pattern** — Nexus's `media_providers.py` already has Veo → Luma fallback. The MarkItDown pattern formalizes this: each provider is a "converter", failures are accumulated, error messages combine all attempts.

4. **Lazy import pattern** — Nexus imports all providers at module load. Adopt deferred import + stored exc_info so Nexus starts even when one AI provider's SDK is missing/broken.

5. **Frozen context object (`StreamInfo`)** — Nexus passes `creds` objects through call chains. Replace dict passing with a frozen dataclass with `copy_and_update()` for immutable context threading.
