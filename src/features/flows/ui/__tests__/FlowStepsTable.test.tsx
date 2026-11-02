import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FlowStepsTable } from "../FlowStepsTable";
import type { Flow } from "@entities/flow/model";

const mockFlow: Flow = {
    id: "test-flow",
    title: "Accessible Routes",
    version: 1,
    steps: [
        {
            id: "AR-Q01",
            type: "Question",
            text: "Is the surface stable, firm and slip resistant?",
            yesNext: "AR-Q02",
            noNext: "AR-F01",
            barrierId: "AR-B01",
        },
        {
            id: "AR-F01",
            type: "Form",
            title: "Surface Condition - Non-compliant surface",
            next: "AR-Q02",
            barrierId: "AR-B01",
            fields: [
                { id: "photo", type: "photo", label: "Upload photo" },
                { id: "notes", type: "text", label: "Notes" }
            ],
        },
        {
            id: "AR-Q02",
            type: "Select",
            text: "Select running slope conditions",
            options: [
                { label: "<5%", next: "AR-Q05" },
                { label: "5-8.3%", next: "AR-F02", barrierId: "AR-B02" }
            ]
        }
    ]
};

describe("FlowStepsTable", () => {
    it("renders selectable step rows with routing and barrier context", () => {
        const onSelectStep = vi.fn();

        render(
            <FlowStepsTable
                flow={mockFlow}
                selectedStepId="AR-F01"
                onSelectStep={onSelectStep}
                onDeleteStep={vi.fn()}
                onAddStep={vi.fn()}
                searchTerm=""
                onSearchChange={vi.fn()}
                isAdmin={true}
                draggedStepId={null}
                dragOverStepId={null}
                onDragStart={vi.fn()}
                onDragOver={vi.fn()}
                onDragEnter={vi.fn()}
                onDragLeave={vi.fn()}
                onDragEnd={vi.fn()}
                onDrop={vi.fn()}
                isStepIncomplete={vi.fn().mockReturnValue(false)}
            />
        );

        expect(screen.getByRole("table", { name: "Flow step sequence" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Select step AR-F01" })).toHaveAttribute("aria-current", "step");
        expect(screen.getByRole("button", { name: "Select step AR-Q01" })).not.toHaveAttribute("aria-current");

        // Verifica que los IDs de los pasos se renderizan
        expect(screen.getByText("AR-Q01")).toBeInTheDocument();
        expect(screen.getByText("AR-F01")).toBeInTheDocument();
        expect(screen.getByText("AR-Q02")).toBeInTheDocument();

        // Verifica los badges de ruteo
        expect(screen.getByText(/YES/)).toBeInTheDocument();
        expect(screen.getByText(/NO/)).toBeInTheDocument();
        expect(screen.getByText(/NEXT/)).toBeInTheDocument();

        // Verifica las barreras
        expect(screen.getAllByText("AR-B01").length).toBeGreaterThan(0);
        expect(screen.getByText("AR-B02")).toBeInTheDocument();
    });

    it("triggers onSelectStep when clicking on a row", () => {
        const onSelectStep = vi.fn();

        render(
            <FlowStepsTable
                flow={mockFlow}
                selectedStepId="AR-F01"
                onSelectStep={onSelectStep}
                onDeleteStep={vi.fn()}
                onAddStep={vi.fn()}
                searchTerm=""
                onSearchChange={vi.fn()}
                isAdmin={true}
                draggedStepId={null}
                dragOverStepId={null}
                onDragStart={vi.fn()}
                onDragOver={vi.fn()}
                onDragEnter={vi.fn()}
                onDragLeave={vi.fn()}
                onDragEnd={vi.fn()}
                onDrop={vi.fn()}
                isStepIncomplete={vi.fn().mockReturnValue(false)}
            />
        );

        const qRow = screen.getByText("AR-Q01").closest("tr");
        expect(qRow).not.toBeNull();
        if (qRow) {
            fireEvent.click(qRow);
            expect(onSelectStep).toHaveBeenCalledWith("AR-Q01");
        }
    });

    it("filters steps when a searchTerm is provided", () => {
        render(
            <FlowStepsTable
                flow={mockFlow}
                selectedStepId="AR-F01"
                onSelectStep={vi.fn()}
                onDeleteStep={vi.fn()}
                onAddStep={vi.fn()}
                searchTerm="Surface"
                onSearchChange={vi.fn()}
                isAdmin={true}
                draggedStepId={null}
                dragOverStepId={null}
                onDragStart={vi.fn()}
                onDragOver={vi.fn()}
                onDragEnter={vi.fn()}
                onDragLeave={vi.fn()}
                onDragEnd={vi.fn()}
                onDrop={vi.fn()}
                isStepIncomplete={vi.fn().mockReturnValue(false)}
            />
        );

        expect(screen.getByText("AR-F01")).toBeInTheDocument();
        expect(screen.queryByText("AR-Q02")).not.toBeInTheDocument();
    });
});

const richFlow: Flow = {
    id: "rich-flow",
    title: "Rich",
    version: 1,
    steps: [
        { id: "Q-1", type: "Question", text: "First question?", yesNext: "F-1", noNext: "", barrierId: "B-1", conditionalYesNext: { conditions: [], matchAny: false, next: "F-1" } } as unknown as Flow["steps"][number],
        { id: "F-1", type: "Form", title: "Form without next", next: "", fields: [] },
        { id: "S-1", type: "Select", text: "Pick one", options: [
            { label: "One", next: "Q-1" },
            { label: "Two", next: "" },
            { label: "Three", next: "F-1", barrierId: "B-3" },
        ] },
        { id: "S-2", type: "Select", text: "Empty select", options: [] },
        { id: "E-1", type: "End" },
        { id: "E-1", type: "End" },
    ],
};

const baseProps = () => ({
    flow: richFlow,
    selectedStepId: null,
    onSelectStep: vi.fn(),
    onDeleteStep: vi.fn(),
    onAddStep: vi.fn(),
    searchTerm: "",
    onSearchChange: vi.fn(),
    isAdmin: true,
    draggedStepId: null,
    dragOverStepId: null,
    onDragStart: vi.fn(),
    onDragOver: vi.fn(),
    onDragEnter: vi.fn(),
    onDragLeave: vi.fn(),
    onDragEnd: vi.fn(),
    onDrop: vi.fn(),
    isStepIncomplete: (step: Flow["steps"][number]) => step.id === "F-1",
});

describe("FlowStepsTable — desktop table", () => {
    it("shows the panel heading, the counts and one column header per column", () => {
        render(<FlowStepsTable {...baseProps()} />);

        expect(screen.getByRole("heading", { name: "Flow Steps" })).toBeInTheDocument();
        expect(screen.getByText("6 of 6 total steps")).toBeInTheDocument();
        expect(screen.getAllByRole("columnheader").map((th) => th.textContent)).toEqual([
            "ID", "Type", "Question / Title", "Routing", "Barriers", "Actions",
        ]);
    });

    it("renders the routing chips for every step type", () => {
        render(<FlowStepsTable {...baseProps()} />);

        expect(screen.getByTitle("YES leads to F-1")).toBeInTheDocument();
        expect(screen.getByTitle("Missing NO link")).toBeInTheDocument();
        expect(screen.getByTitle("Has conditional navigation")).toHaveTextContent("COND");
        expect(screen.getByText("Missing next step")).toBeInTheDocument();
        expect(screen.getByText("No options")).toBeInTheDocument();
        expect(screen.getAllByText("END").length).toBeGreaterThan(0);
        expect(screen.getByText("+1 more")).toBeInTheDocument();
        // La opción sin destino se muestra con «?» en lugar de ocultarse.
        expect(screen.getByTitle("Two -> Missing")).toHaveTextContent("?");
    });

    it("lists the barriers of a step and an accessible placeholder when it has none", () => {
        render(<FlowStepsTable {...baseProps()} />);

        expect(screen.getByText("B-1")).toBeInTheDocument();
        expect(screen.getByText("B-3")).toBeInTheDocument();
        expect(screen.getAllByText("None").length).toBeGreaterThan(0);
    });

    it("flags duplicate ids and incomplete steps with accessible text", () => {
        render(<FlowStepsTable {...baseProps()} />);

        expect(screen.getAllByTitle("Duplicate ID: Each step must have a unique ID")).toHaveLength(2);
        expect(screen.getByTitle("Incomplete: missing step references")).toHaveTextContent("Incomplete step");
    });

    it("marks the selected row with the edge colour and the others without it", () => {
        render(<FlowStepsTable {...baseProps()} selectedStepId="Q-1" />);

        const selected = screen.getByRole("button", { name: "Select step Q-1" }).closest("tr");
        const other = screen.getByRole("button", { name: "Select step S-1" }).closest("tr");
        expect(selected).toHaveClass("border-l-[var(--kma-selected-edge)]");
        expect(other).toHaveClass("border-l-transparent");
    });

    it("adds each kind of step from the header buttons", () => {
        const props = baseProps();
        render(<FlowStepsTable {...props} />);

        for (const type of ["Question", "Form", "Select", "End"]) {
            fireEvent.click(screen.getByTitle(`Add ${type} step`));
            expect(props.onAddStep).toHaveBeenLastCalledWith(type);
        }
    });

    it("deletes a step without selecting its row", () => {
        const props = baseProps();
        render(<FlowStepsTable {...props} />);

        fireEvent.click(screen.getByRole("button", { name: "Delete step S-1" }));

        expect(props.onDeleteStep).toHaveBeenCalledWith("S-1");
        expect(props.onSelectStep).not.toHaveBeenCalled();
    });

    it("blocks adding, deleting and dragging for non administrators", () => {
        render(<FlowStepsTable {...baseProps()} isAdmin={false} />);

        const addButtons = screen.getAllByTitle("Only administrators can add steps");
        expect(addButtons).toHaveLength(4);
        expect(addButtons.every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
        expect(screen.getAllByTitle("Only administrators can delete steps").every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
        expect(screen.queryByTitle("Drag to reorder")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Select step S-1" }).closest("tr")).toHaveAttribute("draggable", "false");
    });

    it("stops dragging while a search is active", () => {
        render(<FlowStepsTable {...baseProps()} searchTerm="pick" />);

        expect(screen.queryByTitle("Drag to reorder")).not.toBeInTheDocument();
        expect(screen.getByText("1 of 6 total steps")).toBeInTheDocument();
    });

    it("explains an empty search and an empty flow with different messages", () => {
        const { rerender } = render(<FlowStepsTable {...baseProps()} searchTerm="zzz" />);
        expect(screen.getByText("No matching steps")).toBeInTheDocument();
        expect(screen.getByText("No steps match your search criteria.")).toBeInTheDocument();
        expect(screen.getByText("No matching steps").closest("td")).toHaveAttribute("colspan", "6");

        rerender(<FlowStepsTable {...baseProps()} flow={{ ...richFlow, steps: [] }} />);
        expect(screen.getByText("Add your first step")).toBeInTheDocument();
        expect(screen.getByText("Choose a step type above to start your flow.")).toBeInTheDocument();
    });

    it("reports the search term as the user types", () => {
        const props = baseProps();
        render(<FlowStepsTable {...props} />);

        fireEvent.change(screen.getByLabelText("Search steps"), { target: { value: "pick" } });

        expect(props.onSearchChange).toHaveBeenCalledWith("pick");
    });
});

describe("FlowStepsTable — compact list for the mobile drawer", () => {
    it("has no column headers and no panel heading, but keeps the count and the row actions", () => {
        render(<FlowStepsTable {...baseProps()} layout="list" selectedStepId="Q-1" />);

        expect(screen.queryAllByRole("columnheader")).toHaveLength(0);
        expect(screen.queryByRole("heading", { name: "Flow Steps" })).not.toBeInTheDocument();
        expect(screen.getByText("6 of 6 total steps")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Select step Q-1" })).toHaveAttribute("aria-current", "step");
        expect(screen.getByRole("button", { name: "Delete step S-1" })).toBeEnabled();
    });

    it("shows the routing, the barriers and the warnings inside each card", () => {
        render(<FlowStepsTable {...baseProps()} layout="list" />);

        expect(screen.getByTitle("YES leads to F-1")).toBeInTheDocument();
        expect(screen.getByText("Missing next step")).toBeInTheDocument();
        expect(screen.getAllByText("Barriers:").length).toBeGreaterThan(0);
        expect(screen.getByTitle("Incomplete: missing step references")).toBeInTheDocument();
        expect(screen.getAllByTitle("Duplicate ID: Each step must have a unique ID")).toHaveLength(2);
    });

    it("selects from the card and handles empty states", () => {
        const props = baseProps();
        const { rerender } = render(<FlowStepsTable {...props} layout="list" />);
        fireEvent.click(screen.getByRole("button", { name: "Select step S-1" }));
        expect(props.onSelectStep).toHaveBeenCalledWith("S-1");

        rerender(<FlowStepsTable {...props} layout="list" searchTerm="zzz" />);
        expect(screen.getByText("No matching steps")).toBeInTheDocument();
        rerender(<FlowStepsTable {...props} layout="list" flow={{ ...richFlow, steps: [] }} />);
        expect(screen.getByText("Add your first step")).toBeInTheDocument();
    });
});
