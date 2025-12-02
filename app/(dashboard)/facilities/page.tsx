"use client";

import React, { useCallback, useMemo, useState } from "react";
import PageHeader from "@shared/ui/page-header";
import FacilitySearchCard from "@features/facilities/ui/FacilitySearchCard";
import type { Facility, FacilityListFilter } from "@entities/facility/model";
import FacilityTable from "@features/facilities/ui/FacilityTable";
import { useDebouncedSearch } from "@shared/lib/useDebouncedSearch";
import CreateFacilityDialog from "@features/facilities/ui/CreateFacilityDialog";
import type { FacilityUpsertValues } from "@features/facilities/ui/FacilityUpsertDialog";
import { useCreateFacilityMutation } from "@features/facilities/ui/hooks/useCreateFacilityMutation";
import { useFacilitiesQuery } from "@features/facilities/ui/hooks/useFacilitiesQuery";

export default function FacilitiesPage() {
  const [query, setQuery] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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
    isLoading: isCreating,
    error: createError,
  } = useCreateFacilityMutation();

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
          // status y demás defaults los resuelve el usecase
        });
        setIsCreateOpen(false);
      } catch {
        // El error se refleja en `createError` vía React Query, no cerramos el modal.
      }
    },
    [createFacility]
  );

  const handleEdit = useCallback((id: string) => {
    // TODO: Navegar a /facilities/[id]/edit o similar.
    // router.push(`/facilities/${id}/edit`);
  }, []);

  const handleDelete = useCallback((id: string) => {
    // TODO: Abrir modal de confirmación y disparar useMutation de delete.
  }, []);

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
    </>
  );
}
