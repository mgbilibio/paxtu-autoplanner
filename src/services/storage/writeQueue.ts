// Fila/mutex por chave de arquivo. Serializa as escritas read-modify-write dos
// agregados (membros, secoes, usuarios, calendario, grupos) para evitar
// "lost update": duas chamadas concorrentes que leem o mesmo estado, alteram e
// gravam, fazendo a segunda sobrescrever a primeira. Cada chave guarda a cauda
// de uma corrente de Promises; runExclusive so executa fn quando a anterior
// terminou, garantindo que a releitura dentro de fn enxergue a gravacao previa.
const tails = new Map<string, Promise<unknown>>();

export const runExclusive = async <T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> => {
  // Espera a cauda atual (sem propagar seu erro/resultado) antes de rodar fn,
  // mantendo a ordem de chegada das chamadas.
  const previous = tails.get(key) ?? Promise.resolve();
  const run = previous.then(() => fn(), () => fn());
  // A cauda registrada nunca rejeita, senao a proxima fn da fila nao rodaria.
  const tail = run.catch(() => undefined);
  tails.set(key, tail);
  try {
    return await run;
  } finally {
    // Se ninguem encadeou depois, esta corrente foi totalmente drenada: limpa o
    // slot para nao vazar chaves antigas no Map.
    if (tails.get(key) === tail) tails.delete(key);
  }
};
