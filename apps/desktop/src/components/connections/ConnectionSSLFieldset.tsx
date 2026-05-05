import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SSLConfig } from '@/shared/types/connection';

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
          onChange={(e) => onChange((s) => ({ ...s, enabled: e.target.checked }))}
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
                onChange((s) => ({ ...s, rejectUnauthorized: e.target.checked }))
              }
            />
            <Label htmlFor="ssl-reject">Reject unauthorized certificates</Label>
          </div>
          <PathField
            id="ssl-ca"
            label="CA Certificate path"
            placeholder="/path/to/ca.pem"
            value={value.ca ?? ''}
            onChange={(v) => onChange((s) => ({ ...s, ca: v }))}
          />
          <PathField
            id="ssl-cert"
            label="Client Certificate path"
            placeholder="/path/to/cert.pem"
            value={value.cert ?? ''}
            onChange={(v) => onChange((s) => ({ ...s, cert: v }))}
          />
          <PathField
            id="ssl-key"
            label="Client Key path"
            placeholder="/path/to/key.pem"
            value={value.key ?? ''}
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
  value: string;
  onChange: (value: string) => void;
}

function PathField({ id, label, placeholder, value, onChange }: Readonly<PathFieldProps>) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        className="font-mono text-xs"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
