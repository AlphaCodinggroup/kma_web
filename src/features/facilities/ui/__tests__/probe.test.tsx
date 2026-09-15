import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ArrowUp } from "lucide-react";

describe("probe", () => {
  it("lucide class names", () => {
    const { container } = render(<ArrowUp className="h-4 w-4" />);
    console.log("SVG_OUTER:", container.innerHTML);
  });

  it("URL object url availability", () => {
    console.log("createObjectURL:", typeof URL.createObjectURL, "revoke:", typeof URL.revokeObjectURL);
    const f = new File(["x"], "a.png", { type: "image/png" });
    try {
      console.log("url:", URL.createObjectURL(f));
    } catch (e) {
      console.log("createObjectURL threw:", (e as Error).message);
    }
  });

  it("file input change via fireEvent", () => {
    render(<input aria-label="photo" type="file" onChange={(e) => console.log("files len:", e.currentTarget.files?.length)} />);
    const input = screen.getByLabelText("photo") as HTMLInputElement;
    const f = new File(["x"], "a.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [f] } });
    fireEvent.change(input, { target: { files: [] } });
    expect(true).toBe(true);
  });

  it("implicit submit with disabled submit button", () => {
    let submitted = 0;
    render(
      <form onSubmit={(e) => { e.preventDefault(); submitted++; }}>
        <input aria-label="name" />
        <button type="submit" disabled>go</button>
      </form>
    );
    fireEvent.submit(screen.getByLabelText("name").closest("form")!);
    console.log("submitted:", submitted);
    expect(submitted).toBe(1);
  });
});
