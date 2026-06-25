from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: str
    username: str
    role: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
