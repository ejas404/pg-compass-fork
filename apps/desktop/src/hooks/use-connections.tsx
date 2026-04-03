import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  ConnectionConfig,
  ConnectionInput,
  DatabaseSchema,
  SchemaTreeOptions,
} from '@/shared/types/connection';

interface ConnectionContextValue {
  connections: ConnectionConfig[];
  loading: boolean;
  /** Reload connections from the store. */
  refresh: () => Promise<void>;
  /** Create a new connection and refresh the list. */
  create: (input: ConnectionInput) => Promise<ConnectionConfig | null>;
  /** Update an existing connection and refresh the list. */
  update: (id: string, input: ConnectionInput) => Promise<ConnectionConfig | null>;
  /** Delete a connection and refresh the list. */
  remove: (id: string) => Promise<boolean>;
  /** Toggle favourite status and refresh the list. */
  toggleFavourite: (id: string) => Promise<void>;
  /** Test a connection. Returns true if successful, or an error string. */
  testConnection: (id: string) => Promise<{ ok: boolean; error?: string }>;
  /** Fetch schemas and tables for a connected database. */
  getSchemaTree: (
    id: string,
    options?: SchemaTreeOptions,
  ) => Promise<{ ok: boolean; data?: DatabaseSchema[]; error?: string }>;
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

export function ConnectionProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [connections, setConnections] = useState<ConnectionConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const result = await globalThis.window.connectionApi.getAll();
    if (result.success && result.data) {
      setConnections(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(function loadConnections() {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: ConnectionInput): Promise<ConnectionConfig | null> => {
      const result = await globalThis.window.connectionApi.create(input);
      if (result.success && result.data) {
        await refresh();
        return result.data;
      }
      return null;
    },
    [refresh],
  );

  const update = useCallback(
    async (id: string, input: ConnectionInput): Promise<ConnectionConfig | null> => {
      const result = await globalThis.window.connectionApi.update(id, input);
      if (result.success && result.data) {
        await refresh();
        return result.data;
      }
      return null;
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      const result = await globalThis.window.connectionApi.delete(id);
      if (result.success) {
        await refresh();
        return true;
      }
      return false;
    },
    [refresh],
  );

  const toggleFavourite = useCallback(
    async (id: string): Promise<void> => {
      await globalThis.window.connectionApi.toggleFavourite(id);
      await refresh();
    },
    [refresh],
  );

  const testConnection = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      const result = await globalThis.window.connectionApi.test(id);
      if (result.success) return { ok: true };
      return { ok: false, error: result.error };
    },
    [],
  );

  const getSchemaTree = useCallback(
    async (
      id: string,
      options?: SchemaTreeOptions,
    ): Promise<{ ok: boolean; data?: DatabaseSchema[]; error?: string }> => {
      const result = await globalThis.window.connectionApi.getSchemaTree(
        id,
        options,
      );
      if (result.success && result.data) return { ok: true, data: result.data };
      return { ok: false, error: result.error };
    },
    [],
  );

  const value = useMemo(
    () => ({
      connections,
      loading,
      refresh,
      create,
      update,
      remove,
      toggleFavourite,
      testConnection,
      getSchemaTree,
    }),
    [
      connections,
      loading,
      refresh,
      create,
      update,
      remove,
      toggleFavourite,
      testConnection,
      getSchemaTree,
    ],
  );

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnections(): ConnectionContextValue {
  const ctx = useContext(ConnectionContext);
  if (!ctx) throw new Error('useConnections must be used within ConnectionProvider');
  return ctx;
}
