import { SettingsChannels } from "../shared/constants/ipc-channels";
import type { AppSettings } from "../shared/types/settings";
import { getSettings, updateSettings } from "./settings-store";
import { validateSettingsPatch } from "./ipc-validation";
import { registerIpcHandler } from "./ipc-security";

export function registerSettingsHandlers(
  onSettingsUpdated?: (settings: AppSettings) => void,
): void {
  registerIpcHandler(SettingsChannels.GET, () => {
    try {
      return { success: true, data: getSettings() };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  registerIpcHandler(SettingsChannels.UPDATE, (_event, rawPatch: unknown) => {
    try {
      const patch = validateSettingsPatch(rawPatch);
      const settings = updateSettings(patch);
      onSettingsUpdated?.(settings);
      return { success: true, data: settings };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
}
