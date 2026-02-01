from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import asyncio
import json
from .langchain_mcp_backend import chatbot, retrieve_all_threads

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    thread_id: str

async def stream_generator(message: str, thread_id: str):
    config = {"configurable": {"thread_id": thread_id}}
    
    try:
        async for event in chatbot.astream_events(
            {"messages": [("user", message)]},
            config,
            version="v1"
        ):
            kind = event["event"]
            
            if kind == "on_chat_model_stream":
                content = event["data"]["chunk"].content
                if content:
                    yield f"data: {json.dumps({'type': 'content', 'content': content})}\n\n"
            
            elif kind == "on_tool_start":
                yield f"data: {json.dumps({'type': 'tool_start', 'tool': event['name']})}\n\n"
                
            elif kind == "on_tool_end":
                yield f"data: {json.dumps({'type': 'tool_end', 'tool': event['name']})}\n\n"

    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

@app.get("/threads")
def get_threads():
    threads = retrieve_all_threads()
    return {"threads": threads}

@app.delete("/thread/{thread_id}")
async def delete_thread_endpoint(thread_id: str):
    try:
        from .langchain_mcp_backend import delete_thread_sync
        delete_thread_sync(thread_id)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def stream_generator(message: str, thread_id: str):
    config = {"configurable": {"thread_id": thread_id}}
    
    # Heuristic Title Generation: if this is the first message 
    # (or title not set), save a title based on the message.
    from .langchain_mcp_backend import set_thread_title, get_metadata
    
    metadata = await get_metadata()
    if thread_id not in metadata:
        # Simple heuristic: take first 4-5 words or first 40 chars
        title = (message[:40] + '...') if len(message) > 40 else message
        set_thread_title(thread_id, title)

    try:
        async for event in chatbot.astream_events(
            {"messages": [("user", message)]},
            config,
            version="v1"
        ):
            kind = event["event"]
            
            if kind == "on_chat_model_stream":
                content = event["data"]["chunk"].content
                if content:
                    yield f"data: {json.dumps({'type': 'content', 'content': content})}\n\n"
            
            elif kind == "on_tool_start":
                yield f"data: {json.dumps({'type': 'tool_start', 'tool': event['name']})}\n\n"
            
            elif kind == "on_error":
                 yield f"data: {json.dumps({'type': 'error', 'content': str(event['data'])})}\n\n"

    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

@app.post("/chat/stream")
async def chat_endpoint(request: ChatRequest):
    return StreamingResponse(
        stream_generator(request.message, request.thread_id),
        media_type="text/event-stream"
    )

@app.get("/thread/{thread_id}/history")
async def get_thread_history(thread_id: str):
    """
    Return the full message history for a given thread.

    If the thread has no checkpoints yet (e.g. the user clicked a freshly
    created conversation with no messages), we treat that as an empty history
    instead of raising a 500 error.
    """
    try:
        state = await chatbot.aget_state({"configurable": {"thread_id": thread_id}})
    except Exception:
        # If there is no saved state for this thread yet, just return an empty
        # history so the frontend can still open the conversation.
        return {"messages": []}

    if not getattr(state, "values", None):
        return {"messages": []}

    messages = []
    for msg in state.values.get("messages", []):
        # Skip purely functional tool messages in the UI history for now
        # to keep the conversation view clean.
        if msg.type == "tool":
            continue
            
        role = "user" if msg.type == "human" else "assistant"
        content = msg.content
        
        # If content is a list (e.g. multi-modal or tool-call metadata), 
        # extract text or stringify it.
        if isinstance(content, list):
            text_parts = [c["text"] for c in content if isinstance(c, dict) and "text" in c]
            content = " ".join(text_parts) if text_parts else str(content)
        
        messages.append({"role": role, "content": str(content)})

    return {"messages": messages}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
