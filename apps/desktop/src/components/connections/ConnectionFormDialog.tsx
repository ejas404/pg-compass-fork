import { useState, useEffect, type FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConnections } from '@/hooks/use-connections';
import type {
  ConnectionConfig,
  ConnectionInput,
  ConnectionFields,
  SSLConfig,
  SSHConfig,
} from '@/shared/types/connection';

/** Predefined color palette for connection identification. */
const COLOR_OPTIONS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
];

interface ConnectionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass a connection to edit; leave undefined for create mode. */
  editConnection?: ConnectionConfig;
}

const defaultFields: ConnectionFields = {
  host: 'localhost',
  port: 5432,
  database: '',
  user: 'postgres',
  password: '',
};

const defaultSSL: SSLConfig = {
  enabled: false,
  rejectUnauthorized: true,
  ca: '',
  cert: '',
  key: '',
};

const defaultSSH: SSHConfig = {
  enabled: false,
  host: '',
  port: 22,
  user: '',
  authMethod: 'password',
  password: '',
  privateKeyPath: '',
  passphrase: '',
};

export function ConnectionFormDialog({
  open,
  onOpenChange,
  editConnection,
}: Readonly<ConnectionFormDialogProps>) {
  const { create, update } = useConnections();
  const isEdit = !!editConnection;

  // Form state
  const [label, setLabel] = useState('');
  const [color, setColor] = useState<string | undefined>(undefined);
  const [mode, setMode] = useState<'uri' | 'fields'>('uri');
  const [uri, setUri] = useState('');
  const [fields, setFields] = useState<ConnectionFields>({ ...defaultFields });
  const [ssl, setSsl] = useState<SSLConfig>({ ...defaultSSL });
  const [ssh, setSsh] = useState<SSHConfig>({ ...defaultSSH });
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (!open) return;

    if (editConnection) {
      setLabel(editConnection.label);
      setColor(editConnection.color);
      setMode(editConnection.mode);
      setUri(editConnection.uri ?? '');
      setFields(editConnection.fields ?? { ...defaultFields });
      setSsl(editConnection.ssl ?? { ...defaultSSL });
      setSsh(editConnection.ssh ?? { ...defaultSSH });
      setAdvancedOpen(
        !!(editConnection.ssl?.enabled || editConnection.ssh?.enabled),
      );
    } else {
      // Reset for create
      setLabel('');
      setColor(undefined);
      setMode('uri');
      setUri('');
      setFields({ ...defaultFields });
      setSsl({ ...defaultSSL });
      setSsh({ ...defaultSSH });
      setAdvancedOpen(false);
    }
  }, [open, editConnection]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);

    const input: ConnectionInput = {
      label: label.trim() || 'Untitled Connection',
      color: color || undefined,
      favourite: editConnection?.favourite ?? false,
      mode,
      uri: mode === 'uri' ? uri : undefined,
      fields: mode === 'fields' ? fields : undefined,
      ssl: ssl.enabled ? ssl : undefined,
      ssh: ssh.enabled ? ssh : undefined,
    };

    if (isEdit && editConnection) {
      await update(editConnection.id, input);
    } else {
      await create(input);
    }

    setSaving(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Connection' : 'New Connection'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the connection details below.'
              : 'Enter the details for your PostgreSQL connection.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Label */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="conn-label">Label</Label>
            <Input
              id="conn-label"
              placeholder="My Database"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          {/* Color */}
          <div className="flex flex-col gap-1.5">
            <Label>Color</Label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cn(
                    'size-6 rounded-full border-2 transition-transform hover:scale-110',
                    color === c
                      ? 'border-foreground scale-110'
                      : 'border-transparent',
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(color === c ? undefined : c)}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Mode toggle */}
          <div className="flex flex-col gap-1.5">
            <Label>Connection Mode</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === 'uri' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('uri')}
              >
                URI
              </Button>
              <Button
                type="button"
                variant={mode === 'fields' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('fields')}
              >
                Individual Fields
              </Button>
            </div>
          </div>

          {/* URI input */}
          {mode === 'uri' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="conn-uri">Connection URI</Label>
              <Input
                id="conn-uri"
                placeholder="postgresql://user:password@localhost:5432/mydb"
                className="font-mono text-sm"
                value={uri}
                onChange={(e) => setUri(e.target.value)}
              />
            </div>
          )}

          {/* Individual fields */}
          {mode === 'fields' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="conn-host">Host</Label>
                <Input
                  id="conn-host"
                  placeholder="localhost"
                  value={fields.host}
                  onChange={(e) =>
                    setFields((f) => ({ ...f, host: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="conn-port">Port</Label>
                <Input
                  id="conn-port"
                  type="number"
                  placeholder="5432"
                  value={fields.port}
                  onChange={(e) =>
                    setFields((f) => ({
                      ...f,
                      port: Number.parseInt(e.target.value, 10) || 5432,
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="conn-database">Database</Label>
                <Input
                  id="conn-database"
                  placeholder="postgres"
                  value={fields.database}
                  onChange={(e) =>
                    setFields((f) => ({ ...f, database: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="conn-user">User</Label>
                <Input
                  id="conn-user"
                  placeholder="postgres"
                  value={fields.user}
                  onChange={(e) =>
                    setFields((f) => ({ ...f, user: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="conn-password">Password</Label>
                <Input
                  id="conn-password"
                  type="password"
                  value={fields.password}
                  onChange={(e) =>
                    setFields((f) => ({ ...f, password: e.target.value }))
                  }
                />
              </div>
            </div>
          )}

          {/* Advanced Configuration */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-between"
              >
                <span>Advanced Configuration</span>
                <ChevronDown
                  className={cn(
                    'size-4 transition-transform duration-200',
                    advancedOpen && 'rotate-180',
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="flex flex-col gap-4 pt-3">
              {/* SSL */}
              <fieldset className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2">
                  <input
                    id="ssl-enabled"
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={ssl.enabled}
                    onChange={(e) =>
                      setSsl((s) => ({ ...s, enabled: e.target.checked }))
                    }
                  />
                  <Label htmlFor="ssl-enabled">Enable SSL</Label>
                </div>
                {ssl.enabled && (
                  <div className="flex flex-col gap-2 pl-6">
                    <div className="flex items-center gap-2">
                      <input
                        id="ssl-reject"
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={ssl.rejectUnauthorized ?? true}
                        onChange={(e) =>
                          setSsl((s) => ({
                            ...s,
                            rejectUnauthorized: e.target.checked,
                          }))
                        }
                      />
                      <Label htmlFor="ssl-reject">
                        Reject unauthorized certificates
                      </Label>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="ssl-ca">CA Certificate path</Label>
                      <Input
                        id="ssl-ca"
                        className="font-mono text-xs"
                        placeholder="/path/to/ca.pem"
                        value={ssl.ca ?? ''}
                        onChange={(e) =>
                          setSsl((s) => ({ ...s, ca: e.target.value }))
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="ssl-cert">Client Certificate path</Label>
                      <Input
                        id="ssl-cert"
                        className="font-mono text-xs"
                        placeholder="/path/to/cert.pem"
                        value={ssl.cert ?? ''}
                        onChange={(e) =>
                          setSsl((s) => ({ ...s, cert: e.target.value }))
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="ssl-key">Client Key path</Label>
                      <Input
                        id="ssl-key"
                        className="font-mono text-xs"
                        placeholder="/path/to/key.pem"
                        value={ssl.key ?? ''}
                        onChange={(e) =>
                          setSsl((s) => ({ ...s, key: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                )}
              </fieldset>

              {/* SSH */}
              <fieldset className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2">
                  <input
                    id="ssh-enabled"
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={ssh.enabled}
                    onChange={(e) =>
                      setSsh((s) => ({ ...s, enabled: e.target.checked }))
                    }
                  />
                  <Label htmlFor="ssh-enabled">Enable SSH Tunnel</Label>
                </div>
                {ssh.enabled && (
                  <div className="grid grid-cols-2 gap-2 pl-6">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="ssh-host">SSH Host</Label>
                      <Input
                        id="ssh-host"
                        value={ssh.host}
                        onChange={(e) =>
                          setSsh((s) => ({ ...s, host: e.target.value }))
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="ssh-port">SSH Port</Label>
                      <Input
                        id="ssh-port"
                        type="number"
                        value={ssh.port}
                        onChange={(e) =>
                          setSsh((s) => ({
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
                        value={ssh.user}
                        onChange={(e) =>
                          setSsh((s) => ({ ...s, user: e.target.value }))
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="ssh-auth">Auth Method</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={
                            ssh.authMethod === 'password'
                              ? 'default'
                              : 'outline'
                          }
                          size="sm"
                          className="flex-1"
                          onClick={() =>
                            setSsh((s) => ({ ...s, authMethod: 'password' }))
                          }
                        >
                          Password
                        </Button>
                        <Button
                          type="button"
                          variant={
                            ssh.authMethod === 'privateKey'
                              ? 'default'
                              : 'outline'
                          }
                          size="sm"
                          className="flex-1"
                          onClick={() =>
                            setSsh((s) => ({ ...s, authMethod: 'privateKey' }))
                          }
                        >
                          Key
                        </Button>
                      </div>
                    </div>
                    {ssh.authMethod === 'password' && (
                      <div className="col-span-2 flex flex-col gap-1.5">
                        <Label htmlFor="ssh-password">SSH Password</Label>
                        <Input
                          id="ssh-password"
                          type="password"
                          value={ssh.password ?? ''}
                          onChange={(e) =>
                            setSsh((s) => ({ ...s, password: e.target.value }))
                          }
                        />
                      </div>
                    )}
                    {ssh.authMethod === 'privateKey' && (
                      <>
                        <div className="col-span-2 flex flex-col gap-1.5">
                          <Label htmlFor="ssh-key">Private Key path</Label>
                          <Input
                            id="ssh-key"
                            className="font-mono text-xs"
                            placeholder="~/.ssh/id_rsa"
                            value={ssh.privateKeyPath ?? ''}
                            onChange={(e) =>
                              setSsh((s) => ({
                                ...s,
                                privateKeyPath: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="col-span-2 flex flex-col gap-1.5">
                          <Label htmlFor="ssh-passphrase">Passphrase</Label>
                          <Input
                            id="ssh-passphrase"
                            type="password"
                            value={ssh.passphrase ?? ''}
                            onChange={(e) =>
                              setSsh((s) => ({
                                ...s,
                                passphrase: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </fieldset>
            </CollapsibleContent>
          </Collapsible>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Connection'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
