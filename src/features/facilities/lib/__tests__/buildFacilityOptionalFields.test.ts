import { describe, expect, it } from "vitest";
import { buildFacilityOptionalFields } from "../buildFacilityOptionalFields";

describe("buildFacilityOptionalFields", () => {
  it("returns nothing for an empty form", () => {
    expect(buildFacilityOptionalFields({ name: "Plant" } as never)).toEqual({});
  });

  it("drops the blank text fields", () => {
    expect(
      buildFacilityOptionalFields({
        name: "Plant",
        address: "   ",
        city: "",
        description: "  ",
        photoUrl: "   ",
      } as never),
    ).toEqual({});
  });

  it("keeps every filled text field verbatim", () => {
    expect(
      buildFacilityOptionalFields({
        name: "Plant",
        address: " One Street ",
        city: "Boston",
        description: "HQ",
        photoUrl: "  https://cdn.example/a.png  ",
      } as never),
    ).toEqual({
      address: " One Street ",
      city: "Boston",
      description: "HQ",
      photoUrl: "https://cdn.example/a.png",
    });
  });

  it("prefers the uploaded file over the stored url and over the clear flag", () => {
    const photoFile = new File(["x"], "a.png", { type: "image/png" });

    expect(
      buildFacilityOptionalFields({
        name: "Plant",
        photoFile,
        photoUrl: "https://cdn.example/a.png",
        clearPhoto: true,
      } as never),
    ).toEqual({ photoFile });
  });

  it("clears the photo when the flag is set and no file replaces it", () => {
    expect(buildFacilityOptionalFields({ name: "Plant", clearPhoto: true } as never)).toEqual({
      clearPhoto: true,
    });
  });
});
