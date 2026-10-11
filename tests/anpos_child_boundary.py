"""Child-repository boundary helper for ANPOS tests.

scripts/bootstrap_child.py removes vendor-only paths listed in
config/licensing/vendor-source-boundary.json. Tests that inspect those vendor
assets are meaningful only in the canonical template source; in an initialised
child they are skipped (never silently passed) when the asset was stripped.
"""
from __future__ import annotations

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _vendor_only_paths() -> tuple[str, ...]:
    try:
        instance = json.loads((ROOT / "config/protocol/instance.json").read_text(encoding="utf-8"))
        boundary = json.loads((ROOT / "config/licensing/vendor-source-boundary.json").read_text(encoding="utf-8"))
    except Exception:
        return ()
    if instance.get("instance_status") == "template_source":
        return ()
    raw = boundary.get("vendor_only_paths")
    return tuple(p for p in raw if isinstance(p, str) and p) if isinstance(raw, list) else ()


def stripped_from_child(relative: str) -> bool:
    if (ROOT / relative).exists():
        return False
    return any(relative == p or relative.startswith(p + "/") for p in _vendor_only_paths())


def requires_vendor_source(*relatives: str):
    """Skip the decorated test in a child repository where any listed vendor-only path was stripped."""
    stripped = [r for r in relatives if stripped_from_child(r)]
    return unittest.skipIf(bool(stripped), f"vendor-only path stripped from child repository: {', '.join(stripped)}")
