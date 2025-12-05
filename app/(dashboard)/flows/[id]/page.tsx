"use client";

import React from "react";
import PageHeader from "@shared/ui/page-header";
import { useFlowById } from "@features/flows/lib/useFlowsQuery";
import { FlowEditor } from "@features/flows/ui/FlowEditor";
import { useParams } from "next/navigation";
import { Loading } from "@shared/ui/Loading";
import { Retry } from "@shared/ui/Retry";


export default function FlowEditorPage() {
    const params = useParams();
    const id = params?.id as string;
    const { flow, isLoading, error, refetch } = useFlowById(id, true);

    if (isLoading) {
        return (
            <Loading text='Loading Flow' />
        );
    }

    if (error || !flow) {
        return (
            <Retry text={"Error loading flow: " + (error?.message ?? "Flow not found")} onClick={refetch} />
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
