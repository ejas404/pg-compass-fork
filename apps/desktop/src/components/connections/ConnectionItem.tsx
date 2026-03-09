import { useEffect, useState } from 'react';
import {
  ChevronRight,
  Database,
  Edit,
  Folder,
  Loader2,
  Plug,
  Star,
  Table2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useConnections } from '@/hooks/use-connections';
import { useSettings } from '@/hooks/use-settings';
import type {
  ConnectionConfig,
  DatabaseSchema,
} from '@/shared/types/connection';

interface ConnectionItemProps {
  connection: ConnectionConfig;
  onEdit: (connection: ConnectionConfig) => void;
}

export function ConnectionItem({ connection, onEdit }: Readonly<ConnectionItemProps>) {
  const { remove, toggleFavourite, testConnection, getSchemaTree } = useConnections();
  const { settings } = useSettings();
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [schemasLoading, setSchemasLoading] = useState(false);
  const [schemas, setSchemas] = useState<DatabaseSchema[]>([]);
  const [expandedSchemas, setExpandedSchemas] = useState<Record<string, boolean>>({});
  const [hovered, setHovered] = useState(false);
  const includeInternalSchemas = !settings.general.hideInternalSchemas;

  useEffect(() => {
    if (!connected || !expanded) {
      return;
    }

    let disposed = false;

    async function reloadSchemaTree() {
      setSchemasLoading(true);
      const result = await getSchemaTree(connection.id, { includeInternalSchemas });

      if (disposed) {
        return;
      }

      setSchemasLoading(false);

      if (result.ok && result.data) {
        setSchemas(result.data);
        setExpandedSchemas({});
      } else {
        toast.error(`Failed to load schemas for "${connection.label}"`, {
          description: result.error,
        });
      }
    }

    void reloadSchemaTree();

    return () => {
      disposed = true;
    };
  }, [
    includeInternalSchemas,
    connected,
    expanded,
    connection.id,
    connection.label,
    getSchemaTree,
  ]);

  async function handleConnect() {
    setConnecting(true);
    // Verify we can reach the server before marking this item as connected.
    const result = await testConnection(connection.id);
    setConnecting(false);

    if (result.ok) {
      setConnected(true);
      toast.success(`Connected to "${connection.label}"`);
    } else {
      toast.error(`Failed to connect to "${connection.label}"`, {
        description: result.error,
      });
    }
  }

  async function handleExpand() {
    if (!connected) return;

    const willExpand = !expanded;
    setExpanded(willExpand);

    if (willExpand && !schemasLoading && schemas.length === 0) {
      setSchemasLoading(true);
      const result = await getSchemaTree(connection.id, { includeInternalSchemas });
      setSchemasLoading(false);

      if (result.ok && result.data) {
        setSchemas(result.data);
      } else {
        toast.error(`Failed to load schemas for "${connection.label}"`, {
          description: result.error,
        });
      }
    }
  }

  function toggleSchema(schemaName: string) {
    setExpandedSchemas((prev) => ({
      ...prev,
      [schemaName]: !prev[schemaName],
    }));
  }

  function renderSchemaTree() {
    if (schemasLoading) {
      return (
        <>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-28" />
        </>
      );
    }

    if (schemas.length === 0) {
      return (
        <span className="text-xs text-muted-foreground">
          No user schemas with tables found.
        </span>
      );
    }

    return schemas.map((schema) => {
      const schemaExpanded = expandedSchemas[schema.name] ?? false;

      return (
        <div key={schema.name} className="flex flex-col gap-0.5">
          <button
            type="button"
            className="flex items-center gap-1 rounded-sm px-1 py-0.5 text-left text-xs hover:bg-sidebar-accent"
            onClick={() => toggleSchema(schema.name)}
            aria-label={schemaExpanded ? `Collapse schema ${schema.name}` : `Expand schema ${schema.name}`}
          >
            <ChevronRight
              className={cn(
                'size-3 text-muted-foreground transition-transform duration-200',
                schemaExpanded && 'rotate-90',
              )}
            />
            <Folder className="size-3 text-muted-foreground" />
            <span className="truncate">{schema.name}</span>
            <span className="ml-auto text-[10px] text-muted-foreground">
              {schema.tables.length}
            </span>
          </button>

          {schemaExpanded && (
            <div className="ml-3 flex flex-col gap-0.5 border-l border-sidebar-border pl-2">
              {schema.tables.map((tableName) => (
                <button
                  key={`${schema.name}.${tableName}`}
                  type="button"
                  className="flex items-center gap-1 rounded-sm px-1 py-0.5 text-left text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                  aria-label={`Table ${tableName}`}
                >
                  <Table2 className="size-3" />
                  <span className="truncate">{tableName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      );
    });
  }

  async function handleDelete() {
    const ok = await remove(connection.id);
    if (ok) {
      toast.success(`Deleted "${connection.label}"`);
    }
  }

  return (
    <div className="group/connection flex flex-col">
      {/* Connection row */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className="relative flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-sidebar-accent"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Color indicator */}
        {connection.color && (
          <div
            className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full"
            style={{ backgroundColor: connection.color }}
          />
        )}

        {/* Expand arrow (only when connected) */}
        <button
          type="button"
          className={cn(
            'flex size-4 shrink-0 items-center justify-center',
            connected
              ? 'cursor-pointer text-muted-foreground hover:text-foreground'
              : 'invisible',
          )}
          onClick={handleExpand}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <ChevronRight
            className={cn(
              'size-3 transition-transform duration-200',
              expanded && 'rotate-90',
            )}
          />
        </button>

        {/* Icon + label */}
        <Database className="size-4 shrink-0 text-muted-foreground" />
        <span
          className="flex-1 truncate text-sm"
          style={connection.color ? { color: connection.color } : undefined}
        >
          {connection.label}
        </span>

        {/* Favourite indicator */}
        {connection.favourite && !hovered && (
          <Star className="size-3 shrink-0 fill-yellow-500 text-yellow-500" />
        )}

        {/* Actions on hover */}
        {hovered && (
          <div className="flex items-center gap-0.5">
            {!connected && !connecting && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={handleConnect}
                    aria-label="Connect"
                  >
                    <Plug className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Connect</TooltipContent>
              </Tooltip>
            )}
            {connecting && (
              <Loader2 className="size-3 animate-spin text-muted-foreground" />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  aria-label="More actions"
                >
                  <span className="text-xs leading-none">⋯</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => onEdit(connection)}>
                  <Edit className="mr-2 size-3" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleFavourite(connection.id)}>
                  <Star className="mr-2 size-3" />
                  {connection.favourite ? 'Unfavourite' : 'Favourite'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="mr-2 size-3" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Expandable schema/table tree */}
      {connected && expanded && (
        <div className="ml-6 flex flex-col gap-1 py-1 pl-4">
          {renderSchemaTree()}
        </div>
      )}
    </div>
  );
}
