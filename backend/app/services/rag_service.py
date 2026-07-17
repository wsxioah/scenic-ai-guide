# -*- coding: utf-8 -*-
import hashlib
import logging
import chromadb
from chromadb.config import Settings as ChromaSettings
from app.core.config import settings

logger = logging.getLogger(__name__)


class SentenceTransformerEmbedding:
    """Semantic embedding using sentence-transformers (384-dim, Chinese-capable)"""

    DIM = 384

    def __init__(self):
        self._model = None

    @property
    def model(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
        return self._model

    def __call__(self, input: list[str]) -> list[list[float]]:
        embeddings = self.model.encode(input, normalize_embeddings=True)
        return embeddings.tolist()

    def embed_query(self, input) -> list[float] | list[list[float]]:
        if isinstance(input, list):
            return self(input)
        return self([input])[0]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self(texts)


class RAGService:
    """ChromaDB-based RAG retrieval service"""

    def __init__(self):
        self._client = None
        self._collection = None

    @property
    def client(self):
        if self._client is None:
            self._client = chromadb.PersistentClient(
                path=settings.chroma_persist_dir,
                settings=ChromaSettings(anonymized_telemetry=False),
            )
        return self._client

    @property
    def collection(self):
        if self._collection is None:
            self._collection = self.client.get_or_create_collection(
                name="scenic_knowledge_v2",
                metadata={"hnsw:space": "cosine"},
                embedding_function=SentenceTransformerEmbedding(),
            )
        return self._collection

    async def search(self, query: str, top_k: int = 3) -> list[dict]:
        try:
            results = self.collection.query(query_texts=[query], n_results=top_k)
            if results and results["documents"] and results["documents"][0]:
                knowledge = []
                for i, doc in enumerate(results["documents"][0]):
                    meta = results["metadatas"][0][i] if results["metadatas"] else {}
                    knowledge.append({
                        "title": meta.get("title", "Unknown"),
                        "content": doc,
                        "score": round(1 - results["distances"][0][i], 3) if results["distances"] else 0,
                    })
                return knowledge
        except Exception as e:
            logger.warning(f"RAG search error: {e}")
        return []

    async def add_knowledge(self, title: str, content: str, tags: list[str] = None,
                            scenic_id: int = None) -> str:
        metadata = {"title": title}
        if tags:
            metadata["tags"] = ",".join(tags)
        if scenic_id:
            metadata["scenic_id"] = str(scenic_id)
        doc_id = hashlib.md5(f"{title}{content[:50]}".encode()).hexdigest()[:16]
        self.collection.add(documents=[content], metadatas=[metadata], ids=[doc_id])
        return doc_id

    async def delete_knowledge(self, doc_id: str):
        try:
            self.collection.delete(ids=[doc_id])
        except Exception as e:
            logger.warning(f"RAG delete error: {e}")

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
        return await self.search(" ".join(user_interests), top_k=top_k)
