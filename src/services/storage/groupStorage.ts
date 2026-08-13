import { ScoutGroup } from '../../types';
import { readJsonDoc, writeJsonDoc } from './dualBackend';
import { DATA_EVENTS, dispatchDataEvent } from './events';
import { GROUPS_FILENAME, GROUPS_KEY } from './names';
import { runExclusive } from './writeQueue';

export const getGroupsAsync = async (): Promise<ScoutGroup[]> => {
  return readJsonDoc<ScoutGroup[]>(GROUPS_FILENAME, GROUPS_KEY, []);
};

export const saveGroupAsync = async (group: ScoutGroup): Promise<void> => {
  // Releitura dentro da secao critica serializada por chave (anti lost update).
  await runExclusive(GROUPS_FILENAME, async () => {
    const groups = await getGroupsAsync();
    const index = groups.findIndex(item => item.id === group.id);
    if (index >= 0) groups[index] = group;
    else groups.push(group);
    await writeJsonDoc(GROUPS_FILENAME, GROUPS_KEY, groups);
  });
  dispatchDataEvent(DATA_EVENTS.GROUPS_UPDATED);
};
