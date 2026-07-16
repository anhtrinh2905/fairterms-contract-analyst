from fastapi import APIRouter
from pydantic import BaseModel

from app.agents.agent import run_agent

router = APIRouter(prefix="/agent", tags=["agent"])


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    query: str
    conversation: list[Message] = []


class ChatResponse(BaseModel):
    answer: str


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    history = [m.model_dump() for m in req.conversation]
    answer = run_agent(req.query, history)
    return ChatResponse(answer=answer)
