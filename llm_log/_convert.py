#!/usr/bin/env python3
"""Convert Claude Code JSONL session files to readable markdown.

Produces clean, readable markdown with tool calls and their results
grouped together under assistant turns (not split across user/assistant).
"""

import json
import os
import re

BASE = os.path.expanduser("~/.claude/projects/-Users-wolfgang-workspace-lagebild-ki/")
OUT_DIR = "/Users/wolfgang/workspace/lagebild-ki/llm_log/"

# Chronological order (sorted by first timestamp)
SESSIONS = [
    ("dd5004e8-a5fc-400e-ba02-43d83b2a4106.jsonl", "2026-03-12T13:04"),
    ("942b5979-b91b-49c9-b1ca-dbad107a5d01.jsonl", "2026-03-12T13:31"),
    ("c84886cb-f712-4ebf-88f5-aa4531d5ed17.jsonl", "2026-03-12T14:09"),
    ("51bcf414-4a1c-412b-830c-2cc040225f9f.jsonl", "2026-03-12T15:32"),
    ("f36005af-a0c9-437e-9b46-98ba2f96bc13.jsonl", "2026-03-12T20:10"),
]


def truncate(s, max_len=300):
    if not s:
        return ""
    s = str(s)
    return s[:max_len] + "..." if len(s) > max_len else s


def format_tool_use(block):
    """Format a tool_use block as a brief summary line."""
    name = block.get("name", "Unknown")
    inp = block.get("input", {})

    if name == "Read":
        return f"**Tool: Read** `{inp.get('file_path', '?')}`"
    elif name == "Write":
        path = inp.get("file_path", "?")
        content_len = len(inp.get("content", ""))
        return f"**Tool: Write** `{path}` ({content_len} chars)"
    elif name == "Edit":
        path = inp.get("file_path", "?")
        old = truncate(inp.get("old_string", ""), 80)
        return f'**Tool: Edit** `{path}` replacing `{old}`'
    elif name == "Bash":
        cmd = inp.get("command", "?")
        desc = inp.get("description", "")
        cmd_short = truncate(cmd, 200)
        if desc:
            return f"**Tool: Bash** `{cmd_short}` -- {desc}"
        return f"**Tool: Bash** `{cmd_short}`"
    elif name == "Glob":
        pattern = inp.get("pattern", "?")
        path = inp.get("path", ".")
        return f"**Tool: Glob** `{pattern}` in `{path}`"
    elif name == "Grep":
        pattern = inp.get("pattern", "?")
        path = inp.get("path", ".")
        return f"**Tool: Grep** `{pattern}` in `{path}`"
    elif name == "WebFetch":
        url = inp.get("url", "?")
        return f"**Tool: WebFetch** `{truncate(url, 150)}`"
    elif name == "WebSearch":
        query = inp.get("query", "?")
        return f"**Tool: WebSearch** `{query}`"
    elif name == "TodoWrite":
        return "**Tool: TodoWrite** (updated task list)"
    elif name == "Skill":
        skill = inp.get("skill", "?")
        return f"**Tool: Skill** `{skill}`"
    elif name == "ToolSearch":
        query = inp.get("query", "?")
        return f"**Tool: ToolSearch** `{query}`"
    elif name == "NotebookEdit":
        return f"**Tool: NotebookEdit** `{inp.get('notebook_path', '?')}`"
    else:
        keys = list(inp.keys())
        return f"**Tool: {name}** (params: {keys})"


def format_tool_result_content(content, is_error=False):
    """Format tool result content as a brief blockquote."""
    if isinstance(content, list):
        texts = []
        for item in content:
            if isinstance(item, dict):
                if item.get("type") == "text":
                    texts.append(item.get("text", ""))
                elif item.get("type") == "image":
                    texts.append("[image]")
            else:
                texts.append(str(item))
        content = "\n".join(texts)

    content = str(content).strip()
    if not content:
        return "> *(empty result)*"

    prefix = "**Result (error):**" if is_error else "**Result:**"

    lines = content.split("\n")
    if len(lines) > 8:
        preview = "\n".join(lines[:6])
        return f"> {prefix} ({len(lines)} lines)\n> ```\n> {truncate(preview, 500)}\n> ```\n> *(truncated)*"
    else:
        return f"> {prefix}\n> ```\n> {truncate(content, 500)}\n> ```"


def extract_user_text_parts(content):
    """Extract user text and tool results separately from user message content.
    Returns (user_texts: list[str], tool_results: dict[tool_use_id -> formatted_str])
    """
    if isinstance(content, str):
        return [content], {}

    user_texts = []
    tool_results = {}

    for block in content:
        if isinstance(block, str):
            user_texts.append(block)
        elif isinstance(block, dict):
            btype = block.get("type", "")
            if btype == "text":
                text = block.get("text", "")
                if text.startswith("<ide_opened_file>"):
                    m = re.search(r'file (.+?) in the IDE', text)
                    if m:
                        user_texts.append(f"*[Opened file: `{m.group(1)}`]*")
                elif text.startswith("<"):
                    # Skip system XML tags silently (they're context, not conversation)
                    pass
                else:
                    user_texts.append(text)
            elif btype == "tool_result":
                tid = block.get("tool_use_id", "")
                is_error = block.get("is_error", False)
                formatted = format_tool_result_content(block.get("content", ""), is_error)
                tool_results[tid] = formatted

    return user_texts, tool_results


def process_session(jsonl_path, session_id, session_num, start_time):
    """Process a single JSONL session file and return markdown content.

    Strategy: We collect all messages, then do a two-pass approach:
    1. Build a map of tool_use_id -> tool_result (from user messages)
    2. Render conversation as User/Assistant turns, attaching tool results
       inline under the tool_use that triggered them.
    """

    raw = []
    with open(jsonl_path) as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    raw.append(json.loads(line))
                except json.JSONDecodeError:
                    continue

    # First pass: collect all tool results keyed by tool_use_id
    all_tool_results = {}  # tool_use_id -> formatted result string
    for obj in raw:
        if obj.get("type") != "user":
            continue
        content = obj.get("message", {}).get("content", "")
        _, trs = extract_user_text_parts(content)
        all_tool_results.update(trs)

    # Second pass: build markdown
    md = []
    md.append(f"# Session {session_num:02d}")
    md.append("")
    md.append(f"- **Session ID:** `{session_id}`")
    md.append(f"- **Started:** {start_time}")
    md.append(f"- **File size:** {os.path.getsize(jsonl_path) / 1024:.0f} KB")
    md.append("")
    md.append("---")
    md.append("")

    user_turn_count = 0

    for obj in raw:
        msg_type = obj.get("type")

        if msg_type == "user":
            message = obj.get("message", {})
            content = message.get("content", "")
            ts = obj.get("timestamp", "")

            user_texts, _ = extract_user_text_parts(content)
            # Filter empty
            user_texts = [t for t in user_texts if t.strip()]

            if not user_texts:
                # Pure tool result message or empty - skip (results are inlined under assistant)
                continue

            user_turn_count += 1
            ts_short = ts[:19].replace("T", " ") if ts else ""
            md.append(f"## User [{ts_short}]")
            md.append("")
            md.append("\n".join(user_texts))
            md.append("")

        elif msg_type == "assistant":
            message = obj.get("message", {})
            content = message.get("content", [])
            ts = obj.get("timestamp", "")

            pieces = []

            for block in content:
                btype = block.get("type", "")

                if btype == "thinking":
                    thinking = block.get("thinking", "")
                    if thinking.strip():
                        pieces.append(
                            f"<details>\n<summary>Thinking...</summary>\n\n"
                            f"{truncate(thinking, 1000)}\n\n</details>"
                        )

                elif btype == "text":
                    text = block.get("text", "")
                    if text.strip():
                        pieces.append(text)

                elif btype == "tool_use":
                    tool_line = format_tool_use(block)
                    tid = block.get("id", "")
                    result_line = all_tool_results.get(tid, "")
                    if result_line:
                        pieces.append(f"{tool_line}\n{result_line}")
                    else:
                        pieces.append(tool_line)

            if not pieces:
                continue

            ts_short = ts[:19].replace("T", " ") if ts else ""
            md.append(f"### Assistant [{ts_short}]")
            md.append("")
            md.append("\n\n".join(pieces))
            md.append("")

    md.append("---")
    md.append(f"*End of session ({user_turn_count} user turns)*")

    return "\n".join(md)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    for i, (filename, start_time) in enumerate(SESSIONS, 1):
        session_id = filename.replace(".jsonl", "")
        jsonl_path = os.path.join(BASE, filename)

        print(f"Processing session {i}: {session_id}...")

        md_content = process_session(jsonl_path, session_id, i, start_time)

        out_path = os.path.join(OUT_DIR, f"session_{i:02d}.md")
        with open(out_path, "w") as f:
            f.write(md_content)

        print(f"  -> {out_path} ({len(md_content)} chars)")

    print("\nDone! Generated markdown files in", OUT_DIR)


if __name__ == "__main__":
    main()
