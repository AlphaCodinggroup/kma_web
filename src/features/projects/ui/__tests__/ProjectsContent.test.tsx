/**
 * ProjectsContent: listado con búsqueda, ordenamiento, estados de
 * carga/error/vacío y los flujos de alta, edición, borrado y archivado.
 *
 * Se mockean los hooks de datos (no `fetch`) para poder controlar cada estado
 * sin necesidad de un QueryClientProvider.
 */
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MutableRefObject } from "react";
import type { Project } from "@entities/projects/model";
import type { UserSummary } from "@entities/user/list.model";

// ---- estado mutable que leen los mocks ----
const state = {
    projects: {
        data: undefined as { items: Project[] } | undefined,
        isLoading: false,
        isError: false,
    },
    usersData: undefined as { items: UserSummary[] } | undefined,
    facilitiesData: undefined as
        | { items: { id: string; name: string }[] }
        | undefined,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    isArchiving: false,
    createError: null as Error | null,
    updateError: null as Error | null,
    deleteOptions: undefined as
        | { onSuccess?: () => void; onError?: (error: unknown) => void }
        | undefined,
    isAdmin: true,
};

const refetchMock = vi.fn();
const createProjectMock = vi.fn();
const updateProjectMock = vi.fn();
const deleteProjectMock = vi.fn();
const archiveProjectMock = vi.fn();
const projectsQuerySpy = vi.fn();
const usersQuerySpy = vi.fn();
const facilitiesQuerySpy = vi.fn();

vi.mock("@features/projects/ui/hooks/useProjectsQuery", () => ({
    useProjectsQuery: (...args: unknown[]) => {
        projectsQuerySpy(...args);
        return {
            data: state.projects.data,
            isLoading: state.projects.isLoading,
            isError: state.projects.isError,
            refetch: refetchMock,
        };
    },
}));

vi.mock("@features/users/ui/hooks/useUsersQuery", () => ({
    useUsersQuery: (...args: unknown[]) => {
        usersQuerySpy(...args);
        return { data: state.usersData };
    },
}));

vi.mock("@features/facilities/ui/hooks/useFacilitiesQuery", () => ({
    useFacilitiesQuery: (...args: unknown[]) => {
        facilitiesQuerySpy(...args);
        return { data: state.facilitiesData };
    },
}));

vi.mock("@features/projects/ui/hooks/useCreateProjectMutation", () => ({
    useCreateProjectMutation: () => ({
        mutateAsync: createProjectMock,
        isPending: state.isCreating,
        error: state.createError,
    }),
}));

vi.mock("@features/projects/ui/hooks/useUpdateProjectMutation", () => ({
    useUpdateProjectMutation: () => ({
        mutateAsync: updateProjectMock,
        isPending: state.isUpdating,
        error: state.updateError,
    }),
}));

vi.mock("@features/projects/ui/hooks/useDeleteProjectMutation", () => ({
    useDeleteProjectMutation: (options?: {
        onSuccess?: () => void;
        onError?: (error: unknown) => void;
    }) => {
        state.deleteOptions = options;
        return { mutate: deleteProjectMock, isPending: state.isDeleting };
    },
}));

vi.mock("@features/projects/ui/hooks/useArchiveProjectMutation", () => ({
    useArchiveProjectMutation: () => ({
        mutateAsync: archiveProjectMock,
        isPending: state.isArchiving,
    }),
}));

vi.mock("@processes/auth/hooks", () => ({
    useSession: () => ({ isAdmin: state.isAdmin }),
}));

// El botón de archivar está comentado dentro de ProjectsTable, pero el
// contenedor sigue pasándole `onArchive`. Se envuelve la tabla real y se
// agrega un disparador por fila para poder ejercitar ese callback sin tocar
// código de producción.
vi.mock("@features/projects/ui/ProjectsTable", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../ProjectsTable")>();
    const Original = actual.ProjectsTable;
    return {
        ...actual,
        ProjectsTable: (props: import("../ProjectsTable").ProjectsTableProps) => (
            <>
                <Original {...props} />
                {props.items.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => props.onArchive(item.id)}
                    >
                        {`archive ${item.id}`}
                    </button>
                ))}
            </>
        ),
    };
});

import { ProjectsContent } from "../ProjectsContent";

// ---- fixtures ----

function makeProject(overrides: Record<string, unknown> = {}): Project {
    return {
        id: "p-1",
        name: "Project One",
        status: "ACTIVE",
        users: [],
        facilities: [],
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        createdBy: "admin",
        ...overrides,
    } as unknown as Project;
}

const auditorAda: UserSummary = {
    id: "u-ada",
    cognitoId: "cog-ada",
    name: "Ada Lovelace",
    email: "ada@kma.io",
    role: "auditor",
};

// Nombre en blanco: la etiqueta debe caer al email.
const auditorBlankName: UserSummary = {
    id: "u-blank",
    cognitoId: "cog-blank",
    name: "   ",
    email: "blank@kma.io",
    role: "auditor",
};

// Sin nombre ni email: la etiqueta debe caer al id.
const auditorNoLabel: UserSummary = {
    id: "u-nolabel",
    cognitoId: "cog-nolabel",
    name: "",
    email: "",
    role: "auditor",
};

const projectAlpha = makeProject({
    id: "p-alpha",
    name: "Alpha Tower",
    status: "ACTIVE",
    description: "Alpha description",
    users: [{ id: "u-ada", name: "Ada Lovelace" }],
    facilities: [{ id: "f-north", name: "North Plant" }],
    createdAt: "2026-01-15T10:30:00Z",
});

const projectBeta = makeProject({
    id: "p-beta",
    name: "beta Bridge",
    status: "ARCHIVED",
    users: [{ id: "u-grace", name: "Grace Hopper" }],
    facilities: [{ id: "f-south", name: "South Depot" }],
    createdAt: "2025-06-02T08:05:00Z",
});

// Proyecto mínimo: sin users, sin facilities, sin status y sin fecha.
const projectMinimal = makeProject({
    id: "p-min",
    name: "Gamma Yard",
    status: "",
    createdAt: "",
    users: undefined,
    facilities: undefined,
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
        return render(<ProjectsContent createTriggerRef={createTriggerRef} />);
    }
    return render(<ProjectsContent />);
}

function makeTriggerRef(): MutableRefObject<(() => void) | undefined> {
    return { current: undefined };
}

function openCreateDialog(ref: MutableRefObject<(() => void) | undefined>) {
    act(() => {
        ref.current?.();
    });
}

describe("ProjectsContent", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        state.projects = {
            data: { items: [projectBeta, projectAlpha, projectMinimal] },
            isLoading: false,
            isError: false,
        };
        state.usersData = { items: [auditorAda] };
        state.facilitiesData = {
            items: [
                { id: "f-north", name: "North Plant" },
                { id: "f-west", name: "West Hub" },
            ],
        };
        state.isCreating = false;
        state.isUpdating = false;
        state.isDeleting = false;
        state.isArchiving = false;
        state.createError = null;
        state.updateError = null;
        state.deleteOptions = undefined;
        state.isAdmin = true;
        createProjectMock.mockResolvedValue(makeProject());
        updateProjectMock.mockResolvedValue(makeProject());
        archiveProjectMock.mockResolvedValue(makeProject());
        refetchMock.mockResolvedValue(undefined);
        vi.spyOn(console, "error").mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("listing", () => {
        it("renders a row per project with users, facilities, status and created date", () => {
            renderContent();

            expect(
                screen.getByRole("heading", { name: "Projects" })
            ).toBeInTheDocument();
            expect(screen.getByText("Total projects: 3")).toBeInTheDocument();

            const alpha = rowFor("Alpha Tower");
            expect(within(alpha).getByText("Ada Lovelace")).toBeInTheDocument();
            expect(within(alpha).getByText("North Plant")).toBeInTheDocument();
            expect(within(alpha).getByText("Active")).toBeInTheDocument();
            expect(
                within(alpha).getByText("2026-01-15 10:30")
            ).toBeInTheDocument();

            const beta = rowFor("beta Bridge");
            expect(within(beta).getByText("Archived")).toBeInTheDocument();
            expect(
                within(beta).getByText("2025-06-02 08:05")
            ).toBeInTheDocument();
        });

        it("renders dash fallbacks for a project without users, facilities, status or date", () => {
            renderContent();

            const minimal = rowFor("Gamma Yard");
            // Users, facilities y status caen al guión largo; la fecha vacía la
            // resuelve formatIsoToYmdHm con un guión corto.
            expect(within(minimal).getAllByText("—")).toHaveLength(3);
            expect(within(minimal).getByText("-")).toBeInTheDocument();
        });

        it("asks the backend only for active projects and defers the lookups", () => {
            renderContent();

            expect(projectsQuerySpy).toHaveBeenCalledWith({ status: "ACTIVE" });
            expect(usersQuerySpy).toHaveBeenCalledWith({ role: "auditor" }, false);
            expect(facilitiesQuerySpy).toHaveBeenCalledWith(
                { status: "ACTIVE" },
                false
            );
        });

        it("renders the loading state while the query is in flight", () => {
            state.projects = { data: undefined, isLoading: true, isError: false };

            renderContent();

            expect(screen.getByText("Loading projects…")).toBeInTheDocument();
            expect(screen.queryByRole("table")).not.toBeInTheDocument();
        });

        it("renders the retry affordance on error and refetches when clicked", async () => {
            state.projects = { data: undefined, isLoading: false, isError: true };

            renderContent();

            expect(
                screen.getByText("Failed to load projects. Please try again.")
            ).toBeInTheDocument();

            await userEvent.click(screen.getByRole("button", { name: "Retry" }));

            expect(refetchMock).toHaveBeenCalledTimes(1);
        });

        it("renders the empty message when the backend returns no projects", () => {
            state.projects = {
                data: { items: [] },
                isLoading: false,
                isError: false,
            };

            renderContent();

            expect(screen.getByText("No projects found")).toBeInTheDocument();
            expect(screen.getByText("Total projects: 0")).toBeInTheDocument();
        });

        it("renders the empty message when the payload has no items at all", () => {
            state.projects = { data: undefined, isLoading: false, isError: false };

            renderContent();

            expect(screen.getByText("No projects found")).toBeInTheDocument();
        });
    });

    describe("search", () => {
        it.each<[string, string[]]>([
            ["Alpha", ["Alpha Tower"]],
            ["archived", ["beta Bridge"]],
            ["2025-06", ["beta Bridge"]],
            ["grace", ["beta Bridge"]],
            ["north", ["Alpha Tower"]],
        ])("filters the list by %s", async (query, expected) => {
            renderContent();

            await userEvent.type(screen.getByLabelText("Search projects"), query);

            await waitFor(() => {
                expect(rowNames()).toEqual(expected);
            });
        });

        it("shows the empty message when nothing matches the query", async () => {
            renderContent();

            await userEvent.type(
                screen.getByLabelText("Search projects"),
                "zzz-nope"
            );

            await waitFor(() => {
                expect(screen.getByText("No projects found")).toBeInTheDocument();
            });
            expect(screen.getByText("Total projects: 0")).toBeInTheDocument();
        });

        it("ignores a query shorter than the debounce minimum", async () => {
            renderContent();

            await userEvent.type(screen.getByLabelText("Search projects"), "a");

            await waitFor(() => {
                expect(rowNames()).toHaveLength(3);
            });
        });
    });

    describe("sorting", () => {
        it("cycles the project column through ascending, descending and unsorted", async () => {
            renderContent();

            expect(rowNames()).toEqual([
                "beta Bridge",
                "Alpha Tower",
                "Gamma Yard",
            ]);

            await userEvent.click(screen.getByRole("button", { name: /^Project/ }));
            expect(rowNames()).toEqual([
                "Alpha Tower",
                "beta Bridge",
                "Gamma Yard",
            ]);

            await userEvent.click(screen.getByRole("button", { name: /^Project/ }));
            expect(rowNames()).toEqual([
                "Gamma Yard",
                "beta Bridge",
                "Alpha Tower",
            ]);

            await userEvent.click(screen.getByRole("button", { name: /^Project/ }));
            expect(rowNames()).toEqual([
                "beta Bridge",
                "Alpha Tower",
                "Gamma Yard",
            ]);
        });

        it("sorts by auditor and falls back to an empty key when there is none", async () => {
            renderContent();

            await userEvent.click(screen.getByRole("button", { name: /^Auditor/ }));

            expect(rowNames()).toEqual([
                "Gamma Yard",
                "Alpha Tower",
                "beta Bridge",
            ]);
        });

        it("sorts by facility", async () => {
            renderContent();

            await userEvent.click(screen.getByRole("button", { name: /^Facility/ }));

            expect(rowNames()).toEqual([
                "Gamma Yard",
                "Alpha Tower",
                "beta Bridge",
            ]);
        });

        it("sorts by status", async () => {
            renderContent();

            await userEvent.click(screen.getByRole("button", { name: /^Status/ }));

            expect(rowNames()).toEqual([
                "Gamma Yard",
                "Alpha Tower",
                "beta Bridge",
            ]);
        });

        it("sorts by created date", async () => {
            renderContent();

            await userEvent.click(
                screen.getByRole("button", { name: /^Created At/ })
            );

            expect(rowNames()).toEqual([
                "Gamma Yard",
                "beta Bridge",
                "Alpha Tower",
            ]);
        });

        it("restarts the cycle when a different column is selected", async () => {
            renderContent();

            await userEvent.click(screen.getByRole("button", { name: /^Project/ }));
            await userEvent.click(screen.getByRole("button", { name: /^Project/ }));
            // Cambiar de columna vuelve a ascendente.
            await userEvent.click(screen.getByRole("button", { name: /^Status/ }));

            expect(rowNames()).toEqual([
                "Gamma Yard",
                "Alpha Tower",
                "beta Bridge",
            ]);
        });
    });

    describe("create", () => {
        it("registers the create callback in the trigger ref", () => {
            const ref = makeTriggerRef();

            renderContent(ref);

            expect(typeof ref.current).toBe("function");
            expect(
                screen.queryByRole("heading", { name: "Create New Project" })
            ).not.toBeInTheDocument();

            openCreateDialog(ref);

            expect(
                screen.getByRole("heading", { name: "Create New Project" })
            ).toBeInTheDocument();
        });

        it("renders without a trigger ref", () => {
            renderContent();

            expect(
                screen.queryByRole("heading", { name: "Create New Project" })
            ).not.toBeInTheDocument();
        });

        it("enables the lookups once the create dialog is open", () => {
            const ref = makeTriggerRef();
            renderContent(ref);

            openCreateDialog(ref);

            expect(usersQuerySpy).toHaveBeenLastCalledWith(
                { role: "auditor" },
                true
            );
            expect(facilitiesQuerySpy).toHaveBeenLastCalledWith(
                { status: "ACTIVE" },
                true
            );
        });

        it("submits the mapped auditors and facilities and closes on success", async () => {
            const ref = makeTriggerRef();
            renderContent(ref);
            openCreateDialog(ref);

            await userEvent.type(
                screen.getByLabelText("Project Name"),
                "  Delta Site  "
            );
            await userEvent.selectOptions(
                screen.getByLabelText("Select an auditor to add"),
                "u-ada"
            );
            await userEvent.selectOptions(
                screen.getByLabelText("Select a facility to add"),
                "f-north"
            );

            await userEvent.click(
                screen.getByRole("button", { name: "Create Project" })
            );

            expect(createProjectMock).toHaveBeenCalledWith({
                name: "Delta Site",
                users: [{ id: "u-ada", name: "Ada Lovelace" }],
                facilities: [{ id: "f-north", name: "North Plant" }],
                status: "ACTIVE",
            });
            await waitFor(() => {
                expect(refetchMock).toHaveBeenCalled();
            });
            expect(
                screen.queryByRole("heading", { name: "Create New Project" })
            ).not.toBeInTheDocument();
        });

        it("submits empty auditor and facility lists when nothing is selected", async () => {
            const ref = makeTriggerRef();
            renderContent(ref);
            openCreateDialog(ref);

            await userEvent.type(screen.getByLabelText("Project Name"), "Bare");
            await userEvent.click(
                screen.getByRole("button", { name: "Create Project" })
            );

            expect(createProjectMock).toHaveBeenCalledWith({
                name: "Bare",
                users: [],
                facilities: [],
                status: "ACTIVE",
            });
        });

        it("offers facilities coming only from the loaded projects", async () => {
            const ref = makeTriggerRef();
            renderContent(ref);
            openCreateDialog(ref);

            const select = screen.getByLabelText("Select a facility to add");
            // f-north viene de la query y de un proyecto: se deduplica.
            expect(
                within(select)
                    .getAllByRole("option")
                    .map((option) => option.textContent)
            ).toEqual([
                "Select a facility",
                "North Plant",
                "West Hub",
                "South Depot",
            ]);

            await userEvent.type(screen.getByLabelText("Project Name"), "Bare");
            await userEvent.selectOptions(select, "f-south");
            await userEvent.click(
                screen.getByRole("button", { name: "Create Project" })
            );

            expect(createProjectMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    facilities: [{ id: "f-south", name: "South Depot" }],
                })
            );
        });

        it("builds the facility options from the projects when the lookup is empty", () => {
            state.facilitiesData = undefined;
            const ref = makeTriggerRef();
            renderContent(ref);
            openCreateDialog(ref);

            expect(
                within(screen.getByLabelText("Select a facility to add"))
                    .getAllByRole("option")
                    .map((option) => option.textContent)
            ).toEqual(["Select a facility", "South Depot", "North Plant"]);
        });

        it("renders no auditor option when the lookup is empty", () => {
            state.usersData = undefined;
            const ref = makeTriggerRef();
            renderContent(ref);
            openCreateDialog(ref);

            expect(
                within(screen.getByLabelText("Select an auditor to add"))
                    .getAllByRole("option")
                    .map((option) => option.textContent)
            ).toEqual(["Select an auditor"]);
        });

        it("falls back to the email and then to the id for auditors without a name", async () => {
            state.usersData = {
                items: [auditorAda, auditorBlankName, auditorNoLabel],
            };
            const ref = makeTriggerRef();
            renderContent(ref);
            openCreateDialog(ref);

            const select = screen.getByLabelText("Select an auditor to add");
            expect(
                within(select)
                    .getAllByRole("option")
                    .map((option) => option.textContent)
            ).toEqual([
                "Select an auditor",
                "Ada Lovelace",
                "blank@kma.io",
                "u-nolabel",
            ]);

            await userEvent.type(screen.getByLabelText("Project Name"), "Bare");
            await userEvent.selectOptions(select, "u-blank");
            await userEvent.selectOptions(select, "u-nolabel");
            await userEvent.click(
                screen.getByRole("button", { name: "Create Project" })
            );

            expect(createProjectMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    users: [
                        { id: "u-blank", name: "blank@kma.io" },
                        { id: "u-nolabel", name: "u-nolabel" },
                    ],
                })
            );
        });

        it("keeps the dialog open and logs when the creation fails", async () => {
            createProjectMock.mockRejectedValue(new Error("create boom"));
            const ref = makeTriggerRef();
            renderContent(ref);
            openCreateDialog(ref);

            await userEvent.type(screen.getByLabelText("Project Name"), "Bare");
            await userEvent.click(
                screen.getByRole("button", { name: "Create Project" })
            );

            await waitFor(() => {
                expect(console.error).toHaveBeenCalledWith(
                    "Failed to create project",
                    expect.any(Error)
                );
            });
            expect(refetchMock).not.toHaveBeenCalled();
            expect(
                screen.getByRole("heading", { name: "Create New Project" })
            ).toBeInTheDocument();
        });

        it("surfaces the mutation error inside the dialog", () => {
            state.createError = new Error("name already taken");
            const ref = makeTriggerRef();
            renderContent(ref);
            openCreateDialog(ref);

            expect(screen.getByText("name already taken")).toBeInTheDocument();
        });

        it("blocks the form controls while the creation is pending", () => {
            state.isCreating = true;
            const ref = makeTriggerRef();
            renderContent(ref);
            openCreateDialog(ref);

            expect(screen.getByLabelText("Project Name")).toBeDisabled();
            expect(
                screen.getByLabelText("Select an auditor to add")
            ).toBeDisabled();
            expect(
                screen.getByLabelText("Select a facility to add")
            ).toBeDisabled();
            expect(screen.getByRole("button", { name: "Loading..." })).toBeDisabled();
        });

        it("closes the dialog from the close button", async () => {
            const ref = makeTriggerRef();
            renderContent(ref);
            openCreateDialog(ref);

            await userEvent.click(screen.getByRole("button", { name: "Close" }));

            expect(
                screen.queryByRole("heading", { name: "Create New Project" })
            ).not.toBeInTheDocument();
        });
    });

    describe("edit", () => {
        it("opens the edit dialog prefilled with the selected project", async () => {
            renderContent();

            await userEvent.click(
                within(rowFor("Alpha Tower")).getByRole("button", {
                    name: "Edit project",
                })
            );

            expect(
                screen.getByRole("heading", { name: "Edit Project" })
            ).toBeInTheDocument();
            expect(screen.getByLabelText("Project Name")).toHaveValue(
                "Alpha Tower"
            );
            expect(
                screen.getByRole("button", { name: "Remove Ada Lovelace" })
            ).toBeInTheDocument();
            expect(
                screen.getByRole("button", { name: "Remove North Plant" })
            ).toBeInTheDocument();
        });

        it("submits the project id together with the edited values", async () => {
            renderContent();

            await userEvent.click(
                within(rowFor("Alpha Tower")).getByRole("button", {
                    name: "Edit project",
                })
            );
            await userEvent.clear(screen.getByLabelText("Project Name"));
            await userEvent.type(
                screen.getByLabelText("Project Name"),
                "Alpha Tower II"
            );
            await userEvent.click(
                screen.getByRole("button", { name: "Update Project" })
            );

            expect(updateProjectMock).toHaveBeenCalledWith({
                id: "p-alpha",
                name: "Alpha Tower II",
                description: "Alpha description",
                users: [{ id: "u-ada", name: "Ada Lovelace" }],
                facilities: [{ id: "f-north", name: "North Plant" }],
            });
            await waitFor(() => {
                expect(refetchMock).toHaveBeenCalled();
            });
            expect(
                screen.queryByRole("heading", { name: "Edit Project" })
            ).not.toBeInTheDocument();
        });

        it("drops the auditors and facilities removed from the chips", async () => {
            renderContent();

            await userEvent.click(
                within(rowFor("Alpha Tower")).getByRole("button", {
                    name: "Edit project",
                })
            );
            await userEvent.click(
                screen.getByRole("button", { name: "Remove Ada Lovelace" })
            );
            await userEvent.click(
                screen.getByRole("button", { name: "Remove North Plant" })
            );
            await userEvent.click(
                screen.getByRole("button", { name: "Update Project" })
            );

            expect(updateProjectMock).toHaveBeenCalledWith(
                expect.objectContaining({ users: [], facilities: [] })
            );
        });

        it("ignores an auditor or facility that is already selected", async () => {
            renderContent();

            await userEvent.click(
                within(rowFor("Alpha Tower")).getByRole("button", {
                    name: "Edit project",
                })
            );
            await userEvent.selectOptions(
                screen.getByLabelText("Select an auditor to add"),
                "u-ada"
            );
            await userEvent.selectOptions(
                screen.getByLabelText("Select a facility to add"),
                "f-north"
            );

            expect(
                screen.getAllByRole("button", { name: "Remove Ada Lovelace" })
            ).toHaveLength(1);
            expect(
                screen.getAllByRole("button", { name: "Remove North Plant" })
            ).toHaveLength(1);
        });

        it("drops the project from the state when the edit dialog is dismissed", async () => {
            renderContent();

            await userEvent.click(
                within(rowFor("Alpha Tower")).getByRole("button", {
                    name: "Edit project",
                })
            );
            await userEvent.click(screen.getByRole("button", { name: "Close" }));

            expect(
                screen.queryByRole("heading", { name: "Edit Project" })
            ).not.toBeInTheDocument();
        });

        it("edits a project without description or relations", async () => {
            renderContent();

            await userEvent.click(
                within(rowFor("Gamma Yard")).getByRole("button", {
                    name: "Edit project",
                })
            );
            await userEvent.click(
                screen.getByRole("button", { name: "Update Project" })
            );

            expect(updateProjectMock).toHaveBeenCalledWith({
                id: "p-min",
                name: "Gamma Yard",
                users: [],
                facilities: [],
            });
        });

        it("keeps the dialog open and logs when the update fails", async () => {
            updateProjectMock.mockRejectedValue(new Error("update boom"));
            renderContent();

            await userEvent.click(
                within(rowFor("Alpha Tower")).getByRole("button", {
                    name: "Edit project",
                })
            );
            await userEvent.click(
                screen.getByRole("button", { name: "Update Project" })
            );

            await waitFor(() => {
                expect(console.error).toHaveBeenCalledWith(
                    "Failed to update project",
                    expect.any(Error)
                );
            });
            expect(
                screen.getByRole("heading", { name: "Edit Project" })
            ).toBeInTheDocument();
        });

        it("surfaces the update error inside the dialog", async () => {
            state.updateError = new Error("cannot update");
            renderContent();

            await userEvent.click(
                within(rowFor("Alpha Tower")).getByRole("button", {
                    name: "Edit project",
                })
            );

            expect(screen.getByText("cannot update")).toBeInTheDocument();
        });

        it("shows the loading label on the submit button while updating", async () => {
            state.isUpdating = true;
            renderContent();

            await userEvent.click(
                within(rowFor("Alpha Tower")).getByRole("button", {
                    name: "Edit project",
                })
            );

            expect(screen.getByRole("button", { name: "Loading..." })).toBeDisabled();
            expect(screen.getByLabelText("Project Name")).toBeDisabled();
            expect(
                screen.getByRole("button", { name: "Remove Ada Lovelace" })
            ).toBeDisabled();
        });
    });

    describe("delete", () => {
        it("asks for confirmation and deletes the selected project", async () => {
            renderContent();

            await userEvent.click(
                within(rowFor("Alpha Tower")).getByRole("button", {
                    name: "Delete project",
                })
            );

            expect(screen.getByText(/Do you want to delete/)).toBeInTheDocument();
            expect(
                screen.getByText("This action cannot be undone.")
            ).toBeInTheDocument();

            await userEvent.click(screen.getByRole("button", { name: "Delete" }));

            expect(deleteProjectMock).toHaveBeenCalledWith("p-alpha");
        });

        it("closes the confirmation and refetches through the mutation callback", async () => {
            renderContent();

            await userEvent.click(
                within(rowFor("Alpha Tower")).getByRole("button", {
                    name: "Delete project",
                })
            );
            await userEvent.click(screen.getByRole("button", { name: "Delete" }));

            act(() => {
                state.deleteOptions?.onSuccess?.();
            });

            expect(
                screen.queryByText(/Do you want to delete/)
            ).not.toBeInTheDocument();
            expect(refetchMock).toHaveBeenCalled();
        });

        it("logs the failure reported by the delete mutation", () => {
            renderContent();

            const error = new Error("delete boom");
            state.deleteOptions?.onError?.(error);

            expect(console.error).toHaveBeenCalledWith(
                "Failed to delete project",
                error
            );
        });

        it("dismisses the confirmation without deleting", async () => {
            renderContent();

            await userEvent.click(
                within(rowFor("Alpha Tower")).getByRole("button", {
                    name: "Delete project",
                })
            );
            await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

            expect(
                screen.queryByText(/Do you want to delete/)
            ).not.toBeInTheDocument();
            expect(deleteProjectMock).not.toHaveBeenCalled();
        });

        it("blocks the confirmation buttons while the deletion is pending", async () => {
            state.isDeleting = true;
            renderContent();

            await userEvent.click(
                within(rowFor("Alpha Tower")).getByRole("button", {
                    name: "Delete project",
                })
            );

            expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
            await userEvent.click(
                screen.getByRole("button", { name: "Loading..." })
            );
            expect(deleteProjectMock).not.toHaveBeenCalled();
        });
    });

    describe("archive", () => {
        it("asks for confirmation and archives the selected project", async () => {
            renderContent();

            await userEvent.click(
                screen.getByRole("button", { name: "archive p-alpha" })
            );

            expect(screen.getByText(/Do you want to archive/)).toBeInTheDocument();
            expect(
                screen.getByText(
                    "This project will be archived and removed from the active list, but it will not be deleted."
                )
            ).toBeInTheDocument();

            await userEvent.click(screen.getByRole("button", { name: "Archive" }));

            expect(archiveProjectMock).toHaveBeenCalledWith({ id: "p-alpha" });
            await waitFor(() => {
                expect(refetchMock).toHaveBeenCalled();
            });
            expect(
                screen.queryByText(/Do you want to archive/)
            ).not.toBeInTheDocument();
        });

        it("falls back to a generic subject when the project has no name", async () => {
            state.projects = {
                data: { items: [makeProject({ id: "p-x", name: undefined })] },
                isLoading: false,
                isError: false,
            };
            renderContent();

            await userEvent.click(
                screen.getByRole("button", { name: "archive p-x" })
            );

            expect(screen.getByText(/this project/)).toBeInTheDocument();
        });

        it("keeps the confirmation open and logs when the archive fails", async () => {
            archiveProjectMock.mockRejectedValue(new Error("archive boom"));
            renderContent();

            await userEvent.click(
                screen.getByRole("button", { name: "archive p-alpha" })
            );
            await userEvent.click(screen.getByRole("button", { name: "Archive" }));

            await waitFor(() => {
                expect(console.error).toHaveBeenCalledWith(
                    "Failed to archive project",
                    expect.any(Error)
                );
            });
            expect(screen.getByText(/Do you want to archive/)).toBeInTheDocument();
        });

        it("dismisses the archive confirmation", async () => {
            renderContent();

            await userEvent.click(
                screen.getByRole("button", { name: "archive p-beta" })
            );
            await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

            expect(
                screen.queryByText(/Do you want to archive/)
            ).not.toBeInTheDocument();
            expect(archiveProjectMock).not.toHaveBeenCalled();
        });

        it("blocks the archive confirmation while the mutation is pending", async () => {
            state.isArchiving = true;
            renderContent();

            await userEvent.click(
                screen.getByRole("button", { name: "archive p-alpha" })
            );

            expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
            await userEvent.click(
                screen.getByRole("button", { name: "Loading..." })
            );
            expect(archiveProjectMock).not.toHaveBeenCalled();
        });
    });

    describe("permissions", () => {
        it("disables the row actions for a non administrator", () => {
            state.isAdmin = false;
            renderContent();

            const alpha = rowFor("Alpha Tower");
            const edit = within(alpha).getByRole("button", {
                name: "Edit project",
            });
            const remove = within(alpha).getByRole("button", {
                name: "Delete project",
            });

            expect(edit).toBeDisabled();
            expect(edit).toHaveAttribute(
                "title",
                "Only administrators can edit projects"
            );
            expect(remove).toBeDisabled();
            expect(remove).toHaveAttribute(
                "title",
                "Only administrators can delete projects"
            );
        });
    });

    describe("name validation", () => {
        it("rejects a blank name and shows the required message", async () => {
            const ref = makeTriggerRef();
            renderContent(ref);
            openCreateDialog(ref);

            const input = screen.getByLabelText("Project Name");
            await userEvent.type(input, "   ");

            expect(
                screen.getByRole("button", { name: "Create Project" })
            ).toBeDisabled();

            // El submit está deshabilitado, así que se dispara el submit del
            // formulario para ejercitar la guarda interna.
            fireEvent.submit(input.closest("form") as HTMLFormElement);

            expect(
                screen.getByText("Project name is required.")
            ).toBeInTheDocument();
            expect(createProjectMock).not.toHaveBeenCalled();
        });

        it("shows the required message after leaving an empty name field", async () => {
            const ref = makeTriggerRef();
            renderContent(ref);
            openCreateDialog(ref);

            await userEvent.click(screen.getByLabelText("Project Name"));
            await userEvent.tab();

            expect(
                screen.getByText("Project name is required.")
            ).toBeInTheDocument();
        });

        it("clears the required message once a name is typed", async () => {
            const ref = makeTriggerRef();
            renderContent(ref);
            openCreateDialog(ref);

            const input = screen.getByLabelText("Project Name");
            await userEvent.type(input, " ");
            expect(
                screen.getByText("Project name is required.")
            ).toBeInTheDocument();

            await userEvent.type(input, "Delta");
            expect(
                screen.queryByText("Project name is required.")
            ).not.toBeInTheDocument();
        });
    });
});
