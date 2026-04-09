# LanceDB

## What it is

A modern, embedded vector database written in Rust. Faster than ChromaDB, supports hybrid search (vector + full-text), built for AI workloads.

## License

**Apache 2.0.**

## Used for

Alternative to ChromaDB for Nexus memory. Choose if you specifically want speed or hybrid search.

## How to use

```bash
pip install lancedb
```

```python
import lancedb
import pyarrow as pa

db = lancedb.connect("./nexus_lancedb")

table = db.create_table(
    "memories",
    schema=pa.schema([
        pa.field("vector", pa.list_(pa.float32(), 384)),
        pa.field("text", pa.string()),
        pa.field("date", pa.string()),
    ]),
    mode="overwrite",
)

# Add data (you provide the embeddings)
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('all-MiniLM-L6-v2')

texts = ["Adil wants Nexus to control his laptop", "..."]
vectors = model.encode(texts).tolist()

table.add([
    {"vector": v, "text": t, "date": "2026-04-07"}
    for v, t in zip(vectors, texts)
])

# Query
query_vec = model.encode(["What does Adil want?"]).tolist()[0]
results = table.search(query_vec).limit(3).to_pandas()
```

## Score: 8/10 for Nexus

Slightly more setup than Chroma, but faster and supports hybrid search. Pick Chroma for simplicity, LanceDB for performance.

## Links

- https://lancedb.com
