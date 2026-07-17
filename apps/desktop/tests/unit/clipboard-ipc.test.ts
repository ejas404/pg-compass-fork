import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClipboardChannels } from "@/shared/constants/clipboard";

const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  writeText: vi.fn(),
}));

vi.mock("electron", () => ({
  ipcMain: { handle: mocks.handle },
  clipboard: { writeText: mocks.writeText },
}));

import { registerClipboardHandlers } from "@/main/clipboard-ipc";

describe("clipboard IPC", () => {
  beforeEach(() => {
    mocks.handle.mockReset();
    mocks.writeText.mockReset();
    registerClipboardHandlers();
  });

  it("validates input and writes text in the main process", () => {
    const registration = mocks.handle.mock.calls.find(
      ([channel]) => channel === ClipboardChannels.WRITE_TEXT,
    );
    const handler = registration?.[1] as (
      event: unknown,
      text: unknown,
    ) => { success: boolean; error?: string };

    expect(handler({}, { unsafe: true }).success).toBe(false);
    expect(handler({}, "copied value")).toEqual({ success: true });
    expect(mocks.writeText).toHaveBeenCalledWith("copied value");
  });
});
