from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.database import get_db
from app.models.entities import User
from app.core.auth import create_access_token, get_current_user

router = APIRouter()


class LoginRequest(BaseModel):
    phone: str
    code: str = "0000"


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


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    if req.code != "0000":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="验证码错误")
    from sqlalchemy import select
    result = await db.execute(select(User).where(User.phone == req.phone))
    user = result.scalar_one_or_none()
    if not user:
        user = User(phone=req.phone, nickname=f"游客{req.phone[-4:]}")
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
