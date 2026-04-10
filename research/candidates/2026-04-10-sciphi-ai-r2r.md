# R2R

**URL:** https://github.com/SciPhi-AI/R2R
**License:** unknown
**Score:** 6.8/10
**Category:** ai-tool
**For project:** General
**Found by:** vault-research-agent, niche: ai-new
**Date:** 2026-04-10

## What it does
R2R is a production-ready AI retrieval system that helps you build smart question-answering apps. It can ingest documents, images, and audio files, then let users ask complex questions that require multi-step reasoning and research across your knowledge base.

## Why it's interesting
This isn't just another RAG demo — it's enterprise-grade infrastructure with a "Deep Research" feature that thinks through complex queries step-by-step, like having an AI researcher on your team. The dual deployment model (simple pip install vs full Docker stack) means you can start small and scale up.

## Startup potential
Fork this into "KnowledgeBase-as-a-Service" — let businesses upload their docs/media and get an AI research assistant API in 5 minutes. Target consulting firms, law offices, and research teams who need to quickly search through massive document collections. Charge per GB stored + per query. The multimodal support (PDFs, images, audio) is a huge differentiator over basic text-only solutions.

## How to start using it
```bash
pip install r2r
```

Create a simple knowledge base:
```python
from r2r import R2RClient
client = R2RClient()

# Upload a document
client.documents.create(file_path="/path/to/your/document.pdf")

# Ask questions
response = client.retrieval.rag(query="What are the key findings about X?")
```

Set your OpenAI API key as `OPENAI_API_KEY` environment variable.

## Best features
- Deep Research API that performs multi-step reasoning with configurable "thinking budgets"
- Multimodal ingestion supporting text, PDFs, images, and audio files
- Hybrid search combining vector similarity with keyword matching
- Clean TypeScript SDK with automatic JWT token refresh
- Knowledge graph integration for understanding relationships between concepts

## Risks and gotchas
Major red flag: no license specified despite claims of being "open source" — this blocks commercial use entirely. Also requires OpenAI API keys for core functionality, so costs scale with usage. The full Docker deployment adds PostgreSQL complexity that might be overkill for simple use cases.

## Similar projects
- **LangChain**: More flexible but requires more setup; clear Apache license
- **Haystack**: Enterprise-focused with better licensing clarity; steeper learning curve