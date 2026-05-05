import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectionSSHFieldset } from "@/components/connections/ConnectionSSHFieldset";
import { ConnectionSSLFieldset } from "@/components/connections/ConnectionSSLFieldset";
import type { SSHConfig, SSLConfig } from "@/shared/types/connection";

function SslHarness() {
  const [ssl, setSsl] = useState<SSLConfig>({
    enabled: true,
    rejectUnauthorized: true,
    ca: "",
    cert: "",
    key: "",
  });

  return <ConnectionSSLFieldset value={ssl} onChange={setSsl} />;
}

function SshHarness() {
  const [ssh, setSsh] = useState<SSHConfig>({
    enabled: true,
    host: "",
    port: 22,
    user: "",
    authMethod: "privateKey",
    privateKeyPath: "",
  });

  return <ConnectionSSHFieldset value={ssh} onChange={setSsh} />;
}

describe("connection file fields", () => {
  beforeEach(() => {
    Object.assign(window, {
      connectionApi: {
        showOpenFileDialog: vi.fn().mockResolvedValue({
          success: true,
          data: "C:\\certs\\selected.pem",
        }),
      },
    });
  });

  it("fills SSL certificate paths from the file picker", async () => {
    const user = userEvent.setup();
    render(<SslHarness />);

    await user.click(screen.getAllByRole("button", { name: /browse/i })[0]!);

    expect(window.connectionApi.showOpenFileDialog).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Select CA certificate" }),
    );
    expect(screen.getByLabelText("CA certificate file")).toHaveValue(
      "C:\\certs\\selected.pem",
    );
  });

  it("fills SSH private key paths from the file picker", async () => {
    const user = userEvent.setup();
    render(<SshHarness />);

    await user.click(screen.getByRole("button", { name: /browse/i }));

    expect(window.connectionApi.showOpenFileDialog).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Select SSH private key" }),
    );
    expect(screen.getByLabelText("Private key file")).toHaveValue(
      "C:\\certs\\selected.pem",
    );
  });
});
