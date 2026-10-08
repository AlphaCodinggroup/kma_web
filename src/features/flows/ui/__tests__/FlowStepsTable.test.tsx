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
