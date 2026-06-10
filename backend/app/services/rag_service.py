# -*- coding: utf-8 -*-
import json
import re

import chromadb
from chromadb.config import Settings as ChromaSettings
from app.core.config import settings

# Chinese character range: U+4E00 to U+9FFF
CHINESE_RE = re.compile(r'[一-鿿]+')


class SimpleKeywordEmbedding:
    """Simple keyword-based embedding function, no model download needed"""

    DIM = 512  # Fixed embedding dimension

    def _embed_text(self, text: str) -> list[float]:
        vec = [0.0] * self.DIM
        chars = CHINESE_RE.findall(text)
        for chunk in chars:
            for i in range(0, len(chunk), 2):
                if i + 2 <= len(chunk):
                    kw = chunk[i:i+2]
                    h = hash(kw) % self.DIM
                    vec[h] = 1.0
        return vec

    def __call__(self, input: list[str]) -> list[list[float]]:
        return [self._embed_text(t) for t in input]

    def embed_query(self, text: str) -> list[float]:
        return self._embed_text(text)

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [self._embed_text(t) for t in texts]

    def name(self) -> str:
        return "simple-keyword"


class RAGService:
    """ChromaDB-based RAG retrieval service"""

    def __init__(self):
        self.client = chromadb.PersistentClient(
            path=settings.chroma_persist_dir,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        self.collection = self.client.get_or_create_collection(
            name="scenic_knowledge",
            metadata={"hnsw:space": "cosine"},
            embedding_function=SimpleKeywordEmbedding(),
        )

    async def search(self, query: str, top_k: int = 3) -> list[dict]:
        """Search for relevant knowledge"""
        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=top_k,
            )
            if results and results["documents"] and results["documents"][0]:
                knowledge = []
                for i, doc in enumerate(results["documents"][0]):
                    meta = results["metadatas"][0][i] if results["metadatas"] else {}
                    knowledge.append({
                        "title": meta.get("title", "Unknown"),
                        "content": doc,
                        "score": 1 - results["distances"][0][i] if results["distances"] else 0,
                    })
                return knowledge
        except Exception as e:
            print(f"RAG search error: {e}")
        return []

    async def add_knowledge(self, title: str, content: str, tags: list[str] = None,
                            scenic_id: int = None) -> str:
        """Add knowledge to vector store"""
        metadata = {"title": title}
        if tags:
            metadata["tags"] = ",".join(tags)
        if scenic_id:
            metadata["scenic_id"] = str(scenic_id)

        import hashlib
        doc_id = hashlib.md5(f"{title}{content[:50]}".encode()).hexdigest()[:16]

        self.collection.add(
            documents=[content],
            metadatas=[metadata],
            ids=[doc_id],
        )
        return doc_id

    async def delete_knowledge(self, doc_id: str):
        try:
            self.collection.delete(ids=[doc_id])
        except Exception:
            pass

    async def add_batch(self, items: list[dict]) -> int:
        count = 0
        for item in items:
            await self.add_knowledge(
                title=item.get("title", ""),
                content=item.get("content", ""),
                tags=item.get("tags"),
                scenic_id=item.get("scenic_id"),
            )
            count += 1
        return count

    async def recommend_scenic(self, user_interests: list[str], top_k: int = 5) -> list[dict]:
        if not user_interests:
            return []
        query = " ".join(user_interests)
        return await self.search(query, top_k=top_k)
