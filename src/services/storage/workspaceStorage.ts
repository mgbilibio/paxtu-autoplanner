import { AppConfig } from '../../types';

const WORKSPACE_FILENAME = 'paxtu_workspace.json';

export interface WorkspaceMetadata {
  workspaceId: string;
  groupName?: string;
  createdAt: string;
  lastOpenedAt: string;
  lastOpenedBy?: string;
  syncMode: 'local' | 'sharedFolder';
}

const newWorkspaceId = (): string => {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `workspace_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

export const ensureWorkspaceMetadata = async (
  config: AppConfig,
  openedBy?: string,
): Promise<WorkspaceMetadata | null> => {
  if (!config.dataFolder || !window.fileSystem) return null;
  const existing = await window.fileSystem.readData(
    config.dataFolder,
    WORKSPACE_FILENAME,
  );
  const now = new Date().toISOString();
  const previous = existing ? JSON.parse(existing) as WorkspaceMetadata : null;
  const metadata: WorkspaceMetadata = {
    workspaceId: previous?.workspaceId || newWorkspaceId(),
    groupName: config.profile?.groupName || previous?.groupName,
    createdAt: previous?.createdAt || now,
    lastOpenedAt: now,
    lastOpenedBy: openedBy || previous?.lastOpenedBy,
    syncMode: config.syncMode || previous?.syncMode || 'local',
  };
  await window.fileSystem.writeData(
    config.dataFolder,
    WORKSPACE_FILENAME,
    JSON.stringify(metadata, null, 2),
  );
  return metadata;
};
