import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AuditQuestionsList from "../AuditQuestionsList";

vi.mock("../AuditQuestionCard", () => ({ default: ({ text, attachments }: { text: string; attachments: { id: string; name: string }[] }) => <article>{text}{attachments.map(attachment => <span key={attachment.id}>{attachment.name}</span>)}</article> }));

describe("AuditQuestionsList — field evidence", () => {
  it("preserves the photographs supplied with an answer", () => {
    render(<AuditQuestionsList items={[{ id: "q-1", text: "Entrance", type: "yes_no", answer: false, attachments: [{ id: "photo-1", name: "Entrance photograph", url: "https://files.test/entrance.jpg" }] }]} />);
    expect(screen.getByText("Entrance photograph")).toBeVisible();
  });
  it("includes evidence-only responses in the all-answers view", () => {
    render(<AuditQuestionsList items={[{ id: "q-1", text: "Field evidence", type: "text", attachments: [{ id: "photo-1", name: "Entrance photograph", url: "https://files.test/entrance.jpg" }] }]} />);
    expect(screen.getByText("Field evidence")).toBeVisible();
    expect(screen.getByText("Entrance photograph")).toBeVisible();
  });
});
