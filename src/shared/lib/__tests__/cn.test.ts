// ---------------------------------------------------------------------------
// Tests para cn: combinación mínima de classNames.
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { cn } from "../cn";

describe("cn", () => {
  it.each([
    [["a", "b"], "a b"],
    [["a", false, "b"], "a b"],
    [["a", null, undefined, "b"], "a b"],
    [[], ""],
    [[false, null, undefined], ""],
    [["only"], "only"],
  ])("joins %j into %s", (input, expected) => {
    expect(cn(...(input as Array<string | false | null | undefined>))).toBe(
      expected
    );
  });
});
