import { beforeEach, describe, expect, it, vi } from "vitest";

const { openExternal } = vi.hoisted(() => ({
  openExternal: vi.fn(async () => undefined),
}));

vi.mock("electron", () => ({
  shell: { openExternal },
}));

import {
  buildContentSecurityPolicy,
  configureContentSecurityPolicy,
  configureWindowSecurity,
  isAllowedExternalUrl,
} from "@/main/window-security";

describe("Electron window security", () => {
  beforeEach(() => {
    openExternal.mockClear();
  });

  it("allows only known HTTPS external hosts", () => {
    expect(isAllowedExternalUrl("https://github.com/waterrmalann")).toBe(true);
    expect(isAllowedExternalUrl("https://www.openstreetmap.org/")).toBe(true);
    expect(isAllowedExternalUrl("http://github.com/waterrmalann")).toBe(false);
    expect(isAllowedExternalUrl("https://github.com.evil.example/")).toBe(
      false,
    );
    expect(isAllowedExternalUrl("not a url")).toBe(false);
  });

  it("installs CSP response headers", () => {
    let headersCallback:
      | ((
          details: { responseHeaders?: Record<string, string[]> },
          callback: (response: {
            responseHeaders: Record<string, string[]>;
          }) => void,
        ) => void)
      | undefined;
    const session = {
      webRequest: {
        onHeadersReceived: vi.fn((callback) => {
          headersCallback = callback;
        }),
      },
    };

    configureContentSecurityPolicy(session as never);

    const applyHeaders = vi.fn();
    headersCallback?.(
      { responseHeaders: { Existing: ["value"] } },
      applyHeaders,
    );
    expect(applyHeaders).toHaveBeenCalledWith({
      responseHeaders: {
        Existing: ["value"],
        "Content-Security-Policy": [buildContentSecurityPolicy()],
      },
    });
  });

  it("allows only the configured development websocket origin", () => {
    const productionPolicy = buildContentSecurityPolicy();
    expect(productionPolicy).not.toContain(" ws:");
    expect(productionPolicy).not.toContain(" wss:");
    expect(productionPolicy).toContain("script-src 'self'");
    expect(productionPolicy).not.toContain("script-src 'self' 'unsafe-inline'");

    const developmentPolicy = buildContentSecurityPolicy(
      "http://localhost:5173",
    );
    expect(developmentPolicy).toContain("ws://localhost:5173");
    expect(developmentPolicy).not.toContain(" wss:");
    expect(developmentPolicy).toContain("script-src 'self' 'unsafe-inline'");
  });

  it("blocks navigation, denies permissions, and opens allowed links externally", () => {
    let navigate:
      | ((event: { preventDefault: () => void }, url: string) => void)
      | undefined;
    let permission:
      | ((
          webContents: unknown,
          permission: string,
          callback: (allowed: boolean) => void,
        ) => void)
      | undefined;
    let permissionCheck: (() => boolean) | undefined;
    const setWindowOpenHandler = vi.fn();
    const window = {
      webContents: {
        setWindowOpenHandler,
        on: vi.fn((_event, callback) => {
          navigate = callback;
        }),
        session: {
          setPermissionRequestHandler: vi.fn((callback) => {
            permission = callback;
          }),
          setPermissionCheckHandler: vi.fn((callback) => {
            permissionCheck = callback;
          }),
        },
      },
    };

    configureWindowSecurity(window as never);

    expect(
      setWindowOpenHandler.mock.calls[0]?.[0]({
        url: "https://github.com/waterrmalann",
      }),
    ).toEqual({ action: "deny" });

    const preventDefault = vi.fn();
    navigate?.(
      { preventDefault },
      "https://www.openstreetmap.org/?mlat=1&mlon=2",
    );
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(openExternal).toHaveBeenCalledTimes(2);

    const permissionResult = vi.fn();
    permission?.(undefined, "geolocation", permissionResult);
    expect(permissionResult).toHaveBeenCalledWith(false);
    expect(permissionCheck?.()).toBe(false);
  });
});
