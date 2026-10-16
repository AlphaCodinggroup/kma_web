/**
 * Detalle de proyecto: estados de carga y error, secciones por facility con
 * sus auditorías, resumen, reporte del proyecto y las acciones de edición y
 * borrado. Se mockean los hooks de datos, no `fetch`.
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Audit } from "@entities/audit/model";
import type { Project } from "@entities/projects/model";

// ---- estado mutable que leen los mocks ----
const state = {
  project: {
    data: undefined as Project | undefined,
    isLoading: false,
    error: null as unknown,
  },
  audits: {
    audits: [] as Audit[],
    isLoading: false,
    isError: false,
  },
  facilities: [] as { id: string; address?: string; city?: string }[],
  facilitiesProjectId: undefined as string | undefined,
  reports: [] as { id: string; reportName: string | null; reportUrl: string | null }[],
  downloadingId: null as string | null,
  isAdmin: true,
  noReportNeededOpen: false,
  deletePending: false,
  deletingAuditId: undefined as string | undefined,
  search: "",
};

const push = vi.fn();
const refetchProject = vi.fn();
const refetchAudits = vi.fn();
const download = vi.fn();
const openReview = vi.fn();
const setNoReportNeeded = vi.fn();
const updateProject = vi.fn();
const deleteProject = vi.fn();
const deleteAudit = vi.fn();
const toProjectUsers = vi.fn();
const toProjectFacilities = vi.fn();
const reportsQuerySpy = vi.fn();
const openReviewOptionsSpy = vi.fn();
const lookupsSpy = vi.fn();
let deleteProjectOptions:
  | { onSuccess?: () => void; onError?: (error: unknown) => void }
  | undefined;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/projects/project-1",
  useSearchParams: () => new URLSearchParams(state.search),
}));
vi.mock("@processes/auth/hooks", () => ({
  useSession: () => ({ isAdmin: state.isAdmin }),
}));
vi.mock("@features/projects/ui/hooks/useProjectQuery", () => ({
  useProjectQuery: () => ({
    data: state.project.data,
    isLoading: state.project.isLoading,
    error: state.project.error,
    refetch: refetchProject,
  }),
}));
vi.mock("@features/facilities/ui/hooks/useProjectFacilitiesQuery", () => ({
  useProjectFacilitiesQuery: (projectId?: string) => {
    state.facilitiesProjectId = projectId;
    return { data: state.facilities };
  },
}));
vi.mock("@features/audits/lib/hooks/useProjectAudits", () => ({
  useProjectAudits: () => ({ ...state.audits, refetch: refetchAudits }),
}));
vi.mock("@features/reports/lib/hooks/useReportsQuery", () => ({
  useReportsListQuery: (...args: unknown[]) => {
    reportsQuerySpy(...args);
    return { data: { items: state.reports } };
  },
}));
vi.mock("@features/reports/lib/hooks/useDownloadReportFile", () => ({
  useDownloadReportFile: () => ({ download, activeId: state.downloadingId }),
}));
vi.mock("@features/audits/lib/hooks/useOpenAuditReview", () => ({
  useOpenAuditReview: (options: unknown) => {
    openReviewOptionsSpy(options);
    return {
      openReview,
      editingId: null,
      noReportNeeded: {
        open: state.noReportNeededOpen,
        onOpenChange: setNoReportNeeded,
      },
    };
  },
}));
vi.mock("@features/audits/lib/hooks/useDeleteAudit", () => ({
  useDeleteAudit: () => ({
    mutateAsync: deleteAudit,
    isPending: Boolean(state.deletingAuditId),
    variables: state.deletingAuditId,
  }),
}));
vi.mock("@features/projects/ui/hooks/useProjectFormLookups", () => ({
  useProjectFormLookups: (params: unknown) => {
    lookupsSpy(params);
    return {
      auditors: [],
      facilityOptions: [],
      toProjectUsers,
      toProjectFacilities,
    };
  },
}));
vi.mock("@features/projects/ui/hooks/useUpdateProjectMutation", () => ({
  useUpdateProjectMutation: () => ({
    mutateAsync: updateProject,
    isPending: false,
    error: null,
  }),
}));
vi.mock("@features/projects/ui/hooks/useDeleteProjectMutation", () => ({
  useDeleteProjectMutation: (options: typeof deleteProjectOptions) => {
    deleteProjectOptions = options;
    return { mutate: deleteProject, isPending: state.deletePending };
  },
}));

// La tabla real consulta el detalle de cada auditoría; acá sólo importa qué recibe.
vi.mock("@features/audits/ui/AuditsTable", () => ({
  default: ({
    items,
    onEdit,
    onDelete,
    deletingId,
  }: {
    items: Audit[];
    onEdit: (audit: Audit) => void;
    onDelete: (audit: Audit) => void;
    deletingId: string | null;
  }) => (
    <ul data-testid="audits-table" data-deleting={deletingId ?? ""}>
      {items.map((audit) => (
        <li key={audit.id}>
          {audit.id}
          <button onClick={() => onEdit(audit)}>review {audit.id}</button>
          <button onClick={() => onDelete(audit)}>delete {audit.id}</button>
        </li>
      ))}
    </ul>
  ),
}));

// El formulario tiene sus propias pruebas; el stub envía valores fijos.
vi.mock("@features/projects/ui/EditProjectDialog", () => ({
  default: ({
    open,
    onSubmit,
  }: {
    open: boolean;
    onSubmit: (values: Record<string, unknown>) => Promise<void>;
  }) =>
    open ? (
      <button
        onClick={() =>
          void onSubmit({
            id: "project-1",
            name: "Renamed",
            description: "New description",
            auditorIds: ["u-1"],
            facilityIds: ["f-1"],
          })
        }
      >
        submit edit
      </button>
    ) : null,
}));

import ProjectDetailView from "../ProjectDetailView";

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: "project-1",
  name: "Boston Apartments",
  status: "ACTIVE",
  users: [],
  facilities: [
    { id: "f-1", name: "House 1" },
    { id: "f-2", name: "House 2" },
  ],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-02T00:00:00Z",
  createdBy: "user-1",
  ...overrides,
});

const makeAudit = (overrides: Partial<Audit> = {}): Audit => ({
  id: "audit-1",
  flowId: "flow-1",
  flowName: "Ramps",
  version: 1,
  projectId: "project-1",
  facilityId: "f-1",
  status: "draft_report_in_review",
  createdBy: null,
  updatedBy: null,
  createdAt: "2026-01-15T10:30:00Z",
  updatedAt: "2026-01-16T10:30:00Z",
  projectName: "Boston Apartments",
  auditorName: "Ada",
  facilityName: "House 1",
  findingsCount: 2,
  ...overrides,
});

const renderView = () => render(<ProjectDetailView projectId="project-1" />);

/** Última URL escrita con history.replaceState. */
const lastReplacedUrl = () => vi.mocked(window.history.replaceState).mock.lastCall?.[2];

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("alert", vi.fn());
  vi.spyOn(console, "error").mockImplementation(() => {});
  deleteProjectOptions = undefined;
  state.project = { data: makeProject(), isLoading: false, error: null };
  state.audits = {
    audits: [
      makeAudit(),
      makeAudit({ id: "audit-2", facilityId: "f-2", status: "completed" }),
    ],
    isLoading: false,
    isError: false,
  };
  state.facilities = [{ id: "f-1", address: "12 Main St", city: "Boston" }];
  state.facilitiesProjectId = undefined;
  state.reports = [];
  state.downloadingId = null;
  state.isAdmin = true;
  state.noReportNeededOpen = false;
  state.deletePending = false;
  state.deletingAuditId = undefined;
  state.search = "";
});

describe("ProjectDetailView — loading and errors", () => {
  it("shows the loader while the project loads", () => {
    state.project = { data: undefined, isLoading: true, error: null };

    renderView();

    expect(screen.getByText("Loading project")).toBeInTheDocument();
  });

  it("offers a retry when the project fails to load", async () => {
    state.project = { data: undefined, isLoading: false, error: new Error("boom") };

    renderView();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(screen.getByText("The project could not be loaded.")).toBeInTheDocument();
    expect(refetchProject).toHaveBeenCalledTimes(1);
  });

  it("sends back to the list when the project does not exist", async () => {
    state.project = {
      data: undefined,
      isLoading: false,
      error: { code: "NOT_FOUND", message: "Not found" },
    };

    renderView();
    await userEvent.click(screen.getByRole("button", { name: "Back to projects" }));

    expect(
      screen.getByText("This project does not exist or was deleted.")
    ).toBeInTheDocument();
    expect(push).toHaveBeenCalledWith("/projects");
  });

  it("keeps showing the project when a later refetch fails", () => {
    state.project = { data: makeProject(), isLoading: false, error: new Error("boom") };

    renderView();

    expect(screen.getByRole("heading", { name: "Boston Apartments" })).toBeInTheDocument();
  });

  it("offers a retry when the audits fail to load", async () => {
    state.audits = { audits: [], isLoading: false, isError: true };

    renderView();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(
      screen.getByText("The project's audits could not be loaded.")
    ).toBeInTheDocument();
    expect(refetchAudits).toHaveBeenCalledTimes(1);
  });

  it("waits for the audits before listing the facilities", () => {
    state.audits = { audits: [], isLoading: true, isError: false };

    renderView();

    expect(screen.getByText("Loading audits…")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /House 1/ })).toBeNull();
  });
});

describe("ProjectDetailView — sections and summary", () => {
  it("lists one section per facility, opening the first one", () => {
    renderView();

    const first = screen.getByRole("button", { name: /House 1/ });
    const second = screen.getByRole("button", { name: /House 2/ });
    expect(first).toHaveAttribute("aria-expanded", "true");
    expect(first).toHaveTextContent("12 Main St · Boston");
    expect(second).toHaveAttribute("aria-expanded", "false");
    expect(within(screen.getByTestId("audits-table")).getByText("audit-1")).toBeInTheDocument();
  });

  it("reads the address and city from the facilities of the viewed project", () => {
    renderView();

    expect(state.facilitiesProjectId).toBe("project-1");
  });

  it("summarizes the facilities and the audits", () => {
    renderView();

    expect(screen.getByTestId("metric-facilities")).toHaveTextContent("2");
    expect(screen.getByTestId("metric-in-progress")).toHaveTextContent("1");
    expect(screen.getByTestId("metric-completed")).toHaveTextContent("1");
  });

  it("separates delivered and unavailable states from work in progress", () => {
    state.audits.audits = [
      makeAudit({ id: "working", status: "audit_in_progress" }),
      makeAudit({ id: "done", status: "completed" }),
      makeAudit({ id: "delivered", status: "final_report_sent_to_client" }),
      makeAudit({ id: "unavailable", status: "unknown" }),
      makeAudit({ id: "deleted", status: "deleted" }),
    ];
    renderView();
    expect(screen.getByTestId("metric-in-progress")).toHaveTextContent("1");
    expect(screen.getByTestId("metric-completed")).toHaveTextContent("1");
    expect(screen.getByTestId("metric-delivered")).toHaveTextContent("1");
    expect(screen.getByTestId("metric-unavailable")).toHaveTextContent("1");
    expect(screen.getByText("unavailable")).toBeInTheDocument();
  });

  it("counts the facilities that only appear in audits", () => {
    state.project.data = makeProject({ facilities: [] });
    state.audits = {
      audits: [makeAudit({ facilityId: "f-9", facilityName: "Old Depot" })],
      isLoading: false,
      isError: false,
    };

    renderView();

    expect(screen.getByTestId("metric-facilities")).toHaveTextContent("1");
    expect(screen.getByText("Not assigned to this project")).toBeInTheDocument();
  });

  it("does not count audits without a facility as one", () => {
    state.project.data = makeProject({ facilities: [] });
    state.audits = {
      audits: [makeAudit({ facilityId: null, facilityName: null })],
      isLoading: false,
      isError: false,
    };

    renderView();

    expect(screen.getByTestId("metric-facilities")).toHaveTextContent("0");
    expect(screen.getByRole("button", { name: /No facility/ })).toBeInTheDocument();
  });

  it("says when the project has no facilities", () => {
    state.project.data = makeProject({ facilities: [] });
    state.audits = { audits: [], isLoading: false, isError: false };

    renderView();

    expect(screen.getByText("This project has no facilities yet.")).toBeInTheDocument();
  });

  it("opens the review coming back to this project", async () => {
    renderView();

    expect(openReviewOptionsSpy).toHaveBeenCalledWith(
      expect.objectContaining({ returnTo: "/projects/project-1" })
    );
    await userEvent.click(screen.getByRole("button", { name: "review audit-1" }));
    expect(openReview).toHaveBeenCalledWith(
      expect.objectContaining({ id: "audit-1" })
    );
  });

  it("refreshes the audits when a review is ready", () => {
    renderView();

    const [options] = openReviewOptionsSpy.mock.calls[0] as [{ onReady: () => void }];
    options.onReady();

    expect(refetchAudits).toHaveBeenCalledTimes(1);
  });

  it("shows the no report notice when the review asks for it", () => {
    state.noReportNeededOpen = true;

    renderView();

    expect(screen.getByText("No Report Needed")).toBeInTheDocument();
  });
});

describe("ProjectDetailView — report", () => {
  it("looks for the report of this project", () => {
    renderView();

    expect(reportsQuerySpy).toHaveBeenCalledWith({ projectId: "project-1" });
  });

  it("disables the download while the project has no report", () => {
    state.reports = [{ id: "audit-2", reportName: "Boston", reportUrl: null }];

    renderView();

    expect(screen.getByRole("button", { name: "Download report" })).toBeDisabled();
  });

  it("downloads the project report", async () => {
    const report = { id: "audit-2", reportName: "Boston", reportUrl: "https://cdn/r.pdf" };
    state.reports = [report];
    download.mockResolvedValue({});

    renderView();
    await userEvent.click(screen.getByRole("button", { name: "Download report" }));

    expect(download).toHaveBeenCalledWith(report);
  });

  it("warns when the download fails", async () => {
    state.reports = [{ id: "audit-2", reportName: "Boston", reportUrl: "https://cdn/r.pdf" }];
    download.mockRejectedValue(new Error("network"));

    renderView();
    await userEvent.click(screen.getByRole("button", { name: "Download report" }));

    await waitFor(() =>
      expect(screen.getByText("Error downloading the report. Please try again.")).toBeInTheDocument()
    );
  });

  it("shows the download in progress", () => {
    state.reports = [{ id: "audit-2", reportName: "Boston", reportUrl: "https://cdn/r.pdf" }];
    state.downloadingId = "audit-2";

    renderView();

    expect(screen.getByRole("button", { name: "Downloading…" })).toBeDisabled();
  });
});

describe("ProjectDetailView — project actions", () => {
  it("edits the project with the chosen auditors and facilities", async () => {
    toProjectUsers.mockReturnValue([{ id: "u-1", name: "Ada" }]);
    toProjectFacilities.mockReturnValue([{ id: "f-1", name: "House 1" }]);
    updateProject.mockResolvedValue({});

    renderView();
    expect(lookupsSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: false })
    );
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(lookupsSpy).toHaveBeenLastCalledWith({
      enabled: true,
      projects: [state.project.data],
    });
    await userEvent.click(screen.getByRole("button", { name: "submit edit" }));

    await waitFor(() =>
      expect(updateProject).toHaveBeenCalledWith({
        id: "project-1",
        name: "Renamed",
        description: "New description",
        users: [{ id: "u-1", name: "Ada" }],
        facilities: [{ id: "f-1", name: "House 1" }],
      })
    );
    expect(toProjectUsers).toHaveBeenCalledWith(["u-1"]);
    expect(toProjectFacilities).toHaveBeenCalledWith(["f-1"]);
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "submit edit" })).toBeNull()
    );
  });

  it("keeps the form open when the update fails", async () => {
    updateProject.mockRejectedValue(new Error("boom"));

    renderView();
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    await userEvent.click(screen.getByRole("button", { name: "submit edit" }));

    await waitFor(() =>
      expect(console.error).toHaveBeenCalledWith(
        "Failed to update project",
        expect.any(Error)
      )
    );
    expect(screen.getByRole("button", { name: "submit edit" })).toBeInTheDocument();
  });

  it("deletes the project after the confirmation and goes back to the list", async () => {
    renderView();

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Do you want to delete “Boston Apartments”?"
    );
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" })
    );

    expect(deleteProject).toHaveBeenCalledWith("project-1");
    deleteProjectOptions?.onSuccess?.();
    expect(push).toHaveBeenCalledWith("/projects");
  });

  it("logs a failed project deletion", () => {
    renderView();

    deleteProjectOptions?.onError?.(new Error("boom"));

    expect(console.error).toHaveBeenCalledWith(
      "Failed to delete project",
      expect.any(Error)
    );
  });
});

describe("ProjectDetailView — audit deletion", () => {
  it("deletes an audit after the confirmation", async () => {
    deleteAudit.mockResolvedValue(undefined);

    renderView();
    await userEvent.click(screen.getByRole("button", { name: "delete audit-1" }));
    expect(screen.getByText("the Ramps audit")).toBeInTheDocument();
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" })
    );

    expect(deleteAudit).toHaveBeenCalledWith("audit-1");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("names an audit without flow generically", async () => {
    state.audits.audits = [makeAudit({ flowName: null })];

    renderView();
    await userEvent.click(screen.getByRole("button", { name: "delete audit-1" }));

    expect(screen.getByText("the audit audit")).toBeInTheDocument();
  });

  it("warns and keeps the confirmation when the deletion fails", async () => {
    deleteAudit.mockRejectedValue(new Error("boom"));

    renderView();
    await userEvent.click(screen.getByRole("button", { name: "delete audit-1" }));
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" })
    );

    await waitFor(() =>
      expect(screen.getByText("Error deleting the audit. Please try again.")).toBeInTheDocument()
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("cancels the audit deletion", async () => {
    renderView();
    await userEvent.click(screen.getByRole("button", { name: "delete audit-1" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(deleteAudit).not.toHaveBeenCalled();
  });

  it("marks the audit being deleted", () => {
    state.deletingAuditId = "audit-1";

    renderView();

    expect(screen.getByTestId("audits-table")).toHaveAttribute(
      "data-deleting",
      "audit-1"
    );
  });
});

describe("ProjectDetailView — search and filters", () => {
  beforeEach(() => {
    vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
    state.project.data = makeProject({
      facilities: [
        { id: "f-1", name: "House 1" },
        { id: "f-2", name: "House 2" },
        { id: "f-3", name: "House 3" },
      ],
    });
    state.audits = {
      audits: [
        makeAudit({ id: "a-1", facilityId: "f-1", status: "completed", auditorName: "Ada" }),
        makeAudit({
          id: "a-2",
          facilityId: "f-2",
          facilityName: "House 2",
          status: "draft_report_in_review",
          auditorName: "Luis Field",
        }),
        makeAudit({
          id: "a-3",
          facilityId: "f-2",
          facilityName: "House 2",
          flowId: "flow-2",
          flowName: "Doors",
          status: "draft_report_pending_review",
          auditorName: "Ada",
        }),
      ],
      isLoading: false,
      isError: false,
    };
  });

  it("offers the facilities, flows and statuses of the project", () => {
    renderView();

    const facility = screen.getByRole("combobox", { name: "Filter by facility" });
    expect(within(facility).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "All facilities",
      "House 1",
      "House 2",
      "House 3",
    ]);
    const flow = screen.getByRole("combobox", { name: "Filter by flow" });
    expect(within(flow).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "All flows",
      "Doors",
      "Ramps",
    ]);
    expect(
      within(screen.getByRole("combobox", { name: "Filter by status" })).getAllByRole("option")
    ).toHaveLength(8);
    expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull();
  });

  it("keeps only the facilities with matches, open, and says how many are shown", async () => {
    renderView();

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Filter by status" }),
      "draft_report_in_review"
    );

    expect(screen.queryByRole("button", { name: /House 1/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /House 3/ })).toBeNull();
    const house2 = screen.getByRole("button", { name: /House 2/ });
    expect(house2).toHaveAttribute("aria-expanded", "true");
    expect(house2).toHaveTextContent("1 audit · 1 in progress · 0 completed");
    expect(screen.getByText("Showing 1 of 3 audits")).toBeInTheDocument();
    // Las tarjetas siguen siendo del proyecto entero.
    expect(screen.getByTestId("metric-in-progress")).toHaveTextContent("2");
    expect(lastReplacedUrl()).toBe("/projects/project-1?status=draft_report_in_review");
  });

  it("shows the chosen facility even when it has no audits", async () => {
    renderView();

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Filter by facility" }),
      "f-3"
    );

    const house3 = screen.getByRole("button", { name: /House 3/ });
    expect(house3).toHaveTextContent("No matches");
    expect(screen.getByText("No audits match the filters.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /House 2/ })).toBeNull();
  });

  it("filters by flow", async () => {
    renderView();

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Filter by flow" }), "flow-2");

    expect(screen.getByText("Showing 1 of 3 audits")).toBeInTheDocument();
    expect(screen.getByText("a-3")).toBeInTheDocument();
  });

  it("searches the auditor, flow, facility and status", async () => {
    renderView();

    await userEvent.type(screen.getByRole("searchbox", { name: "Search audits" }), "field");

    await waitFor(() => expect(screen.getByText("Showing 1 of 3 audits")).toBeInTheDocument());
    expect(screen.getByText("a-2")).toBeInTheDocument();
  });

  it("offers to clear when nothing matches", async () => {
    renderView();

    await userEvent.type(screen.getByRole("searchbox", { name: "Search audits" }), "zzz");
    await waitFor(() =>
      expect(screen.getByText("No audits match the filters.")).toBeInTheDocument()
    );
    // El de la barra y el del estado vacío hacen lo mismo; se usa el del estado vacío.
    const clearButtons = screen.getAllByRole("button", { name: "Clear filters" });
    expect(clearButtons).toHaveLength(2);
    await userEvent.click(clearButtons[1]!);

    expect(screen.getAllByRole("button", { name: /House/ })).toHaveLength(3);
    expect(screen.queryByText(/Showing/)).toBeNull();
    expect(lastReplacedUrl()).toBe("/projects/project-1");
  });

  it("starts from the filters in the url and ignores unknown values", () => {
    state.search = "status=completed&flow=gone";

    renderView();

    expect(screen.getByRole("combobox", { name: "Filter by status" })).toHaveValue("completed");
    expect(screen.getByRole("combobox", { name: "Filter by flow" })).toHaveValue("");
    expect(screen.getByRole("button", { name: /House 1/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /House 2/ })).toBeNull();
    // Leer la URL al montar no la reescribe.
    expect(window.history.replaceState).not.toHaveBeenCalled();
  });

  it("comes back from the review with the same filters", () => {
    state.search = "status=completed";

    renderView();

    expect(openReviewOptionsSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ returnTo: "/projects/project-1?status=completed" })
    );
  });

  it("hides the toolbar while the project has no audits", () => {
    state.audits = { audits: [], isLoading: false, isError: false };

    renderView();

    expect(screen.queryByRole("searchbox", { name: "Search audits" })).toBeNull();
  });
});
