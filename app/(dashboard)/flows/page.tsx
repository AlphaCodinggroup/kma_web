"use client";

import { useUrlParameter } from "@shared/lib/useUrlParameter";
import React from "react";
import PageHeader from "@shared/ui/page-header";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useSession } from "@processes/auth/hooks";
import type {
  CreateFlowCategoryInput,
  FlowCategory,
  UpdateFlowCategoryInput,
} from "@entities/flow/model";
import {
  FlowsSection,
  type FlowItemVM,
} from "@features/flows/ui/FlowSection";
import { FlowCategoriesSection } from "@features/flows/ui/FlowCategoriesSection";
import { FlowCategoryDialog } from "@features/flows/ui/FlowCategoryDialog";
import SearchInput from "@shared/ui/search-input";
import { FilterSelect, type FilterOption } from "@shared/ui/filter-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/ui/tabs";
import { useFlowsQuery } from "@features/flows/lib/useFlowsQuery";
import {
  useCreateFlowCategory,
  useDeleteFlowCategory,
  useFlowCategoriesQuery,
  useUpdateFlowCategory,
} from "@features/flows/lib/useFlowCategoriesQuery";
import { Loading } from "@shared/ui/Loading";
import { Button } from "@shared/ui/controls";

const CATEGORY_STATUS_OPTIONS: readonly FilterOption[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export default function FlowsPage() {
  const { isAdmin } = useSession();
  const [tabParam, setTabParam] = useUrlParameter("tab");
  const activeTab = tabParam === "categories" ? "categories" : "flows";

  const [search, setSearch] = useUrlParameter("q");
  const [categorySearch, setCategorySearch] = useUrlParameter("cq");
  const [categoryStatus, setCategoryStatus] = useUrlParameter("cstatus");

  const { data, isLoading, error, refetch } = useFlowsQuery(true);
  const {
    data: categoriesData,
    isLoading: isCategoriesLoading,
    error: categoriesError,
    refetch: refetchCategories,
  } = useFlowCategoriesQuery(true);

  const createCategory = useCreateFlowCategory();
  const updateCategory = useUpdateFlowCategory();
  const deleteCategory = useDeleteFlowCategory();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<FlowCategory | null>(null);
  const [dialogError, setDialogError] = React.useState<string | null>(null);

  const handleTabChange = React.useCallback(
    (nextTab: string) => {
      setTabParam(nextTab === "categories" ? "categories" : "");
    },
    [setTabParam]
  );

  const handleSearchChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    [setSearch]
  );

  const handleCategorySearchChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCategorySearch(e.target.value);
    },
    [setCategorySearch]
  );

  const categories = React.useMemo(
    () => categoriesData?.categories ?? [],
    [categoriesData]
  );

  const categoryNameById = React.useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((cat) => map.set(cat.id, cat.name));
    return map;
  }, [categories]);

  const flows: FlowItemVM[] = React.useMemo(() => {
    if (!data?.flows) return [];
    return data.flows.map((f) => ({
      id: f.id,
      title: f.title,
      description: f.description ?? "",
      flowId: f.id,
      code: f.code,
      categoryName: f.category ? (categoryNameById.get(f.category) ?? f.category) : undefined,
    }));
  }, [data, categoryNameById]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return flows;
    return flows.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        (i.description?.toLowerCase().includes(q) ?? false) ||
        (i.categoryName?.toLowerCase().includes(q) ?? false)
    );
  }, [search, flows]);

  const filteredCategories = React.useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    return categories.filter((cat) => {
      if (categoryStatus === "active" && !cat.isActive) return false;
      if (categoryStatus === "inactive" && cat.isActive) return false;
      if (!q) return true;
      return (
        cat.name.toLowerCase().includes(q) ||
        (cat.description?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [categories, categorySearch, categoryStatus]);

  const openCreateCategory = () => {
    setEditingCategory(null);
    setDialogError(null);
    setDialogOpen(true);
  };

  const openEditCategory = (category: FlowCategory) => {
    setEditingCategory(category);
    setDialogError(null);
    setDialogOpen(true);
  };

  const handleSaveCategory = async (
    values: CreateFlowCategoryInput | UpdateFlowCategoryInput
  ) => {
    setDialogError(null);
    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({
          id: editingCategory.id,
          input: values as UpdateFlowCategoryInput,
        });
      } else {
        await createCategory.mutateAsync(values as CreateFlowCategoryInput);
      }
      setDialogOpen(false);
      setEditingCategory(null);
    } catch (err) {
      setDialogError(
        err instanceof Error ? err.message : "Could not save category. Please try again."
      );
    }
  };

  const handleDeleteCategory = async (category: FlowCategory, permanent: boolean) => {
    await deleteCategory.mutateAsync({ id: category.id, permanent });
  };

  const hasCategoryFilters = Boolean(categorySearch.trim() || categoryStatus);

  const actionSlot = isAdmin ? (
    activeTab === "categories" ? (
      <Button type="button" fullWidth={false} onClick={openCreateCategory} className="gap-2 whitespace-nowrap">
        <Plus className="h-4 w-4" aria-hidden="true" />
        <span>Create Category</span>
      </Button>
    ) : (
      <Link href="/flows/new" className="btn gap-2 whitespace-nowrap no-underline">
        <Plus className="h-4 w-4" aria-hidden="true" />
        Create Flow
      </Link>
    )
  ) : undefined;

  return (
    <section className="flex w-full flex-col gap-6">
      <PageHeader
        title="Flows"
        subtitle="Build the steps, questions, and categories that organize each audit."
        className="mb-0"
        actionSlot={actionSlot}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList aria-label="Flows management sections">
          <TabsTrigger value="flows">
            Flows ({flows.length})
          </TabsTrigger>
          <TabsTrigger value="categories">
            Categories ({categories.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flows">
          <div className="overflow-hidden rounded-lg border border-[var(--kma-border)] bg-[var(--kma-surface)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--kma-border)] px-4 py-4 sm:px-6">
              <div>
                <h2 className="text-base font-semibold text-[var(--kma-fg)]">Audit templates</h2>
                <p className="mt-1 text-xs text-[var(--kma-muted)]">
                  {filtered.length} {filtered.length === 1 ? "template" : "templates"}
                  {search ? " found" : " available"}
                </p>
              </div>
              <div className="w-full sm:w-72">
                <SearchInput
                  placeholder="Search flows..."
                  aria-label="Search flows"
                  value={search}
                  onChange={handleSearchChange}
                />
              </div>
            </div>
            {error ? (
              <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--kma-border)] px-4 py-4 sm:px-6">
                <p className="text-sm text-[var(--kma-danger)]">Error loading flows: {error.message}</p>
                <Button type="button" variant="secondary" fullWidth={false} onClick={() => refetch()}>
                  Try again
                </Button>
              </div>
            ) : null}
            {isLoading ? (
              <Loading text="Loading flows…" />
            ) : (
              <>
                <FlowsSection items={filtered} onDeleted={() => refetch()} />
                {filtered.length === 0 && !error ? (
                  <div className="px-5 py-12 text-center">
                    <p className="font-semibold">
                      {search ? "No flows match your search" : "No flow templates yet"}
                    </p>
                    <p className="mt-1 text-sm text-[var(--kma-muted)]">
                      {search
                        ? "Try another name or clear the search."
                        : "Create a template to guide auditors through an inspection."}
                    </p>
                    {search ? (
                      <Button type="button" variant="secondary" fullWidth={false} className="mt-4" onClick={() => setSearch("")}>
                        Clear search
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="categories">
          <div className="overflow-hidden rounded-lg border border-[var(--kma-border)] bg-[var(--kma-surface)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--kma-border)] px-4 py-4 sm:px-6">
              <div>
                <h2 className="text-base font-semibold text-[var(--kma-fg)]">Flow categories</h2>
                <p className="mt-1 text-xs text-[var(--kma-muted)]">
                  {filteredCategories.length}{" "}
                  {filteredCategories.length === 1 ? "category" : "categories"}
                  {hasCategoryFilters ? " found" : " available"}
                </p>
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                <FilterSelect
                  value={categoryStatus}
                  onChange={setCategoryStatus}
                  options={CATEGORY_STATUS_OPTIONS}
                  allLabel="All statuses"
                  ariaLabel="Filter categories by status"
                />
                <div className="w-full sm:w-64">
                  <SearchInput
                    placeholder="Search categories..."
                    aria-label="Search categories"
                    value={categorySearch}
                    onChange={handleCategorySearchChange}
                  />
                </div>
              </div>
            </div>
            {categoriesError ? (
              <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--kma-border)] px-4 py-4 sm:px-6">
                <p className="text-sm text-[var(--kma-danger)]">
                  Error loading categories: {categoriesError.message}
                </p>
                <Button type="button" variant="secondary" fullWidth={false} onClick={() => refetchCategories()}>
                  Try again
                </Button>
              </div>
            ) : null}
            {isCategoriesLoading ? (
              <Loading text="Loading categories…" />
            ) : (
              <>
                <FlowCategoriesSection
                  items={filteredCategories}
                  onEdit={openEditCategory}
                  onDelete={handleDeleteCategory}
                />
                {filteredCategories.length === 0 && !categoriesError ? (
                  <div className="px-5 py-12 text-center">
                    <p className="font-semibold">
                      {hasCategoryFilters
                        ? "No categories match your filters"
                        : "No categories yet"}
                    </p>
                    <p className="mt-1 text-sm text-[var(--kma-muted)]">
                      {hasCategoryFilters
                        ? "Try adjusting your search or status filter."
                        : "Create a category to group audit flows by area or topic."}
                    </p>
                    {hasCategoryFilters ? (
                      <Button
                        type="button"
                        variant="secondary"
                        fullWidth={false}
                        className="mt-4"
                        onClick={() => {
                          setCategorySearch("");
                          setCategoryStatus("");
                        }}
                      >
                        Clear filters
                      </Button>
                    ) : isAdmin ? (
                      <Button
                        type="button"
                        fullWidth={false}
                        className="mt-4 gap-2"
                        onClick={openCreateCategory}
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        <span>Create Category</span>
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <FlowCategoryDialog
        open={dialogOpen}
        onOpenChange={(nextOpen) => {
          setDialogOpen(nextOpen);
          if (!nextOpen) {
            setEditingCategory(null);
            setDialogError(null);
          }
        }}
        category={editingCategory}
        isSubmitting={createCategory.isPending || updateCategory.isPending}
        error={dialogError}
        onSubmit={handleSaveCategory}
      />
    </section>
  );
}
