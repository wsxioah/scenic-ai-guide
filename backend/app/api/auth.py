from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.database import get_db
from app.models.entities import User

router = APIRouter()


class LoginRequest(BaseModel):
    phone: str
    code: str = "0000"  # 简化验证码


class UserInfo(BaseModel):
    id: int
    phone: str
    nickname: str
    avatar: str | None = None


@router.post("/login", response_model=UserInfo)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """手机号+验证码登录（验证码默认0000）"""
    # TODO: 接入真实短信验证码
    if req.code != "0000":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="验证码错误")
    # 查找或创建用户
    from sqlalchemy import select
    result = await db.execute(select(User).where(User.phone == req.phone))
    user = result.scalar_one_or_none()
    if not user:
        user = User(phone=req.phone, nickname=f"游客{req.phone[-4:]}")
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return UserInfo(id=user.id, phone=user.phone, nickname=user.nickname, avatar=user.avatar)


@router.get("/profile", response_model=UserInfo)
async def get_profile(user_id: int, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return UserInfo(id=user.id, phone=user.phone, nickname=user.nickname, avatar=user.avatar)


@router.post("/profile")
async def update_profile(user_id: int, nickname: str = None, avatar: str = None,
                         db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if nickname:
        user.nickname = nickname
    if avatar:
        user.avatar = avatar
    await db.commit()
    return {"message": "更新成功"}
