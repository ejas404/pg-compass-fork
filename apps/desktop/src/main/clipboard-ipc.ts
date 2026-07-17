import { clipboard, ipcMain } from "electron";
import { ClipboardChannels } from "../shared/constants/clipboard";

const MAX_CLIPBOARD_TEXT_LENGTH = 10_000_000;

export function registerClipboardHandlers(): void {
  ipcMain.handle(
    ClipboardChannels.WRITE_TEXT,
    (_event, text: unknown): { success: boolean; error?: string } => {
      if (typeof text !== "string") {
        return { success: false, error: "Clipboard text must be a string." };
      }
      if (text.length > MAX_CLIPBOARD_TEXT_LENGTH) {
        return {
          success: false,
          error: "Clipboard text exceeds the 10 MB safety limit.",
        };
      }
      try {
        clipboard.writeText(text);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    },
  );
}
