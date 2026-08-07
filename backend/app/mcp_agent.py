# ──────────────────────────────────────────────────────────────────────────────
# backend/app/mcp_agent.py
# Model Context Protocol (MCP) Execution Hub
# Exposes tool execution routes and a multi-step agent reasoning loop
# ──────────────────────────────────────────────────────────────────────────────
from __future__ import annotations

import asyncio
import io
import json
import logging
import os
import subprocess
import time
import uuid
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, List, Optional

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from .config import get_settings
from .models import (
    AgentExecuteRequest,
    AgentExecuteResponse,
    AgentRunRequest,
    AgentRunResponse,
    AgentTool,
    ChatMessage,
    ChatRequest,
    Role,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/agent", tags=["MCP Agent"])

# ── Tool Registry ─────────────────────────────────────────────────────────────

class MCPToolRegistry:
    """Registry of all callable MCP tools."""

    def __init__(self, settings=None) -> None:
        self._settings = settings or get_settings()

    # ── Tool Definitions ──────────────────────────────────────────────────────

    def list_tools(self) -> List[AgentTool]:
        tools = [
            AgentTool(
                name="read_file",
                description="Read the contents of a file from the filesystem.",
                parameters={
                    "type": "object",
                    "properties": {
                        "path": {"type": "string", "description": "Absolute or relative file path"},
                        "encoding": {"type": "string", "default": "utf-8"},
                    },
                    "required": ["path"],
                },
            ),
            AgentTool(
                name="list_directory",
                description="List files and subdirectories in a given directory path.",
                parameters={
                    "type": "object",
                    "properties": {
                        "path": {"type": "string", "description": "Directory path to list"},
                        "recursive": {"type": "boolean", "default": False},
                    },
                    "required": ["path"],
                },
            ),
            AgentTool(
                name="http_request",
                description="Make an HTTP GET or POST request to an external URL.",
                parameters={
                    "type": "object",
                    "properties": {
                        "url": {"type": "string"},
                        "method": {"type": "string", "enum": ["GET", "POST"], "default": "GET"},
                        "headers": {"type": "object", "default": {}},
                        "body": {"type": "object"},
                    },
                    "required": ["url"],
                },
            ),
            AgentTool(
                name="run_python",
                description="Execute a Python code snippet and return stdout/stderr.",
                parameters={
                    "type": "object",
                    "properties": {
                        "code": {"type": "string", "description": "Python code to execute"},
                        "timeout": {"type": "integer", "default": 30},
                    },
                    "required": ["code"],
                },
                requires_confirmation=True,
            ),
        ]

        # Conditionally expose write/shell tools based on config
        if self._settings.mcp_allow_write:
            tools.append(
                AgentTool(
                    name="write_file",
                    description="Write content to a file (overwrite or create).",
                    parameters={
                        "type": "object",
                        "properties": {
                            "path": {"type": "string"},
                            "content": {"type": "string"},
                            "encoding": {"type": "string", "default": "utf-8"},
                        },
                        "required": ["path", "content"],
                    },
                    requires_confirmation=True,
                )
            )

        if self._settings.mcp_allow_shell:
            tools.append(
                AgentTool(
                    name="run_shell",
                    description="Run a shell command and return stdout/stderr. ⚠️ Use with caution.",
                    parameters={
                        "type": "object",
                        "properties": {
                            "command": {"type": "string"},
                            "cwd": {"type": "string"},
                            "timeout": {"type": "integer", "default": 30},
                        },
                        "required": ["command"],
                    },
                    requires_confirmation=True,
                )
            )

        return tools

    # ── Tool Executors ────────────────────────────────────────────────────────

    async def execute(self, tool_name: str, args: Dict[str, Any]) -> Any:
        """Dispatch and execute the named tool with given arguments."""
        dispatch = {
            "read_file": self._read_file,
            "write_file": self._write_file,
            "list_directory": self._list_directory,
            "http_request": self._http_request,
            "run_python": self._run_python,
            "run_shell": self._run_shell,
        }
        if tool_name not in dispatch:
            raise ValueError(f"Unknown tool: '{tool_name}'. Available: {list(dispatch.keys())}")
        return await dispatch[tool_name](args)

    async def _read_file(self, args: Dict) -> Dict:
        path = Path(args["path"])
        encoding = args.get("encoding", "utf-8")
        if not path.exists():
            raise FileNotFoundError(f"File not found: {path}")
        content = path.read_text(encoding=encoding)
        return {
            "path": str(path.resolve()),
            "size_bytes": path.stat().st_size,
            "content": content,
        }

    async def _write_file(self, args: Dict) -> Dict:
        if not self._settings.mcp_allow_write:
            raise PermissionError("File writing is disabled (MCP_ALLOW_WRITE=false)")
        path = Path(args["path"])
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(args["content"], encoding=args.get("encoding", "utf-8"))
        return {"path": str(path.resolve()), "bytes_written": len(args["content"].encode())}

    async def _list_directory(self, args: Dict) -> Dict:
        path = Path(args["path"])
        if not path.exists():
            raise FileNotFoundError(f"Directory not found: {path}")
        recursive = args.get("recursive", False)
        if recursive:
            entries = [
                {"path": str(p), "type": "dir" if p.is_dir() else "file", "size": p.stat().st_size if p.is_file() else None}
                for p in sorted(path.rglob("*"))
            ]
        else:
            entries = [
                {"path": str(p), "type": "dir" if p.is_dir() else "file", "size": p.stat().st_size if p.is_file() else None}
                for p in sorted(path.iterdir())
            ]
        return {"path": str(path.resolve()), "entries": entries, "count": len(entries)}

    async def _http_request(self, args: Dict) -> Dict:
        url = args["url"]
        method = args.get("method", "GET").upper()
        headers = args.get("headers", {})
        body = args.get("body")

        async with httpx.AsyncClient(timeout=30.0) as client:
            if method == "GET":
                resp = await client.get(url, headers=headers)
            elif method == "POST":
                resp = await client.post(url, headers=headers, json=body)
            else:
                raise ValueError(f"Unsupported method: {method}")

        try:
            response_body = resp.json()
        except Exception:
            response_body = resp.text[:2000]

        return {
            "url": url,
            "method": method,
            "status_code": resp.status_code,
            "headers": dict(resp.headers),
            "body": response_body,
        }

    async def _run_python(self, args: Dict) -> Dict:
        code = args["code"]
        timeout = args.get("timeout", 30)

        # Capture stdout/stderr safely
        old_stdout = io.StringIO()
        old_stderr = io.StringIO()

        proc = await asyncio.create_subprocess_exec(
            "python3", "-c", code,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        except asyncio.TimeoutError:
            proc.kill()
            return {"success": False, "error": f"Execution timed out after {timeout}s"}

        return {
            "success": proc.returncode == 0,
            "returncode": proc.returncode,
            "stdout": stdout.decode()[:4000],
            "stderr": stderr.decode()[:2000],
        }

    async def _run_shell(self, args: Dict) -> Dict:
        if not self._settings.mcp_allow_shell:
            raise PermissionError("Shell execution is disabled (MCP_ALLOW_SHELL=false)")

        command = args["command"]
        cwd = args.get("cwd", ".")
        timeout = args.get("timeout", 30)

        proc = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=cwd,
        )
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        except asyncio.TimeoutError:
            proc.kill()
            return {"success": False, "error": f"Command timed out after {timeout}s"}

        return {
            "success": proc.returncode == 0,
            "returncode": proc.returncode,
            "stdout": stdout.decode()[:4000],
            "stderr": stderr.decode()[:2000],
            "command": command,
        }


# ── Singleton registry ────────────────────────────────────────────────────────
_registry = MCPToolRegistry()


# ── Agent Reasoning Loop ──────────────────────────────────────────────────────

class MCPAgent:
    """
    Simple ReAct-style agent that uses a chat model to reason about tasks
    and calls MCP tools to execute actions.
    """

    def __init__(self, registry: MCPToolRegistry) -> None:
        self._registry = registry

    def _build_system_prompt(self, available_tools: List[AgentTool]) -> str:
        tool_descriptions = "\n".join(
            f"- **{t.name}**: {t.description}\n  Parameters: {json.dumps(t.parameters, indent=2)}"
            for t in available_tools
        )
        return f"""You are an AI agent with access to the following tools:

{tool_descriptions}

## Instructions:
1. To use a tool, respond with a JSON block in this exact format:
```json
{{
  "thought": "Why I need this tool",
  "tool": "tool_name",
  "args": {{"param1": "value1"}}
}}
```
2. After receiving the tool result, continue reasoning.
3. When you have the final answer, respond with:
```json
{{
  "thought": "I now have enough information",
  "final_answer": "Your complete answer here"
}}
```
4. Do NOT call tools unnecessarily. Be concise and direct.
"""

    async def run(self, task: str, model: str, max_steps: int, tool_filter: Optional[List[str]] = None) -> AgentRunResponse:
        from .routers.chat import _stream_with_fallback

        available_tools = self._registry.list_tools()
        if tool_filter:
            available_tools = [t for t in available_tools if t.name in tool_filter]

        system_prompt = self._build_system_prompt(available_tools)
        conversation: List[ChatMessage] = [
            ChatMessage(role=Role.user, content=task)
        ]
        steps: List[Dict] = []
        final_answer: Optional[str] = None

        for step_num in range(max_steps):
            # Collect model response
            response_text = ""
            chat_req = ChatRequest(
                messages=conversation,
                model=model,
                system_prompt=system_prompt,
                stream=True,
            )
            async for chunk in _stream_with_fallback(chat_req):
                if chunk.startswith("data: ") and not chunk.strip().endswith("[DONE]"):
                    try:
                        parsed = json.loads(chunk[6:])
                        content = parsed.get("choices", [{}])[0].get("delta", {}).get("content", "")
                        response_text += content
                    except Exception:
                        pass

            # Parse model response
            step: Dict[str, Any] = {"step": step_num + 1, "model_response": response_text}

            # Look for JSON block
            import re
            json_matches = re.findall(r"```json\s*(.*?)\s*```", response_text, re.DOTALL)
            if json_matches:
                try:
                    action = json.loads(json_matches[-1])
                    step["thought"] = action.get("thought", "")

                    if "final_answer" in action:
                        final_answer = action["final_answer"]
                        step["type"] = "final"
                        step["final_answer"] = final_answer
                        steps.append(step)
                        break

                    if "tool" in action:
                        tool_name = action["tool"]
                        tool_args = action.get("args", {})
                        step["type"] = "tool_call"
                        step["tool"] = tool_name
                        step["args"] = tool_args

                        try:
                            t_start = time.time()
                            result = await self._registry.execute(tool_name, tool_args)
                            step["tool_result"] = result
                            step["duration_ms"] = int((time.time() - t_start) * 1000)
                            # Add tool result to conversation
                            conversation.append(ChatMessage(role=Role.assistant, content=response_text))
                            conversation.append(ChatMessage(
                                role=Role.user,
                                content=f"Tool result for {tool_name}:\n```json\n{json.dumps(result, indent=2)}\n```"
                            ))
                        except Exception as exc:
                            step["tool_error"] = str(exc)
                            conversation.append(ChatMessage(role=Role.assistant, content=response_text))
                            conversation.append(ChatMessage(
                                role=Role.user,
                                content=f"Tool '{tool_name}' failed: {exc}. Try a different approach."
                            ))
                except json.JSONDecodeError:
                    step["type"] = "text"
                    final_answer = response_text
                    steps.append(step)
                    break
            else:
                # No JSON block — treat as final answer
                step["type"] = "text"
                final_answer = response_text
                steps.append(step)
                break

            steps.append(step)

        return AgentRunResponse(
            task=task,
            steps=steps,
            final_answer=final_answer,
            success=final_answer is not None,
            total_steps=len(steps),
        )


_agent = MCPAgent(_registry)


# ── FastAPI Routes ────────────────────────────────────────────────────────────

@router.get(
    "/tools",
    response_model=List[AgentTool],
    summary="List all available MCP tools",
)
async def list_tools():
    """Returns all registered MCP tools with their parameter schemas."""
    return _registry.list_tools()


@router.post(
    "/execute",
    response_model=AgentExecuteResponse,
    summary="Execute a single MCP tool",
)
async def execute_tool(request: AgentExecuteRequest):
    """
    Execute a named MCP tool directly with the provided arguments.
    Useful for one-shot tool calls from the frontend or sub-agents.
    """
    start = time.time()
    try:
        result = await _registry.execute(request.tool_name, request.arguments)
        return AgentExecuteResponse(
            tool_name=request.tool_name,
            result=result,
            success=True,
            duration_ms=int((time.time() - start) * 1000),
        )
    except (ValueError, FileNotFoundError, PermissionError) as exc:
        return AgentExecuteResponse(
            tool_name=request.tool_name,
            result=None,
            success=False,
            error=str(exc),
            duration_ms=int((time.time() - start) * 1000),
        )
    except Exception as exc:
        logger.exception(f"[mcp] Unexpected error in tool '{request.tool_name}'")
        raise HTTPException(status_code=500, detail=str(exc))


@router.post(
    "/run",
    response_model=AgentRunResponse,
    summary="Run multi-step agent reasoning loop",
    description=(
        "Launches a ReAct-style agent loop that uses an LLM to reason about the task "
        "and calls MCP tools iteratively until a final answer is produced."
    ),
)
async def agent_run(request: AgentRunRequest):
    """
    Run the MCP agent on a task. The agent will:
    1. Reason about what tool to use
    2. Execute the tool
    3. Observe the result
    4. Repeat until a final answer is reached or max_steps is hit
    """
    settings = get_settings()
    max_steps = min(request.max_steps, settings.mcp_max_steps)

    logger.info(f"[agent/run] task={request.task[:80]} model={request.model} max_steps={max_steps}")

    result = await _agent.run(
        task=request.task,
        model=request.model,
        max_steps=max_steps,
        tool_filter=request.tools,
    )
    return result
