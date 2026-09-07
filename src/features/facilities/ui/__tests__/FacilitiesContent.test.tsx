/**
 * FacilitiesContent: listado con búsqueda, alternancia entre activas y
 * archivadas, estados de carga/error/vacío y los flujos de alta, edición,
 * borrado, archivado y restauración.
 */
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MutableRefObject } from "react";
import type { Facility } from "@entities/facility/model";

// ---- estado mutable que leen los mocks ----
const state = {
    data: undefined as { items: Facility[] } | undefined,
    isLoading: false,
    isError: false,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    isArchiving: false,
    isRestoring: false,
    createError: null as Error | null,
    updateError: null as Error | null,
    isAdmin: true,
};

const refetchMock = vi.fn();
const createFacilityMock = vi.fn();
const updateFacilityMock = vi.fn();
const deleteFacilityMock = vi.fn();
const archiveFacilityMock = vi.fn();
const restoreFacilityMock = vi.fn();
const facilitiesQuerySpy = vi.fn();

vi.mock("@features/facilities/ui/hooks/useFacilitiesQuery", () => ({
    useFacilitiesQuery: (...args: unknown[]) => {
        facilitiesQuerySpy(...args);
        return {
            data: state.data,
            isLoading: state.isLoading,
            isError: state.isError,
            refetch: refetchMock,
        };
    },
}));

vi.mock("@features/facilities/ui/hooks/useCreateFacilityMutation", () => ({
    useCreateFacilityMutation: () => ({
        mutateAsync: createFacilityMock,
        isPending: state.isCreating,
        error: state.createError,
    }),
}));

vi.mock("@features/facilities/ui/hooks/useUpdateFacilityMutation", () => ({
    useUpdateFacilityMutation: () => ({
        mutateAsync: updateFacilityMock,
        isPending: state.isUpdating,
        error: state.updateError,
    }),
}));

vi.mock("@features/facilities/ui/hooks/useDeleteFacilityMutation", () => ({
    useDeleteFacilityMutation: () => ({
        mutateAsync: deleteFacilityMock,
        isPending: state.isDeleting,
    }),
}));

vi.mock("@features/facilities/ui/hooks/useArchiveFacilityMutation", () => ({
    useArchiveFacilityMutation: () => ({
        mutateAsync: archiveFacilityMock,
        isPending: state.isArchiving,
    }),
}));

vi.mock("@features/facilities/ui/hooks/useRestoreFacilityMutation", () => ({
    useRestoreFacilityMutation: () => ({
        mutateAsync: restoreFacilityMock,
        isPending: state.isRestoring,
    }),
}));

vi.mock("@processes/auth/hooks", () => ({
    useSession: () => ({ isAdmin: state.isAdmin }),
}));

import { FacilitiesContent } from "../FacilitiesContent";

// ---- fixtures ----

function makeFacility(overrides: Record<string, unknown> = {}): Facility {
    return {
        id: "f-1",
        projectId: "p-1",
        name: "Facility One",
        status: "ACTIVE",
        userIds: [],
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        createdBy: "admin",
        ...overrides,
    } as unknown as Facility;
}

const facilityNorth = makeFacility({
    id: "f-north",
    name: "North Plant",
    address: "1 Main Street",
    city: "Springfield",
    description: "Main production plant",
    photoUrl: "https://cdn.kma.io/north.png",
    createdAt: "2026-02-10T09:15:00Z",
});

// Sin description: la edición debe caer a `notes`.
const facilityHarbor = makeFacility({
    id: "f-harbor",
    name: "Harbor Depot",
    address: "9 Dock Road",
    city: "Bayview",
    notes: "Legacy notes",
    createdAt: "2025-11-05T14:40:00Z",
});

// Facility mínima: sin dirección, sin ciudad, sin textos y sin fecha.
const facilityMinimal = makeFacility({
    id: "f-min",
    name: "Bare Site",
    createdAt: "",
});

// ---- helpers ----

function bodyRows(): HTMLTableRowElement[] {
    return screen.getAllByRole("row").slice(1) as HTMLTableRowElement[];
}

function rowNames(): string[] {
    return bodyRows().map((row) => row.cells[0]?.textContent?.trim() ?? "");
}

function rowFor(name: string): HTMLElement {
    const row = screen.getByText(name).closest("tr");
    if (!row) throw new Error(`No row found for "${name}"`);
    return row;
}

function renderContent(
    createTriggerRef?: MutableRefObject<(() => void) | undefined>
) {
    if (createTriggerRef) {
        return render(<FacilitiesContent createTriggerRef={createTriggerRef} />);
    }
    return render(<FacilitiesContent />);
}

function makeTriggerRef(): MutableRefObject<(() => void) | undefined> {
    return { current: undefined };
}

function openCreateDialog(ref: MutableRefObject<(() => void) | undefined>) {
    act(() => {
        ref.current?.();
    });
}

async function fillRequiredFields(name: string) {
    await userEvent.type(screen.getByLabelText("Name"), name);
    await userEvent.type(screen.getByLabelText("Address"), "5 Elm Street");
    await userEvent.type(screen.getByLabelText("City, State"), "Shelbyville");
}

describe("FacilitiesContent", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        state.data = { items: [facilityNorth, facilityHarbor, facilityMinimal] };
        state.isLoading = false;
        state.isError = false;
        state.isCreating = false;
        state.isUpdating = false;
        state.isDeleting = false;
        state.isArchiving = false;
        state.isRestoring = false;
        state.createError = null;
        state.updateError = null;
        state.isAdmin = true;
        createFacilityMock.mockResolvedValue(makeFacility());
        updateFacilityMock.mockResolvedValue(makeFacility());
        deleteFacilityMock.mockResolvedValue(undefined);
        archiveFacilityMock.mockResolvedValue(makeFacility());
        restoreFacilityMock.mockResolvedValue(makeFacility());
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("listing", () => {
        it("renders a row per facility with address, city and created date", () => {
            renderContent();

            expect(
                screen.getByRole("heading", { name: "Facilities" })
            ).toBeInTheDocument();
            expect(screen.getByText("Active facilities: 3")).toBeInTheDocument();

            const north = rowFor("North Plant");
            expect(
                within(north).getByText("1 Main Street · Springfield")
            ).toBeInTheDocument();
            expect(
                within(north).getByText("2026-02-10 09:15")
            ).toBeInTheDocument();
        });

        it("renders dash fallbacks for a facility without address, city or date", () => {
            renderContent();

            const minimal = rowFor("Bare Site");
            expect(within(minimal).getAllByText("—")).toHaveLength(2);
        });

        it("asks the backend for the active facilities", () => {
            renderContent();

            expect(facilitiesQuerySpy).toHaveBeenCalledWith({ status: "ACTIVE" });
        });

        it("renders the loading state while the query is in flight", () => {
            state.data = undefined;
            state.isLoading = true;

            renderContent();

            expect(screen.getByText("Loading facilities…")).toBeInTheDocument();
            expect(screen.queryByRole("table")).not.toBeInTheDocument();
        });

        it("renders the retry affordance on error and refetches when clicked", async () => {
            state.data = undefined;
            state.isError = true;

            renderContent();

            expect(
                screen.getByText("Failed to load facilities. Please try again.")
            ).toBeInTheDocument();

            await userEvent.click(screen.getByRole("button", { name: "Retry" }));

            expect(refetchMock).toHaveBeenCalledTimes(1);
        });

        it("renders the empty message when the backend returns no facilities", () => {
            state.data = { items: [] };

            renderContent();

            expect(screen.getByText("No facilities found")).toBeInTheDocument();
            expect(screen.getByText("Active facilities: 0")).toBeInTheDocument();
        });

        it("renders the empty message when the payload has no items at all", () => {
            state.data = undefined;

            renderContent();

            expect(screen.getByText("No facilities found")).toBeInTheDocument();
        });
    });

    describe("archived toggle", () => {
        it("switches the query, the subtitle and the row actions", async () => {
            renderContent();

            expect(
                within(rowFor("North Plant")).getByRole("button", {
                    name: "Archive facility",
                })
            ).toBeInTheDocument();

            await userEvent.click(
                screen.getByRole("button", { name: "Show archived facilities" })
            );

            expect(facilitiesQuerySpy).toHaveBeenLastCalledWith({
                status: "ARCHIVED",
            });
            expect(screen.getByText("Archived facilities: 3")).toBeInTheDocument();

            const north = rowFor("North Plant");
            expect(
                within(north).getByRole("button", { name: "Restore facility" })
            ).toBeInTheDocument();
            expect(
                within(north).queryByRole("button", { name: "Archive facility" })
            ).not.toBeInTheDocument();
            expect(
                within(north).queryByRole("button", { name: "Delete facility" })
            ).not.toBeInTheDocument();
        });

        it("switches back to the active facilities", async () => {
            renderContent();

            await userEvent.click(
                screen.getByRole("button", { name: "Show archived facilities" })
            );
            await userEvent.click(
                screen.getByRole("button", { name: "Show active facilities" })
            );

            expect(facilitiesQuerySpy).toHaveBeenLastCalledWith({
                status: "ACTIVE",
            });
            expect(screen.getByText("Active facilities: 3")).toBeInTheDocument();
        });
    });

    describe("search", () => {
        it.each<[string, string[]]>([
            ["North", ["North Plant"]],
            ["dock road", ["Harbor Depot"]],
            ["bayview", ["Harbor Depot"]],
        ])("filters the list by %s", async (query, expected) => {
            renderContent();

            await userEvent.type(screen.getByLabelText("Search facilities"), query);

            await waitFor(() => {
                expect(rowNames()).toEqual(expected);
            });
        });

        it("shows the empty message when nothing matches the query", async () => {
            renderContent();

            await userEvent.type(
                screen.getByLabelText("Search facilities"),
                "zzz-nope"
            );

            await waitFor(() => {
                expect(screen.getByText("No facilities found")).toBeInTheDocument();
            });
            expect(screen.getByText("Active facilities: 0")).toBeInTheDocument();
        });

        it("ignores a query shorter than the debounce minimum", async () => {
            renderContent();

            await userEvent.type(screen.getByLabelText("Search facilities"), "n");

            await waitFor(() => {
                expect(rowNames()).toHaveLength(3);
            });
        });
    });

    describe("create", () => {
        it("registers the create callback in the trigger ref", () => {
            const ref = makeTriggerRef();

            renderContent(ref);

            expect(typeof ref.current).toBe("function");
            expect(
                screen.queryByRole("heading", { name: "Create New Facility" })
            ).not.toBeInTheDocument();

            openCreateDialog(ref);

            expect(
                screen.getByRole("heading", { name: "Create New Facility" })
            ).toBeInTheDocument();
        });

        it("renders without a trigger ref", () => {
            renderContent();

            expect(
                screen.queryByRole("heading", { name: "Create New Facility" })
            ).not.toBeInTheDocument();
        });

        it("submits the name plus every optional field and closes on success", async () => {
            const ref = makeTriggerRef();
            renderContent(ref);
            openCreateDialog(ref);

            await fillRequiredFields("  Willow Site  ");
            await userEvent.type(
                screen.getByLabelText("Description"),
                "Backup warehouse"
            );

            await userEvent.click(
                screen.getByRole("button", { name: "Create Facility" })
            );

            expect(createFacilityMock).toHaveBeenCalledWith({
                name: "Willow Site",
                address: "5 Elm Street",
                city: "Shelbyville",
                description: "Backup warehouse",
            });
            expect(
                screen.queryByRole("heading", { name: "Create New Facility" })
            ).not.toBeInTheDocument();
        });

        it("submits without a description when it is left empty", async () => {
            const ref = makeTriggerRef();
            renderContent(ref);
            openCreateDialog(ref);

            await fillRequiredFields("Willow Site");
            await userEvent.click(
                screen.getByRole("button", { name: "Create Facility" })
            );

            expect(createFacilityMock).toHaveBeenCalledWith({
                name: "Willow Site",
                address: "5 Elm Street",
                city: "Shelbyville",
            });
        });

        it("keeps the dialog open when the creation fails", async () => {
            createFacilityMock.mockRejectedValue(new Error("create boom"));
            const ref = makeTriggerRef();
            renderContent(ref);
            openCreateDialog(ref);

            await fillRequiredFields("Willow Site");
            await userEvent.click(
                screen.getByRole("button", { name: "Create Facility" })
            );

            await waitFor(() => {
                expect(createFacilityMock).toHaveBeenCalled();
            });
            expect(
                screen.getByRole("heading", { name: "Create New Facility" })
            ).toBeInTheDocument();
        });

        it("surfaces the mutation error inside the dialog", () => {
            state.createError = new Error("facility already exists");
            const ref = makeTriggerRef();
            renderContent(ref);
            openCreateDialog(ref);

            expect(
                screen.getByText("facility already exists")
            ).toBeInTheDocument();
        });

        it("closes the dialog from the close button", async () => {
            const ref = makeTriggerRef();
            renderContent(ref);
            openCreateDialog(ref);

            await userEvent.click(screen.getByRole("button", { name: "Close" }));

            expect(
                screen.queryByRole("heading", { name: "Create New Facility" })
            ).not.toBeInTheDocument();
        });
    });

    describe("edit", () => {
        it("opens the edit dialog prefilled with the facility values", async () => {
            renderContent();

            await userEvent.click(
                within(rowFor("North Plant")).getByRole("button", {
                    name: "Edit facility",
                })
            );

            expect(
                screen.getByRole("heading", { name: "Edit Facility" })
            ).toBeInTheDocument();
            expect(screen.getByLabelText("Name")).toHaveValue("North Plant");
            expect(screen.getByLabelText("Address")).toHaveValue("1 Main Street");
            expect(screen.getByLabelText("City, State")).toHaveValue("Springfield");
            expect(screen.getByLabelText("Description")).toHaveValue(
                "Main production plant"
            );
            expect(
                screen.getByRole("img", { name: "Facility photo preview" })
            ).toHaveAttribute("src", "https://cdn.kma.io/north.png");
        });

        // description y notes son campos distintos: antes se colapsaban en uno
        // porque el backend no tenía notes, y la interfaz no podía separarlos.
        it("loads notes into its own field, not into the description", async () => {
            renderContent();

            await userEvent.click(
                within(rowFor("Harbor Depot")).getByRole("button", {
                    name: "Edit facility",
                })
            );

            expect(screen.getByLabelText("Description")).toHaveValue("");
            expect(screen.getByLabelText("Notes")).toHaveValue("Legacy notes");
        });

        it("leaves every optional field empty when the facility has none", async () => {
            renderContent();

            await userEvent.click(
                within(rowFor("Bare Site")).getByRole("button", {
                    name: "Edit facility",
                })
            );

            expect(screen.getByLabelText("Address")).toHaveValue("");
            expect(screen.getByLabelText("City, State")).toHaveValue("");
            expect(screen.getByLabelText("Description")).toHaveValue("");
            expect(
                screen.queryByRole("img", { name: "Facility photo preview" })
            ).not.toBeInTheDocument();
        });

        it("submits the facility id together with the edited values", async () => {
            renderContent();

            await userEvent.click(
                within(rowFor("North Plant")).getByRole("button", {
                    name: "Edit facility",
                })
            );
            await userEvent.clear(screen.getByLabelText("Name"));
            await userEvent.type(screen.getByLabelText("Name"), "North Plant II");
            await userEvent.click(
                screen.getByRole("button", { name: "Update Facility" })
            );

            // notes viaja como campo propio, vacío cuando la facility no tiene.
            expect(updateFacilityMock).toHaveBeenCalledWith({
                id: "f-north",
                name: "North Plant II",
                address: "1 Main Street",
                city: "Springfield",
                description: "Main production plant",
                notes: "",
                photoUrl: "https://cdn.kma.io/north.png",
            });
            expect(
                screen.queryByRole("heading", { name: "Edit Facility" })
            ).not.toBeInTheDocument();
        });

        // FIXME: vaciar un campo opcional debería llegar al submit como cadena
        // vacía para que el backend lo borre. Hoy FacilityUpsertDialog y
        // buildFacilityOptionalFields omiten la clave, así que la descripción
        // vieja queda intacta en el backend. El test fija el comportamiento
        // ACTUAL.
        // Vaciar un campo lo borra: antes se omitía del payload, el backend
        // conservaba el valor viejo y el usuario veía el cambio como aplicado.
        it("sends an emptied description so the backend clears it", async () => {
            renderContent();

            await userEvent.click(
                within(rowFor("North Plant")).getByRole("button", {
                    name: "Edit facility",
                })
            );
            await userEvent.clear(screen.getByLabelText("Description"));
            await userEvent.click(
                screen.getByRole("button", { name: "Update Facility" })
            );

            const payload = updateFacilityMock.mock.calls[0]?.[0];
            expect(payload).toMatchObject({
                id: "f-north",
                name: "North Plant",
                description: "",
            });
        });

        it("drops the facility from the state when the edit dialog is dismissed", async () => {
            renderContent();

            await userEvent.click(
                within(rowFor("North Plant")).getByRole("button", {
                    name: "Edit facility",
                })
            );
            await userEvent.click(screen.getByRole("button", { name: "Close" }));

            expect(
                screen.queryByRole("heading", { name: "Edit Facility" })
            ).not.toBeInTheDocument();
            expect(screen.getByRole("table")).toBeInTheDocument();
        });

        it("keeps the dialog open when the update fails", async () => {
            updateFacilityMock.mockRejectedValue(new Error("update boom"));
            renderContent();

            await userEvent.click(
                within(rowFor("North Plant")).getByRole("button", {
                    name: "Edit facility",
                })
            );
            await userEvent.click(
                screen.getByRole("button", { name: "Update Facility" })
            );

            await waitFor(() => {
                expect(updateFacilityMock).toHaveBeenCalled();
            });
            expect(
                screen.getByRole("heading", { name: "Edit Facility" })
            ).toBeInTheDocument();
        });

        it("surfaces the update error inside the dialog", async () => {
            state.updateError = new Error("cannot update");
            renderContent();

            await userEvent.click(
                within(rowFor("North Plant")).getByRole("button", {
                    name: "Edit facility",
                })
            );

            expect(screen.getByText("cannot update")).toBeInTheDocument();
        });

        it("blocks the form controls while the update is pending", async () => {
            state.isUpdating = true;
            renderContent();

            await userEvent.click(
                within(rowFor("North Plant")).getByRole("button", {
                    name: "Edit facility",
                })
            );

            expect(screen.getByLabelText("Name")).toBeDisabled();
            expect(screen.getByLabelText("Address")).toBeDisabled();
            expect(screen.getByLabelText("City, State")).toBeDisabled();
            expect(screen.getByLabelText("Description")).toBeDisabled();
            expect(
                screen.getByRole("button", { name: "Loading..." })
            ).toBeDisabled();
        });
    });

    describe("delete", () => {
        it("asks for confirmation and deletes the selected facility", async () => {
            renderContent();

            await userEvent.click(
                within(rowFor("North Plant")).getByRole("button", {
                    name: "Delete facility",
                })
            );

            expect(screen.getByText(/Do you want to delete/)).toBeInTheDocument();
            expect(
                screen.getByText("This action cannot be undone.")
            ).toBeInTheDocument();

            await userEvent.click(screen.getByRole("button", { name: "Delete" }));

            expect(deleteFacilityMock).toHaveBeenCalledWith("f-north");
            await waitFor(() => {
                expect(
                    screen.queryByText(/Do you want to delete/)
                ).not.toBeInTheDocument();
            });
        });

        it("keeps the confirmation open when the deletion fails", async () => {
            deleteFacilityMock.mockRejectedValue(new Error("delete boom"));
            renderContent();

            await userEvent.click(
                within(rowFor("North Plant")).getByRole("button", {
                    name: "Delete facility",
                })
            );
            await userEvent.click(screen.getByRole("button", { name: "Delete" }));

            await waitFor(() => {
                expect(deleteFacilityMock).toHaveBeenCalled();
            });
            expect(screen.getByText(/Do you want to delete/)).toBeInTheDocument();
        });

        it("dismisses the confirmation without deleting", async () => {
            renderContent();

            await userEvent.click(
                within(rowFor("North Plant")).getByRole("button", {
                    name: "Delete facility",
                })
            );
            await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

            expect(
                screen.queryByText(/Do you want to delete/)
            ).not.toBeInTheDocument();
            expect(deleteFacilityMock).not.toHaveBeenCalled();
        });

        it("blocks the confirmation buttons while the deletion is pending", async () => {
            state.isDeleting = true;
            renderContent();

            await userEvent.click(
                within(rowFor("North Plant")).getByRole("button", {
                    name: "Delete facility",
                })
            );

            expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
            await userEvent.click(
                screen.getByRole("button", { name: "Loading..." })
            );
            expect(deleteFacilityMock).not.toHaveBeenCalled();
        });
    });

    describe("archive", () => {
        it("asks for confirmation and archives the selected facility", async () => {
            renderContent();

            await userEvent.click(
                within(rowFor("North Plant")).getByRole("button", {
                    name: "Archive facility",
                })
            );

            expect(screen.getByText(/Do you want to archive/)).toBeInTheDocument();
            expect(
                screen.getByText(
                    "This facility will be archived and removed from the active list, but it will not be permanently deleted."
                )
            ).toBeInTheDocument();

            await userEvent.click(screen.getByRole("button", { name: "Archive" }));

            expect(archiveFacilityMock).toHaveBeenCalledWith("f-north");
            await waitFor(() => {
                expect(
                    screen.queryByText(/Do you want to archive/)
                ).not.toBeInTheDocument();
            });
        });

        it("keeps the confirmation open when the archive fails", async () => {
            archiveFacilityMock.mockRejectedValue(new Error("archive boom"));
            renderContent();

            await userEvent.click(
                within(rowFor("Harbor Depot")).getByRole("button", {
                    name: "Archive facility",
                })
            );
            await userEvent.click(screen.getByRole("button", { name: "Archive" }));

            await waitFor(() => {
                expect(archiveFacilityMock).toHaveBeenCalled();
            });
            expect(screen.getByText(/Do you want to archive/)).toBeInTheDocument();
        });

        it("dismisses the archive confirmation", async () => {
            renderContent();

            await userEvent.click(
                within(rowFor("North Plant")).getByRole("button", {
                    name: "Archive facility",
                })
            );
            await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

            expect(
                screen.queryByText(/Do you want to archive/)
            ).not.toBeInTheDocument();
            expect(archiveFacilityMock).not.toHaveBeenCalled();
        });
    });

    describe("restore", () => {
        it("asks for confirmation and restores the selected facility", async () => {
            renderContent();

            await userEvent.click(
                screen.getByRole("button", { name: "Show archived facilities" })
            );
            await userEvent.click(
                within(rowFor("North Plant")).getByRole("button", {
                    name: "Restore facility",
                })
            );

            expect(screen.getByText(/Do you want to restore/)).toBeInTheDocument();
            expect(
                screen.getByText(
                    "This facility will be restored and moved back to the active list."
                )
            ).toBeInTheDocument();

            await userEvent.click(screen.getByRole("button", { name: "Restore" }));

            expect(restoreFacilityMock).toHaveBeenCalledWith("f-north");
            await waitFor(() => {
                expect(
                    screen.queryByText(/Do you want to restore/)
                ).not.toBeInTheDocument();
            });
        });

        it("keeps the confirmation open when the restore fails", async () => {
            restoreFacilityMock.mockRejectedValue(new Error("restore boom"));
            renderContent();

            await userEvent.click(
                screen.getByRole("button", { name: "Show archived facilities" })
            );
            await userEvent.click(
                within(rowFor("Harbor Depot")).getByRole("button", {
                    name: "Restore facility",
                })
            );
            await userEvent.click(screen.getByRole("button", { name: "Restore" }));

            await waitFor(() => {
                expect(restoreFacilityMock).toHaveBeenCalled();
            });
            expect(screen.getByText(/Do you want to restore/)).toBeInTheDocument();
        });

        it("dismisses the restore confirmation", async () => {
            renderContent();

            await userEvent.click(
                screen.getByRole("button", { name: "Show archived facilities" })
            );
            await userEvent.click(
                within(rowFor("North Plant")).getByRole("button", {
                    name: "Restore facility",
                })
            );
            await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

            expect(
                screen.queryByText(/Do you want to restore/)
            ).not.toBeInTheDocument();
            expect(restoreFacilityMock).not.toHaveBeenCalled();
        });

        it("blocks the restore confirmation while the mutation is pending", async () => {
            state.isRestoring = true;
            renderContent();

            await userEvent.click(
                screen.getByRole("button", { name: "Show archived facilities" })
            );
            await userEvent.click(
                within(rowFor("North Plant")).getByRole("button", {
                    name: "Restore facility",
                })
            );

            expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
            await userEvent.click(
                screen.getByRole("button", { name: "Loading..." })
            );
            expect(restoreFacilityMock).not.toHaveBeenCalled();
        });
    });

    describe("permissions", () => {
        it("disables the row actions for a non administrator", () => {
            state.isAdmin = false;
            renderContent();

            const north = rowFor("North Plant");
            const edit = within(north).getByRole("button", {
                name: "Edit facility",
            });
            const archive = within(north).getByRole("button", {
                name: "Archive facility",
            });
            const remove = within(north).getByRole("button", {
                name: "Delete facility",
            });

            expect(edit).toBeDisabled();
            expect(edit).toHaveAttribute(
                "title",
                "Only administrators can edit facilities"
            );
            expect(archive).toBeDisabled();
            expect(archive).toHaveAttribute(
                "title",
                "Only administrators can archive facilities"
            );
            expect(remove).toBeDisabled();
            expect(remove).toHaveAttribute(
                "title",
                "Only administrators can delete facilities"
            );
        });

        it("disables the restore action for a non administrator", async () => {
            state.isAdmin = false;
            renderContent();

            await userEvent.click(
                screen.getByRole("button", { name: "Show archived facilities" })
            );

            const restore = within(rowFor("North Plant")).getByRole("button", {
                name: "Restore facility",
            });
            expect(restore).toBeDisabled();
            expect(restore).toHaveAttribute(
                "title",
                "Only administrators can restore facilities"
            );
        });
    });

    describe("name validation", () => {
        it("keeps the submit button disabled until name, address and city are filled", async () => {
            const ref = makeTriggerRef();
            renderContent(ref);
            openCreateDialog(ref);

            const submit = screen.getByRole("button", {
                name: "Create Facility",
            });
            expect(submit).toBeDisabled();

            await userEvent.type(screen.getByLabelText("Name"), "   ");
            expect(submit).toBeDisabled();

            await userEvent.clear(screen.getByLabelText("Name"));
            await userEvent.type(screen.getByLabelText("Name"), "Willow");
            expect(submit).toBeDisabled();

            await userEvent.type(screen.getByLabelText("Address"), "5 Elm Street");
            expect(submit).toBeDisabled();

            await userEvent.type(
                screen.getByLabelText("City, State"),
                "Shelbyville"
            );
            expect(submit).toBeEnabled();
            expect(createFacilityMock).not.toHaveBeenCalled();
        });
    });
});
