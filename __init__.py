"""Hermes adapter for Gipypowers' shared Node.js core."""

from pathlib import Path
import json
import subprocess


PLUGIN_ROOT = Path(__file__).resolve().parent
SKILLS_ROOT = PLUGIN_ROOT / "skills"
MAX_CONTEXT_CHARS = 5800
_SESSION_ROOTS = {}
_SEEN_SESSIONS = set()
_UPDATE_SESSIONS = set()
_UPDATE_NOTICES = {}


def _run_context(root, mode, prompt="", session_id=""):
    command = [
        "node",
        str(PLUGIN_ROOT / "core" / "cli.js"),
        "context",
        mode,
        "--root",
        str(root),
    ]
    if prompt:
        command.extend(["--prompt", prompt[:50000]])
    if session_id:
        command.extend(["--session-id", session_id[:160]])
    if mode == "session":
        command.append("--compact")
    try:
        result = subprocess.run(
            command,
            cwd=str(root),
            capture_output=True,
            text=True,
            timeout=2.5,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return ""
    if result.returncode != 0:
        return ""
    return result.stdout.strip()[:MAX_CONTEXT_CHARS]


def _run_startup_update(root):
    command = [
        "node",
        str(PLUGIN_ROOT / "core" / "cli.js"),
        "update",
        "startup",
        "--host",
        "hermes",
        "--root",
        str(root),
        "--plugin-root",
        str(PLUGIN_ROOT),
    ]
    try:
        result = subprocess.run(
            command,
            cwd=str(root),
            capture_output=True,
            text=True,
            timeout=14.5,
            check=False,
        )
        if result.returncode != 0:
            return ""
        status = json.loads(result.stdout)
    except (OSError, subprocess.TimeoutExpired, ValueError):
        return ""
    notice = status.get("notice")
    return notice if isinstance(notice, str) else ""


def register(ctx):
    """Register only optional host-supported hooks and bundled skills."""
    register_skill = getattr(ctx, "register_skill", None)
    if callable(register_skill):
        for skill_dir in sorted(SKILLS_ROOT.iterdir()):
            skill_file = skill_dir / "SKILL.md"
            if skill_file.is_file():
                register_skill(skill_dir.name, str(skill_dir))

    register_section = getattr(ctx, "register_system_prompt_section", None)
    if callable(register_section):
        def session_context(session_info):
            root = Path(session_info.get("cwd") or Path.cwd()).resolve()
            session_id = str(session_info.get("session_id") or "")
            if session_id:
                _SESSION_ROOTS[session_id] = root
            return _run_context(root, "session", session_id=session_id)[:4000]

        register_section(
            "gipypowers.session",
            session_context,
            position="after_memory",
            max_chars=4000,
        )

    def on_session_start(session_info):
        session_info = session_info if isinstance(session_info, dict) else {}
        root = Path(session_info.get("cwd") or Path.cwd()).resolve()
        session_id = str(session_info.get("session_id") or "")
        update_key = session_id or f"root:{root}"
        if session_id:
            _SESSION_ROOTS[session_id] = root
        if update_key in _UPDATE_SESSIONS:
            return None
        _UPDATE_SESSIONS.add(update_key)
        notice = _run_startup_update(root)
        if notice:
            _UPDATE_NOTICES[update_key] = notice
        return None

    register_hook = getattr(ctx, "register_hook", None)
    if callable(register_hook):
        register_hook("on_session_start", on_session_start)

    def route_and_recall(user_message="", session_id="", is_first_turn=False, **kwargs):
        del is_first_turn
        session_key = str(session_id or "")
        root = Path(
            kwargs.get("cwd") or _SESSION_ROOTS.get(session_key) or Path.cwd()
        ).resolve()
        update_key = session_key or f"root:{root}"
        if session_key:
            _SESSION_ROOTS.setdefault(session_key, root)
        message = user_message if isinstance(user_message, str) else ""
        context = _run_context(root, "prompt", message, session_key)
        if update_key in _SEEN_SESSIONS:
            if not context:
                return None
            return {"context": context}
        _SEEN_SESSIONS.add(update_key)
        if update_key not in _UPDATE_SESSIONS:
            on_session_start({"cwd": root, "session_id": session_key})
        update_notice = _UPDATE_NOTICES.pop(update_key, "")
        if update_notice:
            context = "\n\n".join((context, update_notice))
        if not context:
            return None
        if callable(register_section):
            return {"context": context[:MAX_CONTEXT_CHARS]}
        startup = _run_context(root, "session", session_id=session_key)
        combined = "\n\n".join(part for part in (startup, context) if part)
        return {"context": combined[:MAX_CONTEXT_CHARS]}

    if callable(register_hook):
        register_hook("pre_llm_call", route_and_recall)
