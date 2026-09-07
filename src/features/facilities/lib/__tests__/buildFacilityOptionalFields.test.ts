// ---------------------------------------------------------------------------
// Tests for buildFacilityOptionalFields
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import type { FacilityUpsertValues } from "@features/facilities/ui/FacilityUpsertDialog";
import { buildFacilityOptionalFields } from "../buildFacilityOptionalFields";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeValues(
  overrides: Partial<FacilityUpsertValues> = {}
): FacilityUpsertValues {
  return { name: "Facility 1", ...overrides };
}

/** File mínimo, suficiente para las ramas del helper. */
function makeFile(name = "photo.png"): File {
  return new File(["binary"], name, { type: "image/png" });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildFacilityOptionalFields", () => {
  it("returns an empty object when there is nothing optional", () => {
    expect(buildFacilityOptionalFields(makeValues())).toEqual({});
  });

  it.each<[string, Partial<FacilityUpsertValues>, object]>([
    ["a blank address", { address: "   " }, {}],
    ["a filled address", { address: "Main st. 1" }, { address: "Main st. 1" }],
    ["a blank city", { city: "  " }, {}],
    ["a filled city", { city: "Austin" }, { city: "Austin" }],
    ["a blank description", { description: "" }, {}],
    ["a filled description", { description: "Notes" }, { description: "Notes" }],
  ])("maps %s", (_label, overrides, expected) => {
    expect(buildFacilityOptionalFields(makeValues(overrides))).toEqual(expected);
  });

  it("trims the photo url when there is no file", () => {
    expect(
      buildFacilityOptionalFields(
        makeValues({ photoUrl: "  https://cdn.test/a.png  " })
      )
    ).toEqual({ photoUrl: "https://cdn.test/a.png" });
  });

  it("drops a blank photo url", () => {
    expect(
      buildFacilityOptionalFields(makeValues({ photoUrl: "   " }))
    ).toEqual({});
  });

  it("prefers the file over the url when both are present", () => {
    const photoFile = makeFile();

    expect(
      buildFacilityOptionalFields(
        makeValues({ photoFile, photoUrl: "https://cdn.test/a.png" })
      )
    ).toEqual({ photoFile });
  });

  it("sets clearPhoto when it is requested and there is no new file", () => {
    expect(
      buildFacilityOptionalFields(makeValues({ clearPhoto: true }))
    ).toEqual({ clearPhoto: true });
  });

  it("ignores clearPhoto when a new file is uploaded", () => {
    const photoFile = makeFile();

    expect(
      buildFacilityOptionalFields(makeValues({ clearPhoto: true, photoFile }))
    ).toEqual({ photoFile });
  });

  it("maps every optional field at once", () => {
    const photoFile = makeFile("another.png");

    expect(
      buildFacilityOptionalFields(
        makeValues({
          address: "Main st. 1",
          city: "Austin",
          description: "Notes",
          photoFile,
        })
      )
    ).toEqual({
      address: "Main st. 1",
      city: "Austin",
      description: "Notes",
      photoFile,
    });
  });
});
