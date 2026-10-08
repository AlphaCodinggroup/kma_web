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
        <section className="flex w-full flex-col gap-5">
            <PageHeader
                className="mb-0"
                title="Create New Flow"
                subtitle="Design a new audit flow from scratch"
            />
            <FlowEditor initialFlow={EMPTY_FLOW} mode="create" />
        </section>
    );
}
