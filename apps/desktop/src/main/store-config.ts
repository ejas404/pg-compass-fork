interface StoreConfigOptions {
  name: string;
}

export function resolveStoreOptions({ name }: StoreConfigOptions): {
  name: string;
  cwd?: string;
} {
  const cwd = process.env.PG_COMPASS_STORE_DIR?.trim();

  if (!cwd) {
    return { name };
  }

  return {
    name,
    cwd,
  };
}
