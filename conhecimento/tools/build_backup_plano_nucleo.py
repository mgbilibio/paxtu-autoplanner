"""Gera backup plano enxuto do nucleo funcional do app."""

from __future__ import annotations

import base64
import json
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "conhecimento" / "docs"
TEXT_EXT = {
    ".bat", ".css", ".html", ".js", ".json", ".md", ".mjs", ".py",
    ".sql", ".ts", ".tsx", ".txt", ".yml",
}
BINARY_KEEP = {
    ROOT / "conhecimento" / "bd" / "progressao_2025.sqlite",
    ROOT / "conhecimento" / "bd" / "especialidades_guia.sqlite",
}
ALLOW_DIRS = [
    ROOT / "src",
    ROOT / "electron",
    ROOT / "public",
    ROOT / "conhecimento" / "tools",
]
ALLOW_FILES = [
    ROOT / "package.json",
    ROOT / "package-lock.json",
    ROOT / "index.html",
    ROOT / "vite.config.ts",
    ROOT / "tailwind.config.js",
    ROOT / "postcss.config.js",
    ROOT / "tsconfig.json",
    ROOT / "INICIAR_APP.bat",
    ROOT / "_runAPP.bat",
    ROOT / "AGENTS.md",
    ROOT / "conhecimento" / "index.md",
    ROOT / "conhecimento" / "docs" / "plano_implementacao_melhorias_2026-04-28.md",
    ROOT / "conhecimento" / "docs" / "diagnostico_base_operacional.md",
    ROOT / "conhecimento" / "docs" / "guia_uso_app.md",
    ROOT / "conhecimento" / "docs" / "guia_desenvolvedor.md",
    ROOT / "AutoPaxtu042026" / "docs" / "indice_app_alvo.md",
]
SKIP_NAMES = {
    "node_modules", "dist", "dist-electron", "release", "__pycache__",
}


def is_allowed(path: Path) -> bool:
    if path in ALLOW_FILES or path in BINARY_KEEP:
        return True
    return any(path.is_relative_to(folder) for folder in ALLOW_DIRS)


def should_skip(path: Path) -> bool:
    return any(part in SKIP_NAMES for part in path.parts)


def iter_files() -> list[Path]:
    found: set[Path] = set()
    for folder in ALLOW_DIRS:
        if folder.exists():
            for path in folder.rglob("*"):
                if path.is_file() and not should_skip(path):
                    found.add(path)
    for path in ALLOW_FILES + list(BINARY_KEEP):
        if path.exists() and path.is_file():
            found.add(path)
    return sorted(found, key=lambda p: p.as_posix().lower())


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def encode_binary(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode("ascii")


def write_backup(files: list[Path]) -> tuple[Path, Path]:
    stamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    md_path = OUT_DIR / f"backup_plano_nucleo_{stamp}.md"
    manifest_path = OUT_DIR / f"backup_manifest_nucleo_{stamp}.json"
    manifest = []
    lines = [
        "# Backup plano nucleo funcional",
        "",
        f"Gerado em: {datetime.now().isoformat(timespec='seconds')}",
        "",
        "Escopo: codigo fonte, configuracoes, docs operacionais e bancos SQLite essenciais.",
        "Exclusoes: livros, OCR, backups antigos, node_modules, dist, release e caches.",
        "",
        "## Estrutura",
        "",
    ]
    for path in files:
        kind = "binary-base64" if path in BINARY_KEEP else "text"
        manifest.append({
            "path": rel(path),
            "size": path.stat().st_size,
            "kind": kind,
        })
        lines.append(f"- `{rel(path)}` ({kind}, {path.stat().st_size} bytes)")
    lines.extend(["", "## Conteudo", ""])
    for path in files:
        item = manifest[[m["path"] for m in manifest].index(rel(path))]
        lines.append(f"<!-- BEGIN FILE {rel(path)} -->")
        if item["kind"] == "binary-base64":
            lines.append("```base64")
            lines.append(encode_binary(path))
            lines.append("```")
        else:
            suffix = path.suffix.lower().lstrip(".") or "text"
            lines.append(f"```{suffix}")
            lines.append(read_text(path))
            lines.append("```")
        lines.append(f"<!-- END FILE {rel(path)} -->")
        lines.append("")
    md_path.write_text("\n".join(lines), encoding="utf-8")
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    return md_path, manifest_path


def main() -> None:
    files = [path for path in iter_files() if is_allowed(path)]
    md_path, manifest_path = write_backup(files)
    total_size = sum(path.stat().st_size for path in files)
    print(f"[OK] backup: {md_path}")
    print(f"[OK] manifest: {manifest_path}")
    print(f"[OK] arquivos={len(files)} tamanho_origem={total_size} bytes")


if __name__ == "__main__":
    main()
