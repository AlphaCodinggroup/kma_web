/**
 * Sección desplegable: el botón expone su estado y el contenido se monta sólo
 * con la sección abierta.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Collapsible } from "../collapsible";

describe("Collapsible", () => {
  it("starts closed without mounting its content", () => {
    render(
      <Collapsible title="House 1" meta="2 audits">
        <p>Body</p>
      </Collapsible>
    );

    const toggle = screen.getByRole("button", { name: /House 1/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("2 audits")).toBeInTheDocument();
    expect(screen.queryByText("Body")).toBeNull();
  });

  it("opens and closes from its header", async () => {
    render(
      <Collapsible title="House 1">
        <p>Body</p>
      </Collapsible>
    );
    const toggle = screen.getByRole("button", { name: "House 1" });

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const body = screen.getByText("Body");
    expect(toggle.getAttribute("aria-controls")).toBe(body.parentElement?.id);

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Body")).toBeNull();
  });

  it("can start open", () => {
    render(
      <Collapsible title="House 1" defaultOpen>
        <p>Body</p>
      </Collapsible>
    );

    expect(screen.getByRole("button", { name: "House 1" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(screen.getByText("Body")).toBeInTheDocument();
  });
});
