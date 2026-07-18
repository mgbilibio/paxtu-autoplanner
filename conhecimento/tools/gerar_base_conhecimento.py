"""Gera a espinha dorsal local da base de conhecimento."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def ensure_text(path: Path, text: str) -> None:
    """Cria o arquivo apenas se ainda nao existir."""
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")


def main() -> None:
    """Cria os indices principais da base local."""
    ensure_text(ROOT / "index.md", "# Base de Conhecimento\n")
    ensure_text(ROOT / "por" / "2020" / "index.md", "# POR 2020\n")
    ensure_text(ROOT / "por" / "2025" / "index.md", "# POR 2025\n")
    ensure_text(ROOT / "especialidades" / "2020" / "index.md", "# Especialidades 2020\n")
    ensure_text(ROOT / "especialidades" / "2025" / "index.md", "# Especialidades 2025\n")


if __name__ == "__main__":
    main()
