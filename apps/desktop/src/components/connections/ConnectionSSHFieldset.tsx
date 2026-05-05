import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileSearch } from "lucide-react";
import type { SSHConfig } from "@/shared/types/connection";

interface ConnectionSSHFieldsetProps {
  value: SSHConfig;
  onChange: (updater: (s: SSHConfig) => SSHConfig) => void;
}

export function ConnectionSSHFieldset({
  value,
  onChange,
}: Readonly<ConnectionSSHFieldsetProps>) {
  async function handleBrowsePrivateKey() {
    const result = await globalThis.window.connectionApi.showOpenFileDialog({
      title: "Select SSH private key",
      defaultPath: value.privateKeyPath || undefined,
      filters: [
        { name: "Private key files", extensions: ["pem", "key", "rsa"] },
        { name: "All files", extensions: ["*"] },
      ],
    });
    if (result.success && result.data) {
      onChange((s) => ({ ...s, privateKeyPath: result.data ?? "" }));
    }
  }

  return (
    <fieldset className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-2">
        <input
          id="ssh-enabled"
          type="checkbox"
          className="size-4 accent-primary"
          checked={value.enabled}
          onChange={(e) =>
            onChange((s) => ({ ...s, enabled: e.target.checked }))
          }
        />
        <Label htmlFor="ssh-enabled">Enable SSH Tunnel</Label>
      </div>
      {value.enabled && (
        <div className="grid grid-cols-2 gap-2 pl-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ssh-host">SSH Host</Label>
            <Input
              id="ssh-host"
              value={value.host}
              onChange={(e) =>
                onChange((s) => ({ ...s, host: e.target.value }))
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ssh-port">SSH Port</Label>
            <Input
              id="ssh-port"
              type="number"
              value={value.port}
              onChange={(e) =>
                onChange((s) => ({
                  ...s,
                  port: Number.parseInt(e.target.value, 10) || 22,
                }))
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ssh-user">SSH User</Label>
            <Input
              id="ssh-user"
              value={value.user}
              onChange={(e) =>
                onChange((s) => ({ ...s, user: e.target.value }))
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ssh-auth">Auth Method</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={
                  value.authMethod === "password" ? "default" : "outline"
                }
                size="sm"
                className="flex-1"
                onClick={() =>
                  onChange((s) => ({ ...s, authMethod: "password" }))
                }
              >
                Password
              </Button>
              <Button
                type="button"
                variant={
                  value.authMethod === "privateKey" ? "default" : "outline"
                }
                size="sm"
                className="flex-1"
                onClick={() =>
                  onChange((s) => ({ ...s, authMethod: "privateKey" }))
                }
              >
                Key
              </Button>
            </div>
          </div>
          {value.authMethod === "password" && (
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="ssh-password">SSH Password</Label>
              <Input
                id="ssh-password"
                type="password"
                value={value.password ?? ""}
                onChange={(e) =>
                  onChange((s) => ({ ...s, password: e.target.value }))
                }
              />
            </div>
          )}
          {value.authMethod === "privateKey" && (
            <>
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="ssh-key">Private key file</Label>
                <div className="flex gap-2">
                  <Input
                    id="ssh-key"
                    className="font-mono text-xs"
                    placeholder="Select a private key file"
                    value={value.privateKeyPath ?? ""}
                    onChange={(e) =>
                      onChange((s) => ({
                        ...s,
                        privateKeyPath: e.target.value,
                      }))
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleBrowsePrivateKey}
                  >
                    <FileSearch className="size-4" />
                    Browse
                  </Button>
                </div>
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="ssh-passphrase">Passphrase</Label>
                <Input
                  id="ssh-passphrase"
                  type="password"
                  value={value.passphrase ?? ""}
                  onChange={(e) =>
                    onChange((s) => ({ ...s, passphrase: e.target.value }))
                  }
                />
              </div>
            </>
          )}
        </div>
      )}
    </fieldset>
  );
}
