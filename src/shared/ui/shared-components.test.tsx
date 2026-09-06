import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Badge,
  ProjectStatusBadge,
  StatusBadge,
} from "./badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
import ConfirmDialog from "./confirm-dialog";
import ConfirmTitle from "./confirm-title";
import {
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "./modal";
import PageHeader from "./page-header";
import RowActionButton from "./row-action-button";
import SearchInput from "./search-input";
import TableSummaryHeader from "./table-header";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

const Icon = ({ className }: { className?: string }) => (
  <svg data-testid="icon" className={className} />
);

describe("shared UI primitives", () => {
  it.each([
    ["neutral", "solid"],
    ["neutral", "soft"],
    ["neutral", "outline"],
    ["success", "solid"],
    ["success", "soft"],
    ["success", "outline"],
    ["warning", "solid"],
    ["warning", "soft"],
    ["warning", "outline"],
    ["danger", "solid"],
    ["danger", "soft"],
    ["danger", "outline"],
    ["info", "solid"],
    ["info", "soft"],
    ["info", "outline"],
  ] as const)("renders %s/%s badges", (tone, variant) => {
    render(
      <Badge tone={tone} variant={variant} size="md" className="custom">
        Label
      </Badge>
    );
    expect(screen.getByText("Label")).toHaveClass("custom", "px-3");
  });

  it("renders every canonical audit status and project status", () => {
    const statuses = [
      "audit_in_progress",
      "draft_report_pending_review",
      "draft_report_in_review",
      "final_report_sent_to_client",
      "completed",
    ] as const;
    const { rerender } = render(<StatusBadge status={statuses[0]} />);
    expect(screen.getByText("Audit In Progress")).toBeInTheDocument();
    for (const status of statuses.slice(1)) rerender(<StatusBadge status={status} />);
    expect(screen.getByText("Completed")).toHaveClass("bg-gray-900");

    rerender(<ProjectStatusBadge status="ACTIVE" />);
    expect(screen.getByText("Active")).toHaveClass("bg-emerald-50");
    rerender(<ProjectStatusBadge status="ARCHIVED" variant="solid" size="md" />);
    expect(screen.getByText("Archived")).toHaveClass("bg-gray-900", "px-3");
  });

  it("renders card and table composition with forwarded attributes", () => {
    render(
      <Card data-testid="card" className="card-extra">
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
        <Table className="table-extra">
          <TableCaption>Caption</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Column</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Value</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    );
    expect(screen.getByTestId("card")).toHaveClass("card-extra");
    expect(screen.getByRole("heading", { name: "Title" })).toBeInTheDocument();
    expect(screen.getByRole("table")).toHaveClass("table-extra");
    expect(screen.getByText("Caption").tagName).toBe("CAPTION");
    expect(screen.getByText("Column").tagName).toBe("TH");
    expect(screen.getByText("Value").tagName).toBe("TD");
  });

  it("renders accessible tabs and changes active content", async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="one">
        <TabsList className="tabs-list">
          <TabsTrigger value="one">One</TabsTrigger>
          <TabsTrigger value="two">Two</TabsTrigger>
        </TabsList>
        <TabsContent value="one">First content</TabsContent>
        <TabsContent value="two">Second content</TabsContent>
      </Tabs>
    );
    expect(screen.getByText("First content")).toBeVisible();
    await user.click(screen.getByRole("tab", { name: "Two" }));
    expect(screen.getByText("Second content")).toBeVisible();
  });

  it("renders search and table summary helpers", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <>
        <SearchInput aria-label="Search" onChange={onChange} containerClassName="container" />
        <TableSummaryHeader title="Facilities" subtitle="Total" total={3} action={<button>New</button>} />
      </>
    );
    const search = screen.getByRole("searchbox", { name: "Search" });
    expect(search).toHaveAttribute("placeholder", "Search…");
    await user.type(search, "plant");
    expect(onChange).toHaveBeenCalled();
    expect(screen.getByText("Total: 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New" })).toBeInTheDocument();
  });
});

describe("modal controls", () => {
  it("does not render closed content", () => {
    render(
      <Modal open={false} onOpenChange={vi.fn()}>
        Hidden
      </Modal>
    );
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
  });

  it("locks scrolling and closes on Escape and overlay click", () => {
    const onOpenChange = vi.fn();
    const { unmount } = render(
      <Modal open onOpenChange={onOpenChange}>
        <ModalContent className="custom-modal">
          <ModalHeader>
            <ModalTitle>Modal title</ModalTitle>
            <ModalDescription>Description</ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <ModalCloseButton onClick={() => onOpenChange(false)} />
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    fireEvent.click(screen.getByRole("dialog").firstElementChild as Element);
    expect(onOpenChange).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledTimes(3);
    expect(screen.getByText("Modal title")).toBeInTheDocument();
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("can disable Escape and overlay closing", () => {
    const onOpenChange = vi.fn();
    render(
      <Modal open onOpenChange={onOpenChange} closeOnEsc={false} closeOnOverlay={false}>
        Content
      </Modal>
    );
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("dialog").firstElementChild as Element);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("confirms, cancels and displays errors", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Archive report"
        description="Historical version"
        error="Cannot archive"
        confirmLabel="Archive"
        cancelLabel="Keep"
        onConfirm={onConfirm}
      />
    );
    expect(screen.getByText("Cannot archive")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Archive" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Keep" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables confirm and cancel while loading", async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog open onOpenChange={vi.fn()} title="Wait" loading onConfirm={onConfirm} />
    );
    expect(screen.getByRole("button", { name: "Loading..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("formats quoted and unquoted confirmation titles", () => {
    const { rerender } = render(<ConfirmTitle action="archive" subject="Report 1" />);
    expect(screen.getByText(/“Report 1”/)).toBeInTheDocument();
    rerender(<ConfirmTitle action="restore" subject="Report 1" quoted={false} />);
    expect(screen.getByText(/Report 1/)).not.toHaveTextContent("“");
  });
});

describe("page and row actions", () => {
  it.each(["start", "center", "end"] as const)("renders %s-aligned headers", (verticalAlign) => {
    const onClick = vi.fn();
    const { unmount } = render(
      <PageHeader
        title="Reports"
        subtitle="Generated files"
        verticalAlign={verticalAlign}
        primaryAction={{ label: "Create", onClick, icon: Icon, "data-testid": "create" }}
      />
    );
    fireEvent.click(screen.getByTestId("create"));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    unmount();
  });

  it("prefers a custom header action slot and supports an absent subtitle", () => {
    render(<PageHeader title="Reports" actionSlot={<button>Custom action</button>} />);
    expect(screen.getByRole("button", { name: "Custom action" })).toBeInTheDocument();
    expect(screen.queryByText("Generated files")).not.toBeInTheDocument();
  });

  it.each([
    ["default", "md", false],
    ["danger", "sm", false],
    ["default", "sm", true],
  ] as const)("renders %s/%s row actions", (variant, size, disabled) => {
    const onClick = vi.fn();
    render(
      <RowActionButton
        icon={Icon}
        ariaLabel="Edit"
        variant={variant}
        size={size}
        disabled={disabled}
        onClick={onClick}
      />
    );
    const button = screen.getByRole("button", { name: "Edit" });
    fireEvent.click(button);
    expect(button).toHaveAttribute("title", "Edit");
    expect(onClick).toHaveBeenCalledTimes(disabled ? 0 : 1);
  });
});
