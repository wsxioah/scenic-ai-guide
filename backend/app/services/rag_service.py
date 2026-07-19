# -*- coding: utf-8 -*-
import hashlib
import logging
import os

# Use HF mirror in China (no-op if HF_ENDPOINT already set)
if "HF_ENDPOINT" not in os.environ:
    os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"

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

    def name(self) -> str:
        return "paraphrase-multilingual-MiniLM-L12-v2"

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

    def warmup(self):
        """在应用启动时预加载ChromaDB + SentenceTransformer模型"""
        _ = self.collection  # 初始化ChromaDB client + collection
        # 触发embedding模型加载（通过一次空查询）
        try:
            self.collection.query(query_texts=["warmup"], n_results=1)
        except Exception:
            pass  # 集合可能为空

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


# 单例——所有模块共享同一个已预热的实例
_rag_service: RAGService | None = None


def get_rag_service() -> RAGService:
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGService()
    return _rag_service
