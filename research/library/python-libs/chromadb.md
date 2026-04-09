# ChromaDB

## What it is

An open-source **embedded vector database** for AI applications. Stores embeddings, supports similarity search, metadata filtering. Runs in-process (no separate server) or as a service.

## License

**Apache 2.0.**

## Used for

- **Nexus.AI** — long-term memory. Right now `assistant_memory.db` is SQLite with conversation history. Adding semantic search ("what did Adil say about Omoikiri last month?") requires embeddings + vector search. Chroma is the simplest path.

## Why it matters for Nexus

Real assistant memory needs both:
1. **Recent context** (last N messages) → SQLite is fine
2. **Long-term semantic recall** (find related past conversations by meaning, not by exact words) → vector DB

Chroma is the lowest-friction option to add (2) to (1).

## How to use

```bash
pip install chromadb
```

```python
import chromadb

client = chromadb.PersistentClient(path="./nexus_memory_chroma")

collection = client.get_or_create_collection(
    name="conversations",
    metadata={"hnsw:space": "cosine"}
)

# Add memories
collection.add(
    documents=[
        "Adil said he wants Nexus to control his laptop remotely",
        "Adil is working on Omoikiri.AI — a CRM for WhatsApp",
        "News.AI is a content factory using Gemini for image generation",
    ],
    metadatas=[
        {"date": "2026-04-07", "topic": "nexus"},
        {"date": "2026-04-07", "topic": "omoikiri"},
        {"date": "2026-04-07", "topic": "news-ai"},
    ],
    ids=["msg-1", "msg-2", "msg-3"]
)

# Query
results = collection.query(
    query_texts=["What does Adil want Nexus to do?"],
    n_results=2,
)

print(results['documents'])
# Returns the most semantically relevant past memories
```

## Embeddings are automatic

By default, Chroma uses a local sentence-transformer model. No API key needed, no cost. For higher quality, you can plug in OpenAI/Cohere/Anthropic embeddings.

## Score: 9/10 for Nexus

Drop-in upgrade for Nexus's memory layer. Highly recommended.

## Alternatives

- **LanceDB** — newer, faster, similar embedded model
- **Qdrant** — server-based, more production-ready, more features
- **pgvector** in Postgres — already on Adil's stack via Supabase, but adds DB dependency to Nexus
- **FAISS** — Facebook's library, more low-level, no metadata filtering

## Risks

- Local file storage means it's tied to one machine (same problem as `assistant_memory.db`)
- Default embedding model is small — fine for personal use, may want a better model later

## Links

- https://www.trychroma.com
