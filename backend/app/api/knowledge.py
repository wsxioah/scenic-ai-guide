from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.database import get_db
from app.models.entities import KnowledgePoint
from app.services.rag_service import RAGService

router = APIRouter()
rag_service = RAGService()


@router.get("/search")
async def search_knowledge(q: str, top_k: int = 5):
    """搜索知识库"""
    results = await rag_service.search(q, top_k=top_k)
    return {"query": q, "results": results}


@router.get("/points")
async def list_points(scenic_id: int | None = None, page: int = 1,
                      db: AsyncSession = Depends(get_db)):
    """知识列表"""
    query = select(KnowledgePoint)
    if scenic_id:
        query = query.where(KnowledgePoint.scenic_id == scenic_id)
    query = query.order_by(KnowledgePoint.id.desc()).offset((page - 1) * 20).limit(20)
    result = await db.execute(query)
    points = result.scalars().all()
    return [{
        "id": p.id, "scenic_id": p.scenic_id, "title": p.title,
        "content": p.content[:200], "tags": p.tags, "source": p.source,
    } for p in points]


@router.post("/points")
async def create_point(
    title: str, content: str, scenic_id: int | None = None,
    tags: str = "", source: str = "manual",
    db: AsyncSession = Depends(get_db),
):
    """添加知识"""
    tag_list = [t.strip() for t in tags.split(",") if t.strip()]
    embedding_id = await rag_service.add_knowledge(title, content, tag_list, scenic_id)

    p = KnowledgePoint(
        scenic_id=scenic_id, title=title, content=content,
        tags=tags, source=source, embedding_id=embedding_id,
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return {"id": p.id, "embedding_id": embedding_id, "message": "知识添加成功"}


@router.delete("/points/{point_id}")
async def delete_point(point_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(KnowledgePoint).where(KnowledgePoint.id == point_id))
    point = result.scalar_one_or_none()
    if point and point.embedding_id:
        await rag_service.delete_knowledge(point.embedding_id)
    if point:
        await db.delete(point)
        await db.commit()
    return {"message": "删除成功"}


@router.post("/import/batch")
async def import_batch(items: list[dict], db: AsyncSession = Depends(get_db)):
    """批量导入知识"""
    count = 0
    for item in items:
        embedding_id = await rag_service.add_knowledge(
            title=item.get("title", ""),
            content=item.get("content", ""),
            tags=item.get("tags", []),
            scenic_id=item.get("scenic_id"),
        )
        p = KnowledgePoint(
            scenic_id=item.get("scenic_id"),
            title=item.get("title", ""),
            content=item.get("content", ""),
            tags=",".join(item.get("tags", [])),
            source=item.get("source", "import"),
            embedding_id=embedding_id,
        )
        db.add(p)
        count += 1
    await db.commit()
    return {"imported": count, "message": f"成功导入{count}条知识"}


@router.post("/import/excel")
async def import_excel(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """从Excel文件导入知识（支持.xlsx格式）"""
    import pandas as pd
    content = await file.read()
    df = pd.read_excel(content)
    items = []
    for _, row in df.iterrows():
        items.append({
            "title": str(row.get("title", row.get("标题", ""))),
            "content": str(row.get("content", row.get("内容", ""))),
            "tags": str(row.get("tags", row.get("标签", ""))).split(",") if row.get("tags") or row.get("标签") else [],
        })
    result = await import_batch(items, db)
    return result
