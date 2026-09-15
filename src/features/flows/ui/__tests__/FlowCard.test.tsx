import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AnchorHTMLAttributes, ReactNode } from "react";

// ---- mocks ----

const useSessionMock = vi.fn();
vi.mock("@processes/auth/hooks", () => ({
  useSession: () => useSessionMock(),
}));

const deleteMock = vi.fn();
vi.mock("@features/flows/api/flows.repo.impl", () => ({
  flowsRepo: {
    delete: (...args: unknown[]) => deleteMock(...args),
  },
}));

// next/link se reduce a un ancla para poder consultarlo por rol.
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...rest
  }: { children: ReactNode; href: string } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// ---- import after mocks ----
import FlowCard from "../FlowCard";

describe("FlowCard", () => {
  let confirmSpy: ReturnType<typeof vi.fn>;
  let alertSpy: ReturnType<typeof vi.fn>;
  let reloadMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    useSessionMock.mockReturnValue({ isAdmin: true });
    deleteMock.mockResolvedValue(undefined);

    confirmSpy = vi.fn(() => true);
    alertSpy = vi.fn();
    reloadMock = vi.fn();
    vi.stubGlobal("confirm", confirmSpy);
    vi.stubGlobal("alert", alertSpy);
    // window.location.reload es el fallback cuando no llega onDeleted.
    Object.defineProperty(window.location, "reload", {
      configurable: true,
      writable: true,
      value: reloadMock,
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders the title, description and the view questions button", () => {
    render(
      <FlowCard flowId="AR" title="Ramps" description="Ramp audit flow" />
    );

    expect(screen.getByRole("heading", { name: "Ramps" })).toBeInTheDocument();
    expect(screen.getByText("Ramp audit flow")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /view questions/i })
    ).toBeInTheDocument();
  });

  it("omits the description paragraph when there is none", () => {
    render(<FlowCard flowId="AR" title="Ramps" />);

    expect(screen.getByRole("heading", { name: "Ramps" })).toBeInTheDocument();
    expect(screen.queryByText("Ramp audit flow")).not.toBeInTheDocument();
  });

  it("calls onViewQuestions when the view button is pressed", async () => {
    const user = userEvent.setup();
    const onViewQuestions = vi.fn();
    render(
      <FlowCard flowId="AR" title="Ramps" onViewQuestions={onViewQuestions} />
    );

    await user.click(screen.getByRole("button", { name: /view questions/i }));

    expect(onViewQuestions).toHaveBeenCalledTimes(1);
  });

  it("exposes the edit link for administrators and marks the card as navigating on click", async () => {
    const user = userEvent.setup();
    render(<FlowCard flowId="AR" title="Ramps" />);

    const link = screen.getByRole("link", { name: "Edit flow" });
    expect(link).toHaveAttribute("href", "/flows/AR");

    await user.click(link);

    expect(screen.getByText("Navigating to flow...")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Ramps" })).not.toBeInTheDocument();
  });

  it("replaces the edit link with a disabled hint for non administrators", () => {
    useSessionMock.mockReturnValue({ isAdmin: false });
    render(<FlowCard flowId="AR" title="Ramps" />);

    expect(
      screen.queryByRole("link", { name: "Edit flow" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByTitle("Only administrators can edit flows")
    ).toBeInTheDocument();
  });

  it("disables the delete button for non administrators", () => {
    useSessionMock.mockReturnValue({ isAdmin: false });
    render(<FlowCard flowId="AR" title="Ramps" />);

    expect(
      screen.getByTitle("Only administrators can delete flows")
    ).toBeDisabled();
  });

  it("asks for confirmation and aborts the delete when it is declined", async () => {
    confirmSpy.mockReturnValue(false);
    const user = userEvent.setup();
    render(<FlowCard flowId="AR" title="Ramps" />);

    await user.click(screen.getByTitle("Delete flow"));

    expect(confirmSpy).toHaveBeenCalledWith(
      "Are you sure you want to delete this flow? This action cannot be undone."
    );
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("deletes the flow and calls onDeleted when confirmed", async () => {
    const user = userEvent.setup();
    const onDeleted = vi.fn();
    render(<FlowCard flowId="AR" title="Ramps" onDeleted={onDeleted} />);

    await user.click(screen.getByTitle("Delete flow"));

    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith("AR"));
    expect(onDeleted).toHaveBeenCalledTimes(1);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it("reloads the page when no onDeleted callback is provided", async () => {
    const user = userEvent.setup();
    render(<FlowCard flowId="AR" title="Ramps" />);

    await user.click(screen.getByTitle("Delete flow"));

    await waitFor(() => expect(reloadMock).toHaveBeenCalledTimes(1));
  });

  it("alerts and keeps the card usable when the delete request fails", async () => {
    deleteMock.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<FlowCard flowId="AR" title="Ramps" />);

    await user.click(screen.getByTitle("Delete flow"));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith("Failed to delete flow")
    );
    expect(screen.getByTitle("Delete flow")).not.toBeDisabled();
  });

  it("applies the provided data-testid", () => {
    render(<FlowCard flowId="AR" title="Ramps" data-testid="flow-card-AR" />);

    expect(screen.getByTestId("flow-card-AR")).toBeInTheDocument();
  });
});
