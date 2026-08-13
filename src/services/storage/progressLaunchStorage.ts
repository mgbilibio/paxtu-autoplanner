import { ProgressLaunch } from '../../types';
import { readAccessibleItems, readSectionItems, writeSectionItems } from '../firebase/sectionData';
import { isFirestoreBacked, readJsonDoc, writeJsonDoc } from './dualBackend';
import { DATA_EVENTS, dispatchDataEvent } from './events';
import { PROGRESS_LAUNCHES_FILENAME, PROGRESS_LAUNCHES_KEY } from './names';
import { assertCanWriteSection } from './sectionLockStorage';
import { runExclusive } from './writeQueue';

const upsertLaunch = (current: ProgressLaunch[], launch: ProgressLaunch): ProgressLaunch[] => {
  let updated = current.filter(item => item.eventId !== launch.eventId || item.id === launch.id);
  const idx = updated.findIndex(item => item.id === launch.id);
  if (idx >= 0) updated[idx] = launch;
  else updated.push(launch);
  return updated;
};

export const getProgressLaunchesAsync = async (
  sectionId?: string,
): Promise<ProgressLaunch[]> => {
  if (isFirestoreBacked()) {
    if (sectionId) return readSectionItems<ProgressLaunch>(sectionId, 'progressLaunches');
    return readAccessibleItems<ProgressLaunch>('progressLaunches');
  }
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
  if (isFirestoreBacked()) {
    await runExclusive(`firestore-launches-${launch.sectionId}`, async () => {
      const current = await readSectionItems<ProgressLaunch>(launch.sectionId, 'progressLaunches');
      await writeSectionItems(launch.sectionId, 'progressLaunches', upsertLaunch(current, launch));
    });
    dispatchDataEvent(DATA_EVENTS.PROGRESS_LAUNCHES_UPDATED);
    return;
  }
  await runExclusive(PROGRESS_LAUNCHES_FILENAME, async () => {
    const current = await getProgressLaunchesAsync();
    await writeJsonDoc(PROGRESS_LAUNCHES_FILENAME, PROGRESS_LAUNCHES_KEY, upsertLaunch(current, launch));
  });
  dispatchDataEvent(DATA_EVENTS.PROGRESS_LAUNCHES_UPDATED);
};

export const deleteProgressLaunchAsync = async (id: string): Promise<void> => {
  if (isFirestoreBacked()) {
    const current = await getProgressLaunchesAsync();
    const launch = current.find(l => l.id === id);
    assertCanWriteSection(launch?.sectionId);
    if (!launch) return;
    await runExclusive(`firestore-launches-${launch.sectionId}`, async () => {
      const items = await readSectionItems<ProgressLaunch>(launch.sectionId, 'progressLaunches');
      await writeSectionItems(launch.sectionId, 'progressLaunches', items.filter(item => item.id !== id));
    });
    dispatchDataEvent(DATA_EVENTS.PROGRESS_LAUNCHES_UPDATED);
    return;
  }
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
