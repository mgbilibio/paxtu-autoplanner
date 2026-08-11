"""Baixa as especialidades públicas da UEB para base paralela auditável.

A fonte é a página oficial de Especialidades dos Escoteiros do Brasil, que
carrega cards via admin-ajax. O script não usa login, não acessa compra da
Loja Escoteira e não sobrescreve a base 2024-1.
"""

from __future__ import annotations

import html
import json
import re
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "conhecimento" / "especialidades" / "2026_ueb_atualizado"
RAW_DIR = OUT_DIR / "raw_html"
GENERATED_DIR = ROOT / "src" / "data" / "generated"
AJAX_URL = "https://www.escoteiros.org.br/wp-admin/admin-ajax.php"
BASE_URL = "https://www.escoteiros.org.br/especialidades/"
USER_AGENT = "PaxtuAP fonte auditavel (+https://www.escoteiros.org.br/especialidades/)"


@dataclass
class CategoriaFonte:
    slug: str
    eixo: str
    publico: str


@dataclass
class NivelEspecialidade:
    nome: str
    itens: int


@dataclass
class EspecialidadeAtualizada:
    id: int
    post_slug: str
    titulo: str
    eixo: str
    publico: str
    url: str
    imagem: str
    requisitos: list[str]
    niveis: list[NivelEspecialidade]
    notas_tecnicas: list[str]
    fonte: str
    capturado_em: str


CATEGORIAS = [
    CategoriaFonte("habilidades-para-a-vida", "Habilidades para a Vida", "Lobinho/Escoteiro"),
    CategoriaFonte("meio-ambiente", "Meio Ambiente", "Lobinho/Escoteiro"),
    CategoriaFonte("paz-e-desenvolvimento", "Paz e Desenvolvimento", "Lobinho/Escoteiro"),
    CategoriaFonte("saude-e-bem-estar", "Saúde e Bem-Estar", "Lobinho/Escoteiro"),
    CategoriaFonte(
        "habilidades-para-a-vida-programa-educativo-atualizado-ramos-senior-e-pioneiro",
        "Habilidades para a Vida",
        "Sênior/Pioneiro",
    ),
    CategoriaFonte(
        "meio-ambiente-programa-educativo-atualizado-ramos-senior-e-pioneiro",
        "Meio Ambiente",
        "Sênior/Pioneiro",
    ),
    CategoriaFonte(
        "paz-e-desenvolvimento-programa-educativo-atualizado-ramos-senior-e-pioneiro",
        "Paz e Desenvolvimento",
        "Sênior/Pioneiro",
    ),
    CategoriaFonte(
        "saude-e-bem-estar-programa-educativo-atualizado-ramos-senior-e-pioneiro",
        "Saúde e Bem-Estar",
        "Sênior/Pioneiro",
    ),
]


def normalizar_texto(texto: str) -> str:
    """Remove quebras e espaços duplicados sem alterar conteúdo semântico."""
    return re.sub(r"\s+", " ", html.unescape(texto)).strip()


def slug_from_url(url: str) -> str:
    """Extrai o slug final de uma URL de especialidade."""
    return url.rstrip("/").split("/")[-1]


def http_post(url: str, data: dict[str, str]) -> str:
    """Executa POST form-urlencoded e retorna HTML."""
    encoded = urlencode(data).encode("utf-8")
    request = Request(
        url,
        data=encoded,
        headers={
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "User-Agent": USER_AGENT,
        },
        method="POST",
    )
    with urlopen(request, timeout=60) as response:
        return response.read().decode("utf-8")


def http_get(url: str) -> str:
    """Executa GET e retorna HTML."""
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=60) as response:
        return response.read().decode("utf-8")


def cards_da_categoria(categoria: CategoriaFonte) -> list[dict[str, str]]:
    """Percorre o botão Carregar Mais para uma categoria."""
    cards: list[dict[str, str]] = []
    pagina = 1
    max_page = 1
    while pagina <= max_page:
        raw_path = RAW_DIR / f"categoria_{categoria.slug}_p{pagina}.html"
        payload = {
            "action": "filter",
            "tipo": "especialidade",
            "taxonomy": "CategoriaEspecialidade",
            "category": categoria.slug,
            "page": str(pagina),
        }
        if raw_path.exists():
            fragmento = raw_path.read_text(encoding="utf-8")
        else:
            fragmento = http_post(AJAX_URL, payload)
            raw_path.write_text(fragmento, encoding="utf-8")
        soup = BeautifulSoup(fragmento, "html.parser")
        page_marker = soup.select_one(".pages")
        if page_marker and page_marker.get("data-max-page"):
            max_page = int(str(page_marker.get("data-max-page")))
        for link in soup.select("a.card-badge-link"):
            href = str(link.get("href", "")).strip()
            title_el = link.select_one(".card-title")
            img_el = link.select_one("img")
            title = normalizar_texto(title_el.get_text(" ")) if title_el else ""
            image = str(img_el.get("src", "")).strip() if img_el else ""
            if href and title:
                cards.append({"url": href, "titulo": title, "imagem": image})
        pagina += 1
        time.sleep(0.2)
    return cards


def parsear_niveis(soup: BeautifulSoup) -> list[NivelEspecialidade]:
    """Extrai tabela lateral de níveis."""
    niveis: list[NivelEspecialidade] = []
    for row in soup.select(".badge-table tbody tr"):
        cols = [normalizar_texto(col.get_text(" ")) for col in row.select("td")]
        if len(cols) == 2:
            numero = re.search(r"\d+", cols[1])
            itens = int(numero.group(0)) if numero else 0
            niveis.append(NivelEspecialidade(cols[0], itens))
    return niveis


def texto_indica_notas(texto: str) -> bool:
    """Identifica o marcador de notas para não misturar requisitos e notas."""
    return bool(re.search(r"notas?\s+t[eé]cnicas?", texto, re.IGNORECASE))


def parsear_itens_lista(lista: BeautifulSoup) -> list[str]:
    """Extrai itens diretos de uma lista HTML."""
    return [
        normalizar_texto(item.get_text(" "))
        for item in lista.find_all("li", recursive=False)
        if normalizar_texto(item.get_text(" "))
    ]


def parsear_requisitos(content: BeautifulSoup) -> list[str]:
    """Extrai requisitos da área principal em formatos usados pela UEB."""
    requisitos: list[str] = []

    for p in content.find_all("p", recursive=False):
        texto = normalizar_texto(p.get_text(" "))
        if texto_indica_notas(texto):
            break
        if re.match(r"^\d+\.", texto):
            requisitos.append(texto)
    if requisitos:
        return requisitos

    for child in content.find_all(["ol", "ul"], recursive=False):
        texto_anterior = ""
        previous = child.find_previous_sibling()
        if previous:
            texto_anterior = normalizar_texto(previous.get_text(" "))
        if texto_indica_notas(texto_anterior):
            continue
        requisitos.extend(parsear_itens_lista(child))
    if requisitos:
        return requisitos

    stage_labels = ("CONHECER", "FAZER", "COMPARTILHAR")
    filhos = content.find_all(["p", "ul"], recursive=False)
    for index, child in enumerate(filhos):
        if child.name != "p":
            continue
        texto = normalizar_texto(child.get_text(" "))
        if texto_indica_notas(texto):
            break
        if not texto.upper().startswith(stage_labels):
            continue
        proximo = filhos[index + 1] if index + 1 < len(filhos) else None
        itens = parsear_itens_lista(proximo) if proximo and proximo.name == "ul" else []
        if itens:
            requisitos.append(f"{texto} Exemplos: {'; '.join(itens)}")
        else:
            requisitos.append(texto)
    return requisitos


def parsear_notas(content: BeautifulSoup) -> list[str]:
    """Extrai notas técnicas do primeiro OL após o marcador de notas."""
    notas: list[str] = []
    marcador = content.find(string=re.compile("Notas Técnicas", re.IGNORECASE))
    if marcador:
        container = marcador.find_parent()
        lista = container.find_next("ol") if container else None
        if lista:
            notas = [normalizar_texto(li.get_text(" ")) for li in lista.find_all("li")]
    return notas


def parsear_especialidade(
    card: dict[str, str],
    categoria: CategoriaFonte,
    stable_id: int,
    capturado_em: str,
) -> EspecialidadeAtualizada:
    """Baixa e estrutura uma página individual."""
    slug = slug_from_url(card["url"])
    raw_path = RAW_DIR / f"especialidade_{slug}.html"
    if raw_path.exists():
        page_html = raw_path.read_text(encoding="utf-8")
    else:
        page_html = http_get(card["url"])
        raw_path.write_text(page_html, encoding="utf-8")
    soup = BeautifulSoup(page_html, "html.parser")
    title_el = soup.select_one("h1.header-title")
    content = soup.select_one(".content__text")
    image_el = soup.select_one("img.badge-image")
    titulo = normalizar_texto(title_el.get_text(" ")) if title_el else card["titulo"]
    requisitos = parsear_requisitos(content) if content else []
    notas = parsear_notas(content) if content else []
    imagem = str(image_el.get("src", "")).strip() if image_el else card["imagem"]
    return EspecialidadeAtualizada(
        id=stable_id,
        post_slug=slug,
        titulo=titulo,
        eixo=categoria.eixo,
        publico=categoria.publico,
        url=card["url"],
        imagem=imagem,
        requisitos=requisitos,
        niveis=parsear_niveis(soup),
        notas_tecnicas=notas,
        fonte=BASE_URL,
        capturado_em=capturado_em,
    )


def gerar_ts(especialidades: list[EspecialidadeAtualizada], capturado_em: str) -> str:
    """Gera módulo TypeScript autocontido para uso pelo app."""
    payload = {
        "capturadoEm": capturado_em,
        "fonte": BASE_URL,
        "especialidades": [asdict(item) for item in especialidades],
    }
    json_text = json.dumps(payload, ensure_ascii=False, indent=2)
    return (
        "// Auto-gerado por conhecimento/tools/scrape_ueb_especialidades_2026.py\n"
        "// Fonte pública: https://www.escoteiros.org.br/especialidades/\n\n"
        "export const ESPECIALIDADES_UEB_2026 = "
        f"{json_text} as const;\n"
    )


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    capturado_em = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    especialidades: list[EspecialidadeAtualizada] = []
    vistos: set[str] = set()
    stable_id = 260001
    for categoria in CATEGORIAS:
        for card in cards_da_categoria(categoria):
            slug = slug_from_url(card["url"])
            dedupe_key = f"{categoria.publico}|{slug}"
            if dedupe_key in vistos:
                continue
            vistos.add(dedupe_key)
            especialidades.append(parsear_especialidade(card, categoria, stable_id, capturado_em))
            stable_id += 1
            time.sleep(0.2)
    especialidades.sort(key=lambda item: (item.publico, item.eixo, item.titulo))
    payload = {
        "capturadoEm": capturado_em,
        "fonte": BASE_URL,
        "categorias": [asdict(item) for item in CATEGORIAS],
        "especialidades": [asdict(item) for item in especialidades],
    }
    (OUT_DIR / "especialidades_ueb_2026.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (GENERATED_DIR / "especialidades_ueb_2026.ts").write_text(
        gerar_ts(especialidades, capturado_em),
        encoding="utf-8",
    )
    print(f"[OK] {len(especialidades)} especialidades baixadas")
    print(f"[OK] {OUT_DIR / 'especialidades_ueb_2026.json'}")
    print(f"[OK] {GENERATED_DIR / 'especialidades_ueb_2026.ts'}")


if __name__ == "__main__":
    main()
