import { ProgressLaunch } from '../../types';
import { readJsonDoc, writeJsonDoc } from './dualBackend';
import { DATA_EVENTS, dispatchDataEvent } from './events';
import { PROGRESS_LAUNCHES_FILENAME, PROGRESS_LAUNCHES_KEY } from './names';
import { assertCanWriteSection } from './sectionLockStorage';
import { runExclusive } from './writeQueue';

export const getProgressLaunchesAsync = async (
  sectionId?: string,
): Promise<ProgressLaunch[]> => {
  const all = await readJsonDoc<ProgressLaunch[]>(
    PROGRESS_LAUNCHES_FILENAME,
    PROGRESS_LAUNCHES_KEY,
    [],
  );
  if (sectionId) return all.filter(l => l.sectionId === sectionId);
  return all;
};

export const getProgressLaunchByEventId = async (
  eventId: string,
): Promise<ProgressLaunch | null> => {
  const all = await getProgressLaunchesAsync();
  return all.find(l => l.eventId === eventId) || null;
};

export const saveProgressLaunchAsync = async (
  launch: ProgressLaunch,
): Promise<void> => {
  assertCanWriteSection(launch.sectionId);
  await runExclusive(PROGRESS_LAUNCHES_FILENAME, async () => {
    const current = await getProgressLaunchesAsync();
    const index = current.findIndex(item => item.id === launch.id);
    const byEvent = current.findIndex(
      item => item.eventId === launch.eventId && item.id !== launch.id,
    );
    let updated = [...current];
    // MVP: um launch por evento — remove duplicatas do mesmo eventId
    if (byEvent >= 0) {
      updated = updated.filter(item => item.eventId !== launch.eventId || item.id === launch.id);
    }
    const idx = updated.findIndex(item => item.id === launch.id);
    if (idx >= 0) updated[idx] = launch;
    else updated.push(launch);
    await writeJsonDoc(PROGRESS_LAUNCHES_FILENAME, PROGRESS_LAUNCHES_KEY, updated);
  });
  dispatchDataEvent(DATA_EVENTS.PROGRESS_LAUNCHES_UPDATED);
};

export const deleteProgressLaunchAsync = async (id: string): Promise<void> => {
  await runExclusive(PROGRESS_LAUNCHES_FILENAME, async () => {
    const current = await getProgressLaunchesAsync();
    const launch = current.find(l => l.id === id);
    assertCanWriteSection(launch?.sectionId);
    await writeJsonDoc(
      PROGRESS_LAUNCHES_FILENAME,
      PROGRESS_LAUNCHES_KEY,
      current.filter(l => l.id !== id),
    );
  });
  dispatchDataEvent(DATA_EVENTS.PROGRESS_LAUNCHES_UPDATED);
};
