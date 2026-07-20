"""景物识别 API"""
import base64
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.recognition_service import predict

logger = logging.getLogger(__name__)

router = APIRouter()


class RecognizeRequest(BaseModel):
    image: str  # base64 encoded image


@router.post("/identify")
async def identify_scene(req: RecognizeRequest):
    """上传图片识别灵山景点（base64 JSON），返回 Top-5 预测"""
    try:
        image_bytes = base64.b64decode(req.image)
    except Exception:
        raise HTTPException(400, "无效的 base64 图片数据")

    if len(req.image) > 15 * 1024 * 1024:
        raise HTTPException(400, "图片大小不能超过 10MB")

    try:
        results = await predict(image_bytes)
    except Exception as e:
        logger.exception("Recognition failed")
        raise HTTPException(500, f"识别失败: {str(e)}")

    top = results[0] if results else None
    return {
        "results": results,
        "top_match": top["name"] if top else None,
        "top_confidence": top["confidence"] if top else 0,
    }
