import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ConfirmTitle from "../confirm-title";

describe("ConfirmTitle", () => {
  it("renders the action and the quoted subject by default", () => {
    const { container } = render(
      <ConfirmTitle action="delete" subject="Project A" />
    );
    // Las comillas tipográficas envuelven al sujeto cuando quoted es true.
    expect(container.textContent).toBe("Do you want to delete “Project A”?");
  });

  it("renders the subject without quotes when quoted is false", () => {
    const { container } = render(
      <ConfirmTitle action="archive" subject="Project B" quoted={false} />
    );
    expect(container.textContent).toBe("Do you want to archive Project B?");
  });

  it("renders a ReactNode subject", () => {
    render(
      <ConfirmTitle
        action="remove"
        subject={<em data-testid="subject-node">Node subject</em>}
      />
    );
    expect(screen.getByTestId("subject-node")).toBeInTheDocument();
  });

  it("applies className on the wrapper span", () => {
    const { container } = render(
      <ConfirmTitle action="delete" subject="X" className="wrapper-class" />
    );
    expect(container.firstElementChild).toHaveClass("wrapper-class");
  });

  it("applies subjectClassName on top of the bold subject span", () => {
    render(
      <ConfirmTitle
        action="delete"
        subject="Subject"
        quoted={false}
        subjectClassName="subject-class"
      />
    );
    const subject = screen.getByText("Subject");
    expect(subject).toHaveClass("font-bold", "subject-class");
  });

  it("renders with the minimum required props only", () => {
    const { container } = render(<ConfirmTitle action="reset" subject="Y" />);
    expect(container.firstElementChild?.tagName).toBe("SPAN");
  });
});
