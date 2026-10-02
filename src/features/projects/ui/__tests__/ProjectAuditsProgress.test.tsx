/**
 * ProjectAuditsProgress: auditorías completadas sobre el total del proyecto.
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Audit } from "@entities/audit/model";

const state = {
  audits: [] as Audit[],
  isLoading: false,
  isError: false,
};
const projectAuditsQuerySpy = vi.fn();

vi.mock("@features/audits/lib/hooks/useProjectAudits", () => ({
  default: (projectId: string | undefined) => {
    projectAuditsQuerySpy(projectId);
    return {
      audits: state.audits,
      isLoading: state.isLoading,
      isError: state.isError,
      isFetching: false,
      refetch: vi.fn(),
    };
  },
}));

import ProjectAuditsProgress from "../ProjectAuditsProgress";

const audit = (id: string, status: string): Audit =>
  ({ id, status }) as unknown as Audit;

beforeEach(() => {
  vi.clearAllMocks();
  state.audits = [];
  state.isLoading = false;
  state.isError = false;
});

describe("ProjectAuditsProgress", () => {
  it("asks for the audits of the given project", () => {
    render(<ProjectAuditsProgress projectId="p-1" />);

    expect(projectAuditsQuerySpy).toHaveBeenCalledWith("p-1");
  });

  it("shows completed over total with a check when every audit is completed", () => {
    state.audits = [audit("a", "completed"), audit("b", "completed")];

    render(<ProjectAuditsProgress projectId="p-1" />);

    expect(screen.getByText("2/2")).toBeInTheDocument();
    expect(screen.getByLabelText("All audits completed")).toBeInTheDocument();
  });

  it("shows no check while some audit is not completed", () => {
    state.audits = [
      audit("a", "completed"),
      audit("b", "draft_report_in_review"),
      audit("c", "audit_in_progress"),
    ];

    render(<ProjectAuditsProgress projectId="p-1" />);

    expect(screen.getByText("1/3")).toBeInTheDocument();
    expect(screen.queryByLabelText("All audits completed")).not.toBeInTheDocument();
  });

  it("shows 0/0 without a check for a project with no audits", () => {
    render(<ProjectAuditsProgress projectId="p-1" />);

    expect(screen.getByText("0/0")).toBeInTheDocument();
    expect(screen.queryByLabelText("All audits completed")).not.toBeInTheDocument();
  });

  it("shows a placeholder while loading", () => {
    state.isLoading = true;
    state.audits = [audit("a", "completed")];

    render(<ProjectAuditsProgress projectId="p-1" />);

    expect(screen.getByLabelText("Loading audits")).toBeInTheDocument();
    expect(screen.queryByText("1/1")).not.toBeInTheDocument();
  });

  it("shows a dash when the audits could not be loaded", () => {
    state.isError = true;

    render(<ProjectAuditsProgress projectId="p-1" />);

    expect(screen.getByTitle("Could not load the audits")).toHaveTextContent("—");
  });
});
