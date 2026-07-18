#!/usr/bin/env python3
"""
Script de backup datado da base de conhecimento.
Gera snapshots com estrutura espelhada, prune automático e empacotamento opcional.
"""

import argparse
import shutil
import zipfile
from datetime import datetime
from pathlib import Path


# Raiz do projeto relativa ao script (antes era literal 'E:/PY/paxtuplanner' sem o
# segmento 'PaxtuAP/' — os globs caiam em pastas inexistentes e o backup saia VAZIO).
BASE = Path(__file__).resolve().parents[2]
BACKUPS_DIR = BASE / 'backups'
SOURCES = [
    'conhecimento/bd/*.sqlite',
    'conhecimento/docs/**/*.md',
    'conhecimento/tools/*.py',
    'src/data/generated/*.ts',
]


def make_backup() -> Path:
    """Cria pasta datada e copia arquivos. Retorna Path da pasta backup."""
    timestamp = datetime.now().strftime('%Y%m%d-%H%M')
    backup_path = BACKUPS_DIR / timestamp
    backup_path.mkdir(parents=True, exist_ok=True)

    total_size = 0
    file_count = 0

    for pattern in SOURCES:
        parts = pattern.split('/')
        glob_part = parts[-1]
        base_part = '/'.join(parts[:-1])

        src_dir = BASE / base_part
        for src_file in src_dir.glob(glob_part):
            if src_file.is_file():
                rel_path = src_file.relative_to(BASE)
                dest_file = backup_path / rel_path

                dest_file.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src_file, dest_file)

                file_size = dest_file.stat().st_size
                total_size += file_size
                file_count += 1

                print(f"  {rel_path} ({file_size:,} bytes)")

    total_mb = total_size / (1024 * 1024)
    print(f"\nBackup concluído: {file_count} arquivos, {total_mb:.2f} MB")
    print(f"Pasta: {backup_path}")

    return backup_path


def prune_old_backups(keep: int = 10) -> None:
    """Remove as pastas de backup mais antigas, mantendo as `keep` mais recentes."""
    if not BACKUPS_DIR.exists():
        return

    backups = sorted(
        [d for d in BACKUPS_DIR.iterdir() if d.is_dir()],
        reverse=True
    )

    to_remove = backups[keep:]
    for backup_path in to_remove:
        shutil.rmtree(backup_path)
        print(f"Removido: {backup_path.name}")


def make_zip(backup_path: Path) -> None:
    """Empacota snapshot em ZIP com compressão e remove pasta."""
    zip_path = backup_path.parent / f"{backup_path.name}.zip"

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for file in backup_path.rglob('*'):
            if file.is_file():
                arcname = file.relative_to(backup_path.parent)
                zf.write(file, arcname=arcname)

    shutil.rmtree(backup_path)
    zip_size = zip_path.stat().st_size / (1024 * 1024)
    print(f"ZIP criado: {zip_path.name} ({zip_size:.2f} MB)")


def main():
    """CLI com argparse."""
    parser = argparse.ArgumentParser(
        description='Backup datado da base de conhecimento'
    )
    parser.add_argument(
        '--keep',
        type=int,
        default=10,
        help='Quantidade de backups a manter (default: 10)'
    )
    parser.add_argument(
        '--zip',
        action='store_true',
        help='Empacotar em ZIP e remover pasta'
    )

    args = parser.parse_args()

    print(f"Iniciando backup em {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    backup_path = make_backup()

    if args.zip:
        make_zip(backup_path)

    print(f"\nPrune: mantendo {args.keep} backups mais recentes")
    prune_old_backups(keep=args.keep)

    print("\nConcluído!")


if __name__ == '__main__':
    main()
