import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClipboardChannels } from "@/shared/constants/ipc-channels";

const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  writeText: vi.fn(),
}));

vi.mock("electron", () => ({
  ipcMain: { handle: mocks.handle },
  clipboard: { writeText: mocks.writeText },
}));

import { registerClipboardHandlers } from "@/main/clipboard-ipc";
import { configureIpcSecurity } from "@/main/ipc-security";

describe("clipboard IPC", () => {
  const mainFrame = { url: "file:///app/index.html" };
  const event = {
    senderFrame: mainFrame,
    sender: { mainFrame },
  };

  beforeEach(() => {
    mocks.handle.mockReset();
    mocks.writeText.mockReset();
    configureIpcSecurity(mainFrame.url);
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

    expect(handler(event, { unsafe: true }).success).toBe(false);
    expect(handler(event, "copied value")).toEqual({
      success: true,
      data: undefined,
    });
    expect(mocks.writeText).toHaveBeenCalledWith("copied value");
  });
});
