import Store from 'electron-store';
import { randomUUID } from 'node:crypto';
import type {
  ConnectionConfig,
  ConnectionInput,
} from '../shared/types/connection';

interface StoreSchema {
  connections: ConnectionConfig[];
}

const store = new Store<StoreSchema>({
  name: 'connections',
  defaults: {
    connections: [],
  },
});

/** Get all saved connections. */
export function getAllConnections(): ConnectionConfig[] {
  return store.get('connections');
}

/** Get a single connection by ID. */
export function getConnectionById(
  id: string,
): ConnectionConfig | undefined {
  const connections = store.get('connections');
  return connections.find((c) => c.id === id);
}

/** Create a new connection and return it. */
export function createConnection(
  input: ConnectionInput,
): ConnectionConfig {
  const connection: ConnectionConfig = {
    ...input,
    id: randomUUID(),
  };
  const connections = store.get('connections');
  connections.push(connection);
  store.set('connections', connections);
  return connection;
}

/** Update an existing connection by ID. Returns the updated connection or undefined. */
export function updateConnection(
  id: string,
  input: ConnectionInput,
): ConnectionConfig | undefined {
  const connections = store.get('connections');
  const index = connections.findIndex((c) => c.id === id);
  if (index === -1) return undefined;

  const updated: ConnectionConfig = { ...input, id };
  connections[index] = updated;
  store.set('connections', connections);
  return updated;
}

/** Delete a connection by ID. Returns true if deleted. */
export function deleteConnection(id: string): boolean {
  const connections = store.get('connections');
  const filtered = connections.filter((c) => c.id !== id);
  if (filtered.length === connections.length) return false;
  store.set('connections', filtered);
  return true;
}

/** Toggle the favourite status of a connection. Returns the updated connection or undefined. */
export function toggleFavourite(
  id: string,
): ConnectionConfig | undefined {
  const connections = store.get('connections');
  const index = connections.findIndex((c) => c.id === id);
  if (index === -1) return undefined;

  connections[index].favourite = !connections[index].favourite;
  store.set('connections', connections);
  return connections[index];
}
