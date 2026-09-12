export type SpecialtyLevelRule =
  | { kind: 'explicit'; nivel1: number; nivel2: number; nivel3: number; source: string }
  | { kind: 'unvalidated'; source: 'missing-niveis' };

export const specialtyLevelRuleFor = (item: {
  niveis?: readonly { nome: string; itens: number }[];
  requisitos?: readonly unknown[];
  fonte?: string;
}): SpecialtyLevelRule => {
  const niveis = item.niveis || [];
  const nivel1 = niveis.find(nivel => nivel.nome === 'Nível I')?.itens;
  const nivel2 = niveis.find(nivel => nivel.nome === 'Nível II')?.itens;
  const nivel3 = niveis.find(nivel => nivel.nome === 'Nível III')?.itens;
  if (nivel1 || nivel2 || nivel3) {
    return {
      kind: 'explicit',
      nivel1: nivel1 || 0,
      nivel2: nivel2 || 0,
      nivel3: nivel3 || 0,
      source: item.fonte || 'UEB Especialidades 2026',
    };
  }
  return { kind: 'unvalidated', source: 'missing-niveis' };
};
