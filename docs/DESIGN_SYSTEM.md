# Design System

PG Compass uses **Tailwind CSS v4** and **shadcn/ui** (New York style, neutral base) for all UI components and styling. This document defines the visual language, component patterns, and design constraints for the application.

---

## Principles

1. **Data-first**: UI exists to serve the data. Maximize space for tables, rows, and query results. Decorative elements are avoided.
2. **Minimal chrome**: Borders, shadows, and ornamentation are used sparingly. The interface should feel quiet and let content speak.
3. **Consistent density**: The app is a professional tool. Use compact spacing (small/xs button sizes, tight padding) without feeling cramped.
4. **Keyboard-friendly**: All interactive elements must be focusable and operable via keyboard. Focus rings are always visible.

---

## Dark Mode

PG Compass defaults to **dark mode** and applies it via the `dark` class on the root app container. This is a class-based strategy (`&:is(.dark *)`) — not system-preference based.

All color references should use semantic tokens (e.g., `bg-background`, `text-foreground`, `border-border`) which automatically resolve to the correct palette based on the active theme.

Light mode is supported but secondary. The dark palette is the primary design target.

---

## Color Palette

We use shadcn/ui's **neutral** base color in oklch. All colors are exposed as CSS custom properties and mapped through Tailwind's `@theme` block.

### Semantic Tokens

| Token                  | Usage                                          |
| ---------------------- | ---------------------------------------------- |
| `background`           | Page/app background                            |
| `foreground`           | Primary text color                             |
| `card` / `card-fg`     | Card surfaces and their text                   |
| `muted` / `muted-fg`   | Subdued backgrounds, secondary text            |
| `accent` / `accent-fg` | Hover states, active highlights                |
| `primary` / `primary-fg`| Primary actions (buttons, links)              |
| `secondary` / `secondary-fg` | Secondary actions                        |
| `destructive`          | Danger/delete actions                          |
| `border`               | Borders and dividers                           |
| `input`                | Form input borders                             |
| `ring`                 | Focus ring color                               |
| `sidebar-*`            | Sidebar-specific variants                      |

### Connection Colors

Each saved connection can have an optional user-chosen accent color. This color is used as a subtle left-border or indicator dot on:
- The sidebar connection item
- Tab headers belonging to that connection

Use inline styles for per-connection colors. Do not create Tailwind classes for them.

---

## Typography

| Role        | Class                     | Usage                              |
| ----------- | ------------------------- | ---------------------------------- |
| Heading     | `text-lg font-semibold`   | Section titles, empty states       |
| Subheading  | `text-sm font-semibold`   | Sidebar headers, card titles       |
| Body        | `text-sm`                 | Default text, descriptions         |
| Caption     | `text-xs text-muted-foreground` | Hints, timestamps, metadata  |
| Monospace   | `font-mono text-sm`       | SQL, connection strings, code      |

### Font Stack

- **Sans**: Inter → system-ui fallback
- **Mono**: JetBrains Mono → system monospace fallback

Both are defined in the Tailwind `@theme` block. No external font loading is required — the system fallback chain ensures zero layout shift.

---

## Spacing & Layout

The app uses a **fixed two-panel layout**:

```
┌─────────────┬────────────────────────────────────┐
│  Sidebar    │  Workspace                         │
│  (256px)    │  (flex-1)                           │
│             │  ┌──────────────────────────────┐   │
│  Connections│  │ Tab Bar (40px)               │   │
│  Tree View  │  ├──────────────────────────────┤   │
│             │  │                              │   │
│             │  │ Tab Content                  │   │
│             │  │                              │   │
│             │  └──────────────────────────────┘   │
└─────────────┴────────────────────────────────────┘
```

- **Sidebar width**: `w-64` (256px), non-collapsible in v1.
- **Tab bar height**: `h-10` (40px).
- **Content padding**: `p-4` for content areas, `p-3` for sidebar sections.
- **Gap between elements**: `gap-2` (8px) default, `gap-4` (16px) between sections.

---

## Components

### From shadcn/ui

These are installed and available in `@/components/ui/`:

| Component       | Primary Use                                       |
| --------------- | ------------------------------------------------- |
| `Button`        | All clickable actions                             |
| `Tabs`          | Table viewer sub-tabs (Data, Structure, etc.)     |
| `ScrollArea`    | Sidebar scrollable content                        |
| `Tooltip`       | Hover hints for icon buttons                      |
| `Separator`     | Visual dividers                                   |
| `Input`         | Form fields (connection form, filters)            |
| `Table`         | Data display (table listing, data viewer)         |
| `Badge`         | Status indicators (column types, index types)     |
| `Dialog`        | Modals (connection form, confirmations)           |
| `Sheet`         | Slide-over panels                                 |
| `DropdownMenu`  | Context menus, action menus                       |
| `Accordion`     | Sidebar connection/schema tree expansion           |
| `Sidebar`       | Sidebar primitives (available for future use)     |
| `Skeleton`      | Loading placeholders                              |

### Button Conventions

- **Primary actions**: `variant="default"` (solid filled).
- **Secondary actions**: `variant="outline"` or `variant="secondary"`.
- **Destructive actions**: `variant="destructive"` (disconnect, delete).
- **Toolbar/icon buttons**: `variant="ghost"` with `size="icon-sm"`.
- **In-table actions**: `variant="ghost"` with `size="xs"`.

### Table Conventions

- Use shadcn `Table` components for all data grids.
- Row hover: `hover:bg-muted/50`.
- Selected row: `bg-accent`.
- Fixed header: The `TableHeader` should stick to the top of the scroll container.
- Monospace for data values: Apply `font-mono` to `TableCell` containing data.

---

## Patterns

### Empty States

Empty states use a centered layout with:
- A muted icon in a rounded container (`rounded-xl bg-muted p-4`)
- A heading (`text-lg font-semibold`)
- A description (`text-sm text-muted-foreground`)

### Loading States

- Use `Skeleton` components from shadcn for loading placeholders.
- Match the skeleton shape to the expected content (rows for tables, blocks for cards).

### Tab Bar

The workspace tab bar sits at the top of the main area. Each tab shows:
- The item name (table or query)
- A close button on hover
- An optional connection color indicator (left dot or border)

Tabs use `text-xs` labels and `h-10` height.

### Sidebar Tree

The sidebar connection tree uses nested `Accordion` items:
- **Level 0**: Connection (with optional color dot + label)
- **Level 1**: Schema name
- **Level 2**: Table name

Each level increases left padding by `pl-4` for visual hierarchy.

---

## Iconography

All icons come from **Lucide React** (`lucide-react`). Defaults:
- Size: `size-4` (16px) for inline, `size-5` (20px) for standalone.
- Color: Inherits from `currentColor`.
- No icon-only buttons without a `Tooltip` or `aria-label`.

---

## Borders & Radius

- **Border color**: `border-border` (resolves to the theme's border token).
- **Border radius**: `rounded-md` for buttons and inputs, `rounded-lg` for cards and containers.
- **Dividers**: Use `Separator` component or `border-b border-border`.

---

## Accessibility

- All interactive components must have visible focus indicators (handled by shadcn defaults).
- Color is never the sole indicator of state — always pair with text or icons.
- Minimum touch target: 32px (`size-8`).
- Tooltips on all icon-only buttons.
- Screen reader labels (`aria-label`) on buttons without visible text.
