import { shell, type BrowserWindow, type Session } from "electron";

const ALLOWED_EXTERNAL_HOSTS = new Set(["github.com", "www.openstreetmap.org"]);

export function buildContentSecurityPolicy(devServerUrl?: string): string {
  const connectSources = ["'self'", "https://*.tile.openstreetmap.org"];
  const scriptSources = ["'self'"];

  if (devServerUrl) {
    const devUrl = new URL(devServerUrl);
    const websocketProtocol = devUrl.protocol === "https:" ? "wss:" : "ws:";
    connectSources.push(`${websocketProtocol}//${devUrl.host}`);
    // Vite injects the React Fast Refresh preamble as an inline module in
    // development. Packaged builds never receive this exception.
    scriptSources.push("'unsafe-inline'");
  }

  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://*.tile.openstreetmap.org",
    "font-src 'self' data:",
    `connect-src ${connectSources.join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "frame-src 'none'",
    "form-action 'none'",
  ].join("; ");
}

export function isAllowedExternalUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    return (
      url.protocol === "https:" && ALLOWED_EXTERNAL_HOSTS.has(url.hostname)
    );
  } catch {
    return false;
  }
}

export async function openAllowedExternalUrl(rawUrl: string): Promise<void> {
  if (!isAllowedExternalUrl(rawUrl)) {
    return;
  }

  await shell.openExternal(rawUrl);
}

export function configureContentSecurityPolicy(
  session: Session,
  devServerUrl?: string,
): void {
  const contentSecurityPolicy = buildContentSecurityPolicy(devServerUrl);

  session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [contentSecurityPolicy],
      },
    });
  });
}

export function configureWindowSecurity(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    void openAllowedExternalUrl(url);
    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, rawUrl) => {
    event.preventDefault();
    void openAllowedExternalUrl(rawUrl);
  });

  window.webContents.session.setPermissionRequestHandler(
    (_webContents, _permission, callback) => {
      callback(false);
    },
  );
  window.webContents.session.setPermissionCheckHandler(() => false);
}
