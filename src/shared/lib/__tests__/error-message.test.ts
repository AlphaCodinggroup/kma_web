import { describe, expect, it } from "vitest";
import { errorMessage } from "../error-message";

describe("errorMessage", () => {
  it.each([
    new Error("Request failed"),
    { code: "UNAUTHORIZED", message: "Request failed" },
  ])("preserves messages from errors and API error objects", (error) => {
    expect(errorMessage(error)).toBe("Request failed");
  });

  it.each([undefined, null, "failure", 0, false, {}, { message: 42 }])(
    "leaves malformed errors to the caller's fallback: %j",
    (error) => {
      expect(errorMessage(error)).toBeUndefined();
    },
  );

  it("preserves an empty message for callers choosing between nullish and truthy fallbacks", () => {
    expect(errorMessage({ message: "" })).toBe("");
  });
});
