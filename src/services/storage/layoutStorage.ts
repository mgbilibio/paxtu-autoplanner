import { getAppConfig } from './configStorage';

export const readLayoutFile = async <T>(
  folder: string,
  file: string,
): Promise<T | null> => {
  const config = getAppConfig();
  if (!config?.dataFolder || !window.fileSystem) return null;
  const data = await window.fileSystem.readData(
    `${config.dataFolder}/${folder}`,
    file,
  );
  return data ? JSON.parse(data) as T : null;
};

export const writeLayoutFile = async (
  folder: string,
  file: string,
  payload: unknown,
): Promise<void> => {
  const config = getAppConfig();
  if (!config?.dataFolder || !window.fileSystem) return;
  await window.fileSystem.writeData(
    `${config.dataFolder}/${folder}`,
    file,
    JSON.stringify(payload, null, 2),
  );
};
