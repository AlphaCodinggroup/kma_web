import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  back: vi.fn(),
  push: vi.fn(),
  params: { id: "flow-1" } as Record<string, string>,
  accessCookie: undefined as string | undefined,
  session: { user: { name: "Admin User", role: "admin" } } as any,
  flowsQuery: { data: undefined, isLoading: false, error: null } as any,
  flowById: { flow: undefined, isLoading: false, error: null, refetch: vi.fn() } as any,
  auditDetail: { data: undefined, isLoading: false } as any,
  createProject: vi.fn(),
  createFacility: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  useRouter: () => ({ back: mocks.back, push: mocks.push }),
  useParams: () => mocks.params,
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => mocks.accessCookie ? { value: mocks.accessCookie } : undefined }),
}));
vi.mock("@shared/config/env", () => ({
  serverEnv: () => ({ cookies: { accessName: "access-token" } }),
}));
vi.mock("@processes/auth/session", () => ({ getServerSession: async () => mocks.session }));
vi.mock("@processes/auth/guard", () => ({ default: ({ children }: any) => <div data-testid="auth-guard">{children}</div> }));
vi.mock("@processes/auth/context", () => ({ AuthProvider: ({ children, session }: any) => <div data-testid="auth-provider" data-user={session.user?.name}>{children}</div> }));
vi.mock("@shared/providers/query-provider", () => ({ default: ({ children }: any) => <div data-testid="query-provider">{children}</div> }));
vi.mock("@widgets/shell/AppHeader", () => ({ default: ({ role, userName }: any) => <header data-testid="app-header" data-role={role}>{userName}</header> }));
vi.mock("@widgets/shell/SidebarNav", () => ({ default: ({ role }: any) => <nav data-testid="sidebar" data-role={role} /> }));
vi.mock("@features/auth/ui/LoginForm", () => ({ default: () => <form aria-label="Login form" /> }));
vi.mock("@shared/ui/page-header", () => ({ default: ({ title, subtitle }: any) => <header><h1>{title}</h1><p>{subtitle}</p></header> }));
vi.mock("@features/flows/lib/useFlowsQuery", () => ({
  useFlowsQuery: () => mocks.flowsQuery,
  useFlowById: () => mocks.flowById,
}));
vi.mock("@features/flows/ui/FlowSection", () => ({
  FlowsSection: ({ items }: any) => <section data-testid="flows-section">{items.map((item: any) => <span key={item.id}>{item.title}</span>)}</section>,
}));
vi.mock("@features/flows/ui/FlowEditor", () => ({
  FlowEditor: ({ initialFlow, mode }: any) => <div data-testid="flow-editor" data-id={initialFlow.id} data-mode={mode ?? "edit"}>{initialFlow.title}</div>,
}));
vi.mock("@features/projects/ui/ProjectsContent", () => ({
  ProjectsContent: ({ createTriggerRef }: any) => {
    createTriggerRef.current = mocks.createProject;
    return <div>Projects content</div>;
  },
}));
vi.mock("@features/facilities/ui/FacilitiesContent", () => ({
  FacilitiesContent: ({ createTriggerRef }: any) => {
    createTriggerRef.current = mocks.createFacility;
    return <div>Facilities content</div>;
  },
}));
vi.mock("@features/audits/lib/hooks/useAuditDetail", () => ({ useAuditDetail: () => mocks.auditDetail }));
vi.mock("@features/audits/ui/AuditEditHeader", () => ({ default: (props: any) => <div data-testid="audit-edit-header" data-props={JSON.stringify(props)} /> }));
vi.mock("@features/audits/ui/AuditInfoPanel", () => ({ default: (props: any) => <div data-testid="audit-info-panel" data-props={JSON.stringify(props)} /> }));
vi.mock("@features/audits/ui/AuditEditContent", () => ({ default: (props: any) => <div data-testid="audit-edit-content" data-props={JSON.stringify(props)} /> }));

import Home from "./page";
import GlobalError from "./global-error";
import LoginPage from "./(auth)/login/page";
import DashboardError from "./(dashboard)/error";
import PrivateLayout from "./(dashboard)/layout";
import ProjectsPage from "./(dashboard)/projects/page";
import FlowsPage from "./(dashboard)/flows/page";
import FlowEditorPage from "./(dashboard)/flows/[id]/page";
import NewFlowPage from "./(dashboard)/flows/new/page";
import AuditEditPage from "./(standalone)/audits/[id]/edit/page";
import StandaloneLayout from "./(standalone)/audits/[id]/edit/layout";

describe("application pages and layouts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.accessCookie = undefined;
    mocks.flowsQuery = { data: undefined, isLoading: false, error: null };
    mocks.flowById = { flow: undefined, isLoading: false, error: null, refetch: vi.fn() };
    mocks.auditDetail = { data: undefined, isLoading: false };
  });
  afterEach(() => cleanup());

  it("redirects the root route to login", async () => {
    await Home({});
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });

  it("renders both error boundaries and retries", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    const { unmount } = render(<GlobalError error={new Error("Fatal error")} reset={reset} />);
    expect(screen.getByText("Fatal error")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    unmount();
    render(<DashboardError error={new Error("")} reset={reset} />);
    expect(screen.getByText("An unexpected error occurred.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledTimes(2);
  });

  it("renders login without a session cookie and redirects an existing session", async () => {
    render(await LoginPage({}));
    expect(screen.getByRole("form", { name: "Login form" })).toBeInTheDocument();
    cleanup();
    mocks.accessCookie = "token";
    await LoginPage({});
    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("assembles dashboard and standalone authenticated layouts", async () => {
    const { unmount } = render(await PrivateLayout({ children: <div>Dashboard child</div> }));
    expect(screen.getByTestId("app-header")).toHaveAttribute("data-role", "admin");
    expect(screen.getByTestId("sidebar")).toHaveAttribute("data-role", "admin");
    expect(screen.getByText("Dashboard child")).toBeInTheDocument();
    unmount();
    render(await StandaloneLayout({ children: <div>Standalone child</div> }));
    expect(screen.getByText("Standalone child")).toBeInTheDocument();
    expect(screen.getByTestId("auth-provider")).toHaveAttribute("data-user", "Admin User");
  });

  it("switches project tabs and delegates each create action", async () => {
    const user = userEvent.setup();
    render(<ProjectsPage />);
    await user.click(screen.getByRole("button", { name: "New Project" }));
    expect(mocks.createProject).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("tab", { name: "Facilities" }));
    await user.click(screen.getByRole("button", { name: "New Facility" }));
    expect(mocks.createFacility).toHaveBeenCalledOnce();
  });

  it("renders, searches, loads and reports errors on the flows page", async () => {
    const user = userEvent.setup();
    mocks.flowsQuery = {
      data: { flows: [
        { id: "f1", title: "Ramp inspection", description: "Entrances" },
        { id: "f2", title: "Elevator", description: "Vertical access" },
      ] },
      isLoading: false,
      error: null,
    };
    const { rerender } = render(<FlowsPage />);
    expect(screen.getByText("Ramp inspection")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("Search flows..."), "vertical");
    expect(screen.queryByText("Ramp inspection")).not.toBeInTheDocument();
    expect(screen.getByText("Elevator")).toBeInTheDocument();

    mocks.flowsQuery = { data: undefined, isLoading: true, error: null };
    rerender(<FlowsPage />);
    expect(screen.getByText("Loading flows…")).toBeInTheDocument();
    mocks.flowsQuery = { data: undefined, isLoading: false, error: new Error("network") };
    rerender(<FlowsPage />);
    expect(screen.getByText("Error loading flows: network")).toBeInTheDocument();
  });

  it("covers flow detail loading, errors, retry and editing", async () => {
    const user = userEvent.setup();
    mocks.flowById = { flow: undefined, isLoading: true, error: null, refetch: vi.fn() };
    const { rerender } = render(<FlowEditorPage />);
    expect(screen.getByText("Loading Flow")).toBeInTheDocument();
    mocks.flowById = { flow: undefined, isLoading: false, error: new Error("not found"), refetch: vi.fn() };
    rerender(<FlowEditorPage />);
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(mocks.flowById.refetch).toHaveBeenCalled();
    mocks.flowById = { flow: { id: "flow-1", title: "Ramp", steps: [] }, isLoading: false, error: null, refetch: vi.fn() };
    rerender(<FlowEditorPage />);
    expect(screen.getByRole("heading", { name: "Edit Flow: Ramp" })).toBeInTheDocument();
    expect(screen.getByTestId("flow-editor")).toHaveAttribute("data-id", "flow-1");
  });

  it("passes a fresh navigation flow to the creation editor", () => {
    render(<NewFlowPage />);
    expect(screen.getByRole("heading", { name: "Create New Flow" })).toBeInTheDocument();
    expect(screen.getByTestId("flow-editor")).toHaveAttribute("data-id", "new");
    expect(screen.getByTestId("flow-editor")).toHaveAttribute("data-mode", "create");
  });

  it("maps audit detail and query auditor into the standalone review page", () => {
    mocks.auditDetail = {
      data: {
        id: "audit-1",
        flowName: "Ramp flow",
        status: "completed",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-02",
        projectName: "Project A",
        facilityName: "Facility A",
        location: "Boston",
        auditorName: "Fallback Auditor",
      },
      isLoading: false,
    };
    render(
      <AuditEditPage
        {...({ params: { id: "audit-1" }, searchParams: { auditor: "Query Auditor" } } as any)}
      />,
    );
    expect(screen.getByTestId("audit-edit-header")).toHaveAttribute(
      "data-props",
      expect.stringContaining("Query Auditor"),
    );
    expect(screen.getByTestId("audit-info-panel")).toHaveAttribute(
      "data-props",
      expect.stringContaining("Project A"),
    );
    expect(screen.getByTestId("audit-edit-content")).toHaveAttribute(
      "data-props",
      expect.stringContaining("audit-1"),
    );
  });
});
