"use client";

import React, { useCallback, useMemo, useState } from "react";
import PageHeader from "@shared/ui/page-header";
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
import ConfirmDialog from "@shared/ui/confirm-dialog";
import ConfirmTitle from "@shared/ui/confirm-title";

export default function FacilitiesPage() {
  const [query, setQuery] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);

  const [openDelete, setOpenDelete] = useState(false);
  const [facilityToDelete, setFacilityToDelete] = useState<Facility | null>(
    null
  );

  const debouncedQuery = useDebouncedSearch(query);

  const filters = useMemo<FacilityListFilter | undefined>(() => {
    if (!debouncedQuery) return undefined;

    return {
      search: debouncedQuery,
    };
  }, [debouncedQuery]);

  const { data, isLoading, isError, refetch } = useFacilitiesQuery(filters);

  const facilities = useMemo<Facility[]>(() => data?.items ?? [], [data]);

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

  // ---- Create ----
  const handleOpenCreate = useCallback(() => setIsCreateOpen(true), []);

  const handleCloseCreate = useCallback((open: boolean) => {
    setIsCreateOpen(open);
  }, []);

  const handleCreateSubmit = useCallback(
    async (values: FacilityUpsertValues) => {
      try {
        await createFacility({
          name: values.name,
          address: values.address,
          city: values.city,
          notes: values.notes,
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
        await updateFacility({
          id: editingFacility.id,
          name: values.name,
          address: values.address,
          city: values.city,
          notes: values.notes,
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

  // Mapear Facility de dominio → valores del formulario de edición
  const editDefaultValues: Partial<FacilityUpsertValues> | undefined =
    useMemo(() => {
      if (!editingFacility) return undefined;
      return {
        name: editingFacility.name,
        address: editingFacility.address ?? "",
        city: editingFacility.city ?? "",
        notes: editingFacility.notes ?? "",
      };
    }, [editingFacility]);

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Facilities Management"
          subtitle="Manage facility locations for audits"
          verticalAlign="center"
          primaryAction={{
            label: "New Facility",
            onClick: handleOpenCreate,
          }}
        />

        <FacilitySearchCard
          total={facilities.length}
          query={query}
          onQueryChange={setQuery}
          placeholder="Search facility by name, address or city..."
        >
          <FacilityTable
            items={facilities}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isError={isError}
            isLoading={isLoading}
            onError={refetch}
          />
        </FacilitySearchCard>
      </div>

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
    </>
  );
}
