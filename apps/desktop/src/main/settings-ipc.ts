import { ipcMain } from 'electron';
import {
  SettingsChannels,
  type AppSettings,
  type AppSettingsPatch,
} from '../shared/types/settings';
import {
  getSettings,
  updateSettings,
} from './settings-store';

export function registerSettingsHandlers(
  onSettingsUpdated?: (settings: AppSettings) => void,
): void {
  ipcMain.handle(SettingsChannels.GET, () => {
    try {
      return { success: true, data: getSettings() };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(SettingsChannels.UPDATE, (_event, patch: AppSettingsPatch) => {
    try {
      const settings = updateSettings(patch);
      onSettingsUpdated?.(settings);
      return { success: true, data: settings };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
}
