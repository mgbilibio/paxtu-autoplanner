import { CatalogCategory, ObjectiveItem } from '../types';

const STOPWORDS = new Set([
  'para', 'com', 'uma', 'das', 'dos', 'que', 'por', 'de', 'do',
  'da', 'em', 'no', 'na', 'os', 'as', 'ao', 'aos', 'e', 'ou',
]);

const tokenize = (value: string): string[] =>
  value.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(word => word.length > 3 && !STOPWORDS.has(word));

const scoreText = (tokens: string[], text: string): number => {
  const target = new Set(tokenize(text));
  return tokens.reduce((score, token) => score + (target.has(token) ? 1 : 0), 0);
};

export const buildCustomObjective = (
  description: string,
  catalog: CatalogCategory[],
): ObjectiveItem => {
  const tokens = tokenize(description);
  const matches = catalog.flatMap(category =>
    category.items.map(item => ({
      category: category.name,
      item,
      score:
        scoreText(tokens, item.description) * 3 +
        scoreText(tokens, item.guidance || '') +
        scoreText(tokens, category.name),
    })),
  )
    .filter(match => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const suggestions = matches.map(match =>
    `- ${match.item.code} (${match.category}): ${match.item.description}`,
  ).join('\n');

  const requirementsContext = [
    'Atividade personalizada, criada fora do catálogo.',
    'Ao gerar o roteiro, tente amarrar esta atividade a progressão, especialidade ou insígnia compatível.',
    suggestions ? `Possíveis vínculos encontrados localmente:\n${suggestions}` : 'Nenhum vínculo local óbvio; a IA deve justificar a melhor aproximação ou manter como atividade geral.',
  ].join('\n');

  return {
    id: `${Date.now()}-${Math.random()}`,
    description,
    category: 'Atividade personalizada',
    source: 'Manual',
    requirementsContext,
  };
};
