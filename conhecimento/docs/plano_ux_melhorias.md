# Plano de Ação UX — Melhorias de Fluxo

Análise pós-uso real (2026-04-27). 12 pontos de fricção identificados, priorizados por impacto no chefe escoteiro voluntário.

Cada item tem: **Objetivo · Módulos/Métodos · O que · Como · Motivo · Esforço**.

---

## 🔴 FRICÇÃO ALTA (afeta uso semanal)

### U1. Promover BlocoTracker como caminho principal de progressão

- **Objetivo**: eliminar o atrito de abrir 2 modais (`ProgressionMap` → `BlocoTracker`) para acessar o sistema POR 2025+ (que é o padrão).
- **Módulos**: `src/components/MembersManager.tsx`, `src/components/ProgressionMap.tsx`, `src/components/BlocoTracker.tsx`, novo wrapper `src/components/MemberDashboard.tsx`.
- **Métodos**: `MembersManager.handleSelectMember`, novo `MemberDashboard` que decide qual UI mostrar baseado em ramo + sistema.
- **O que**: ao clicar em um membro Lobinho/Escoteiro com `progressionSystem === 'POR_2025'`, abrir o `BlocoTracker` direto. Para outros ramos ou modo legado, abrir `ProgressionMap` como hoje. Adicionar botão secundário "📋 Modo legado" no `BlocoTracker` para casos raros.
- **Como**:
  1. Criar `MemberDashboard` que recebe membro + seção e decide: se Lob/Esc + POR_2025 → renderiza BlocoTracker fullscreen; senão → ProgressionMap.
  2. `MembersManager` passa a abrir `MemberDashboard` em vez de `ProgressionMap`.
  3. No `BlocoTracker`, adicionar botão "📋 Ver mapa legado (2020)" que abre `ProgressionMap` como overlay opcional, controlado por `showLegacy` flag.
- **Motivo**: hoje o usuário precisa "atravessar" o sistema antigo para chegar no novo. Inverter a hierarquia faz o caminho padrão ser direto. Reduz cliques de 3 → 1.
- **Esforço**: ~1h.

### U2. Agrupar catálogo do Generator por bloco com filtros contextuais

- **Objetivo**: tornar a lista de 150+ itens de progressão navegável. Hoje é overwhelming.
- **Módulos**: `src/App.tsx` (step 2 do generator), novo componente `src/components/CatalogBrowser.tsx`, `src/services/catalogService.ts` (já tem `getMemberCatalogWithProgress`).
- **Métodos**: novo `CatalogBrowser` que recebe `categories: CatalogCategory[]` + `member?` e renderiza com agrupamento colapsável.
- **O que**:
  - Lista de blocos colapsável por padrão. Cada bloco mostra contagem `(X/N concluídas)` se houver membro selecionado.
  - Filtros: ramo, etapa-foco (limita aos blocos da etapa do membro), eixo, "só pendentes" (toggle).
  - Highlight visual: items concluídos ficam riscados com check verde; em-andamento ficam parcialmente coloridos.
- **Como**:
  1. Extrair toda a UI de catálogo do `App.tsx` (linha ~280-330) para `CatalogBrowser.tsx`.
  2. Receber `progressStatus` de `CatalogItem` (já existe via R7) e estilizar conforme.
  3. Manter primeiro nível colapsado por padrão; expandir só o bloco que está sendo focado pelo Generator.
  4. Botão "Selecionar todas as pendentes deste bloco" para batch-add em objetivos.
- **Motivo**: chefe escoteiro lê o catálogo de **cima a baixo** procurando o bloco do dia. Hoje rola por 150 linhas indiscriminadas. Agrupamento + filtro por etapa do membro foca em ~10 itens relevantes.
- **Esforço**: ~1.5h.

### U3. Onboarding fluente pós-setup

- **Objetivo**: eliminar o "e agora?" depois de "Concluir Configuração".
- **Módulos**: `src/components/SetupWizard.tsx` (final), `src/App.tsx` (`handleSetupComplete`), novo `src/components/Onboarding.tsx`.
- **Métodos**: `handleSetupComplete` redireciona para Onboarding em vez de PROFILE_CONFIG; `Onboarding.completeStep(step)` avança.
- **O que**: tour de 4 passos pós-wizard:
  1. "Crie seu Grupo" → mini-form embutido (nome, cidade)
  2. "Adicione sua primeira Seção" → mini-form (nome, ramo)
  3. "Cadastre 1 membro pra testar" → mini-form (nome, ramo, birthDate se Lob/Esc)
  4. "Pronto! Vamos abrir o tracker desse membro" → leva direto para BlocoTracker
- **Como**:
  1. Reaproveitar lógicas de `StructureManager`/`MembersManager` em forms compactos.
  2. Após cada submit, persistir e avançar.
  3. Marcar AppConfig com `onboardingDone: true` para não repetir.
  4. Skip button discreto pra usuário avançado.
- **Motivo**: hoje o usuário sai do wizard, cai na LoginScreen, **não tem usuário cadastrado, não tem grupo, não tem seção** — fluxo travado. Sem tour, abandono é alto.
- **Esforço**: ~1.5h.

### U4. Header com labels visíveis ou menu agrupado

- **Objetivo**: tornar os botões 🧭 📘 🔎 descobríveis.
- **Módulos**: `src/App.tsx` (header).
- **O que**: substituir os 3 ícones soltos por **um menu dropdown "POR 2025+"** com itens labeled.
- **Como**:
  ```tsx
  <DropdownMenu label="POR 2025+">
    <Item icon="🧭" label="Blocos" onClick={() => setView('BLOCOS_2025')} />
    <Item icon="📘" label="Enciclopédia" onClick={() => setView('ENCYCLOPEDIA')} />
    <Item icon="🔎" label="Buscar" shortcut="Ctrl+K" onClick={() => setShowSearch(true)} />
  </DropdownMenu>
  ```
  Em telas largas, expandir como botões com label inline; em mobile, virar hamburger.
- **Motivo**: tooltip não funciona em touch e usuário não passa mouse em cima por curiosidade. Ícone sem label é deserto de descoberta.
- **Esforço**: ~45 min.

---

## 🟡 FRICÇÃO MÉDIA (casos específicos)

### U5. Preservar configuração ao re-tentar geração de plano

- **Objetivo**: se IA gera plano ruim, "tentar de novo" não deve zerar objetivos selecionados, tema e instrução personalizada.
- **Módulos**: `src/App.tsx` (`reset`, `setStep`).
- **Métodos**: `reset()` hoje limpa tudo; criar `softReset()` que preserva inputs.
- **O que**: botão "🔄 Gerar novamente" no card do plano gerado que mantém configuração e re-chama `generateScoutPlan` com mesmos params (e, opcionalmente, com `temperatura` mais alta para variação).
- **Como**:
  1. Em `PlanDisplay.tsx`, adicionar botão "Gerar de novo" ao lado do "Salvar".
  2. Handler dispara CustomEvent `paxtu:regenerate` que `App.tsx` escuta e refaz a chamada com `selectedObjectives` atual.
  3. Adicionar opção "tentar com outro modelo" — abre dropdown rápido de modelos disponíveis.
- **Motivo**: gerar plano custa 30-90s + tokens. Quando sai ruim e o chefe perde a configuração, é frustração imediata.
- **Esforço**: ~30 min.

### U6. Editar campos enriquecidos do plano

- **Objetivo**: permitir corrigir `instrucaoChefia`, `fundoDeCena`, `manualReferencia`, `preparacaoPrevia`, `objetivoEspecifico` quando a IA acerta parcialmente.
- **Módulos**: `src/components/PlanDisplay.tsx`.
- **Métodos**: `updateActivity` já existe — estender para os campos novos.
- **O que**: no modo `isEditing`, cada campo enriquecido vira `<textarea>`/`<input>` editável.
- **Como**:
  1. Para cada bloco hoje renderizado como `<p>` (instrucaoChefia, fundoDeCena, etc), trocar por `<textarea>` quando `isEditing`.
  2. `preparacaoPrevia` (array): tags-input simples (split por linha).
- **Motivo**: chefe corrige quase sempre algo (nome de cordão, p.ex), e ter que regenerar o plano todo pra trocar 1 frase é desperdício.
- **Esforço**: ~45 min.

### U7. Marcar progresso em batch para múltiplos membros

- **Objetivo**: cenário comum "todos da matilha fizeram a Promessa hoje".
- **Módulos**: novo `src/components/BatchProgressMarker.tsx`, `src/services/storageService.ts` (já tem `saveMemberBlocoState`).
- **Métodos**: nova função `saveBatchBlocoActions(memberIds[], blocoId, fixaIdx?, variavelIdx?)`.
- **O que**: tela acessível a partir do `SectionProgressOverview` — "✏️ Marcar ação em lote":
  1. Seleciona ação fixa/variável de um bloco
  2. Lista de membros com checkboxes (default: todos da seção do ramo)
  3. Botão "Marcar como concluído para selecionados" → grava em todos
- **Como**:
  1. Componente novo recebe `sectionId + branch`.
  2. Reusa `getMemberBlocoState` para mostrar status atual de cada membro na ação.
  3. Iteração paralela de saves via `Promise.all`.
- **Motivo**: poupa 5+ minutos toda semana quando atividade foi coletiva.
- **Esforço**: ~1.5h.

### U8. Duplicar plano salvo

- **Objetivo**: reuso de planos antigos como base.
- **Módulos**: `src/components/Catalog.tsx`, `src/services/storageService.ts`.
- **Métodos**: novo `clonePlan(plan: MeetingPlan): MeetingPlan` (gera novo id, novo createdAt, marca origem).
- **O que**: cada card de plano no Catalog ganha botão "📋 Duplicar" → cria cópia, abre no Generator step 3 em modo edição.
- **Como**:
  ```ts
  export const clonePlan = (orig: MeetingPlan): MeetingPlan => ({
    ...orig,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    theme: `${orig.theme} (cópia)`,
    sectionId: undefined, // novo dono define
  });
  ```
- **Motivo**: chefe que tem plano bom de acampamento de Maio quer adaptá-lo pra Junho. Hoje só consegue ver — não copiar.
- **Esforço**: ~30 min.

### U9. Imprimir/Exportar BlocoTracker e SectionProgressOverview

- **Objetivo**: relatórios pra portfólio do jovem e prestação pra UEL.
- **Módulos**: `src/components/BlocoTracker.tsx`, `src/components/SectionProgressOverview.tsx`, novo helper `src/services/printService.ts`.
- **Métodos**: `printService.printElement(ref, title)` usa `window.print()` com CSS `@media print`.
- **O que**:
  - BlocoTracker: botão "🖨️ Imprimir ficha" no header.
  - SectionProgressOverview: botão "🖨️ Exportar tabela" + opção CSV.
- **Como**:
  1. Adicionar `<style>@media print { ... }</style>` global escondendo header/nav.
  2. Botão chama `window.print()`.
  3. Para CSV: gerar string, criar Blob, download (mesmo padrão de `downloadProgressBackup`).
- **Motivo**: documentação física exigida em algumas UEL e usada em entrevista de troca de ramo.
- **Esforço**: ~1h.

---

## 🟢 FRICÇÃO BAIXA (qualidade/polimento)

### U10. Indicadores de status sem depender só de cor

- **Objetivo**: acessibilidade para daltonismo (~5% homens).
- **Módulos**: `src/components/BlocoTracker.tsx`, `src/components/SectionProgressOverview.tsx`, `src/components/ProgressaoBlocos2025.tsx`.
- **O que**: junto com cada cor, ter ícone ou label texto:
  - Concluído: ✓ + verde + "Concluído"
  - Em andamento: ⏳ + azul + "Em andamento"
  - Pendente: ○ + cinza + "Pendente"
- **Como**: criar função `statusBadge(status)` → JSX com ícone + cor + tooltip texto.
- **Motivo**: WCAG AA recomenda evitar cor como único indicador.
- **Esforço**: ~30 min.

### U11. Alertas de idade-limite

- **Objetivo**: lembrar a chefia quando jovem se aproxima de prazo.
- **Módulos**: `src/components/SectionProgressOverview.tsx` (nova coluna), opcional `src/components/Notifications.tsx`.
- **Métodos**: helper `getAgeLimit warnings(membros, hoje): Warning[]`.
- **O que**:
  - Lobinho com 10.5+ anos sem Cruzeiro do Sul → ⚠️ "X meses pra idade-limite"
  - Lobinho 11+ → 🚨 "Já passou da idade — verificar elegibilidade"
  - Idem Escoteiro 14.5+ / 15+
- **Como**:
  1. Calcular `monthsToAgeLimit(birthDate, idadeLimite)`.
  2. Coluna "Alertas" em `SectionProgressOverview` mostra badges.
  3. Opcional: banner de alerta global na tela inicial.
- **Motivo**: o app já tem a info, mas é passiva. Lembrete proativo evita "perder o prazo" do reconhecimento.
- **Esforço**: ~45 min.

### U12. Aviso de concorrência entre chefes na mesma máquina

- **Objetivo**: evitar perda silenciosa de write quando 2 chefes editam o mesmo membro.
- **Módulos**: `src/services/storageService.ts`, `src/components/BlocoTracker.tsx`.
- **Métodos**: estender `MemberBlocoState` com `lastUpdate` (já existe) e validar antes de save.
- **O que**:
  1. Antes de salvar, comparar `lastUpdate` no localStorage com `lastUpdate` em memória do component.
  2. Se for mais novo no storage que em memória → mostrar modal "Outro usuário modificou este bloco. Recarregar / Sobrescrever / Cancelar?"
- **Como**: implementar `optimisticSaveBlocoState(state, prevLastUpdate)` que valida antes de gravar.
- **Motivo**: hoje, dois chefes na mesma máquina (revezando login) podem sobrescrever progresso sem aviso.
- **Esforço**: ~45 min.

---

## 📋 Sequência sugerida de execução

| # | Item | Esforço | Categoria |
|---|------|---------|-----------|
| 1 | U4 (header com menu) | 45 min | 🟢 Quick win visual |
| 2 | U10 (indicadores acessíveis) | 30 min | 🟢 Quick win |
| 3 | U1 (BlocoTracker como principal) | 1h | 🔴 Crítico |
| 4 | U8 (duplicar plano) | 30 min | 🟡 Valor |
| 5 | U5 (preservar config no retry) | 30 min | 🟡 Valor |
| 6 | U6 (editar campos enriquecidos) | 45 min | 🟡 Valor |
| 7 | U2 (catálogo agrupado) | 1.5h | 🔴 Crítico |
| 8 | U3 (onboarding) | 1.5h | 🔴 Crítico |
| 9 | U11 (alertas idade) | 45 min | 🟡 Valor |
| 10 | U9 (print/export) | 1h | 🟡 Valor |
| 11 | U7 (batch progress) | 1.5h | 🟡 Valor |
| 12 | U12 (concorrência) | 45 min | 🟢 Polish |

**Total**: ~11h. **Caminho crítico** (#1, #3, #7, #8): ~5h.

---

## Princípios que guiam estas escolhas

1. **Reduzir cliques no fluxo principal**: tracker direto, catálogo agrupado.
2. **Onboarding sem dead-end**: depois do setup, próximo passo claro.
3. **Reusar trabalho do chefe**: duplicar planos, batch progress, preservar config no retry.
4. **Editar tudo o que a IA produz**: chefe deve ter última palavra.
5. **Acessibilidade básica**: cor + ícone + label.
6. **Auditoria normativa**: alertas proativos, manuais citados, idade-limite vigiada.

---

## Não-objetivos

- **Reescrever em mobile-first**: app é desktop-primeiro (chefe planeja em casa).
- **Sincronização cloud**: backup local é suficiente para o porte.
- **Multi-tenant real (com permissões granulares)**: complexo demais; revezar usuários no mesmo Electron resolve.
- **Internacionalização**: PT-BR é suficiente para o público.
