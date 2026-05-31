from fastapi import APIRouter
from pydantic import BaseModel

from src.services.llm_chat_service import (
    generate_llm_chat
)

router = APIRouter()


class ChatRequest(BaseModel):
    message: str


@router.post("/chat")
async def traffic_chat(request: ChatRequest):

    response = generate_llm_chat(
        request.message
    )

    return {
        "response": response
    }