import type { ReactNode } from 'react';

/**
 * A renderer for a specific PostgreSQL data type.
 * Implements the Strategy pattern for extensible type rendering.
 */
export interface TypeRenderer {
  /** Compact rendering for table cells. */
  renderCell(value: unknown): ReactNode;
  /** Expanded rendering for card view fields. */
  renderCard(value: unknown): ReactNode;
}

/**
 * Central registry for type renderers.
 * Open for extension (register new renderers) without modifying existing code.
 */
class TypeRendererRegistry {
  private readonly renderers = new Map<string, TypeRenderer>();
  private readonly fallback: TypeRenderer;

  constructor(fallback: TypeRenderer) {
    this.fallback = fallback;
  }

  /** Register a renderer for a PostgreSQL type name. */
  register(pgType: string, renderer: TypeRenderer): void {
    this.renderers.set(pgType, renderer);
  }

  /** Register a single renderer for multiple type names. */
  registerMany(pgTypes: string[], renderer: TypeRenderer): void {
    for (const t of pgTypes) {
      this.renderers.set(t, renderer);
    }
  }

  /** Retrieve the renderer for a given type, falling back to the default. */
  get(pgType: string): TypeRenderer {
    return this.renderers.get(pgType) ?? this.fallback;
  }

  /** Check if a renderer is explicitly registered for this type. */
  has(pgType: string): boolean {
    return this.renderers.has(pgType);
  }
}

// Singleton fallback renderer — renders as string
const defaultFallback: TypeRenderer = {
  renderCell(value: unknown) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value as string | number | boolean);
  },
  renderCard(value: unknown) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value as string | number | boolean);
  },
};

/** The global type renderer registry instance. */
export const typeRegistry = new TypeRendererRegistry(defaultFallback);
