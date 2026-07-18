"""Executa verificacoes objetivas para liberar uma versao do app."""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
RESULTS = ROOT / "_data" / "results"
ANSI_RE = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")


def run_command(command: list[str]) -> tuple[bool, str]:
    """Roda um comando e devolve sucesso mais saida consolidada."""
    resolved = command[:]
    if os.name == "nt" and resolved[0] == "npm":
        resolved[0] = "npm.cmd"
    if resolved[0] == "python":
        resolved[0] = sys.executable
    completed = subprocess.run(
        resolved,
        cwd=ROOT,
        text=True,
        capture_output=True,
        shell=False,
    )
    output = "\n".join(
        part for part in [completed.stdout, completed.stderr] if part.strip()
    )
    return completed.returncode == 0, ANSI_RE.sub("", output).strip()


def check_file(path: Path) -> tuple[bool, str]:
    """Confere existencia e tamanho minimo de um arquivo obrigatorio."""
    if not path.exists():
        return False, f"ausente: {path.relative_to(ROOT)}"
    if path.is_file() and path.stat().st_size == 0:
        return False, f"vazio: {path.relative_to(ROOT)}"
    return True, f"ok: {path.relative_to(ROOT)}"


def package_resource_findings() -> list[tuple[bool, str]]:
    """Confere se package.json carrega recursos de base esperados."""
    package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    resources = package.get("build", {}).get("extraResources", [])
    serialized = json.dumps(resources, ensure_ascii=False)
    names = [
        "biblioteca_fts.sqlite",
        "progressao_2025.sqlite",
        "especialidades_guia.sqlite",
    ]
    return [
        (name in serialized, f"extraResources contem {name}")
        for name in names
    ]


def release_artifact_findings() -> list[tuple[bool, str]]:
    """Confere artefatos distribuidos conforme a pasta de release configurada."""
    package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    version = package["version"]
    output = package.get("build", {}).get("directories", {}).get(
        "output",
        "release/${version}",
    )
    release_dir = ROOT / output.replace("${version}", version)
    patterns = [
        "Paxtu AutoPlanner_Setup_*.exe",
        "Paxtu AutoPlanner_Portable_*.exe",
        "Paxtu AutoPlanner_*.zip",
        "win-unpacked/Paxtu AutoPlanner.exe",
    ]
    findings: list[tuple[bool, str]] = []
    for pattern in patterns:
        matches = list(release_dir.glob(pattern))
        if not matches:
            expected = release_dir / pattern
            findings.append((False, f"ausente: {expected.relative_to(ROOT)}"))
        else:
            rel = matches[0].relative_to(ROOT)
            findings.append((True, f"ok: {rel}"))
    return findings


def add_result(
    rows: list[tuple[str, bool, str]],
    name: str,
    ok: bool,
    detail: str,
) -> None:
    """Acrescenta uma linha padronizada ao relatorio."""
    rows.append((name, ok, detail))


def write_report(rows: list[tuple[str, bool, str]]) -> Path:
    """Grava relatorio markdown com resultado da checagem."""
    RESULTS.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    target = RESULTS / f"release_check_{stamp}.md"
    total = len(rows)
    failures = sum(1 for _, ok, _ in rows if not ok)
    lines = [
        "# Release Check PaxTuPlanner",
        "",
        f"Gerado em: {datetime.now().isoformat(timespec='seconds')}",
        f"Total: {total}",
        f"Falhas: {failures}",
        "",
    ]
    for name, ok, detail in rows:
        marker = "OK" if ok else "FALHA"
        lines.append(f"- **{marker}** `{name}`: {detail}")
    target.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return target


def main() -> int:
    """Ponto de entrada do checklist executavel."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--dist", action="store_true")
    parser.add_argument("--skip-build", action="store_true")
    args = parser.parse_args()
    rows: list[tuple[str, bool, str]] = []

    required_files = [
        ROOT / "package.json",
        ROOT / "INICIAR_APP.bat",
        ROOT / "src" / "services" / "storageService.ts",
        ROOT / "conhecimento" / "bd" / "progressao_2025.sqlite",
        ROOT / "conhecimento" / "bd" / "especialidades_guia.sqlite",
        ROOT / "conhecimento" / "bd" / "biblioteca_fts.sqlite",
        ROOT / "docs" / "versions.html",
        ROOT / "docs" / "usersmanual.html",
        ROOT / "docs" / "codeinstructions.html",
    ]
    for path in required_files:
        ok, detail = check_file(path)
        add_result(rows, "arquivo obrigatorio", ok, detail)

    for ok, detail in package_resource_findings():
        add_result(rows, "recursos empacotados", ok, detail)

    for ok, detail in release_artifact_findings():
        add_result(rows, "artefato distribuivel", ok, detail)

    if not args.skip_build:
        ok, output = run_command(["npm", "run", "build"])
        add_result(rows, "npm run build", ok, output[-1200:])

    ok, output = run_command([
        "python",
        "conhecimento\\tools\\validate_progressao.py",
    ])
    add_result(rows, "validate_progressao", ok, output[-1200:])

    if args.dist:
        ok, output = run_command(["npm", "run", "dist"])
        add_result(rows, "npm run dist", ok, output[-1200:])

    report = write_report(rows)
    print(report)
    return 1 if any(not ok for _, ok, _ in rows) else 0


if __name__ == "__main__":
    raise SystemExit(main())
