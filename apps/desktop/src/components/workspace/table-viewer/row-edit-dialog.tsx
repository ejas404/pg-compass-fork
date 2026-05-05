/**
 * Multi-field row editor — a dialog that lets the user edit any subset of a
 * row's columns and Save them as one atomic UPDATE.
 *
 * Composes over the Phase 1 edit registry: each column reuses its registered
 * `TypeEditor` for `toInput` / `validate` / `pgCast`, so type rules stay in a
 * single place. PK columns render read-only — Phase 2 does not allow PK
 * mutation.
 */

import { useMemo, useState, type ReactNode } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  editRegistry,
  type EditValidation,
  type TypeEditor,
} from "@/components/workspace/renderers/edit-registry";
import { ForeignKeyPicker } from "@/components/workspace/renderers/foreign-key-editor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ColumnInfo, UpdateRowFieldChange } from "@/shared/types/table-data";

const MULTILINE_TYPES = new Set([
  "json",
  "jsonb",
  "xml",
  "text",
  "_text",
  "_varchar",
  "_int2",
  "_int4",
  "_int8",
  // Phase 2 keeps modal-kind editors (geometry, geography) as plain WKT
  // textareas — the map editor remains the inline-cell entry point.
  "geometry",
  "geography",
]);

export interface RowEditDialogProps {
  columns: ColumnInfo[];
  row: Record<string, unknown>;
  primaryKey: string[];
  pkValues: unknown[];
  schema: string;
  table: string;
  connectionId: string;
  onRowUpdated: (row: Record<string, unknown>) => void;
  onClose: () => void;
}

interface FieldDraft {
  /** What the user has typed so far; absent in `drafts` means unchanged. */
  raw: string;
  /** When true, save with `setNull: true` regardless of `raw`. */
  setNull: boolean;
}

function makeEnumEditor(labels: string[], pgCast: string): TypeEditor {
  const labelSet = new Set(labels);
  return {
    kind: "inline",
    toInput(value) {
      if (value === null || value === undefined) return labels[0] ?? "";
      return String(value);
    },
    validate(raw) {
      if (!labelSet.has(raw)) {
        return { ok: false, error: `Not a valid value for ${pgCast}: ${raw}` };
      }
      return { ok: true, result: { value: raw, pgCast } };
    },
  };
}

/**
 * For FK columns the row-editor renders a dedicated picker (see `FieldEditor`),
 * but we still need a `TypeEditor` for `toInput` / `validate` / `pgCast` so
 * the diff machinery and Save path stay uniform.  This editor is a thin
 * adapter — it never round-trips through the picker.
 */
function makeFkRowEditor(pgCast: string): TypeEditor {
  return {
    kind: "inline",
    toInput: (value) =>
      value === null || value === undefined ? "" : String(value),
    validate: (raw) => {
      // The picker only ever writes well-typed strings into `raw`; we
      // forward them and let Postgres do the cast.  An empty raw means
      // "no pick yet" and is handled by the caller (it cannot become a
      // change because raw === initialInput).
      return { ok: true, result: { value: raw, pgCast } };
    },
  };
}

function editorFor(col: ColumnInfo): TypeEditor {
  if (col.foreignKey) {
    return makeFkRowEditor(col.foreignKey.valuePgCast);
  }
  if (col.enumLabels && col.enumLabels.length > 0) {
    return makeEnumEditor(
      col.enumLabels,
      col.enumPgCast ?? col.dataType,
    );
  }
  return editRegistry.get(col.dataType);
}

export function RowEditDialog(props: Readonly<RowEditDialogProps>) {
  const pkSet = useMemo(() => new Set(props.primaryKey), [props.primaryKey]);

  // Editable columns — PK columns shown but locked.
  const editableColumns = props.columns.filter((c) => !pkSet.has(c.name));

  const editors = useMemo(() => {
    const map = new Map<string, TypeEditor>();
    for (const col of editableColumns) {
      map.set(col.name, editorFor(col));
    }
    return map;
  }, [editableColumns]);

  const initialInputs = useMemo(() => {
    const map = new Map<string, string>();
    for (const col of editableColumns) {
      map.set(col.name, editors.get(col.name)!.toInput(props.row[col.name]));
    }
    return map;
  }, [editableColumns, editors, props.row]);

  const [drafts, setDrafts] = useState<Record<string, FieldDraft>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState(false);

  const changedColumns = Object.entries(drafts).filter(([col, draft]) => {
    if (draft.setNull) {
      // setNull is meaningful only when original wasn't already NULL.
      return props.row[col] !== null && props.row[col] !== undefined;
    }
    return draft.raw !== initialInputs.get(col);
  });
  const changeCount = changedColumns.length;

  function setDraftRaw(col: string, raw: string) {
    setDrafts((prev) => ({
      ...prev,
      [col]: { raw, setNull: false },
    }));
    setErrors((prev) => ({ ...prev, [col]: null }));
  }

  function setDraftNull(col: string) {
    const initial = initialInputs.get(col) ?? "";
    setDrafts((prev) => ({
      ...prev,
      [col]: { raw: initial, setNull: true },
    }));
    setErrors((prev) => ({ ...prev, [col]: null }));
  }

  function revertField(col: string) {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[col];
      return next;
    });
    setErrors((prev) => ({ ...prev, [col]: null }));
  }

  function handleClose() {
    if (saving) return;
    if (changeCount > 0) {
      const ok = globalThis.window.confirm(
        `Discard ${String(changeCount)} unsaved change${changeCount === 1 ? "" : "s"}?`,
      );
      if (!ok) return;
    }
    props.onClose();
  }

  async function handleSave() {
    if (changeCount === 0) return;
    const validatedChanges: UpdateRowFieldChange[] = [];
    const nextErrors: Record<string, string | null> = {};
    let firstError: string | null = null;

    for (const [col, draft] of changedColumns) {
      const colInfo = editableColumns.find((c) => c.name === col)!;
      const editor = editors.get(col)!;
      if (draft.setNull) {
        // For setNull the cast is informational; main process emits `col = NULL`.
        const fallbackCast = colInfo.enumPgCast ?? colInfo.dataType;
        validatedChanges.push({
          column: col,
          pgCast: fallbackCast,
          newValue: null,
          setNull: true,
        });
        continue;
      }
      const validation: EditValidation = editor.validate(draft.raw);
      if (!validation.ok) {
        nextErrors[col] = validation.error;
        firstError = firstError ?? validation.error;
        continue;
      }
      validatedChanges.push({
        column: col,
        pgCast: validation.result.pgCast,
        newValue: validation.result.value,
        setNull: false,
      });
    }

    if (firstError) {
      setErrors((prev) => ({ ...prev, ...nextErrors }));
      return;
    }

    setSaving(true);
    try {
      const response = await globalThis.window.tableDataApi.updateRow({
        connectionId: props.connectionId,
        schema: props.schema,
        table: props.table,
        pkColumns: props.primaryKey,
        pkValues: props.pkValues,
        changes: validatedChanges,
      });
      if (!response.success || !response.data) {
        const message = response.error ?? "Unknown error";
        toast.error("Update failed", { description: message });
        return;
      }
      props.onRowUpdated(response.data.row);
      toast.success(
        changeCount === 1 ? "Row updated" : `${String(changeCount)} fields updated`,
      );
      props.onClose();
    } catch (err) {
      toast.error("Update failed", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent
        data-testid="row-editor"
        className="sm:max-w-2xl"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            void handleSave();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <span>Edit row</span>
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {props.schema}.{props.table}
            </span>
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {props.primaryKey
              .map((col, i) => `${col} = ${formatPkValue(props.pkValues[i])}`)
              .join(", ")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="flex flex-col gap-2">
            {props.columns.map((col) => {
              const isPk = pkSet.has(col.name);
              const draft = drafts[col.name];
              const original = initialInputs.get(col.name);
              const changed =
                !isPk &&
                draft !== undefined &&
                (draft.setNull
                  ? props.row[col.name] !== null && props.row[col.name] !== undefined
                  : draft.raw !== original);
              return (
                <div
                  key={col.name}
                  data-testid={`row-field-${col.name}`}
                  data-changed={changed ? "true" : "false"}
                  className={`grid grid-cols-[10rem_1fr_auto] items-start gap-2 rounded-md border px-2 py-1.5 ${
                    changed ? "border-primary/40 bg-primary/5" : "border-transparent"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-mono text-xs">{col.name}</span>
                    <span className="text-[10px] text-muted-foreground/70">
                      {col.dataType}
                      {isPk ? " · pk" : ""}
                    </span>
                  </div>
                  <div className="min-w-0">
                    {isPk ? (
                      <PkValueDisplay value={props.row[col.name]} />
                    ) : (
                      <FieldEditor
                        col={col}
                        rawValue={draft?.raw ?? original ?? ""}
                        setNull={draft?.setNull ?? false}
                        disabled={saving}
                        connectionId={props.connectionId}
                        onChange={(raw) => setDraftRaw(col.name, raw)}
                      />
                    )}
                    {errors[col.name] ? (
                      <p className="mt-1 text-[11px] text-destructive">
                        {errors[col.name]}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1">
                    {!isPk ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="size-7"
                          disabled={saving || !changed}
                          onClick={() => revertField(col.name)}
                          aria-label={`Revert ${col.name}`}
                          data-testid={`revert-${col.name}`}
                        >
                          <RotateCcw className="size-3" />
                        </Button>
                        <Button
                          type="button"
                          variant={draft?.setNull ? "secondary" : "ghost"}
                          size="sm"
                          className="h-7 px-2 text-[10px]"
                          disabled={saving}
                          onClick={() => setDraftNull(col.name)}
                          data-testid={`setnull-${col.name}`}
                        >
                          NULL
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <span className="mr-auto self-center text-xs text-muted-foreground">
            {changeCount === 0
              ? "No changes"
              : `${String(changeCount)} field${changeCount === 1 ? "" : "s"} changed`}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={saving || changeCount === 0}
            onClick={() => {
              void handleSave();
            }}
            data-testid="row-editor-save"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatPkValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "string") return JSON.stringify(value);
  return String(value);
}

function PkValueDisplay({ value }: Readonly<{ value: unknown }>) {
  if (value === null || value === undefined) {
    return (
      <span className="font-mono text-xs italic text-muted-foreground">NULL</span>
    );
  }
  return (
    <span className="block truncate font-mono text-xs text-muted-foreground">
      {String(value)}
    </span>
  );
}

interface FieldEditorProps {
  col: ColumnInfo;
  rawValue: string;
  setNull: boolean;
  disabled: boolean;
  connectionId: string;
  onChange: (raw: string) => void;
}

function FieldEditor(props: Readonly<FieldEditorProps>): ReactNode {
  if (props.setNull) {
    return (
      <div
        data-testid={`null-pill-${props.col.name}`}
        className="rounded-md border border-dashed border-muted-foreground/40 px-2 py-1 text-center font-mono text-xs italic text-muted-foreground"
      >
        NULL
      </div>
    );
  }

  if (props.col.foreignKey) {
    return (
      <FkFieldEditor
        col={props.col}
        rawValue={props.rawValue}
        connectionId={props.connectionId}
        disabled={props.disabled}
        onChange={props.onChange}
      />
    );
  }

  const enumLabels = props.col.enumLabels;
  if (enumLabels && enumLabels.length > 0) {
    return (
      <select
        value={props.rawValue}
        onChange={(e) => props.onChange(e.target.value)}
        disabled={props.disabled}
        data-testid={`row-enum-${props.col.name}`}
        className="h-8 w-full rounded-md border border-input bg-background px-2 font-mono text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
      >
        {enumLabels.map((label) => (
          <option key={label} value={label} className="bg-popover text-popover-foreground">
            {label}
          </option>
        ))}
      </select>
    );
  }

  if (props.col.dataType === "bool") {
    const checked = props.rawValue.trim().toLowerCase() === "true";
    return (
      <div className="flex h-8 items-center justify-between rounded-md border border-input bg-muted/30 px-2">
        <span className="font-mono text-xs">{checked ? "True" : "False"}</span>
        <Switch
          checked={checked}
          onCheckedChange={(next) => props.onChange(next ? "true" : "false")}
          disabled={props.disabled}
          aria-label={`Toggle ${props.col.name}`}
        />
      </div>
    );
  }

  if (MULTILINE_TYPES.has(props.col.dataType)) {
    return (
      <textarea
        value={props.rawValue}
        onChange={(e) => props.onChange(e.target.value)}
        disabled={props.disabled}
        className="min-h-16 w-full resize-y rounded-md border border-input bg-transparent px-2 py-1 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
        spellCheck={false}
      />
    );
  }

  return (
    <Input
      value={props.rawValue}
      onChange={(e) => props.onChange(e.target.value)}
      disabled={props.disabled}
      className="h-8 font-mono text-xs"
      spellCheck={false}
    />
  );
}

// ---------------------------------------------------------------------------
// FK field editor — used when `col.foreignKey` is present.
//
// Renders a compact trigger ("<label> · <value>") that opens a nested Dialog
// containing the searchable picker.  The trigger always shows the *current
// draft* value so the row's "X fields changed" indicator and the per-field
// changed-state highlight stay in sync without any extra wiring.
// ---------------------------------------------------------------------------

interface FkFieldEditorProps {
  col: ColumnInfo;
  rawValue: string;
  disabled: boolean;
  connectionId: string;
  onChange: (raw: string) => void;
}

function FkFieldEditor(props: Readonly<FkFieldEditorProps>) {
  const fk = props.col.foreignKey!;
  const [open, setOpen] = useState(false);
  // The picked label is purely cosmetic — we cache the most recent label
  // from the picker so the trigger doesn't say "no label" right after
  // the user picked a labelled row.
  const [lastLabel, setLastLabel] = useState<string | null>(null);

  const display = props.rawValue === "" ? "(unset)" : props.rawValue;

  return (
    <>
      <button
        type="button"
        disabled={props.disabled}
        onClick={() => setOpen(true)}
        data-testid={`fk-trigger-${props.col.name}`}
        className="flex h-8 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-2 text-left text-xs hover:bg-muted/40 disabled:opacity-50"
      >
        <span className="truncate">
          {lastLabel ? (
            <span className="font-medium">{lastLabel}</span>
          ) : null}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {display}
        </span>
      </button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) setOpen(false);
        }}
      >
        <DialogContent
          data-testid={`fk-picker-dialog-${props.col.name}`}
          className="sm:max-w-lg"
        >
          <DialogHeader>
            <DialogTitle className="text-sm">
              Pick {props.col.name}
            </DialogTitle>
            <DialogDescription className="font-mono text-[11px]">
              References {fk.schema}.{fk.table}.{fk.column}
            </DialogDescription>
          </DialogHeader>
          <ForeignKeyPicker
            currentValue={props.rawValue === "" ? null : props.rawValue}
            currentLabel={lastLabel}
            foreignKey={fk}
            connectionId={props.connectionId}
            allowNull={false}
            onPick={(value, label) => {
              props.onChange(value === null || value === undefined ? "" : String(value));
              setLastLabel(label);
              setOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
