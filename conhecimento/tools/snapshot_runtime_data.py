"""Snapshot dos dados de runtime antes de refactor.

Copia em modo copia (nao move) para `_data/results/snapshots/<timestamp>_<label>/`:
  - meusarquivospaxtu/ (estado do usuario)
  - conhecimento/bd/ (SQLite derivados)
  - src/data/generated/ (TS/JSON gerados)
  - src/data/catalog/ (JSON catalogos)

Uso: python conhecimento/tools/snapshot_runtime_data.py [--label refactor-storage]
"""
from __future__ import annotations

import argparse
import shutil
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TARGETS = [
    Path("meusarquivospaxtu"),
    Path("conhecimento/bd"),
    Path("src/data/generated"),
    Path("src/data/catalog"),
]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--label", default="manual")
    args = parser.parse_args()
    ts = datetime.now().strftime("%Y-%m-%d_%Hh%M")
    dest = ROOT / "_data" / "results" / "snapshots" / f"{ts}_{args.label}"
    dest.mkdir(parents=True, exist_ok=True)
    for rel in TARGETS:
        src = ROOT / rel
        if not src.exists():
            print(f"[{ts}] skip (missing): {rel}")
            continue
        target = dest / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(src, target, dirs_exist_ok=True)
        print(f"[{ts}] copied: {rel} -> {target.relative_to(ROOT)}")
    print(f"[{ts}] snapshot done: {dest.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
