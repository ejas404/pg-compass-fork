import { useSettings } from "@/hooks/use-settings";
import type { DensityPreference } from "@/shared/types/settings";

/**
 * Resolved data-view density. Falls back to "compact" so configs persisted
 * before this setting existed keep the tighter default the app ships with.
 */
export function useDensity(): DensityPreference {
  const { settings } = useSettings();
  return settings.appearance.density ?? "compact";
}
