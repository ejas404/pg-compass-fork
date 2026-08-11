import { describe, expect, it } from "vitest";
import {
  buildInsertBatchSql,
  computeBatchSize,
  parseCsv,
  parseCsvImport,
  parseJsonImport,
} from "@/main/table-data-import";

describe("parseCsv (RFC 4180)", () => {
  it("parses simple comma-separated LF rows", () => {
    expect(parseCsv("a,b,c\n1,2,3\n")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles CRLF line endings", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("does not emit a phantom trailing row after a final newline", () => {
    expect(parseCsv("a\n1\n")).toEqual([["a"], ["1"]]);
  });

  it("keeps a final row that lacks a trailing newline", () => {
    expect(parseCsv("a\n1")).toEqual([["a"], ["1"]]);
  });

  it("preserves commas inside quoted fields", () => {
    expect(parseCsv('name,note\n"Smith, Jr.",hi\n')).toEqual([
      ["name", "note"],
      ["Smith, Jr.", "hi"],
    ]);
  });

  it("preserves newlines inside quoted fields", () => {
    expect(parseCsv('a\n"line1\nline2"\n')).toEqual([["a"], ["line1\nline2"]]);
  });

  it("unescapes doubled quotes", () => {
    expect(parseCsv('a\n"she said ""hi"""\n')).toEqual([
      ["a"],
      ['she said "hi"'],
    ]);
  });

  it("distinguishes trailing empty field from missing", () => {
    expect(parseCsv("a,b,\n")).toEqual([["a", "b", ""]]);
  });

  it("throws on an unterminated quoted field", () => {
    expect(() => parseCsv('a\n"unterminated\n')).toThrow(/unterminated/i);
  });

  it("rejects content after a closing quote", () => {
    expect(() => parseCsv('a,b\n"x"junk,y\n')).toThrow(/closing quote/i);
  });

  it("rejects a quote inside an unquoted field", () => {
    expect(() => parseCsv('a\nabc"def\n')).toThrow(/unquoted field/i);
  });
});

describe("parseCsvImport", () => {
  it("strips a UTF-8 BOM from the first header", () => {
    const parsed = parseCsvImport("﻿id,name\n1,alice\n");
    expect(parsed.columns).toEqual(["id", "name"]);
  });

  it("maps empty cells to NULL and keeps non-empty as strings", () => {
    const parsed = parseCsvImport("a,b\n1,\n,2\n");
    expect(parsed.rows).toEqual([
      ["1", null],
      [null, "2"],
    ]);
  });

  it("skips blank lines between rows", () => {
    const parsed = parseCsvImport("a\n1\n\n2\n");
    expect(parsed.rows).toEqual([["1"], ["2"]]);
  });

  it("keeps a quoted empty field as a real one-column row", () => {
    const parsed = parseCsvImport('a\n""\n');
    expect(parsed.rows).toEqual([[null]]);
  });

  it("pads a short row with NULLs", () => {
    const parsed = parseCsvImport("a,b,c\n1,2\n");
    expect(parsed.rows).toEqual([["1", "2", null]]);
  });

  it("rejects a row with more cells than the header", () => {
    expect(() => parseCsvImport("a,b\n1,2,3\n")).toThrow(/values/i);
  });

  it("rejects duplicate headers", () => {
    expect(() => parseCsvImport("id,id\n1,2\n")).toThrow(/duplicate/i);
  });

  it("rejects an empty header name", () => {
    expect(() => parseCsvImport("a,,c\n1,2,3\n")).toThrow(/empty column/i);
  });

  it("treats a header-only file as zero rows", () => {
    expect(parseCsvImport("a,b\n").rows).toEqual([]);
  });

  it("rejects an empty file", () => {
    expect(() => parseCsvImport("")).toThrow(/empty/i);
  });
});

describe("parseJsonImport", () => {
  it("parses an array of flat objects", () => {
    const parsed = parseJsonImport('[{"a":1,"b":"x"},{"a":2,"b":"y"}]');
    expect(parsed.columns).toEqual(["a", "b"]);
    expect(parsed.rows).toEqual([
      ["1", "x"],
      ["2", "y"],
    ]);
  });

  it("accepts a single top-level object as one row", () => {
    const parsed = parseJsonImport('{"a":1}');
    expect(parsed.rows).toEqual([["1"]]);
  });

  it("unions keys across rows in first-seen order; missing keys become NULL", () => {
    const parsed = parseJsonImport('[{"a":1},{"b":2}]');
    expect(parsed.columns).toEqual(["a", "b"]);
    expect(parsed.rows).toEqual([
      ["1", null],
      [null, "2"],
    ]);
  });

  it("stringifies nested objects and arrays for json/jsonb columns", () => {
    const parsed = parseJsonImport('[{"meta":{"k":1},"tags":[1,2]}]');
    expect(parsed.rows).toEqual([['{"k":1}', "[1,2]"]]);
  });

  it("maps JSON null to SQL NULL", () => {
    const parsed = parseJsonImport('[{"a":null}]');
    expect(parsed.rows).toEqual([[null]]);
  });

  it("preserves integers beyond JavaScript's safe range", () => {
    const parsed = parseJsonImport('[{"id":9007199254740993}]');
    expect(parsed.rows).toEqual([["9007199254740993"]]);
  });

  it("preserves precision inside nested JSON values", () => {
    const parsed = parseJsonImport(
      '[{"meta":{"id":9007199254740993,"ratio":1.234567890123456789}}]',
    );
    expect(parsed.rows).toEqual([
      ['{"id":9007199254740993,"ratio":1.234567890123456789}'],
    ]);
  });

  it("returns zero rows for an empty array", () => {
    expect(parseJsonImport("[]").rows).toEqual([]);
  });

  it("rejects an array of non-objects", () => {
    expect(() => parseJsonImport("[1,2,3]")).toThrow(/objects/i);
  });

  it("rejects malformed JSON", () => {
    expect(() => parseJsonImport("{not json")).toThrow(/invalid json/i);
  });

  it("rejects an empty file", () => {
    expect(() => parseJsonImport("   ")).toThrow(/empty/i);
  });
});

describe("computeBatchSize", () => {
  it("caps at 1000 rows for narrow tables", () => {
    expect(computeBatchSize(1)).toBe(1000);
    expect(computeBatchSize(10)).toBe(1000);
  });

  it("keeps rows × columns under the 65535 bind-param limit for wide tables", () => {
    const cols = 100;
    const batch = computeBatchSize(cols);
    expect(batch * cols).toBeLessThanOrEqual(65_535);
    expect(batch).toBe(655);
  });

  it("never returns less than one", () => {
    expect(computeBatchSize(70_000)).toBe(1);
  });
});

describe("buildInsertBatchSql", () => {
  it("builds a multi-row INSERT with dense placeholders and quoted identifiers", () => {
    const sql = buildInsertBatchSql('"app"."notes"', ["a", "b"], 2);
    expect(sql).toBe(
      'INSERT INTO "app"."notes" ("a", "b") VALUES ($1, $2), ($3, $4)',
    );
  });

  it("quotes identifiers containing double quotes", () => {
    const sql = buildInsertBatchSql('"app"."t"', ['ev"il'], 1);
    expect(sql).toBe('INSERT INTO "app"."t" ("ev""il") VALUES ($1)');
  });
});
