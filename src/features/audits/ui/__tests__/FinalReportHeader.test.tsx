/**
 * Encabezado de la pestaña Report: sólo título y ayuda; las acciones viven en
 * la barra del pie.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FinalReportHeader from "../FinalReportHeader";

describe("FinalReportHeader", () => {
  it("names the report and explains what can be edited", () => {
    render(<FinalReportHeader className="mb-3" />);

    expect(screen.getByRole("heading", { name: "Draft Report" })).toBeInTheDocument();
    expect(
      screen.getByText("Preview in the final PDF format. Quantity and QC notes can be edited in place.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
