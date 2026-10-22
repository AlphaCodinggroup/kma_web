"use client";

import React from "react";
import { FlowEditor } from "@features/flows/ui/FlowEditor";
import type { Flow } from "@entities/flow/model";
import PageHeader from "@shared/ui/page-header";

const EMPTY_FLOW: Flow = {
    id: "new",
    title: "",
    description: "",
    flowType: "Navigation",
    isActive: true,
    version: 1,
    steps: [
        {
            id: "L-01",
            type: "Form",
            title: "Location",
            fields: [
                {
                    id: "location",
                    type: "text",
                    label: "Location",
                    placeholder: "Location of ramp(s)"
                }
            ],
            next: ""
        }
    ]
};

export default function NewFlowPage() {
    return (
        <section className="flex h-full min-h-0 w-full flex-col">
            <PageHeader
                className="sr-only"
                title="Create New Flow"
                subtitle="Design a new audit flow from scratch"
            />
            <FlowEditor initialFlow={EMPTY_FLOW} mode="create" />
        </section>
    );
}
