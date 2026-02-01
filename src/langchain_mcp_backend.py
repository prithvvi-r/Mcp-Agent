import os
from langgraph.graph import StateGraph, START, END
from typing import TypedDict, Annotated
from langchain_core.messages import BaseMessage, HumanMessage
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_core.tools import tool, BaseTool
from langchain_mcp_adapters.client import MultiServerMCPClient
from dotenv import load_dotenv
import aiosqlite
import requests
import asyncio
import threading

load_dotenv()


# Dedicated async loop for backend tasks
_ASYNC_LOOP = asyncio.new_event_loop()
_ASYNC_THREAD = threading.Thread(target=_ASYNC_LOOP.run_forever, daemon=True)
_ASYNC_THREAD.start()


def _submit_async(coro):
    return asyncio.run_coroutine_threadsafe(coro, _ASYNC_LOOP)


def run_async(coro):
    return _submit_async(coro).result()


def submit_async_task(coro):
    """Schedule a coroutine on the backend event loop."""
    return _submit_async(coro)


# -------------------
# 1. LLM
# -------------------
llm = ChatOpenAI(model = 'gpt-4o-mini')

# -------------------
# 2. Tools
# -------------------
search_tool = DuckDuckGoSearchRun(region="us-en")


@tool
def get_stock_price(symbol: str) -> dict:
    """
    Fetch latest stock price for a given symbol (e.g. 'AAPL', 'TSLA') 
    using Alpha Vantage with API key in the URL.
    """
    url = f"https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={symbol}&apikey=C9PE94QUEW9VWGFM"
    r = requests.get(url)
    return r.json()


client = MultiServerMCPClient(
    {
        "github": {
            "transport": "stdio",
            "command": "npx",
            "args": [
                "-y",
                "@modelcontextprotocol/server-github"
            ],
            "env": {
                "GITHUB_PERSONAL_ACCESS_TOKEN": os.getenv("GITHUB_PERSONAL_ACCESS_TOKEN")
            }
        },
        
        "arith": {
            "transport": "stdio",
            "command": "python",
            "args": ["C:/Users/PRUTHVIRAJ/Desktop/mcp-server/expense-tracker-mcp-server/main.py"],
        },
        "expense": {
            "transport": "streamable_http",  # if this fails, try "sse"
            "url": "https://splendid-gold-dingo.fastmcp.app/mcp"
        },
        "aws": {
            "transport": "stdio",
            "command": "python",
            "args": ["C:/Users/PRUTHVIRAJ/Desktop/Notes/src/aws_mcp_server.py"],
        }
    }
)


def load_mcp_tools() -> list[BaseTool]:
    try:
        return run_async(client.get_tools())
    except Exception:
        return []


mcp_tools = load_mcp_tools()

tools = [search_tool, get_stock_price, *mcp_tools]
llm_with_tools = llm.bind_tools(tools) if tools else llm

# -------------------
# 3. State
# -------------------
class ChatState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]

# -------------------
# 4. Nodes
# -------------------
async def chat_node(state: ChatState):
    """LLM node that may answer or request a tool call."""
    messages = state["messages"]
    response = await llm_with_tools.ainvoke(messages)
    return {"messages": [response]}


tool_node = ToolNode(tools) if tools else None

# -------------------
# 5. Checkpointer
# -------------------


async def _init_checkpointer():
    conn = await aiosqlite.connect(database="chatbot.db")
    return AsyncSqliteSaver(conn)


checkpointer = run_async(_init_checkpointer())

# -------------------
# 6. Graph
# -------------------
graph = StateGraph(ChatState)
graph.add_node("chat_node", chat_node)
graph.add_edge(START, "chat_node")

if tool_node:
    graph.add_node("tools", tool_node)
    graph.add_conditional_edges("chat_node", tools_condition)
    graph.add_edge("tools", "chat_node")
else:
    graph.add_edge("chat_node", END)

chatbot = graph.compile(checkpointer=checkpointer)

# -------------------
# 7. Thread Metadata & Helpers
# -------------------
async def _init_db():
    async with aiosqlite.connect("chatbot.db") as conn:
        await conn.execute(
            "CREATE TABLE IF NOT EXISTS thread_metadata (thread_id TEXT PRIMARY KEY, title TEXT)"
        )
        await conn.commit()

run_async(_init_db())

async def upsert_title(thread_id: str, title: str):
    async with aiosqlite.connect("chatbot.db") as conn:
        await conn.execute(
            "INSERT OR REPLACE INTO thread_metadata (thread_id, title) VALUES (?, ?)",
            (thread_id, title)
        )
        await conn.commit()

async def get_metadata():
    async with aiosqlite.connect("chatbot.db") as conn:
        async with conn.execute("SELECT thread_id, title FROM thread_metadata") as cursor:
            rows = await cursor.fetchall()
            return {row[0]: row[1] for row in rows}

async def delete_thread_data(thread_id: str):
    async with aiosqlite.connect("chatbot.db") as conn:
        # Delete from custom metadata
        await conn.execute("DELETE FROM thread_metadata WHERE thread_id = ?", (thread_id,))
        # Delete from LangGraph checkpointer tables (verified schema: checkpoints, writes)
        await conn.execute("DELETE FROM checkpoints WHERE thread_id = ?", (thread_id,))
        await conn.execute("DELETE FROM writes WHERE thread_id = ?", (thread_id,))
        await conn.commit()

async def _alist_threads():
    # Merge existing checkpoint threads with metadata
    metadata = await get_metadata()
    all_threads = []
    
    # Get all distinct thread IDs from checkpoints
    found_ids = set()
    async for checkpoint in checkpointer.alist(None):
        t_id = checkpoint.config["configurable"]["thread_id"]
        if t_id not in found_ids:
            all_threads.append({
                "id": t_id,
                "title": metadata.get(t_id, f"Thread {t_id[:8]}")
            })
            found_ids.add(t_id)
            
    return all_threads

def retrieve_all_threads():
    return run_async(_alist_threads())

def set_thread_title(thread_id: str, title: str):
    return run_async(upsert_title(thread_id, title))

def delete_thread_sync(thread_id: str):
    return run_async(delete_thread_data(thread_id))
