// ---------------------------------------------------------------------------
// Tests for buildProjectOptionalFields
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { buildProjectOptionalFields } from "../buildProjectOptionalFields";

describe("buildProjectOptionalFields", () => {
  it.each<[string, { name: string; description?: string | undefined }, object]>([
    ["there is no description", { name: "Project 1" }, {}],
    [
      "the description is an empty string",
      { name: "Project 1", description: "" },
      {},
    ],
    [
      "the description is only whitespace",
      { name: "Project 1", description: "   " },
      {},
    ],
    [
      "the description has content",
      { name: "Project 1", description: "A description" },
      { description: "A description" },
    ],
  ])("returns %s → the expected optional fields", (_label, values, expected) => {
    expect(buildProjectOptionalFields(values)).toEqual(expected);
  });

  it("keeps the original spacing of a non-empty description", () => {
    // Sólo se usa `trim()` para decidir si incluir el campo, no para limpiarlo.
    expect(
      buildProjectOptionalFields({ name: "P", description: "  padded  " })
    ).toEqual({ description: "  padded  " });
  });

  it("accepts values that already carry an id (edit mode)", () => {
    expect(
      buildProjectOptionalFields({
        id: "project-1",
        name: "Project 1",
        description: "Edited",
      })
    ).toEqual({ description: "Edited" });
  });
});
