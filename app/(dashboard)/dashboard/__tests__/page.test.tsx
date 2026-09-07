/**
 * Página del dashboard: métricas, actividad reciente y estados de carga/error.
 *
 * Los widgets se stubbean para afirmar los datos que la página les arma, no su
 * render, que se prueba en src/widgets.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useDashboardSummary = vi.fn();

vi.mock("@features/dashboard/ui/useDashboardSummary", () => ({
  useDashboardSummary: () => useDashboardSummary(),
}));

vi.mock("@widgets/dashboard/DashboardMetrics", () => ({
  default: ({
    items,
  }: {
    items: Array<{ title: string; value: string; subtitle: string }>;
  }) => (
    <ul data-testid="metrics">
      {items.map((item) => (
        <li key={item.title}>{`${item.title}=${item.value}`}</li>
      ))}
    </ul>
  ),
}));

vi.mock("@widgets/dashboard/DashboardActivitySection", () => ({
  default: ({
    items,
  }: {
    items: Array<{ project: string; auditor: string; time: string }>;
  }) => (
    <ul data-testid="activity">
      {items.map((item, index) => (
        <li key={index}>{`${item.project} / ${item.auditor} / ${item.time}`}</li>
      ))}
    </ul>
  ),
}));

vi.mock("@shared/ui/Retry", () => ({
  Retry: ({ text, onClick }: { text: string; onClick: () => void }) => (
    <button onClick={onClick}>{text}</button>
  ),
}));

/** Métricas completas, como las devuelve el backend. */
function makeMetrics(overrides: Record<string, number> = {}) {
  return {
    totalProjects: 1200,
    totalFacilities: 34,
    totalFacilitiesUnassigned: 0,
    totalAuditsCompleted: 7,
    totalDraftReportsPendingReview: 2,
    totalDraftReportsInReview: 1,
    totalFinalReportsSentToClient: 5,
    ...overrides,
  };
}

function stubSummary(overrides: Record<string, unknown> = {}) {
  const refetch = vi.fn();
  useDashboardSummary.mockReturnValue({
    data: { metrics: makeMetrics(), recentActivity: [] },
    isLoading: false,
    isError: false,
    refetch,
    ...overrides,
  });
  return refetch;
}

async function renderPage() {
  const { default: DashboardPage } = await import("../page");
  return render(<DashboardPage />);
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the seven metrics with their titles", async () => {
    stubSummary();

    await renderPage();

    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeTruthy();
    expect(screen.getByTestId("metrics").children).toHaveLength(7);
  });

  // La página agrupa los miles con toLocaleString("es-ES"). La aserción no fija
  // el separador porque depende del ICU con el que se compiló Node, pero sí
  // que el número pasa por el formateo de locale y no por String().
  //
  // FIXME: el locale "es-ES" está hardcodeado en una interfaz que está en
  // inglés; debería venir de configuración junto con el resto de los formatos.
  it("formats the numbers with the locale grouping", async () => {
    stubSummary();

    await renderPage();

    expect(
      screen.getByText(`Totals Projects=${(1200).toLocaleString("es-ES")}`)
    ).toBeTruthy();
    expect(screen.getByText(/Totals Projects=1[.,]?200/)).toBeTruthy();
  });

  it("keeps a zero metric instead of showing it as absent", async () => {
    stubSummary();

    await renderPage();

    expect(screen.getByText("Facilities Unassigned=0")).toBeTruthy();
  });

  it("shows a dash for a non finite metric", async () => {
    stubSummary({
      data: {
        metrics: makeMetrics({ totalProjects: Number.NaN }),
        recentActivity: [],
      },
    });

    await renderPage();

    expect(screen.getByText("Totals Projects=-")).toBeTruthy();
  });

  it("shows the empty state when there are no metrics", async () => {
    stubSummary({ data: { recentActivity: [] } });

    await renderPage();

    expect(screen.getByText("No metrics available.")).toBeTruthy();
    expect(screen.queryByTestId("metrics")).toBeNull();
  });

  it("shows the skeletons while it loads", async () => {
    stubSummary({ isLoading: true, data: undefined });

    await renderPage();

    expect(screen.queryByTestId("metrics")).toBeNull();
    expect(screen.queryByTestId("activity")).toBeNull();
  });

  it("shows the retry action on error and hides the content", async () => {
    const refetch = stubSummary({ isError: true, data: undefined });

    await renderPage();

    expect(screen.queryByTestId("metrics")).toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: "Could not load dashboard." })
    );
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("refetches from the refresh button", async () => {
    const refetch = stubSummary();

    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Refresh" }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("composes the activity row as project | facility - flow", async () => {
    stubSummary({
      data: {
        metrics: makeMetrics(),
        recentActivity: [
          {
            projectName: "Proyecto",
            facilityName: "Planta",
            flowName: "Curb ramps",
            auditorName: "jane",
            completedAt: "2026-01-15T10:30:00Z",
          },
        ],
      },
    });

    await renderPage();

    expect(
      screen.getByText(/Proyecto \| Planta - Curb ramps \/ jane \//)
    ).toBeTruthy();
  });

  it.each([
    ["an absent auditor", { auditorName: "" }, "/ - /"],
    ["an absent completion date", { completedAt: null }, "/ -"],
  ])("shows a dash for %s", async (_label, overrides, expected) => {
    stubSummary({
      data: {
        metrics: makeMetrics(),
        recentActivity: [
          {
            projectName: "Proyecto",
            facilityName: "Planta",
            flowName: "Curb ramps",
            auditorName: "jane",
            completedAt: "2026-01-15T10:30:00Z",
            ...overrides,
          },
        ],
      },
    });

    await renderPage();

    expect(screen.getByTestId("activity").textContent).toContain(expected);
  });

  it("renders an empty activity list when the response has none", async () => {
    stubSummary({ data: { metrics: makeMetrics() } });

    await renderPage();

    expect(screen.getByTestId("activity").children).toHaveLength(0);
  });
});
