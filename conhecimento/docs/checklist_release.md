# Checklist de Release - PaxTuPlanner

**Versao**: 20260515-1731  
**Data de Atualizacao**: 2026-05-15 17:31

## 1. Pre-requisitos

- [x] `npm run build` passou sem erro.
- [ ] `python conhecimento/tools/validate_progressao.py` passou com 0 erros e 0 avisos.
- [x] `python conhecimento/tools/run_release_check.py --skip-build` passou com 0 falhas.
- [x] `release/20260515-1731` foi gerado.
- [x] `Paxtu AutoPlanner.exe` iniciou no smoke test do pacote.
- [x] Tela inicial carregou em `http://127.0.0.1:5173/` no smoke web local.
- [x] Os bancos operacionais estao presentes no pacote.
- [ ] Backup completo exportado nao contem chave Gemini.
- [x] Ollama aceita apenas URL local (`localhost`, `127.0.0.1` ou `::1`).

## 2. Verificacao manual

### Fluxo 1: Primeiro acesso
1. Abrir o app.
2. Conferir assistente inicial.
3. Salvar pasta de dados.
4. Confirmar modo local ou compartilhado.

### Fluxo 2: Login operacional
1. Criar ou escolher usuario.
2. Fazer login.
3. Confirmar que a tela aberta e o painel esperado.

### Fluxo 3: Ficha do jovem
1. Abrir um jovem no efetivo.
2. Conferir ficha consolidada.
3. Abrir progressao 2025+.
4. Abrir especialidades.

### Fluxo 4: Compartilhamento
1. Abrir a mesma seccao em duas janelas ou perfis.
2. Confirmar lock.
3. Confirmar modo consulta no segundo acesso.
4. Testar `Assumir edição`.

### Fluxo 5: Backup e release
1. Exportar backup completo.
2. Exportar backup de progressao.
3. Rodar `python conhecimento/tools/run_release_check.py`.
4. Guardar o relatorio em `_data/results`.

### Fluxo 6: Exportacao de campo
1. Gerar ou abrir roteiro.
2. Exportar HTML e conferir previa interna.
3. Baixar HTML e abrir em celular.
4. Repetir a partir de ciclo e agenda.

## 3. Critério de aceite

O release so segue se:

- o build passar;
- a validacao da base passar;
- o pacote distribuivel for gerado com sucesso;
- o smoke test do executavel passar;
- a checagem de compartilhamento nao quebrar o modo consulta.

## 4. Observacoes

- Nao usar git como criterio de release neste projeto.
- Se houver conflito de lock, a prioridade e preservar o dado, nao forcar a escrita.
- Se o app abrir em modo consulta, o comportamento esperado e consulta, nao edição silenciosa.
- ZIP portatil gerado em `release/Paxtu_AutoPlanner_portatil_20260515-1731.zip`.
