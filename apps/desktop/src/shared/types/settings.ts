export type ThemePreference = 'light' | 'dark' | 'system';

export interface GeneralSettings {
  readOnlyMode: boolean;
  shellAccess: boolean;
  enableDevTools: boolean;
  hideInternalSchemas: boolean;
}

export interface AppearanceSettings {
  theme: ThemePreference;
  sidebarWidth: number;
}

export interface PrivacySettings {
  automaticUpdates: boolean;
}

export interface AppSettings {
  general: GeneralSettings;
  appearance: AppearanceSettings;
  privacy: PrivacySettings;
}

export interface AppSettingsPatch {
  general?: Partial<GeneralSettings>;
  appearance?: Partial<AppearanceSettings>;
  privacy?: Partial<PrivacySettings>;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  general: {
    readOnlyMode: false,
    shellAccess: false,
    enableDevTools: true,
    hideInternalSchemas: true,
  },
  appearance: {
    theme: 'dark',
    sidebarWidth: 256,
  },
  privacy: {
    automaticUpdates: true,
  },
};

export const SettingsChannels = {
  GET: 'settings:get',
  UPDATE: 'settings:update',
} as const;
