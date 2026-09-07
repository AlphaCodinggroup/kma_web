import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableCaption,
} from "../table";

// Estructura mínima válida para no disparar advertencias de anidado del DOM.
function renderFullTable(overrides?: {
  tableClassName?: string;
  captionText?: string;
}) {
  return render(
    <Table
      {...(overrides?.tableClassName !== undefined
        ? { className: overrides.tableClassName }
        : {})}
    >
      {overrides?.captionText !== undefined ? (
        <TableCaption>{overrides.captionText}</TableCaption>
      ) : null}
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Jane</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

describe("Table primitives", () => {
  it("renders a complete table with header, body and caption", () => {
    renderFullTable({ captionText: "Users list" });

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Jane" })).toBeInTheDocument();
    expect(screen.getByText("Users list")).toBeInTheDocument();
  });

  it("applies the base classes on the table element", () => {
    renderFullTable();
    expect(screen.getByRole("table")).toHaveClass(
      "w-full",
      "caption-bottom",
      "text-sm",
      "border-collapse"
    );
  });

  it("merges a custom className on the table element", () => {
    renderFullTable({ tableClassName: "table-extra" });
    expect(screen.getByRole("table")).toHaveClass("table-extra", "w-full");
  });

  // Cada primitivo: tag esperado, clases base y reenvío de className/props.
  const primitives: Array<{
    name: string;
    tag: string;
    baseClasses: string[];
  }> = [
    { name: "TableHeader", tag: "THEAD", baseClasses: ["[&_tr]:border-b"] },
    {
      name: "TableHead",
      tag: "TH",
      baseClasses: ["h-11", "px-4", "text-left", "align-middle", "bg-gray-50"],
    },
    {
      name: "TableBody",
      tag: "TBODY",
      baseClasses: ["[&_tr:last-child]:border-0"],
    },
    {
      name: "TableRow",
      tag: "TR",
      baseClasses: ["border-b", "transition-colors", "hover:bg-gray-100"],
    },
    {
      name: "TableCell",
      tag: "TD",
      baseClasses: ["p-4", "text-sm", "text-gray-900", "align-top"],
    },
    {
      name: "TableCaption",
      tag: "CAPTION",
      baseClasses: ["mt-4", "text-sm", "text-gray-500"],
    },
  ];

  it.each(primitives)(
    "$name renders a $tag element with its base classes",
    ({ name, tag, baseClasses }) => {
      render(
        <Table>
          <TableCaption data-testid={name === "TableCaption" ? "node" : "other-caption"}>
            caption
          </TableCaption>
          <TableHeader data-testid={name === "TableHeader" ? "node" : "other-thead"}>
            <TableRow data-testid={name === "TableRow" ? "node" : "other-tr"}>
              <TableHead data-testid={name === "TableHead" ? "node" : "other-th"}>
                head
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody data-testid={name === "TableBody" ? "node" : "other-tbody"}>
            <TableRow>
              <TableCell data-testid={name === "TableCell" ? "node" : "other-td"}>
                cell
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const node = screen.getByTestId("node");
      expect(node.tagName).toBe(tag);
      expect(node).toHaveClass(...baseClasses);
    }
  );

  // displayName se lee, no se asigna: el tipo lo declara como string y con
  // exactOptionalPropertyTypes no encaja en `{ displayName?: string }`.
  const displayNames: Array<{
    name: string;
    Component: { displayName?: string | undefined };
  }> = [
    { name: "Table", Component: Table },
    { name: "TableHeader", Component: TableHeader },
    { name: "TableHead", Component: TableHead },
    { name: "TableBody", Component: TableBody },
    { name: "TableRow", Component: TableRow },
    { name: "TableCell", Component: TableCell },
    { name: "TableCaption", Component: TableCaption },
  ];

  it.each(displayNames)("$name exposes its displayName", ({ name, Component }) => {
    expect(Component.displayName).toBe(name);
  });

  it("merges a custom className on every nested primitive", () => {
    render(
      <Table>
        <TableCaption className="caption-extra">caption</TableCaption>
        <TableHeader className="thead-extra">
          <TableRow className="tr-extra">
            <TableHead className="th-extra">head</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="tbody-extra">
          <TableRow>
            <TableCell className="td-extra">cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    expect(screen.getByText("caption")).toHaveClass("caption-extra", "mt-4");
    expect(screen.getByText("head")).toHaveClass("th-extra", "h-11");
    expect(screen.getByText("cell")).toHaveClass("td-extra", "p-4");
  });

  it("forwards extra DOM props such as colSpan and scope", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={3}>Spanning</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    expect(screen.getByRole("columnheader", { name: "Name" })).toHaveAttribute(
      "scope",
      "col"
    );
    expect(screen.getByRole("cell", { name: "Spanning" })).toHaveAttribute(
      "colspan",
      "3"
    );
  });

  it("forwards refs on every primitive", () => {
    const tableRef = React.createRef<HTMLTableElement>();
    const theadRef = React.createRef<HTMLTableSectionElement>();
    const thRef = React.createRef<HTMLTableCellElement>();
    const tbodyRef = React.createRef<HTMLTableSectionElement>();
    const trRef = React.createRef<HTMLTableRowElement>();
    const tdRef = React.createRef<HTMLTableCellElement>();
    const captionRef = React.createRef<HTMLTableCaptionElement>();

    render(
      <Table ref={tableRef}>
        <TableCaption ref={captionRef}>caption</TableCaption>
        <TableHeader ref={theadRef}>
          <TableRow ref={trRef}>
            <TableHead ref={thRef}>head</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody ref={tbodyRef}>
          <TableRow>
            <TableCell ref={tdRef}>cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    expect(tableRef.current?.tagName).toBe("TABLE");
    expect(theadRef.current?.tagName).toBe("THEAD");
    expect(thRef.current?.tagName).toBe("TH");
    expect(tbodyRef.current?.tagName).toBe("TBODY");
    expect(trRef.current?.tagName).toBe("TR");
    expect(tdRef.current?.tagName).toBe("TD");
    expect(captionRef.current?.tagName).toBe("CAPTION");
  });
});
