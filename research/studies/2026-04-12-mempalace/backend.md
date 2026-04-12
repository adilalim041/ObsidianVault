# MemPalace — Deep Backend Analysis
**Date:** 2026-04-12
**Repo:** `C:/Users/User/Desktop/_study_tmp/mempalace/`
**Stars:** 21.8k | **License:** MIT | **Lang:** Python
**Benchmark:** 96.6% LongMemEval (best known result for AI memory systems)

> ВАЖНО: 96.6% достигается в raw-режиме (verbatim хранение). AAAK (сжатие) — отдельный слой, НЕ влияет на benchmark score.

---

## Что такое MemPalace

MemPalace — это AI memory system для Claude Code / Codex / любого LLM. Хранит воспоминания в ChromaDB (векторная БД) + SQLite (knowledge graph). Всё локально, без облака, без подписок.

Архитектурная метафора — дворец памяти:
- **Palace** = вся БД
- **Wing** = проект или тема (например, `wing_code`, `wing_user`, `wing_myproject`)
- **Hall** = тип информации внутри wing (например, `hall_facts`, `hall_events`, `hall_decisions`)
- **Room** = конкретная идея/тема (например, `chromadb-setup`, `gpu-pricing`)
- **Drawer** = один chunk текста (verbatim, 800 chars), хранится в ChromaDB
- **Closet** = AAAK-сжатая версия drawer (структурированный summary)

---

## Паттерн 1: 4-Layer Memory Stack — wake-up за 600-900 токенов

Файл: `mempalace/layers.py`

Ключевой инсайт: не загружай всё при старте. Загружай минимум, остальное — по требованию.

```python
class MemoryStack:
    """
    Layer 0: Identity       (~100 tokens)   — ВСЕГДА. "Кто я?"
    Layer 1: Essential Story (~500-800)      — ВСЕГДА. Топ моменты из palace.
    Layer 2: On-Demand      (~200-500 each)  — По требованию, когда тема всплывает.
    Layer 3: Deep Search    (unlimited)      — Полный ChromaDB semantic search.
    """
    def wake_up(self, wing: str = None) -> str:
        parts = [self.l0.render(), ""]         # ~100 токенов
        parts.append(self.l1.generate())        # ~500-800 токенов
        return "\n".join(parts)                 # Итого: 600-900 токенов

    def recall(self, wing=None, room=None, n_results=10) -> str:
        return self.l2.retrieve(wing=wing, room=room, n_results=n_results)

    def search(self, query, wing=None, room=None, n_results=5) -> str:
        return self.l3.search(query, wing=wing, room=room, n_results=n_results)
```

**Layer 0** — просто файл `~/.mempalace/identity.txt`. Пишет пользователь вручную. ~100 токенов.

**Layer 1** — автогенерация из ChromaDB. Алгоритм:
1. Загрузить все drawers батчами по 500 (лимит SQLite переменных)
2. Скорить каждый по полям `importance` / `emotional_weight` / `weight` (fallback: 3)
3. Взять топ 15 drawers
4. Сгруппировать по room
5. Обрезать до 3200 chars (hard cap)

```python
class Layer1:
    MAX_DRAWERS = 15
    MAX_CHARS = 3200
    MAX_SCAN = 2000

    def generate(self) -> str:
        # Fetch all drawers in batches to avoid SQLite variable limit (~999)
        _BATCH = 500
        docs, metas = [], []
        offset = 0
        while True:
            kwargs = {"include": ["documents", "metadatas"], "limit": _BATCH, "offset": offset}
            if self.wing:
                kwargs["where"] = {"wing": self.wing}
            batch = col.get(**kwargs)
            # ...
            if len(batch_docs) < _BATCH or len(docs) >= self.MAX_SCAN:
                break

        # Score: importance > emotional_weight > weight (fallback: 3)
        scored = []
        for doc, meta in zip(docs, metas):
            importance = 3
            for key in ("importance", "emotional_weight", "weight"):
                val = meta.get(key)
                if val is not None:
                    importance = float(val)
                    break
            scored.append((importance, meta, doc))
```

**Применимость к нам:** Наш ObsidianVault — это и есть "palace" но файловый. Паттерн wake-up (L0+L1) напрямую применим к Nexus: загружать краткий identity.txt + топ learnings при старте сессии.

---

## Паттерн 2: ChromaDB с cosine distance + inode-based cache invalidation

Файл: `mempalace/mcp_server.py`, `mempalace/backends/chroma.py`

```python
# ВАЖНО: коллекция создаётся с hnsw:space=cosine
collection = client.get_or_create_collection(
    _config.collection_name,
    metadata={"hnsw:space": "cosine"}
)

# Cache invalidation через inode файла БД (не TTL!)
_palace_db_inode = 0

def _get_client():
    db_path = os.path.join(_config.palace_path, "chroma.sqlite3")
    try:
        current_inode = os.stat(db_path).st_ino
    except OSError:
        current_inode = 0

    if _client_cache is None or current_inode != _palace_db_inode:
        _client_cache = chromadb.PersistentClient(path=_config.palace_path)
        _collection_cache = None
        _palace_db_inode = current_inode
    return _client_cache
```

Почему inode? Потому что `repair`/`nuke`/`purge` операции полностью заменяют файл БД. Новый файл = новый inode = автоматически сброс кэша клиента. TTL не поможет — ты можешь получить 4-секундный stale client с полностью другой БД.

**Migration bug fix**: ChromaDB 0.6.x хранил `seq_id` как BLOB, версия 1.5.x ожидает INTEGER. Автомиграция не конвертировала существующие строки. Решение: патч ПЕРЕД созданием PersistentClient:

```python
def _fix_blob_seq_ids(palace_path: str):
    """Must run BEFORE PersistentClient is created (the compactor fires on init)."""
    db_path = os.path.join(palace_path, "chroma.sqlite3")
    with sqlite3.connect(db_path) as conn:
        for table in ("embeddings", "max_seq_id"):
            rows = conn.execute(
                f"SELECT rowid, seq_id FROM {table} WHERE typeof(seq_id) = 'blob'"
            ).fetchall()
            if rows:
                updates = [(int.from_bytes(blob, byteorder="big"), rowid) for rowid, blob in rows]
                conn.executemany(f"UPDATE {table} SET seq_id = ? WHERE rowid = ?", updates)
```

**Metadata cache с TTL 5 секунд:**
```python
_METADATA_CACHE_TTL = 5.0

def _get_cached_metadata(col, where=None):
    global _metadata_cache, _metadata_cache_time
    now = time.time()
    if where is None and _metadata_cache is not None and (now - _metadata_cache_time) < _METADATA_CACHE_TTL:
        return _metadata_cache
    result = _fetch_all_metadata(col, where=where)
    if where is None:
        _metadata_cache = result
        _metadata_cache_time = now
    return result
```

Фильтрованные запросы (`where != None`) никогда не кэшируются — слишком много вариантов.

**ChromaDB silent truncation**: `col.get()` без `limit` молча возвращает максимум 10,000 записей. Всегда пагинировать:

```python
def _fetch_all_metadata(col, where=None):
    """Paginate col.get() to avoid the 10K silent truncation limit."""
    total = col.count()
    all_meta = []
    offset = 0
    while offset < total:
        kwargs = {"include": ["metadatas"], "limit": 1000, "offset": offset}
        if where:
            kwargs["where"] = where
        batch = col.get(**kwargs)
        if not batch["metadatas"]:
            break
        all_meta.extend(batch["metadatas"])
        offset += len(batch["metadatas"])
    return all_meta
```

---

## Паттерн 3: Knowledge Graph на SQLite — временные факты (temporal triples)

Файл: `mempalace/knowledge_graph.py`

Конкурент Zep (который использует Neo4j за $25/mo+). MemPalace делает то же самое на SQLite локально.

**Схема:**
```sql
CREATE TABLE entities (
    id TEXT PRIMARY KEY,          -- lowercase_underscored
    name TEXT NOT NULL,
    type TEXT DEFAULT 'unknown',
    properties TEXT DEFAULT '{}'   -- JSON
);

CREATE TABLE triples (
    id TEXT PRIMARY KEY,
    subject TEXT NOT NULL,
    predicate TEXT NOT NULL,
    object TEXT NOT NULL,
    valid_from TEXT,              -- ISO date "2026-01-15"
    valid_to TEXT,                -- NULL = факт до сих пор актуален
    confidence REAL DEFAULT 1.0,
    source_closet TEXT,           -- ссылка на drawer
    source_file TEXT,
    FOREIGN KEY (subject) REFERENCES entities(id),
    FOREIGN KEY (object) REFERENCES entities(id)
);

CREATE INDEX idx_triples_valid ON triples(valid_from, valid_to);
```

**Временные запросы:**
```python
def query_entity(self, name: str, as_of: str = None, direction: str = "outgoing"):
    """as_of = "2026-01-15" — только факты, актуальные в эту дату"""
    if as_of:
        query += " AND (t.valid_from IS NULL OR t.valid_from <= ?) AND (t.valid_to IS NULL OR t.valid_to >= ?)"
        params.extend([as_of, as_of])
```

**Инвалидация фактов:**
```python
def invalidate(self, subject: str, predicate: str, obj: str, ended: str = None):
    """Факт больше не актуален — ставим valid_to, но НЕ удаляем."""
    ended = ended or date.today().isoformat()
    conn.execute(
        "UPDATE triples SET valid_to=? WHERE subject=? AND predicate=? AND object=? AND valid_to IS NULL",
        (ended, sub_id, pred, obj_id),
    )
```

**Дедупликация при добавлении:**
```python
# Проверяем существующий актуальный тройник перед вставкой
existing = conn.execute(
    "SELECT id FROM triples WHERE subject=? AND predicate=? AND object=? AND valid_to IS NULL",
    (sub_id, pred, obj_id),
).fetchone()
if existing:
    return existing["id"]  # Уже существует и актуален
```

**Потокобезопасность:** threading.Lock на все записи, WAL mode для чтения:
```python
self._lock = threading.Lock()
conn.execute("PRAGMA journal_mode=WAL")
```

**Применимость:** Наш ObsidianVault хранит факты в md-файлах без временных меток. KG-подход позволит отслеживать "Max начал ходить в школу 2025-09-01" + "Max перестал ходить в кружок 2026-02-15". Для Nexus — это прямая замена contacts/memory.db с temporal queries.

---

## Паттерн 4: MCP Server — Write-Ahead Log для аудита и anti-poisoning

Файл: `mempalace/mcp_server.py` строки 74-120

Каждая операция записи (add_drawer, delete_drawer, kg_add, diary_write) логируется в JSONL файл ПЕРЕД выполнением:

```python
_WAL_DIR = Path.home() / ".mempalace" / "wal"
_WAL_FILE = _WAL_DIR / "write_log.jsonl"

_WAL_REDACT_KEYS = frozenset({"content_preview", "entry_preview"})

def _wal_log(operation: str, params: dict, result: dict = None):
    """Append a write operation to the write-ahead log."""
    safe_params = {}
    for k, v in params.items():
        if k in _WAL_REDACT_KEYS:
            safe_params[k] = f"[REDACTED {len(v)} chars]" if isinstance(v, str) else "[REDACTED]"
        else:
            safe_params[k] = v
    entry = {
        "timestamp": datetime.now().isoformat(),
        "operation": operation,
        "params": safe_params,
        "result": result,
    }
    # O_APPEND гарантирует атомарность на уровне ОС
    fd = os.open(str(_WAL_FILE), os.O_WRONLY | os.O_APPEND | os.O_CREAT, 0o600)
    with os.fdopen(fd, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, default=str) + "\n")
```

Зачем это нужно: защита от memory poisoning. Если AI-агент или внешний источник записывает что-то плохое в память — есть полный аудитный след для rollback.

Дополнительная безопасность: права `0o600` на WAL файл и `0o700` на директорию. Pre-create с правильными правами перед первым открытием:
```python
if not _WAL_FILE.exists():
    _WAL_FILE.touch(mode=0o600)
```

**Idempotency add_drawer через детерминированный ID:**
```python
drawer_id = f"drawer_{wing}_{room}_{hashlib.sha256((wing + room + content[:100]).encode()).hexdigest()[:24]}"

# Idempotency: если ID уже существует — возвращаем success без дублирования
existing = col.get(ids=[drawer_id])
if existing and existing["ids"]:
    return {"success": True, "reason": "already_exists", "drawer_id": drawer_id}
```

---

## Паттерн 5: Query Sanitizer — защита от system prompt contamination

Файл: `mempalace/query_sanitizer.py`

**Проблема (Issue #333):** AI-агент иногда передаёт в search query весь system prompt (2000+ chars). Embedding модель представляет конкатенированную строку как один вектор, где system prompt перекрывает реальный вопрос (10-50 chars). Результат: деградация retrieval с 89.8% до 1.0% — тихое катастрофическое падение.

**4-ступенчатый fallback:**
```python
MAX_QUERY_LENGTH = 500   # выше = system prompt почти наверняка доминирует
SAFE_QUERY_LENGTH = 200  # ниже = query чистый

def sanitize_query(raw_query: str) -> dict:
    # Step 1: короткий query — пропускаем без изменений
    if len(raw_query) <= SAFE_QUERY_LENGTH:
        return {"clean_query": raw_query, "was_sanitized": False, "method": "passthrough"}

    # Step 2: найти вопросительное предложение (? в конце)
    # Идём с конца (последний вопрос = скорее всего реальный query)
    question_sentences = []
    for seg in reversed(all_segments):
        if _QUESTION_MARK.search(seg):
            question_sentences.append(seg)

    # Step 3: последнее осмысленное предложение
    # System prompts prepended = реальный query в конце
    for seg in reversed(all_segments):
        if len(seg) >= MIN_QUERY_LENGTH:
            return {"clean_query": seg[-MAX_QUERY_LENGTH:], "method": "tail_sentence"}

    # Step 4: fallback — просто последние 500 символов
    return {"clean_query": raw_query[-MAX_QUERY_LENGTH:], "method": "tail_truncation"}
```

**Ожидаемое восстановление:**
- Passthrough (≤200 chars): ~89.8% (без деградации)
- Question extraction: ~85-89%
- Tail sentence: ~80-89%
- Tail truncation (fallback): ~70-80%
- БЕЗ sanitizer: 1.0% (катастрофа)

---

## Паттерн 6: Entity Detection — двухпроходная классификация person vs project

Файл: `mempalace/entity_detector.py`

**Задача:** до начала mining определить людей и проекты в файлах, чтобы правильно маршрутизировать memories.

**Pass 1: Extract candidates**
```python
def extract_candidates(text: str) -> dict:
    """Возвращает {name: frequency} для имён встречающихся 3+ раз."""
    # Одиночные капитализированные слова
    raw = re.findall(r"\b([A-Z][a-z]{1,19})\b", text)

    # Составные proper nouns
    multi = re.findall(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b", text)

    # Фильтр: минимум 3 вхождения
    return {name: count for name, count in counts.items() if count >= 3}
```

**Pass 2: Score & Classify**
```python
def classify_entity(name, frequency, scores) -> dict:
    ps = scores["person_score"]
    prs = scores["project_score"]

    # Ключевое правило: нужны ДВА разных типа сигналов для "person"
    # Одиночный сигнал с множеством хитов — не достаточно
    signal_categories = set()
    for s in scores["person_signals"]:
        if "dialogue" in s: signal_categories.add("dialogue")
        elif "action" in s: signal_categories.add("action")
        elif "pronoun" in s: signal_categories.add("pronoun")
        elif "addressed" in s: signal_categories.add("addressed")

    has_two_signal_types = len(signal_categories) >= 2

    if person_ratio >= 0.7 and has_two_signal_types and ps >= 5:
        return {"type": "person", "confidence": min(0.99, 0.5 + person_ratio * 0.5)}
    elif person_ratio >= 0.7 and not has_two_signal_types:
        return {"type": "uncertain", "confidence": 0.4}  # pronoun-only = uncertain
    elif person_ratio <= 0.3:
        return {"type": "project", "confidence": min(0.99, 0.5 + (1-person_ratio) * 0.5)}
```

**Сигналы для person:** диалог (">Name:", "[Name]"), person-verbs ("Name said", "Name asked"), local pronoun proximity (she/he в 2 строках), прямое обращение ("hey Name")

**Сигналы для project:** project-verbs ("building X", "deploying X"), versioned refs ("X v2", "X-core"), code file refs ("X.py")

---

## Паттерн 7: Chunking — semantic-aware с overlap

Файл: `mempalace/miner.py`

```python
CHUNK_SIZE = 800    # chars per drawer
CHUNK_OVERLAP = 100  # overlap между чанками
MIN_CHUNK_SIZE = 50

def chunk_text(content: str, source_file: str) -> list:
    chunks = []
    start = 0

    while start < len(content):
        end = min(start + CHUNK_SIZE, len(content))

        # Разбивать на границах параграфов, не на середине
        if end < len(content):
            # Сначала попробовать разрыв параграфа (\n\n)
            newline_pos = content.rfind("\n\n", start, end)
            if newline_pos > start + CHUNK_SIZE // 2:
                end = newline_pos
            else:
                # Fallback: одиночный перевод строки
                newline_pos = content.rfind("\n", start, end)
                if newline_pos > start + CHUNK_SIZE // 2:
                    end = newline_pos

        chunk = content[start:end].strip()
        if len(chunk) >= MIN_CHUNK_SIZE:
            chunks.append({"content": chunk, "chunk_index": chunk_index})

        # OVERLAP: следующий чанк начинается на 100 chars раньше конца текущего
        start = end - CHUNK_OVERLAP if end < len(content) else end
```

**Разговорный chunking** (convo_miner.py): вместо char-based — exchange-pair based. Один вопрос пользователя + ответ AI = один chunk:

```python
def _chunk_by_exchange(lines: list) -> list:
    """Строки с > = user turn. Следующие строки до следующего > = AI response."""
    while i < len(lines):
        if line.strip().startswith(">"):
            user_turn = line.strip()
            # Собираем AI response до следующего >
            ai_lines = []
            while i < len(lines):
                next_line = lines[i]
                if next_line.strip().startswith(">") or next_line.strip().startswith("---"):
                    break
                if next_line.strip():
                    ai_lines.append(next_line.strip())
                i += 1
            ai_response = " ".join(ai_lines[:8])  # первые 8 строк ответа
            content = f"{user_turn}\n{ai_response}"
```

---

## Паттерн 8: Deduplication — greedy longest-first с ChromaDB similarity

Файл: `mempalace/dedup.py`

**Проблема:** повторный mining одних и тех же файлов накапливает near-identical drawers.

**Алгоритм:**
```python
DEFAULT_THRESHOLD = 0.15  # cosine distance. 0 = identical, 2 = opposite.
# 0.15 ≈ 85% cosine similarity — near-identical chunks

def dedup_source_group(col, drawer_ids, threshold=DEFAULT_THRESHOLD, dry_run=True):
    """Greedy: longest first. Если новый drawer похож на уже-kept — удалить."""
    data = col.get(ids=drawer_ids, include=["documents", "metadatas"])
    items = list(zip(data["ids"], data["documents"], data["metadatas"]))
    items.sort(key=lambda x: len(x[1] or ""), reverse=True)  # longest first

    kept = []
    to_delete = []

    for did, doc, meta in items:
        if not kept:
            kept.append((did, doc))
            continue

        # Проверить сходство с уже-kept через ChromaDB query
        results = col.query(
            query_texts=[doc],
            n_results=min(len(kept), 5),
            include=["distances"],
        )
        kept_ids_set = {k[0] for k in kept}

        is_dup = False
        for rid, dist in zip(results["ids"][0], dists):
            if rid in kept_ids_set and dist < threshold:
                is_dup = True
                break

        if is_dup:
            to_delete.append(did)
        else:
            kept.append((did, doc))

    # Удалять батчами по 500 (ChromaDB лимит)
    if to_delete and not dry_run:
        for i in range(0, len(to_delete), 500):
            col.delete(ids=to_delete[i : i + 500])
```

**Важно:** dedup работает ВНУТРИ одного source_file group. Т.е. не global dedup, а per-source. `--threshold 0.10` = near-identical only. `--threshold 0.35` = паразит paraphrased content.

---

## Паттерн 9: Hooks System — Claude Code / Codex integration

Файл: `mempalace/hooks_cli.py`

Три хука подключаются к жизненному циклу Claude Code сессии:

**session-start hook:** инициализирует state directory, пропускает без блокировки.

**stop hook:** блокирует каждые N=15 human messages для auto-save:
```python
STOP_BLOCK_REASON = (
    "AUTO-SAVE checkpoint. Save key topics, decisions, quotes, and code "
    "from this session to your memory system. Organize into appropriate "
    "categories. Use verbatim quotes where possible. Continue conversation "
    "after saving."
)

def hook_stop(data: dict, harness: str):
    # Если уже в save-цикле — пропустить (бесконечный цикл prevention)
    if str(stop_hook_active).lower() in ("true", "1", "yes"):
        _output({})
        return

    exchange_count = _count_human_messages(transcript_path)
    since_last = exchange_count - last_save

    if since_last >= SAVE_INTERVAL and exchange_count > 0:
        _output({"decision": "block", "reason": STOP_BLOCK_REASON})
    else:
        _output({})
```

**precompact hook:** ВСЕГДА блокирует перед compaction (контекст будет потерян):
```python
PRECOMPACT_BLOCK_REASON = (
    "COMPACTION IMMINENT. Save ALL topics, decisions, quotes, code, and "
    "important context from this session to your memory system. Be thorough "
    "— after compaction, detailed context will be lost."
)

def hook_precompact(data: dict, harness: str):
    # Опционально: sync mine перед compaction (чтобы memories попали first)
    if mempal_dir and os.path.isdir(mempal_dir):
        subprocess.run([sys.executable, "-m", "mempalace", "mine", mempal_dir], timeout=60)

    # ВСЕГДА блокировать
    _output({"decision": "block", "reason": PRECOMPACT_BLOCK_REASON})
```

**Подсчёт human messages** — считает строки JSONL из transcript, скипает `<command-message>` (системные сообщения Claude Code):
```python
def _count_human_messages(transcript_path: str) -> int:
    for line in f:
        entry = json.loads(line)
        msg = entry.get("message", {})
        if isinstance(msg, dict) and msg.get("role") == "user":
            content = msg.get("content", "")
            if isinstance(content, str) and "<command-message>" in content:
                continue  # скип системных
            count += 1
```

---

## Паттерн 10: AAAK Dialect — structured symbolic compression

Файл: `mempalace/dialect.py`

AAAK — lossy summarization format. НЕ lossless compression. 96.6% benchmark — НЕ от AAAK, от verbatim drawers.

AAAK нужен для "closets" — структурированных summary поверх verbatim drawers.

**Формат:**
```
Header:  FILE_NUM|PRIMARY_ENTITY|DATE|TITLE
Zettel:  ZID:ENTITIES|topic_keywords|"key_quote"|WEIGHT|EMOTIONS|FLAGS
Tunnel:  T:ZID<->ZID|label
Arc:     ARC:emotion->emotion->emotion
```

**Emotion codes** (20+): `vul=vulnerability`, `joy=joy`, `fear=fear`, `grief=grief`, `wonder=wonder`, `rage=rage`, `love=love`, etc.

**Flags:** `ORIGIN`, `CORE`, `PIVOT`, `GENESIS`, `DECISION`, `TECHNICAL`, `SENSITIVE`

**Пример:**
```
FAM: ALC→♡JOR | 2D(kids): RIL(18,sports) MAX(11,chess+swimming) | BEN(contributor)
```

**Как AAAK учится:** spec включается в статус ответ MCP сервера (`AAAK_SPEC` поле в `tool_status()`). AI читает его при первом вызове `mempalace_status` и потом автоматически пишет в этом формате.

**Emotion detection из plain text:**
```python
_EMOTION_SIGNALS = {
    "decided": "determ",
    "worried": "anx",
    "excited": "excite",
    "frustrated": "frust",
    "love": "love",
    "hate": "rage",
    # ...
}
```

---

## Паттерн 11: Palace Graph — граф комнат без внешней graph DB

Файл: `mempalace/palace_graph.py`

Граф строится динамически из ChromaDB metadata. Нет Neo4j, нет отдельной БД.

```python
def build_graph(col=None, config=None):
    """
    Nodes = rooms (named ideas)
    Edges = rooms, которые есть в нескольких wings (tunnels)
    Edge types = halls (коридоры)
    """
    room_data = defaultdict(lambda: {"wings": set(), "halls": set(), "count": 0})

    # Читать metadata пачками по 1000
    offset = 0
    while offset < total:
        batch = col.get(limit=1000, offset=offset, include=["metadatas"])
        for meta in batch["metadatas"]:
            room = meta.get("room", "")
            wing = meta.get("wing", "")
            if room and room != "general" and wing:
                room_data[room]["wings"].add(wing)

    # Ребро = room существует в 2+ wings (это "tunnel" между wings)
    edges = []
    for room, data in room_data.items():
        wings = sorted(data["wings"])
        if len(wings) >= 2:
            for i, wa in enumerate(wings):
                for wb in wings[i+1:]:
                    edges.append({"room": room, "wing_a": wa, "wing_b": wb})
```

MCP инструменты:
- `mempalace_traverse_graph(start_room, max_hops=2)` — обход графа
- `mempalace_find_tunnels(wing_a, wing_b)` — мосты между двумя wings
- `mempalace_graph_stats()` — общая статистика

---

## Паттерн 12: File routing — 3-приоритетная маршрутизация файлов в rooms

Файл: `mempalace/miner.py`, функция `detect_room()`

```python
def detect_room(filepath: Path, content: str, rooms: list, project_path: Path) -> str:
    """
    Priority 1: папка в пути совпадает с именем/keywords комнаты
    Priority 2: имя файла совпадает с именем комнаты
    Priority 3: keyword scoring по содержимому (первые 2000 chars)
    Fallback:   "general"
    """
    relative = str(filepath.relative_to(project_path)).lower()
    content_lower = content[:2000].lower()  # только первые 2000 chars для скорости

    # P1: folder path
    path_parts = relative.replace("\\", "/").split("/")
    for part in path_parts[:-1]:  # скип самого filename
        for room in rooms:
            candidates = [room["name"].lower()] + [k.lower() for k in room.get("keywords", [])]
            if any(part == c or c in part or part in c for c in candidates):
                return room["name"]

    # P2: filename match
    filename = filepath.stem.lower()
    for room in rooms:
        if room["name"].lower() in filename:
            return room["name"]

    # P3: keyword frequency scoring
    scores = defaultdict(int)
    for room in rooms:
        keywords = room.get("keywords", []) + [room["name"]]
        for kw in keywords:
            scores[room["name"]] += content_lower.count(kw.lower())

    if scores:
        best = max(scores, key=scores.get)
        if scores[best] > 0:
            return best

    return "general"
```

---

## Паттерн 13: Input Validation — защита от path traversal в metadata

Файл: `mempalace/config.py`

```python
MAX_NAME_LENGTH = 128
_SAFE_NAME_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_ .'-]{0,126}[a-zA-Z0-9]?$")

def sanitize_name(value: str, field_name: str = "name") -> str:
    if ".." in value or "/" in value or "\\" in value:
        raise ValueError(f"{field_name} contains invalid path characters")
    if "\x00" in value:
        raise ValueError(f"{field_name} contains null bytes")
    if not _SAFE_NAME_RE.match(value):
        raise ValueError(f"{field_name} contains invalid characters")
    return value

def sanitize_content(value: str, max_length: int = 100_000) -> str:
    if len(value) > max_length:
        raise ValueError(f"content exceeds maximum length of {max_length} characters")
    if "\x00" in value:
        raise ValueError("content contains null bytes")
    return value
```

Вся валидация происходит в MCP tool handlers ПЕРЕД операцией с ChromaDB. Плохие данные не попадают в БД.

---

## MCP Protocol — как подключается к Claude Code

Установка:
```bash
claude mcp add mempalace -- python -m mempalace.mcp_server [--palace /path/to/palace]
```

**TOOLS** регистрируются как словарь `{name: {description, input_schema, handler}}`. MCP читает stdin JSON, парсит tool call, вызывает handler, отвечает в stdout JSON.

Полный список MCP tools:
- `mempalace_status` — overview + AAAK spec (загрузить при старте)
- `mempalace_list_wings` / `mempalace_list_rooms` / `mempalace_get_taxonomy`
- `mempalace_search` — semantic search с wing/room filter
- `mempalace_check_duplicate` — проверка дубликата перед записью
- `mempalace_add_drawer` — записать verbatim content
- `mempalace_delete_drawer` / `mempalace_get_drawer` / `mempalace_list_drawers` / `mempalace_update_drawer`
- `mempalace_kg_query` / `mempalace_kg_add` / `mempalace_kg_invalidate` / `mempalace_kg_timeline` / `mempalace_kg_stats`
- `mempalace_diary_write` / `mempalace_diary_read` — личный журнал агента
- `mempalace_traverse_graph` / `mempalace_find_tunnels` / `mempalace_graph_stats`
- `mempalace_hook_settings` / `mempalace_memories_filed_away`

**PALACE_PROTOCOL** (строка, которую AI читает при каждом статусе):
```
1. ON WAKE-UP: Call mempalace_status
2. BEFORE RESPONDING about any person/project/event: call kg_query or search FIRST
3. IF UNSURE about a fact: say "let me check" and query the palace
4. AFTER EACH SESSION: call diary_write
5. WHEN FACTS CHANGE: kg_invalidate + kg_add
```

---

## Анализ: что это означает для нас

### 1. ObsidianVault vs MemPalace

| Аспект | ObsidianVault | MemPalace |
|---|---|---|
| Хранение | Markdown файлы | ChromaDB + SQLite |
| Поиск | Grep / ручной | Semantic + metadata filter |
| Структура | Файловая иерархия | Wing/Hall/Room/Drawer |
| Факты | Статичные строки | Temporal KG (valid_from/to) |
| Дедупликация | Ручная | Автоматическая (cosine distance) |
| Hooks | Нет | session-start / stop / precompact |
| AI-интеграция | Чтение файлов вручную | MCP server (native tools) |
| Идентичность | CLAUDE.md | identity.txt + L0 layer |

**Вывод:** ObsidianVault — human-first система. MemPalace — AI-first. Они дополняют друг друга, а не конкурируют.

### 2. Что стоит взять из MemPalace немедленно

**a) Wake-up protocol для Nexus** — сейчас Nexus читает vault_reader.py при каждом запросе. Лучше: L0 (identity) + L1 (top learnings) инжектировать в system prompt при старте сессии. Стоимость: 600-900 токенов вместо нуля.

**b) Precompact hook** — у нас уже есть stop hook. Нет precompact hook. Это критично: при compaction Claude Code теряет весь контекст. MemPalace решает это элегантно — блокирует и требует save все важное.

**c) Query sanitization** — если сделаем Nexus поиск по vault через semantic search, нужен sanitize_query. Без него первый же длинный message уронит качество поиска до 1%.

**d) Temporal KG паттерн** — Nexus использует SQLite для памяти, но без temporal validity. Добавить `valid_from`/`valid_to` к контактам и фактам означало бы "John уволился с Google 2026-03-01" вместо override старого факта.

### 3. Стоит ли нам перейти с файловой памяти на MemPalace?

**Для ObsidianVault: НЕТ, сохранить параллельно.**
- Vault — для человека. Adil читает его, редактирует, коммитит.
- MemPalace — для AI. Claude Code читает через MCP, не нужна иерархия файлов.
- Можно использовать MemPalace КАК слой поверх vault: mine vault → palace. Так было бы semantic search по всем знаниям.

**Для Nexus: ДА, рассмотреть для conversation memory.**
- Текущий `assistant_memory.db` (SQLite) слабее — нет temporal KG, нет semantic search.
- MemPalace дал бы Nexus возможность "вспомнить" разговоры по смыслу, а не только по точным запросам.
- Python стек: Nexus уже Python. Интеграция через `from mempalace import MemoryStack`.

**Для Claude Code (наш текущий workflow): ВОЗМОЖНО.**
- Установить MCP server, pointed at our vault mine'd into palace.
- `mempalace mine C:/Users/User/Desktop/ObsidianVault/` — создаст semantic-searchable palace.
- Claude Code будет использовать `mempalace_search` вместо ручного чтения файлов.
- Риск: MemPalace не знает нашу структуру (projects/, knowledge/, patterns/). Нужна настройка wings.

---

## Ключевые инсайты для learnings.md

1. **ChromaDB silent truncation at 10K**: `col.get()` без limit молча возвращает максимум 10,000 записей. Всегда пагинировать через `offset`.

2. **cosine distance vs similarity**: ChromaDB возвращает distance (0=identical, 2=opposite). similarity = 1 - distance. Использовать `max_distance` параметр в search, не `min_similarity`.

3. **inode-based cache invalidation** лучше TTL когда файл может быть полностью заменён (rebuild операции).

4. **Query contamination** — AI может передать весь system prompt как search query, роняя retrieval с 89% до 1%. Нужен sanitizer с 4-step fallback.

5. **Temporal KG на SQLite** = конкурент Neo4j/Zep за $0. Схема: entities + triples с valid_from/valid_to. Инвалидация через UPDATE valid_to, не DELETE.

6. **WAL logging перед каждой write operation** = аудит trail + anti-poisoning protection. Redact sensitive content (content_preview), логировать metadata.

7. **4-layer memory**: L0 (identity, ~100 tokens) + L1 (top K, ~800 tokens) = 600-900 токенов wake-up. L2/L3 — on-demand. Позволяет 95%+ контекста оставить свободным.

8. **Precompact hook** — блокирует context compaction, заставляет AI сохранить ВСЁ перед тем как контекст сожмётся. Критично для долгих сессий.

9. **Stop hook с session counting** — блокирует каждые N=15 human messages, считает по JSONL transcript. Скипает `<command-message>` системные строки.

10. **AAAK spec в status response** — AI обучается формату при первом вызове status. Нет отдельного onboarding шага.

11. **Deterministic drawer IDs** через SHA256(wing + room + content[:100]) = идемпотентность add_drawer без проверок дубликатов на каждом вызове.

12. **Entity detection requires TWO signal categories** для уверенной классификации person. Одна категория с множеством хитов (pronoun-only) → downgrade to uncertain.
