# -*- coding: utf-8 -*-
"""灵山景区景物识别服务 — EfficientNet-B3, 12类景点"""
import json
import logging
from io import BytesIO
from pathlib import Path

logger = logging.getLogger(__name__)

MODEL_DIR = Path(__file__).parent.parent.parent / "models" / "recognition"
MODEL_PATH = MODEL_DIR / "best_model.pth"
LABELS_PATH = MODEL_DIR / "class_labels.json"
IMG_SIZE = 256

_model = None
_labels = None


def _load_model():
    global _model, _labels
    if _model is not None:
        return

    import torch
    import torch.nn as nn
    import torchvision.models as models
    import torchvision.transforms as T

    _labels = json.load(open(LABELS_PATH, encoding="utf-8"))
    device = "cuda" if torch.cuda.is_available() else "cpu"
    num_classes = len(_labels)

    m = models.efficientnet_b3(weights=None)
    in_features = m.classifier[1].in_features
    m.classifier = nn.Sequential(nn.Dropout(p=0.4, inplace=True), nn.Linear(in_features, num_classes))
    checkpoint = torch.load(MODEL_PATH, map_location=device, weights_only=False)
    m.load_state_dict(checkpoint["model_state_dict"])
    m = m.to(device)
    m.eval()

    transform = T.Compose([
        T.Resize((IMG_SIZE, IMG_SIZE)),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    _model = (m, device, transform)
    logger.info("Recognition model loaded (EfficientNet-B3, %d classes)", num_classes)


async def predict(image_bytes: bytes) -> list[dict]:
    """识别图片中的灵山景点，返回 Top-5 预测结果"""
    import torch
    from PIL import Image

    _load_model()
    model, device, transform = _model

    img = Image.open(BytesIO(image_bytes)).convert("RGB")
    tensor = transform(img).unsqueeze(0).to(device)

    with torch.no_grad():
        outputs = model(tensor)
        probs = torch.nn.functional.softmax(outputs, dim=1)
        top5_prob, top5_idx = probs.topk(min(5, len(_labels)), dim=1)

    results = []
    for i in range(len(top5_idx[0])):
        idx = str(top5_idx[0][i].item())
        raw_label = _labels[idx]
        # "01_灵山大佛" -> "灵山大佛"
        name = raw_label[3:] if raw_label[0].isdigit() else raw_label
        results.append({
            "name": name,
            "label": raw_label,
            "confidence": round(float(top5_prob[0][i]), 4),
        })

    return results


def warmup():
    """预加载模型（由 lifespan 调用，避免首次请求等待）"""
    _load_model()
