# Testes que Precisam Ser Executados Pelo Usuário

Os 4 itens abaixo do `plano_riscos_mitigacao.md` exigem ambientes/credenciais que não estão disponíveis no fluxo de desenvolvimento automatizado. Cada um foi implementado/mitigado conforme possível, mas a validação final fica com o usuário.

## R6 + R15 — Validar geração com Gemini real

**Por que não foi testado**: chave API Gemini não está disponível no ambiente automatizado. Cada chave gera custo na conta Google.

**O que validar**:
1. Configurar chave Gemini em Configurações.
2. Selecionar 3-5 ações de blocos diferentes via "Gerar plano".
3. Confirmar que o plano gerado:
   - É JSON válido (sem texto residual).
   - Contém atividades coerentes com as ações escolhidas.
   - Tem `branch` populado.
   - Tem `studyGuide` correspondendo às `activities`.
4. Comparar antes/depois do refactor `llmProvider`: rodar 2x o mesmo prompt, ver se a qualidade caiu.

**Se falhar**:
- Erro de auth: chave inválida ou cota esgotada.
- JSON malformado: revisar prompt em `geminiService.ts`. Considerar adicionar `responseSchema` config.
- Atividades genéricas/não conectadas aos códigos `B{N}.F{n}`: revisar adapter `progressao_2025_catalog.ts` para enriquecer `requirementsContext`.

**Documentar**: criar `conhecimento/docs/regressao_gemini.md` com 2-3 outputs reais para baseline.

## R14 — Testar instalador NSIS empacotado

**Por que não foi testado**: gerar NSIS exige `electron-builder` rodar em modo elevado, e validação real precisa de máquina/VM Windows limpa diferente do dev.

**O que validar**:
1. Rodar `npm run electron:build` — saída em `release/2.9.0/Paxtu AutoPlanner_Setup_2.9.0.exe`.
2. Instalar em VM/máquina Windows limpa.
3. Executar fluxos do `checklist_release.md`:
   - Setup wizard com Gemini E com Ollama.
   - Cadastrar membro com birthDate.
   - Abrir BlocoTracker e marcar fixas.
   - Conquistar reconhecimento (passar todos os 18 blocos manualmente para teste).
   - Clicar 📄 em algum bloco para abrir PDF.
4. Verificar se PDFs em `resources/manuais` foram empacotados (procurar pelo .exe portable + abrir como zip).

**Pré-requisito**: copiar os 3 PDFs (Manual Lobinho, Manual Escoteiro, Guia Especialidades) para `docs/biblioteca/manuais_essenciais/` antes do build, com nomes EXATOS da whitelist em `electron/main.ts`:
- `2025.10.Manual do Escotista - Lobinho.pdf`
- `2025.10.Manual do Escotista - Escoteiro.pdf`
- `Guia de Especialidades 18a Edição - 2024-1.pdf`

**Se PDFs não abrirem em produção**: confirmar em `package.json` que `extraResources` está copiando corretamente (adicionar `console.log` no handler `pdf:openAtPage` para ver candidatos testados).

## Resumo

| Risco | Status | Bloqueador |
|-------|--------|-----------|
| R6 Gemini real | Implementado | Chave Gemini ausente |
| R14 NSIS empacotado | Implementado | Precisa ambiente VM Windows |
| R15 Regressão Gemini | Implementado | Chave Gemini ausente |
| ~~R19 Mac/Linux~~ | **Fora de escopo** | Distribuição Windows-only |

Todos os fixes de código foram aplicados. Apenas a validação manual em ambientes específicos resta.
