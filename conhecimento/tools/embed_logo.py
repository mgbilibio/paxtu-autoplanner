"""Converte a logo do grupo em um modulo TS com data URI base64.

Assim a logo fica embutida no bundle e em cada ficha HTML exportada (autocontida,
abre offline sem depender de arquivo externo).

Entrada : public/logo_grupo.png (ou .jpg)
Saida   : src/data/generated/logo_grupo.ts  ->  export const LOGO_GRUPO_DATA_URI

Rodar apos trocar/atualizar a logo.
"""
import base64
import mimetypes
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
SAIDA = RAIZ / 'src' / 'data' / 'generated' / 'logo_grupo.ts'
CANDIDATOS = [
    RAIZ / 'public' / 'logo_grupo.png',
    RAIZ / 'public' / 'logo_grupo.jpg',
    RAIZ / 'public' / 'logo_grupo.jpeg',
]


def main():
    fonte = next((c for c in CANDIDATOS if c.exists()), None)
    if not fonte:
        raise SystemExit(
            'Logo nao encontrada. Salve em public/logo_grupo.png (ou .jpg).'
        )
    mime = mimetypes.guess_type(str(fonte))[0] or 'image/png'
    dados = base64.b64encode(fonte.read_bytes()).decode('ascii')
    uri = f'data:{mime};base64,{dados}'
    conteudo = (
        '// Gerado por conhecimento/tools/embed_logo.py — logo do grupo em data URI.\n'
        '// Embutida em cada ficha exportada (HTML autocontido) e impressao.\n'
        f'export const LOGO_GRUPO_DATA_URI = "{uri}";\n'
    )
    SAIDA.write_text(conteudo, encoding='utf-8')
    kb = len(dados) / 1024
    print(f'[embed_logo] {fonte.name} ({mime}) -> {SAIDA} ({kb:.1f} KB base64)')


if __name__ == '__main__':
    main()
