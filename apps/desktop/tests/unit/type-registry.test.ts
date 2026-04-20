import { describe, expect, it } from "vitest";
import type { TypeRenderer } from "@/components/workspace/renderers/type-registry";
import { typeRegistry } from "@/components/workspace/renderers/type-registry";

describe("typeRegistry", () => {
  it("falls back to string rendering for unknown types", () => {
    expect(typeRegistry.get("unknown_type").renderCell({ ok: true })).toBe(
      JSON.stringify({ ok: true }),
    );
  });

  it("registers renderers for multiple types", () => {
    const renderer: TypeRenderer = {
      renderCell: () => "cell",
      renderCard: () => "card",
    };

    typeRegistry.registerMany(["custom_a", "custom_b"], renderer);

    expect(typeRegistry.has("custom_a")).toBe(true);
    expect(typeRegistry.get("custom_b").renderCard("ignored")).toBe("card");
  });
});
