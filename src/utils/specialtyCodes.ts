// Códigos de especialidade: SP-* é legado; ESP-GUIA-* identifica a ficha
// oficial usada pelo POR 2025+. O mapa abaixo atende somente ao legado.

// Mapa segmento (2 letras apos 'SP-') -> nome canonico do ramo.
// Segmentos reais presentes nos specs_*.json: SV, CT, CL, DP, HB.
export const SPECIALTY_SEGMENT_TO_BRANCH: Record<string, string> = {
  SV: 'Serviços',
  CT: 'Ciência e Tecnologia',
  CL: 'Cultura',
  DP: 'Desportos',
  HB: 'Habilidades Escoteiras',
};

// Retorna true para especialidades legadas SP-* e do Guia oficial ESP-GUIA-*.
export const isSpecialtyCode = (code: string): boolean => {
  return code.startsWith('SP-') || /^ESP-GUIA-\d+(?:-N[1-3])?$/.test(code);
};

// Mapeia o segmento do code para o nome canonico do ramo.
// Retorna null se nao for um code 'SP-' ou se o segmento for desconhecido.
export const getSpecialtyBranch = (code: string): string | null => {
  if (code.startsWith('ESP-GUIA-')) return 'Guia oficial';
  if (!code.startsWith('SP-')) return null;

  // Estrutura esperada: SP-<SEG>-<ID>. Extrai o segmento (2a parte).
  const segment = code.split('-')[1];
  return SPECIALTY_SEGMENT_TO_BRANCH[segment] ?? null;
};
