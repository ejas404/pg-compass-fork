import { useEffect, useRef } from "react";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { json } from "@codemirror/lang-json";
import { EditorState } from "@codemirror/state";
import { keymap, EditorView, lineNumbers } from "@codemirror/view";
import { pgTheme } from "@/components/sql-editor/pg-theme";

export function isStructuredEditType(pgType: string): boolean {
  return pgType === "json" || pgType === "jsonb" || pgType.startsWith("_");
}

export function StructuredValueEditor({
  value,
  onChange,
  disabled,
  ariaLabel,
}: Readonly<{
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel: string;
}>) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const initialValueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!hostRef.current) return;
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: initialValueRef.current,
        extensions: [
          lineNumbers(),
          history(),
          json(),
          keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
          ...pgTheme,
          EditorView.editable.of(!disabled),
          EditorView.contentAttributes.of({ "aria-label": ariaLabel }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
          EditorView.theme({
            "&": { minHeight: "8rem", maxHeight: "20rem" },
            ".cm-scroller": { overflow: "auto", fontSize: "12px" },
            ".cm-content": { minHeight: "8rem" },
          }),
        ],
      }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [ariaLabel, disabled]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === value) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
    });
  }, [value]);

  return (
    <div
      ref={hostRef}
      className="overflow-hidden rounded-md border border-input bg-background"
      data-structured-editor
    />
  );
}
