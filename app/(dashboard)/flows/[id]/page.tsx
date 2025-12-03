"use client";

import React from "react";
import PageHeader from "@shared/ui/page-header";
import { useFlowById } from "@features/flows/lib/useFlowsQuery";
import { FlowEditor } from "@features/flows/ui/FlowEditor";
import { useParams } from "next/navigation";

export default function FlowEditorPage() {
    const params = useParams();
    const id = params?.id as string;
    const { flow, isLoading, error } = useFlowById(id, true);

    if (isLoading) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                Loading flow...
            </div>
        );
    }

    if (error || !flow) {
        return (
            <div className="p-8 text-center text-destructive">
                Error loading flow: {error?.message ?? "Flow not found"}
            </div>
        );
    }

    return (
        <main className="flex w-full flex-col gap-6">
            <PageHeader
                title={`Edit Flow: ${flow.title}`}
                subtitle="Modify flow details and steps"
            />
            <FlowEditor initialFlow={flow} />
        </main>
    );
}
