import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

/**
 * CodeMirror theme that reads from the app's CSS custom properties
 * so it automatically follows dark/light mode.
 */
const pgEditorTheme = EditorView.theme({
  "&": {
    backgroundColor: "var(--background)",
    color: "var(--foreground)",
    fontSize: "12px",
    fontFamily: "var(--font-mono)",
  },
  ".cm-content": {
    caretColor: "var(--foreground)",
    fontFamily: "var(--font-mono)",
    padding: "8px 0",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--foreground)",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "oklch(from var(--accent) l c h / 50%)",
  },
  ".cm-activeLine": {
    backgroundColor: "oklch(from var(--accent) l c h / 20%)",
  },
  ".cm-gutters": {
    backgroundColor: "var(--muted)",
    color: "var(--muted-foreground)",
    borderRight: "1px solid var(--border)",
    fontFamily: "var(--font-mono)",
    fontSize: "12px",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "oklch(from var(--accent) l c h / 30%)",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    padding: "0 8px 0 4px",
    minWidth: "2em",
  },
  // Autocomplete tooltip
  ".cm-tooltip": {
    backgroundColor: "var(--popover)",
    color: "var(--popover-foreground)",
    border: "1px solid var(--border)",
    borderRadius: "calc(var(--radius) - 2px)",
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
  },
  ".cm-tooltip.cm-tooltip-autocomplete": {
    "& > ul": {
      fontFamily: "var(--font-mono)",
      fontSize: "12px",
    },
    "& > ul > li": {
      padding: "2px 8px",
    },
    "& > ul > li[aria-selected]": {
      backgroundColor: "var(--accent)",
      color: "var(--accent-foreground)",
    },
  },
  ".cm-completionLabel": {
    fontFamily: "var(--font-mono)",
  },
  ".cm-completionDetail": {
    fontStyle: "normal",
    color: "var(--muted-foreground)",
  },
  // Search panel
  ".cm-panels": {
    backgroundColor: "var(--muted)",
    color: "var(--foreground)",
  },
  ".cm-searchMatch": {
    backgroundColor: "oklch(from var(--ring) l c h / 30%)",
  },
  ".cm-searchMatch.cm-searchMatch-selected": {
    backgroundColor: "oklch(from var(--ring) l c h / 50%)",
  },
  // Placeholder
  ".cm-placeholder": {
    color: "var(--muted-foreground)",
    fontFamily: "var(--font-mono)",
  },
  // Focus ring
  "&.cm-focused": {
    outline: "none",
  },
});

const pgHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "var(--syntax-keyword)", fontWeight: "600" },
  {
    tag: tags.operatorKeyword,
    color: "var(--syntax-keyword)",
    fontWeight: "600",
  },
  { tag: tags.typeName, color: "var(--syntax-type)" },
  { tag: tags.string, color: "var(--syntax-string)" },
  { tag: tags.number, color: "var(--syntax-number)" },
  { tag: tags.bool, color: "var(--syntax-number)" },
  {
    tag: tags.null,
    color: "var(--syntax-number)",
    fontStyle: "italic",
  },
  { tag: tags.operator, color: "var(--foreground)" },
  { tag: tags.punctuation, color: "var(--muted-foreground)" },
  { tag: tags.comment, color: "var(--muted-foreground)", fontStyle: "italic" },
  { tag: tags.labelName, color: "var(--syntax-label)" },
  { tag: tags.special(tags.string), color: "var(--syntax-string)" },
]);

export const pgTheme = [pgEditorTheme, syntaxHighlighting(pgHighlightStyle)];
