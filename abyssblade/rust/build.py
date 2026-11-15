#!/usr/bin/env python3
"""BLADEFORGE 빌드: Rust 엔진(.wasm)을 base64로 template.html에 인라인해 단일 dist/index.html 생성."""
import base64
import pathlib
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parent
WASM = ROOT / "target" / "wasm32-unknown-unknown" / "release" / "bladeforge.wasm"
TPL = ROOT / "template.html"
DIST = ROOT / "dist"
TOKEN = "__WASM_BASE64__"


def main() -> int:
    if not WASM.exists():
        print(f"missing wasm: {WASM}", file=sys.stderr)
        print("run: cargo build --target wasm32-unknown-unknown --release", file=sys.stderr)
        return 1
    raw = WASM.read_bytes()
    b64 = base64.b64encode(raw).decode("ascii")
    tpl = TPL.read_text(encoding="utf-8")
    if TOKEN not in tpl:
        print(f"token {TOKEN} not found in template", file=sys.stderr)
        return 1
    html = tpl.replace(TOKEN, b64)
    DIST.mkdir(exist_ok=True)
    (DIST / "index.html").write_text(html, encoding="utf-8")
    (DIST / ".nojekyll").write_text("", encoding="utf-8")
    print(f"wasm {len(raw)/1024:.1f} KB -> base64 {len(b64)/1024:.1f} KB")
    print(f"dist/index.html {len(html)/1024:.1f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
