import { clipboard } from "electron";
import { ClipboardChannels } from "../shared/constants/ipc-channels";
import type { IpcResult } from "../shared/types/ipc";
import { registerIpcHandler } from "./ipc-security";

const MAX_CLIPBOARD_TEXT_LENGTH = 10_000_000;

export function registerClipboardHandlers(): void {
  registerIpcHandler(
    ClipboardChannels.WRITE_TEXT,
    (_event, text: unknown): IpcResult<void> => {
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
        return { success: true, data: undefined };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    },
  );
}
