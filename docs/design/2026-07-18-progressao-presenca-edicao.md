# Design: Lançamento de progressão por presença + edição (excluir quem não atingiu)

**Status:** incluído no plano de produto (2026-07-18)  
**App:** Paxtu AutoPlanner  
**Contexto:** Agenda (`CalendarView`) hoje lança códigos do roteiro para **todos os presentes**, sem revisão seletiva pós-lançamento.

---

## 1. Problema

Fluxo desejado pela chefia:

1. Cadastrar / marcar **todos** que participaram (presença).  
2. Lançar progressão ligada à **data/atividade**.  
3. **Editar** depois: **excluir** jovens que **não atingiram** os objetivos de avaliação da atividade.

Hoje (estado real do código):

| Etapa | Comportamento |
|-------|----------------|
| Presença no evento | ✅ `CalendarEvent.attendance[]` |
| Lançar progressão | ✅ Aplica códigos de `plan.activities[].progressionObjective` a **todos** `present` |
| Separar presença × cumprimento | ❌ Ausente |
| Revisar / desmarcar crédito pós-lançamento | ❌ Ausente |
| Reverter homologação só desta atividade | ❌ Sem registro de “lançamento por evento” |

**Marcar em lote** (`BatchProgressMarker`) permite desmarcar antes de aplicar, mas **não** está amarrado à atividade/data nem ao roteiro.

Relatórios de progressão já usam **homologação real** (blocos/legado), não presença — manter assim.

---

## 2. Princípios

1. **Presença ≠ crédito de progressão.**  
2. **Cadastra todos → exclui quem não atingiu** (não o contrário como fluxo principal).  
3. Frequência continua baseada em **presença**.  
4. Progressão nos relatórios continua baseada em **estado homologado** do membro.  
5. Excluir crédito **não** apaga presença.  
6. Não apagar conclusão de bloco se o jovem já tinha o item por **outro** lançamento/data.

---

## 3. Modelo de dados (proposto)

### 3.1 `ProgressLaunch` (lançamento por atividade)

```ts
interface ProgressLaunch {
  id: string;
  eventId: string;           // CalendarEvent.id
  sectionId: string;
  date: string;              // YYYY-MM-DD (espelho do evento)
  planId?: string;
  planTheme?: string;
  codes: string[];           // códigos aplicados (B5.F2, especialidade, …)
  /** Quem entrou no lote inicial (geralmente = presentes no momento do lançamento) */
  creditedMemberIds: string[];
  /** Quem foi excluído depois (não atingiu avaliação) */
  excludedMemberIds: string[];
  createdAt: string;
  updatedAt: string;
  createdByUserId?: string;
  notes?: string;
}
```

### 3.2 Efetivo de crédito

```
efetivos = creditedMemberIds − excludedMemberIds
```

(ou manter só `creditedMemberIds` mutável: default todos presentes, UI remove IDs).

**Recomendação de implementação:**  
- No lançamento: `creditedMemberIds = presentes`, `excludedMemberIds = []`.  
- Na edição: mover ID para `excludedMemberIds` e **reverter** o apply daqueles códigos **se** o audit trail indicar que a conclusão veio só deste launch.

### 3.3 Rastreio de origem (mínimo viável)

Para reverter com segurança, cada apply deve registrar origem:

```ts
// opção A — por membro no MemberBlocoState (estender)
sourceLaunches?: { code: string; launchId: string; date: string }[];

// opção B — arquivo auxiliar PAXTU_LAUNCH_APPLY_{memberId}
// { launchId, codes[], appliedAt }
```

**MVP:** opção B (arquivo/coleção de applies) evita reescrever schema pesado de blocos.  
**Revert:** se o code só aparece em applies deste `launchId`, remove da lista de concluídas; senão só tira do launch.

---

## 4. UX (Agenda)

### 4.1 Fluxo principal

1. Abrir atividade na data.  
2. Marcar **presença** (todos que vieram) → Salvar.  
3. **Lançar progressão**  
   - Confirma códigos extraídos do roteiro.  
   - Pré-seleção = presentes (ainda permite desmarcar **antes** de aplicar, opcional).  
   - Cria `ProgressLaunch` + aplica aos creditados.  
4. **Revisar crédito** (novo botão, habilitado se existir launch do evento)  
   - Lista jovens creditados (✓).  
   - Desmarcar / “Não atingiu avaliação” → vai para excluídos.  
   - Salvar → reverte apply dos excluídos + atualiza launch.  
5. Opcional: re-incluir alguém excluído por engano (re-apply + tira de excluded).

### 4.2 Copy

- Presença: “Quem veio.”  
- Crédito: “Quem cumpriu os objetivos/critérios de avaliação desta atividade.”  
- Aviso: “Excluir do crédito não remove a presença nem o histórico de frequência.”

### 4.3 Especialidades

Hoje o batch **inicia** especialidade para avaliação requisito a requisito.  
Na exclusão:

- Se só “iniciou” e não há requisitos marcados → pode desfazer início.  
- Se já há avaliação parcial → **não** apagar automaticamente; avisar chefia (“revise ficha da especialidade”).

---

## 5. API / serviços (camada app)

| Função | Responsabilidade |
|--------|------------------|
| `createProgressLaunch(event, plan, memberIds)` | Cria launch + apply codes |
| `updateProgressLaunchCredits(launchId, creditedIds)` | Diff, apply/revert |
| `getLaunchForEvent(eventId)` | UI revisar |
| `extractProgressionCodes` | Já existe — reutilizar |

Persistência: pasta de dados da seção/workspace (mesmo dual backend local/shared).

---

## 6. Plano de PRs

| PR | Entrega |
|----|---------|
| **P0** | Tipos + storage `ProgressLaunch` + list/get/save |
| **P1** | Refator `handleBatchProgression` → cria launch + apply com audit |
| **P2** | UI “Revisar crédito” no modal da Agenda (excluir / re-incluir) |
| **P3** | Reversão segura de blocos + regras de especialidade |
| **P4** | Help + relatórios opcionais (“lançamentos do mês”) |

---

## 7. Critérios de aceite

- [ ] Lançar para todos os presentes em um clique.  
- [ ] Abrir revisão e excluir ≥1 jovem; presença permanece.  
- [ ] Item de bloco some do jovem se só veio deste launch.  
- [ ] Item permanece se já existia por outra data/launch.  
- [ ] Frequência % nos relatórios inalterada ao excluir crédito.  
- [ ] Seção em modo consulta: não grava (mesmo padrão de lock).

---

## 8. Fora de escopo (MVP)

- Avaliação requisito a requisito **dentro** do modal da agenda (fica no tracker/especialidade).  
- Multi-lançamentos concorrentes no mesmo evento (um launch ativo por eventId no MVP; “relançar” substitui ou cria versão 2 — decidir em P1: **um launch por evento**, editar no lugar).  
- Notificação aos pais.

---

## 9. Key decisions

| # | Decisão |
|---|---------|
| G1 | Presença e crédito são entidades separadas |
| G2 | Fluxo: todos creditados → exclusão seletiva |
| G3 | Um `ProgressLaunch` por `eventId` no MVP |
| G4 | Reversão só se audit provar origem neste launch |
| G5 | Frequência nunca depende de crédito |

---

*Incluído no roadmap unificado: `2026-07-18-roadmap-paxtu.md`.*
