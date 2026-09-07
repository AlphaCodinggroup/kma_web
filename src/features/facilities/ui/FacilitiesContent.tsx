"use client";

import React, { useCallback, useMemo, useState, useImperativeHandle } from "react";
import FacilitySearchCard from "@features/facilities/ui/FacilitySearchCard";
import type { Facility, FacilityListFilter } from "@entities/facility/model";
import FacilityTable from "@features/facilities/ui/FacilityTable";
import { useDebouncedSearch } from "@shared/lib/useDebouncedSearch";
import CreateFacilityDialog from "@features/facilities/ui/CreateFacilityDialog";
import EditFacilityDialog from "@features/facilities/ui/EditFacilityDialog";
import type { FacilityUpsertValues } from "@features/facilities/ui/FacilityUpsertDialog";
import { useFacilitiesQuery } from "@features/facilities/ui/hooks/useFacilitiesQuery";
import { useCreateFacilityMutation } from "@features/facilities/ui/hooks/useCreateFacilityMutation";
import { useUpdateFacilityMutation } from "@features/facilities/ui/hooks/useUpdateFacilityMutation";
import { useDeleteFacilityMutation } from "@features/facilities/ui/hooks/useDeleteFacilityMutation";
import { useArchiveFacilityMutation } from "@features/facilities/ui/hooks/useArchiveFacilityMutation";
import { useRestoreFacilityMutation } from "@features/facilities/ui/hooks/useRestoreFacilityMutation";
import { buildFacilityOptionalFields } from "@features/facilities/lib/buildFacilityOptionalFields";
import ConfirmDialog from "@shared/ui/confirm-dialog";
import ConfirmTitle from "@shared/ui/confirm-title";

type FacilitiesContentProps = {
    createTriggerRef?: React.MutableRefObject<(() => void) | undefined>;
};

export const FacilitiesContent: React.FC<FacilitiesContentProps> = ({
    createTriggerRef,
}) => {
    const [query, setQuery] = useState<string>("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingFacility, setEditingFacility] = useState<Facility | null>(null);

    const [openDelete, setOpenDelete] = useState(false);
    const [facilityToDelete, setFacilityToDelete] = useState<Facility | null>(
        null
    );

    const [openArchive, setOpenArchive] = useState(false);
    const [facilityToArchive, setFacilityToArchive] = useState<Facility | null>(
        null
    );

    const [showArchived, setShowArchived] = useState(false);

    const [openRestore, setOpenRestore] = useState(false);
    const [facilityToRestore, setFacilityToRestore] = useState<Facility | null>(
        null
    );

    const debouncedQuery = useDebouncedSearch(query);

    const filters = useMemo<FacilityListFilter>(() => {
        return {
            status: showArchived ? "ARCHIVED" : "ACTIVE",
        };
    }, [showArchived]);

    const { data, isLoading, isError, refetch } = useFacilitiesQuery(filters);

    const facilities = useMemo<Facility[]>(() => data?.items ?? [], [data]);

    const visibleFacilities = useMemo<Facility[]>(() => {
        const src = facilities;
        const q = debouncedQuery.trim().toLowerCase();

        if (!q) return src;

        return src.filter((f) =>
            [f.name, f.address ?? "", f.city ?? ""]
                .filter(Boolean)
                .some((field) => String(field).toLowerCase().includes(q))
        );
    }, [facilities, debouncedQuery]);

    const {
        mutateAsync: createFacility,
        isPending: isCreating,
        error: createError,
    } = useCreateFacilityMutation();

    const {
        mutateAsync: updateFacility,
        isPending: isUpdating,
        error: updateError,
    } = useUpdateFacilityMutation();

    const { mutateAsync: deleteFacility, isPending: isDeleting } =
        useDeleteFacilityMutation();

    const { mutateAsync: archiveFacility, isPending: isArchiving } =
        useArchiveFacilityMutation();

    const { mutateAsync: restoreFacility, isPending: isRestoring } =
        useRestoreFacilityMutation();

    // Expose create trigger to parent via ref
    useImperativeHandle(
        createTriggerRef,
        () => () => {
            setIsCreateOpen(true);
        },
        []
    );

    // ---- Create ----

    const handleCloseCreate = useCallback((open: boolean) => {
        setIsCreateOpen(open);
    }, []);

    const handleCreateSubmit = useCallback(
        async (values: FacilityUpsertValues) => {
            try {
                const optionalFields = buildFacilityOptionalFields(values);

                await createFacility({
                    name: values.name,
                    ...optionalFields,
                });

                setIsCreateOpen(false);
            } catch {
                // El error se refleja en `createError` vía React Query, no cerramos el modal.
            }
        },
        [createFacility]
    );

    // ---- Edit ----
    const handleOpenEdit = useCallback((facility: Facility) => {
        setEditingFacility(facility);
        setIsEditOpen(true);
    }, []);

    const handleEdit = useCallback(
        (id: string) => {
            const found = facilities.find((f) => f.id === id);
            if (!found) return;
            handleOpenEdit(found);
        },
        [facilities, handleOpenEdit]
    );

    const handleCloseEdit = useCallback((open: boolean) => {
        setIsEditOpen(open);
        if (!open) {
            setEditingFacility(null);
        }
    }, []);

    const handleEditSubmit = useCallback(
        async (values: FacilityUpsertValues) => {
            if (!editingFacility) return;

            try {
                const optionalFields = buildFacilityOptionalFields(values);

                await updateFacility({
                    id: editingFacility.id,
                    name: values.name,
                    ...optionalFields,
                });

                setIsEditOpen(false);
                setEditingFacility(null);
            } catch {
                // El error se refleja en `updateError`, mantenemos el modal abierto.
            }
        },
        [editingFacility, updateFacility]
    );

    // ---- Delete ----
    const handleDelete = useCallback(
        (id: string) => {
            const found = facilities.find((f) => f.id === id);
            if (!found) return;
            setFacilityToDelete(found);
            setOpenDelete(true);
        },
        [facilities]
    );

    const confirmDelete = useCallback(async () => {
        if (!facilityToDelete) return;

        try {
            await deleteFacility(facilityToDelete.id);
            setOpenDelete(false);
            setFacilityToDelete(null);
        } catch {
            // El error se podría mostrar con un toast; el modal sigue abierto.
        }
    }, [deleteFacility, facilityToDelete]);

    // ---- Archive ----
    const handleArchive = useCallback(
        (id: string) => {
            const found = facilities.find((f) => f.id === id);
            if (!found) return;
            setFacilityToArchive(found);
            setOpenArchive(true);
        },
        [facilities]
    );

    const confirmArchive = useCallback(async () => {
        if (!facilityToArchive) return;

        try {
            await archiveFacility(facilityToArchive.id);
            setOpenArchive(false);
            setFacilityToArchive(null);
        } catch {
            // Ideal: mostrar toast de error; el modal sigue abierto.
        }
    }, [archiveFacility, facilityToArchive]);

    // ---- Restore ----
    const handleRestore = useCallback(
        (id: string) => {
            const found = facilities.find((f) => f.id === id);
            if (!found) return;
            setFacilityToRestore(found);
            setOpenRestore(true);
        },
        [facilities]
    );

    const confirmRestore = useCallback(async () => {
        if (!facilityToRestore) return;

        try {
            await restoreFacility(facilityToRestore.id);
            setOpenRestore(false);
            setFacilityToRestore(null);
        } catch {
            // Ideal: mostrar toast de error; el modal sigue abierto.
        }
    }, [restoreFacility, facilityToRestore]);

    // Mapear Facility de dominio → valores del formulario de edición
    const editDefaultValues: Partial<FacilityUpsertValues> | undefined =
        useMemo(() => {
            if (!editingFacility) return undefined;
            return {
                name: editingFacility.name,
                address: editingFacility.address ?? "",
                city: editingFacility.city ?? "",
                // description y notes son campos distintos: antes se
                // colapsaban en uno porque el backend no tenía notes.
                description: editingFacility.description ?? "",
                notes: editingFacility.notes ?? "",
                photoUrl: editingFacility.photoUrl ?? "",
            };
        }, [editingFacility]);

    return (
        <>
            <FacilitySearchCard
                total={visibleFacilities.length}
                query={query}
                onQueryChange={setQuery}
                placeholder="Search facility by name, address or city..."
                showArchived={showArchived}
                onToggleArchived={() => setShowArchived(!showArchived)}
            >
                <FacilityTable
                    items={visibleFacilities}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onArchive={handleArchive}
                    onRestore={handleRestore}
                    isError={isError}
                    isLoading={isLoading}
                    onError={refetch}
                    showArchived={showArchived}
                />
            </FacilitySearchCard>

            {/* Modal de creación */}
            <CreateFacilityDialog
                open={isCreateOpen}
                onOpenChange={handleCloseCreate}
                onSubmit={handleCreateSubmit}
                loading={isCreating}
                error={createError?.message ?? null}
            />

            {/* Modal de edición */}
            <EditFacilityDialog
                open={isEditOpen}
                onOpenChange={handleCloseEdit}
                defaultValues={editDefaultValues}
                onSubmit={handleEditSubmit}
                loading={isUpdating}
                error={updateError?.message ?? null}
            />

            {/* Modal de confirmación de borrado */}
            <ConfirmDialog
                open={openDelete}
                onOpenChange={(o) => {
                    setOpenDelete(o);
                    if (!o) setFacilityToDelete(null);
                }}
                title={
                    <ConfirmTitle
                        action="delete"
                        subject={facilityToDelete?.name ?? "this facility"}
                    />
                }
                description="This action cannot be undone."
                confirmLabel="Delete"
                cancelLabel="Cancel"
                loading={isDeleting}
                onConfirm={confirmDelete}
            />

            {/* Modal de confirmación de archivado */}
            <ConfirmDialog
                open={openArchive}
                onOpenChange={(o) => {
                    setOpenArchive(o);
                    if (!o) setFacilityToArchive(null);
                }}
                title={
                    <ConfirmTitle
                        action="archive"
                        subject={facilityToArchive?.name ?? "this facility"}
                    />
                }
                description="This facility will be archived and removed from the active list, but it will not be permanently deleted."
                confirmLabel="Archive"
                cancelLabel="Cancel"
                loading={isArchiving}
                onConfirm={confirmArchive}
            />

            {/* Modal de confirmación de restore */}
            <ConfirmDialog
                open={openRestore}
                onOpenChange={(o) => {
                    setOpenRestore(o);
                    if (!o) setFacilityToRestore(null);
                }}
                title={
                    <ConfirmTitle
                        action="restore"
                        subject={facilityToRestore?.name ?? "this facility"}
                    />
                }
                description="This facility will be restored and moved back to the active list."
                confirmLabel="Restore"
                cancelLabel="Cancel"
                loading={isRestoring}
                onConfirm={confirmRestore}
            />
        </>
    );
};
