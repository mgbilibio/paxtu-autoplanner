import { UserProfile } from '../../types';
import { adultFolder, adultProfilePath } from '../dataLayoutService';
import { getAppConfig } from './configStorage';
import { isFileBacked, readJsonDoc, writeJsonDoc } from './dualBackend';
import { DATA_EVENTS, dispatchDataEvent } from './events';
import { writeLayoutFile } from './layoutStorage';
import { USERS_FILENAME, USERS_KEY } from './names';
import { runExclusive } from './writeQueue';

// Admin-master e uma entidade virtual (seed): existe sempre em memoria, mas
// NUNCA e gravada no agregado persistido. Assim deleteUserAsync nao tenta apagar
// uma pasta inexistente e saveUserAsync nao a duplica no JSON.
const ADMIN_MASTER_ID = 'admin-master';

const adminMasterSeed: UserProfile = {
  id: ADMIN_MASTER_ID,
  name: 'Administrador',
  role: 'ADMINISTRADOR',
  sectionId: 'ADMIN_GLOBAL',
};

// Le apenas os usuarios reais persistidos (sem o seed virtual). Base para
// findIndex/save/delete, evitando reescrever o admin-master no JSON.
const getPersistedUsers = async (): Promise<UserProfile[]> => {
  const users = await readJsonDoc<UserProfile[]>(USERS_FILENAME, USERS_KEY, []);
  // Defesa: se um admin-master vazou para o JSON em versao antiga, ignora-o aqui
  // para nao duplicar com o seed e para nao repersisti-lo.
  return users.filter(user => user.id !== ADMIN_MASTER_ID);
};

export const getUsersAsync = async (): Promise<UserProfile[]> => {
  const users = await getPersistedUsers();
  // Injeta o seed apenas se nao houver outro administrador real cadastrado.
  const hasAdmin = users.some(user => user.role === 'ADMINISTRADOR');
  return hasAdmin ? users : [...users, adminMasterSeed];
};

export const saveUserAsync = async (user: UserProfile): Promise<void> => {
  // Salvar o seed virtual e no-op: ele nao deve ser persistido.
  if (user.id === ADMIN_MASTER_ID) return;
  // Releitura dos usuarios reais dentro da secao critica (anti lost update).
  await runExclusive(USERS_FILENAME, async () => {
    const current = await getPersistedUsers();
    const index = current.findIndex(item => item.id === user.id);
    const updated = index >= 0 ? [...current] : [...current, user];
    if (index >= 0) updated[index] = user;
    await writeJsonDoc(USERS_FILENAME, USERS_KEY, updated);
  });
  if (isFileBacked()) {
    const path = adultProfilePath(user.sectionId, user.id);
    await writeLayoutFile(path.folder, path.file, user);
  }
  dispatchDataEvent(DATA_EVENTS.USERS_UPDATED);
};

export const deleteUserAsync = async (id: string): Promise<void> => {
  // O seed virtual nao existe no agregado: deletar e no-op silencioso.
  if (id === ADMIN_MASTER_ID) return;
  const removed = await runExclusive(USERS_FILENAME, async () => {
    const current = await getPersistedUsers();
    const found = current.find(user => user.id === id);
    await writeJsonDoc(USERS_FILENAME, USERS_KEY, current.filter(user => user.id !== id));
    return found;
  });
  // LGPD: remove a pasta do adulto no filesystem.
  const config = getAppConfig();
  if (removed && config?.dataFolder && window.fileSystem?.deletePath) {
    await window.fileSystem.deletePath(config.dataFolder, adultFolder(removed.sectionId, removed.id));
  }
  dispatchDataEvent(DATA_EVENTS.USERS_UPDATED);
};
