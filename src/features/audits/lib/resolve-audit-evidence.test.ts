import { describe, expect, it } from "vitest";
import type { AuditQuestion } from "@entities/audit/model/audit-detail";
import type { AuditFinding } from "@entities/audit/model/audit-review";
import { resolveAuditEvidence } from "./resolve-audit-evidence";

const question = (url: string): AuditQuestion => ({
  id: "F01", code: "F01", type: "yes_no", text: "Entrance accessible?",
  answer: "NO", attachments: [{ id: "F01-0", name: "photo.jpg", mime: "image/jpeg", url }],
});
const finding = (url: string, includeInReport = true): AuditFinding => ({
  questionCode: "CR-B01", answer: "NO", mitigationId: null, quantity: null,
  unitCost: null, unitOfMeasure: null, measurements: [], calculatedCost: null,
  photos: [{ url, includeInReport }],
});

describe("resolveAuditEvidence", () => {
  it("resolves the real detail/review contract by bucket and complete key, not question code", () => {
    const original = question("s3://kma-audit-bucket/local-fixtures/photo.jpg");
    const authorized = "http://localhost.localstack.cloud:4566/kma-audit-bucket/local-fixtures/photo.jpg?X-Amz-Signature=fixture";
    const result = resolveAuditEvidence([original], [finding(authorized)]);
    expect(result[0].attachments[0]).toEqual({ ...original.attachments[0], url: authorized });
    expect(original.attachments[0].url).toBe("s3://kma-audit-bucket/local-fixtures/photo.jpg");
  });

  it.each([
    "https://kma-audit-bucket.s3.us-east-2.amazonaws.com/local-fixtures/photo.jpg?X-Amz-Signature=fixture",
    "https://kma-audit-bucket.localhost.localstack.cloud:4566/local-fixtures/photo.jpg?X-Amz-Signature=fixture",
  ])("supports virtual-hosted object URLs: %s", (authorized) => {
    const result = resolveAuditEvidence([question("s3://kma-audit-bucket/local-fixtures/photo.jpg")], [finding(authorized)]);
    expect(result[0].attachments[0].url).toBe(authorized);
  });

  it("matches encoded object paths and preserves the entire authorized URL", () => {
    const authorized = "https://s3.example.test/kma-audit-bucket/photos/entry%20door%23one.jpg?token=a%2Fb&expires=123";
    expect(resolveAuditEvidence([question("s3://kma-audit-bucket/photos/entry%20door%23one.jpg")], [finding(authorized)])[0].attachments[0].url).toBe(authorized);
  });

  it.each([
    "https://s3.example.test/other-bucket/local-fixtures/photo.jpg",
    "https://other-bucket.s3.amazonaws.com/local-fixtures/photo.jpg",
    "https://s3.example.test/kma-audit-bucket/another-folder/photo.jpg",
    "https://kma-audit-bucket.s3.amazonaws.com/another-folder/photo.jpg",
    "https://kma-audit-bucket-other.s3.amazonaws.com/local-fixtures/photo.jpg",
    "https://other-bucket.s3.amazonaws.com/kma-audit-bucket/local-fixtures/photo.jpg",
    "https://other-bucket.localhost.localstack.cloud:4566/kma-audit-bucket/local-fixtures/photo.jpg",
    "https://s3.example.test/kma-audit-bucket/local-fixtures/PHOTO.jpg",
  ])("does not confuse buckets, folders, prefixes or object-key case: %s", (url) => {
    const original = question("s3://kma-audit-bucket/local-fixtures/photo.jpg");
    expect(resolveAuditEvidence([original], [finding(url)])[0]).toBe(original);
  });

  it("preserves existing HTTP attachments even when the same object has another signature", () => {
    const original = question("https://s3.example.test/kma-audit-bucket/photo.jpg?token=original");
    expect(resolveAuditEvidence([original], [finding("https://s3.example.test/kma-audit-bucket/photo.jpg?token=new")])[0]).toBe(original);
  });

  it.each(["s3://kma-audit-bucket/local-fixtures/photo.jpg", "not-a-url", "javascript:alert(1)", "ftp://s3.example.test/kma-audit-bucket/local-fixtures/photo.jpg", "https://user:password@s3.example.test/kma-audit-bucket/local-fixtures/photo.jpg"])("keeps the unavailable-photo fallback when signing is absent or invalid: %s", (url) => {
    const original = question("s3://kma-audit-bucket/local-fixtures/photo.jpg");
    expect(resolveAuditEvidence([original], [finding(url)])[0]).toBe(original);
  });

  it("resolves QA evidence excluded from the PDF without changing report inclusion", () => {
    const review = finding("https://s3.example.test/kma-audit-bucket/photo.jpg", false);
    expect(resolveAuditEvidence([question("s3://kma-audit-bucket/photo.jpg")], [review])[0].attachments[0].url).toBe(review.photos[0].url);
    expect(review.photos[0].includeInReport).toBe(false);
  });

  it("preserves unknown attachments and handles empty loaded data", () => {
    const original = question("s3://kma-audit-bucket/unmatched.jpg");
    expect(resolveAuditEvidence([original], [finding("https://s3.example.test/kma-audit-bucket/photo.jpg")])[0]).toBe(original);
    expect(resolveAuditEvidence([original], [])[0]).toBe(original);
    expect(resolveAuditEvidence([], [])).toEqual([]);
  });

  it("preserves malformed encoded URIs instead of guessing the object", () => {
    const original = question("s3://kma-audit-bucket/photo%ZZ.jpg");
    expect(resolveAuditEvidence([original], [finding("https://s3.example.test/kma-audit-bucket/photo%ZZ.jpg")])[0]).toBe(original);
  });
});
