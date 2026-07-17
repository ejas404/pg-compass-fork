/**
 * Multi-field row editor — a dialog that lets the user edit any subset of a
 * row's columns and Save them as one atomic UPDATE.
 *
 * Composes over the Phase 1 edit registry: each column reuses its registered
 * `TypeEditor` for `toInput` / `validate` / `pgCast`, so type rules stay in a
 * single place. PK columns render read-only — Phase 2 does not allow PK
 * mutation.
 */

import { useMemo, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type {
  EditValidation,
  TypeEditor,
} from "@/components/workspace/renderers/edit-registry";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  ColumnInfo,
  UpdateRowFieldChange,
} from "@/shared/types/table-data";
import {
  editorFor,
  FieldEditor,
  formatPrimaryKeyValue,
  PrimaryKeyValue,
  type FieldDraft,
} from "./row-field-editor";

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
        changeCount === 1
          ? "Row updated"
          : `${String(changeCount)} fields updated`,
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
              .map(
                (col, index) =>
                  `${col} = ${formatPrimaryKeyValue(props.pkValues[index])}`,
              )
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
                  ? props.row[col.name] !== null &&
                    props.row[col.name] !== undefined
                  : draft.raw !== original);
              return (
                <div
                  key={col.name}
                  data-testid={`row-field-${col.name}`}
                  data-changed={changed ? "true" : "false"}
                  className={`grid grid-cols-[10rem_1fr_auto] items-start gap-2 rounded-md border px-2 py-1.5 ${
                    changed
                      ? "border-primary/40 bg-primary/5"
                      : "border-transparent"
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
                      <PrimaryKeyValue value={props.row[col.name]} />
                    ) : (
                      <FieldEditor
                        column={col}
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
                          className="size-8"
                          disabled={saving || !changed}
                          onClick={() => revertField(col.name)}
                          aria-label={`Revert ${col.name}`}
                          data-testid={`revert-${col.name}`}
                        >
                          <RotateCcw className="size-3" />
                        </Button>
                        {col.isNullable === true ? (
                          <Button
                            type="button"
                            variant={draft?.setNull ? "secondary" : "ghost"}
                            size="sm"
                            className="h-8 px-2 text-[10px]"
                            disabled={saving}
                            onClick={() => setDraftNull(col.name)}
                            data-testid={`setnull-${col.name}`}
                          >
                            NULL
                          </Button>
                        ) : null}
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
