# SciPhi-AI R2R — Backend Deep Dive

**Score:** 6.8
**Date:** 2026-04-12
**Repo:** `C:/Users/User/Desktop/_study_tmp/r2r/`
**Focus:** RAG pipeline, vector store, document processing, API design

---

## Architecture Overview

R2R — production RAG platform на Python/FastAPI. Структура:

```
py/
  core/           — логика приложения
    base/         — абстракции, базовые классы
    main/         — сервисы, API роутеры, сборка
    providers/    — имплементации (DB, embedding, LLM, ingestion)
  shared/         — data-модели и утилиты (используются и SDK-клиентом)
    abstractions/ — Pydantic-модели (Document, Vector, Search, etc.)
    utils/        — text splitter, base utils
```

Ключевое: `shared/` — это не просто хелперы. Это единый контракт между сервером и Python SDK. Клиент импортирует те же модели.

---

## Pattern 1: Multi-stage Ingestion Pipeline с явными статусами

**Файл:** `py/core/main/services/ingestion_service.py`

`IngestionStatus` — enum с 9 состояниями, каждое соответствует шагу пайплайна:

```python
class IngestionStatus(str, Enum):
    PENDING = "pending"
    PARSING = "parsing"
    EXTRACTING = "extracting"
    CHUNKING = "chunking"
    EMBEDDING = "embedding"
    AUGMENTING = "augmenting"
    STORING = "storing"
    ENRICHING = "enriching"
    FAILED = "failed"
    SUCCESS = "success"
```

Статус обновляется в БД после каждого шага. При сбое любого шага документ переходит в `FAILED` — повторная загрузка разрешена только из `FAILED`. `SUCCESS` блокирует повторную загрузку с явным сообщением "Submit DELETE first".

**Полный pipeline выглядит так:**

```
ingest_file_ingress()    → PARSING  (сохраняет DocumentResponse в БД)
parse_file()             → chunked DocumentChunk[]  (парсинг байт через providers.ingestion)
augment_document_info()  → AUGMENTING  (LLM-генерация summary + embedding summary)
embed_document()         → EMBEDDING  (батчевый async embedding)
store_embeddings()       → STORING    (батчевый upsert в pgvector)
chunk_enrichment()       → ENRICHING  (опционально, LLM-обогащение чанков)
finalize_ingestion()     → SUCCESS
```

**Ключевой паттерн:** каждый шаг — `AsyncGenerator`. `parse_file()` yields `DocumentChunk`, `embed_document()` yields `VectorEntry`, `store_embeddings()` yields строку-статус. Это позволяет стримить прогресс клиенту через SSE без накопления всего документа в памяти.

**Версионирование чанков:** chunk ID генерируется как `generate_id(f"{extraction.id}_{version}")` — версии "v0", "v1" и т.д. позволяют обновлять документ без потери истории.

**Применимо к Nexus.AI:** при добавлении RAG к Nexus — реализовать те же статусы (`PENDING → PROCESSING → SUCCESS/FAILED`) в `assistant_memory.db`. SQLite позволяет это без изменений схемы (колонка `status TEXT`).

---

## Pattern 2: Трёхуровневая стратегия поиска через единый метод

**Файл:** `py/core/main/services/retrieval_service.py`

`RetrievalService.search()` диспетчеризует по `search_strategy`:

```python
async def search(self, query: str, search_settings: SearchSettings) -> AggregateSearchResult:
    strategy = search_settings.search_strategy.lower()
    if strategy == "hyde":
        return await self._hyde_search(query, search_settings)
    elif strategy == "rag_fusion":
        return await self._rag_fusion_search(query, search_settings)
    else:
        return await self._basic_search(query, search_settings)
```

**Стратегия "basic"** — прямой поиск:
1. Embed query (один раз)
2. chunk search (semantic/fulltext/hybrid на выбор)
3. graph search (KG entities/communities/relationships)
4. Combine → `AggregateSearchResult`

**Стратегия "hyde"** (Hypothetical Document Embeddings):
1. LLM генерирует N гипотетических документов по запросу
2. Каждый документ эмбеддится и используется как query vector вместо оригинала
3. Параллельный поиск через `asyncio.gather(*tasks)`
4. Final re-rank по оригинальному запросу

```python
tasks = []
for hypothetical_text in hyde_docs:
    tasks.append(asyncio.create_task(
        self._fanout_chunk_and_graph_search(
            user_text=query,       # для re-ranking
            alt_text=hypothetical_text,  # для embedding
            search_settings=search_settings,
        )
    ))
results_list = await asyncio.gather(*tasks)
```

**Стратегия "rag_fusion"**:
1. LLM генерирует N sub-queries
2. Basic search по каждому sub-query
3. Reciprocal Rank Fusion (RRF) всех результатов: `score += 1 / (k + rank)` где k=60
4. Optional re-rank итогового списка

**Важно:** embedding вычисляется ОДИН РАЗ в `_basic_search` и передаётся `precomputed_vector` в дочерние методы. Это предотвращает N повторных embedding-запросов при hybrid search.

**Применимо к Nexus.AI:** начинать с basic, добавлять hyde/rag_fusion как параметр запроса. RRF — простая формула, реализуется в 15 строк без зависимостей.

---

## Pattern 3: Двухэтапный поиск для бинарных векторов (INT1 quantization)

**Файл:** `py/core/providers/database/chunks.py`

R2R поддерживает 4 типа квантизации: `FP32`, `FP16`, `INT1`, `SPARSE`. Для INT1 реализован two-stage search:

```python
if self.quantization_type == VectorQuantizationType.INT1:
    binary_query = quantize_vector_to_binary(query_vector)
    extended_limit = search_settings.limit * 20  # 20x кандидатов
    
    # Stage 1: быстрый binary search через Hamming distance
    stage1_distance = f"{table_name}.vec_binary {binary_search_measure_repr} $1::bit{bit_dim}"
    
    query = f"""
    WITH candidates AS (
        SELECT {select_clause},
            ({stage1_distance}) as binary_distance
        FROM {table_name}
        {where_clause}
        ORDER BY {stage1_distance}
        LIMIT ${len(params) + 1}  -- 20x limit
    )
    -- Stage 2: re-rank по оригинальному float вектору
    SELECT ..., (vec <=> ${len(params) + 4}::vector{vector_dim}) as distance
    FROM candidates
    ORDER BY distance
    LIMIT ${len(params) + 3}  -- финальный limit
    """
```

Таблица хранит ОБА вектора: `vec vector(N)` и `vec_binary bit(N)`. CTE-подход: быстрый binary pre-filter → точный float re-rank. Экономит compute при больших коллекциях.

**FTS встроен в таблицу как GENERATED ALWAYS AS column:**

```sql
CREATE TABLE chunks (
    ...
    text TEXT,
    fts tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED
);
CREATE INDEX idx_vectors_text ON chunks USING GIN (to_tsvector('english', text));
```

FTS-индекс создаётся автоматически, нет нужды вручную обновлять tsvector при UPDATE.

**Для Nexus.AI:** если добавлять vector search через pgvector (или sqlite-vss), начать с FP32 + HNSW. Binary quantization — оптимизация для >100k чанков.

---

## Pattern 4: MongoDB-style Filter DSL поверх PostgreSQL

**Файл:** `py/core/providers/database/filters.py`

Единый `apply_filters()` транслирует MongoDB-style запросы в PostgreSQL параметрические запросы:

```python
# Входной фильтр (от клиента):
{
    "$and": [
        {"owner_id": {"$eq": "uuid-here"}},
        {"metadata.category": {"$in": ["news", "blog"]}},
        {"collection_ids": {"$overlap": ["col-uuid"]}}
    ]
}

# Генерирует:
# WHERE (owner_id = $1) AND ((metadata -> 'category') ?| ARRAY[$2, $3]::text[]) AND (collection_ids && ARRAY[$4]::uuid[])
# params = ["uuid-here", "news", "blog", "col-uuid"]
```

Ключевые особенности:

1. **Разные типы колонок обрабатываются разными builder-функциями:**
   - `_build_standard_column_condition()` — обычные SQL колонки
   - `_build_collection_ids_condition()` — PostgreSQL `UUID[]` массивы (`&&`, `@>`)
   - `_build_metadata_condition()` → `_build_metadata_operator_condition()` — JSONB (`->>`, `->`, `#>>`, `?|`, `@>`)

2. **ParamHelper** управляет позиционными плейсхолдерами `$1`, `$2`... Принимает `initial_params` для продолжения нумерации после уже добавленных параметров (например после `$1::vector` в semantic search).

3. **`collection_id` (singular) — shorthand** для `collection_ids && ARRAY[value]::uuid[]`. Это удобный alias — клиент не думает об array операторах.

4. **Два режима вывода:** `where_clause` → `"WHERE condition"`, `condition_only` → `"condition"`. Нужно для вставки в уже существующий WHERE с AND.

**Для Nexus.AI:** этот паттерн применим для фильтрации по metadata в SQLite. В SQLite нет `JSONB`, но `json_extract(metadata, '$.key')` даёт похожую функциональность. Тот же `ParamHelper` + builder functions работают.

---

## Pattern 5: Chunk Enrichment — LLM-обогащение с контекстным окном

**Файл:** `py/core/main/services/ingestion_service.py`, методы `_get_enriched_chunk_text()` и `chunk_enrichment()`

После обычного чанкинга и эмбеддинга R2R опционально запускает LLM-проход для улучшения текста каждого чанка:

```python
class ChunkEnrichmentSettings(R2RSerializable):
    enable_chunk_enrichment: bool = False
    n_chunks: int = 2              # контекстное окно: N чанков до и N после
    generation_config: Optional[GenerationConfig] = None
    chunk_enrichment_prompt: Optional[str] = "chunk_enrichment"
```

Для каждого чанка LLM получает:
- `document_summary` — общий summary документа (генерируется ранее)
- `chunk` — сам чанк
- `preceding_chunks` — N предыдущих чанков
- `succeeding_chunks` — N следующих чанков

LLM "переписывает" чанк, делая его более самодостаточным и богатым контекстом. Оригинальный текст сохраняется в `metadata["original_text"]`.

**Параллельная обработка батчами по 128:**

```python
tasks = []
for chunk_idx, chunk in enumerate(list_document_chunks):
    tasks.append(self._get_enriched_chunk_text(...))
    if len(tasks) == 128:
        new_vector_entries.extend(await asyncio.gather(*tasks))
        tasks = []
new_vector_entries.extend(await asyncio.gather(*tasks))
```

После enrichment: DELETE все старые чанки документа → upsert новых.

**Применимо к Nexus.AI:** если добавлять knowledge base, chunk enrichment значительно улучшает retrieval quality для коротких/изолированных чанков. Для небольших баз (< 10k чанков) можно запускать при ingestion синхронно.

---

## Pattern 6: AsyncSyncMeta — автогенерация sync-обёрток для async методов

**Файл:** `py/shared/abstractions/base.py`

```python
class AsyncSyncMeta(type):
    def __new__(cls, name, bases, dct):
        new_cls = super().__new__(cls, name, bases, dct)
        for attr_name, attr_value in dct.items():
            if asyncio.iscoroutinefunction(attr_value) and getattr(attr_value, "_syncable", False):
                sync_method_name = attr_name[1:]  # "aget_completion" → "get_completion"
                setattr(new_cls, sync_method_name, make_sync_method(attr_value))
        return new_cls

def syncable(func):
    func._syncable = True
    return func
```

Декоратор `@syncable` на `async def aget_completion()` автоматически создаёт синхронный `get_completion()`. Sync-wrapper запускает в отдельном Thread с собственным event loop если нет текущего loop, или через `asyncio.run_coroutine_threadsafe` если loop уже есть.

Паттерн нужен для поддержки синхронных клиентов (например, Jupyter notebooks, старые скрипты) без дублирования кода.

---

## Pattern 7: AggregateSearchResult — унификация разнородных источников

**Файл:** `py/shared/abstractions/search.py`

```python
class AggregateSearchResult(R2RSerializable):
    chunk_search_results: Optional[list[ChunkSearchResult]] = None
    graph_search_results: Optional[list[GraphSearchResult]] = None
    web_page_search_results: Optional[list[WebPageSearchResult]] = None
    web_search_results: Optional[list[WebSearchResult]] = None
    document_search_results: Optional[list[DocumentResponse]] = None
    generic_tool_result: Optional[Any] = None
```

Все стратегии поиска (basic/hyde/rag_fusion) возвращают один тип. RAG agent потребляет `AggregateSearchResult` не зная, как именно был сделан поиск.

`GraphSearchResult` объединяет три подтипа через Union:
```python
class GraphSearchResult(R2RSerializable):
    content: GraphEntityResult | GraphRelationshipResult | GraphCommunityResult
    result_type: Optional[GraphSearchResultType] = None
    chunk_ids: Optional[list[UUID]] = None  # связь с исходными чанками
    score: Optional[float] = None
```

Graph results сохраняют `chunk_ids` — ссылки на конкретные чанки из которых были извлечены entity/relationship. Это позволяет traceback от граф-результата к источнику.

---

## Hybrid Search: конкретная реализация RRF

**Файл:** `py/core/providers/database/chunks.py`, метод `hybrid_search()`

```python
# Запускает оба поиска параллельно
semantic_results = await self.semantic_search(query_vector, semantic_settings)
full_text_results = await self.full_text_search(query_text, full_text_settings)

# RRF fusion с весами
for rank, result in enumerate(semantic_results, 1):
    combined_results[result.id] = {"semantic_rank": rank, "full_text_rank": full_text_limit, ...}

for rank, result in enumerate(full_text_results, 1):
    if result.id in combined_results:
        combined_results[result.id]["full_text_rank"] = rank
    else:
        combined_results[result.id] = {"semantic_rank": semantic_limit, "full_text_rank": rank, ...}

# Score calculation
semantic_score = 1 / (rrf_k + hyb_result["semantic_rank"])
full_text_score = 1 / (rrf_k + hyb_result["full_text_rank"])
hyb_result["rrf_score"] = (
    semantic_score * semantic_weight + full_text_score * full_text_weight
) / (semantic_weight + full_text_weight)
```

Дефолтный `rrf_k=60` — стандарт. Отсутствующие в одном из поисков результаты получают "penalty" rank равный пределу поиска (`semantic_limit` или `full_text_limit`), а не ноль — это важно.

---

## Связь с Nexus.AI

Nexus сейчас использует только **Gemini intent classification** без retrieval по знаниям. Если добавлять vault Q&A с vector search (подсказано в `architecture.md`), вот применимые паттерны:

| Потребность | Паттерн из R2R |
|---|---|
| Хранить чанки с векторами | pgvector или sqlite-vss, схема из Pattern 3 |
| Фильтровать по namespace/tag | MongoDB-style DSL (Pattern 4), упрощённая версия |
| Статусы обработки документов | IngestionStatus enum (Pattern 1) в `assistant_memory.db` |
| Улучшить retrieval для коротких чанков | Chunk enrichment с контекстным окном (Pattern 5) |
| Поддержать оба API: sync + async | `@syncable` + `AsyncSyncMeta` (Pattern 6) |
| Разные стратегии поиска | Диспетчер по `search_strategy` (Pattern 2) — начать с basic |

**Минимальный RAG для Nexus:** SQLite FTS5 (уже есть) + sqlite-vss (векторы) + гибридный поиск через Python-side RRF. Не нужен pgvector — SQLite достаточно для personal assistant с <100k чанков.

---

## Что НЕ брать из R2R напрямую

1. `AsyncSyncMeta` — чрезмерно сложен для одного проекта. Достаточно `asyncio.run()` или `loop.run_until_complete()`.
2. `shared/utils/splitter/text.py` — это форк LangChain TextSplitter. Для Nexus лучше взять LangChain напрямую или `langchain-text-splitters`.
3. Graph/KG extraction — реализация через LLM entity extraction, дорого. Подходит только при большом объёме документов и нужде в structured traversal.
4. Multi-collection architecture — для personal assistant overhead, достаточно одного namespace.

---

Last verified: 2026-04-12
