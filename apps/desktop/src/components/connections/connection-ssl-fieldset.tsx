import { useEffect, useState } from "react";
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
      <Label
        htmlFor="ssl-enabled"
        className="flex min-h-8 cursor-pointer items-center gap-2"
      >
        <input
          id="ssl-enabled"
          type="checkbox"
          className="size-4 accent-primary"
          checked={value.enabled}
          onChange={(e) =>
            onChange((s) => ({ ...s, enabled: e.target.checked }))
          }
        />
        <span>Enable SSL</span>
      </Label>
      {value.enabled && (
        <div className="flex flex-col gap-2 pl-6">
          <Label
            htmlFor="ssl-reject"
            className="flex min-h-8 cursor-pointer items-center gap-2"
          >
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
            <span>Reject unauthorized certificates</span>
          </Label>
          <CaField
            source={value.caSource ?? "file"}
            value={value.ca ?? ""}
            onSourceChange={(source) =>
              onChange((s) => ({ ...s, caSource: source.type, ca: source.ca }))
            }
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

interface CaFieldProps {
  source: "file" | "inline";
  value: string;
  onSourceChange: (source: { type: "file" | "inline"; ca: string }) => void;
  onChange: (value: string) => void;
}

function CaField({
  source,
  value,
  onSourceChange,
  onChange,
}: Readonly<CaFieldProps>) {
  const [fileValue, setFileValue] = useState(source === "file" ? value : "");
  const [inlineValue, setInlineValue] = useState(
    source === "inline" ? value : "",
  );

  useEffect(() => {
    if (source === "file") {
      setFileValue(value);
    } else {
      setInlineValue(value);
    }
  }, [source, value]);

  function handleSourceChange(nextSource: "file" | "inline") {
    const nextValue = nextSource === "file" ? fileValue : inlineValue;
    onSourceChange({ type: nextSource, ca: nextValue });
  }

  function handleValueChange(nextValue: string) {
    if (source === "file") {
      setFileValue(nextValue);
    } else {
      setInlineValue(nextValue);
    }
    onChange(nextValue);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={source === "file" ? "ssl-ca-file" : "ssl-ca-inline"}>
          CA certificate
        </Label>
        <div
          role="group"
          aria-label="CA certificate source"
          className="inline-flex h-8 items-center rounded-lg bg-muted p-[3px]"
        >
          <Button
            type="button"
            size="sm"
            variant={source === "file" ? "secondary" : "ghost"}
            className="h-8 px-3 text-xs"
            aria-pressed={source === "file"}
            onClick={() => handleSourceChange("file")}
          >
            File
          </Button>
          <Button
            type="button"
            size="sm"
            variant={source === "inline" ? "secondary" : "ghost"}
            className="h-8 px-3 text-xs"
            aria-pressed={source === "inline"}
            onClick={() => handleSourceChange("inline")}
          >
            Inline
          </Button>
        </div>
      </div>

      {source === "file" ? (
        <PathInput
          id="ssl-ca-file"
          placeholder="Select a CA bundle, if required"
          dialogTitle="Select CA certificate"
          value={value}
          onChange={handleValueChange}
        />
      ) : (
        <textarea
          id="ssl-ca-inline"
          className="min-h-24 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Paste PEM text or base64-encoded PEM contents"
          value={value}
          onChange={(e) => handleValueChange(e.target.value)}
        />
      )}
      <p className="text-xs text-muted-foreground">
        Use Inline to paste the value of provider variables like
        POSTGRES_SSL_CA.
      </p>
    </div>
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
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <PathInput
        id={id}
        placeholder={placeholder}
        dialogTitle={dialogTitle}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

interface PathInputProps {
  id: string;
  placeholder: string;
  dialogTitle: string;
  value: string;
  onChange: (value: string) => void;
}

function PathInput({
  id,
  placeholder,
  dialogTitle,
  value,
  onChange,
}: Readonly<PathInputProps>) {
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
    <div className="flex gap-2">
      <Input
        id={id}
        className="font-mono text-xs"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <Button type="button" variant="outline" size="sm" onClick={handleBrowse}>
        <FileSearch className="size-4" />
        Browse
      </Button>
    </div>
  );
}
