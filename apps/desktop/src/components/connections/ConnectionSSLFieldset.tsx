import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileSearch } from "lucide-react";
import type { SSLConfig } from "@/shared/types/connection";

interface ConnectionSSLFieldsetProps {
  value: SSLConfig;
  onChange: (updater: (s: SSLConfig) => SSLConfig) => void;
}

export function ConnectionSSLFieldset({
  value,
  onChange,
}: Readonly<ConnectionSSLFieldsetProps>) {
  return (
    <fieldset className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-2">
        <input
          id="ssl-enabled"
          type="checkbox"
          className="size-4 accent-primary"
          checked={value.enabled}
          onChange={(e) =>
            onChange((s) => ({ ...s, enabled: e.target.checked }))
          }
        />
        <Label htmlFor="ssl-enabled">Enable SSL</Label>
      </div>
      {value.enabled && (
        <div className="flex flex-col gap-2 pl-6">
          <div className="flex items-center gap-2">
            <input
              id="ssl-reject"
              type="checkbox"
              className="size-4 accent-primary"
              checked={value.rejectUnauthorized ?? true}
              onChange={(e) =>
                onChange((s) => ({
                  ...s,
                  rejectUnauthorized: e.target.checked,
                }))
              }
            />
            <Label htmlFor="ssl-reject">Reject unauthorized certificates</Label>
          </div>
          <PathField
            id="ssl-ca"
            label="CA certificate file"
            placeholder="Select a CA bundle, if required"
            dialogTitle="Select CA certificate"
            value={value.ca ?? ""}
            onChange={(v) => onChange((s) => ({ ...s, ca: v }))}
          />
          <PathField
            id="ssl-cert"
            label="Client certificate file"
            placeholder="Select a client certificate, if required"
            dialogTitle="Select client certificate"
            value={value.cert ?? ""}
            onChange={(v) => onChange((s) => ({ ...s, cert: v }))}
          />
          <PathField
            id="ssl-key"
            label="Client key file"
            placeholder="Select a client key, if required"
            dialogTitle="Select client key"
            value={value.key ?? ""}
            onChange={(v) => onChange((s) => ({ ...s, key: v }))}
          />
        </div>
      )}
    </fieldset>
  );
}

interface PathFieldProps {
  id: string;
  label: string;
  placeholder: string;
  dialogTitle: string;
  value: string;
  onChange: (value: string) => void;
}

function PathField({
  id,
  label,
  placeholder,
  dialogTitle,
  value,
  onChange,
}: Readonly<PathFieldProps>) {
  async function handleBrowse() {
    const result = await globalThis.window.connectionApi.showOpenFileDialog({
      title: dialogTitle,
      defaultPath: value || undefined,
      filters: [
        {
          name: "Certificate and key files",
          extensions: ["pem", "crt", "cer", "key"],
        },
        { name: "All files", extensions: ["*"] },
      ],
    });
    if (result.success && result.data) {
      onChange(result.data);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          className="font-mono text-xs"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleBrowse}
        >
          <FileSearch className="size-4" />
          Browse
        </Button>
      </div>
    </div>
  );
}
