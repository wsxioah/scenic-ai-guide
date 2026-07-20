import logging
import re
import time
import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.database import get_db
from app.models.entities import User, UserFavorite, Conversation, Message
from app.core.auth import create_access_token, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()

_rate_limit: dict[str, list[float]] = {}
_RATE_LIMIT_MAX = 5
_RATE_LIMIT_WINDOW = 60


class LoginRequest(BaseModel):
    account: str
    code: str = "0000"
    password: str = ""

    @field_validator("account")
    @classmethod
    def account_must_be_valid(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("账号不能少于3位")
        return v

    @field_validator("code")
    @classmethod
    def code_must_be_valid(cls, v: str) -> str:
        return v.strip()


class RegisterRequest(BaseModel):
    account: str
    password: str
    nickname: str = ""

    @field_validator("account")
    @classmethod
    def account_must_be_valid(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("账号不能少于3位")
        return v

    @field_validator("password")
    @classmethod
    def password_must_be_valid(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 6:
            raise ValueError("密码不能少于6位")
        if not re.search(r'[a-zA-Z]', v) or not re.search(r'\d', v):
            raise ValueError("密码需包含字母和数字")
        return v

    @field_validator("nickname")
    @classmethod
    def nickname_valid(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("昵称不能为空")
        if len(v) > 20:
            raise ValueError("昵称不能超过20个字")
        return v


class LoginResponse(BaseModel):
    id: int
    phone: str
    nickname: str
    avatar: str | None = None
    token: str


class UserInfo(BaseModel):
    id: int
    phone: str
    nickname: str
    avatar: str | None = None


def _check_rate_limit(client_ip: str) -> None:
    now = time.time()
    attempts = [t for t in _rate_limit.get(client_ip, []) if now - t < _RATE_LIMIT_WINDOW]
    if len(attempts) >= _RATE_LIMIT_MAX:
        logger.warning(f"Rate limit exceeded for IP: {client_ip}")
        raise HTTPException(status_code=429, detail="操作过于频繁，请60秒后再试")
    attempts.append(now)
    _rate_limit[client_ip] = attempts


@router.post("/register", response_model=LoginResponse)
async def register(req: RegisterRequest, request: Request, db: AsyncSession = Depends(get_db)):
    _check_rate_limit(request.client.host if request.client else "unknown")

    existing = (await db.execute(select(User).where(User.phone == req.account))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="该账号已注册，请直接登录")

    hashed = bcrypt.hashpw(req.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    nickname = req.nickname or req.account
    user = User(phone=req.account, nickname=nickname, password_hash=hashed)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = create_access_token(user.id)
    logger.info(f"User registered: {req.account}")
    return LoginResponse(id=user.id, phone=user.phone, nickname=user.nickname, avatar=user.avatar, token=token)


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    _check_rate_limit(request.client.host if request.client else "unknown")

    result = await db.execute(select(User).where(User.phone == req.account))
    user = result.scalar_one_or_none()

    # Password login
    if req.password:
        if not user or not user.password_hash:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="账号或密码错误")
        if not bcrypt.checkpw(req.password.encode("utf-8"), user.password_hash.encode("utf-8")):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="账号或密码错误")
    else:
        # Code login (dev fallback)
        if req.code != "0000":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="验证码错误")
        if not user:
            user = User(phone=req.account, nickname=req.account)
            db.add(user)
            await db.commit()
            await db.refresh(user)

    token = create_access_token(user.id)
    return LoginResponse(id=user.id, phone=user.phone, nickname=user.nickname, avatar=user.avatar, token=token)


@router.get("/profile", response_model=UserInfo)
async def get_profile(user: User = Depends(get_current_user)):
    return UserInfo(id=user.id, phone=user.phone, nickname=user.nickname, avatar=user.avatar)


@router.post("/profile")
async def update_profile(nickname: str = None, avatar: str = None,
                         user: User = Depends(get_current_user),
                         db: AsyncSession = Depends(get_db)):
    if nickname:
        user.nickname = nickname
    if avatar:
        user.avatar = avatar
    await db.commit()
    return {"message": "更新成功"}


@router.get("/stats")
async def user_stats(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    fav_count = (await db.execute(
        select(func.count(UserFavorite.id)).where(UserFavorite.user_id == user.id)
    )).scalar() or 0

    conv_count = (await db.execute(
        select(func.count(Conversation.id)).where(Conversation.user_id == user.id)
    )).scalar() or 0

    msg_count = (await db.execute(
        select(func.count(Message.id))
        .join(Conversation)
        .where(Conversation.user_id == user.id)
    )).scalar() or 0

    visited = 0
    if user.visit_history:
        try:
            import json
            history = json.loads(user.visit_history) if isinstance(user.visit_history, str) else user.visit_history
            visited = len(history) if isinstance(history, list) else 0
        except Exception:
            pass

    return {
        "favorites": fav_count,
        "conversations": conv_count,
        "messages": msg_count,
        "visited_spots": visited,
    }
