export type ShortcutPlatform = "mac" | "windows";

export interface ShortcutDefinition {
  id: string;
  label: string;
  category: "Workspace" | "Data" | "Editor";
  accelerator?: string;
  codeMirrorKey?: string;
  binding: {
    key: string;
    modifier: "mod" | "control";
    shift?: boolean;
  };
  keys: {
    mac: string[];
    windows: string[];
  };
}

export const SHORTCUTS: ShortcutDefinition[] = [
  {
    id: "next-tab",
    label: "Next tab",
    category: "Workspace",
    binding: { key: "Tab", modifier: "control" },
    keys: { mac: ["Control", "Tab"], windows: ["Ctrl", "Tab"] },
  },
  {
    id: "previous-tab",
    label: "Previous tab",
    category: "Workspace",
    binding: { key: "Tab", modifier: "control", shift: true },
    keys: {
      mac: ["Control", "Shift", "Tab"],
      windows: ["Ctrl", "Shift", "Tab"],
    },
  },
  {
    id: "close-tab",
    label: "Close tab",
    category: "Workspace",
    accelerator: "CmdOrCtrl+W",
    binding: { key: "w", modifier: "mod" },
    keys: { mac: ["⌘", "W"], windows: ["Ctrl", "W"] },
  },
  {
    id: "refresh",
    label: "Refresh active view",
    category: "Data",
    binding: { key: "r", modifier: "mod" },
    keys: { mac: ["⌘", "R"], windows: ["Ctrl", "R"] },
  },
  {
    id: "sidebar-search",
    label: "Search sidebar",
    category: "Workspace",
    binding: { key: "f", modifier: "mod", shift: true },
    keys: { mac: ["⌘", "Shift", "F"], windows: ["Ctrl", "Shift", "F"] },
  },
  {
    id: "editor-find",
    label: "Find in editor",
    category: "Editor",
    binding: { key: "f", modifier: "mod" },
    keys: { mac: ["⌘", "F"], windows: ["Ctrl", "F"] },
  },
  {
    id: "run-query",
    label: "Run query",
    category: "Editor",
    codeMirrorKey: "Mod-Enter",
    binding: { key: "Enter", modifier: "mod" },
    keys: { mac: ["⌘", "Enter"], windows: ["Ctrl", "Enter"] },
  },
];

export function currentShortcutPlatform(): ShortcutPlatform {
  if (
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/.test(navigator.platform)
  ) {
    return "mac";
  }
  return "windows";
}

export function shortcutLabel(
  shortcut: ShortcutDefinition,
  platform = currentShortcutPlatform(),
): string {
  return shortcut.keys[platform].join(platform === "mac" ? "" : "+");
}

export function getShortcut(id: string): ShortcutDefinition {
  const shortcut = SHORTCUTS.find((item) => item.id === id);
  if (!shortcut) throw new Error(`Unknown shortcut: ${id}`);
  return shortcut;
}

export function matchesShortcut(
  id: string,
  event: {
    key: string;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
  },
  platform = currentShortcutPlatform(),
): boolean {
  const { binding } = getShortcut(id);
  const modifier =
    binding.modifier === "control"
      ? event.ctrlKey
      : platform === "mac"
        ? event.metaKey
        : event.ctrlKey;
  return (
    modifier &&
    event.shiftKey === Boolean(binding.shift) &&
    event.key.toLowerCase() === binding.key.toLowerCase()
  );
}
