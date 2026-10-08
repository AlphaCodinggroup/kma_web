import type { AuditQuestion } from "@entities/audit/model/audit-detail";
import type { AuditFinding } from "@entities/audit/model/audit-review";

function decodePath(value: string): string | undefined {
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

function authorizedPhoto(url: string) {
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol) || parsed.username || parsed.password) return undefined;
    const path = decodePath(parsed.pathname.slice(1));
    if (!path) return undefined;
    const virtualBucket = /^(.+)\.(?:s3(?:[.-][^.]*)?\..+|localhost\.localstack\.cloud)$/.exec(parsed.hostname)?.[1];
    return { url, hostname: parsed.hostname, path, virtualBucket };
  } catch {
    return undefined;
  }
}

/** Reuse readable review evidence without changing attachment identity or PDF inclusion. */
export function resolveAuditEvidence(
  questions: readonly AuditQuestion[],
  findings: readonly AuditFinding[],
): AuditQuestion[] {
  const photos = findings.flatMap((finding) => finding.photos)
    .map((photo) => authorizedPhoto(photo.url))
    .filter((photo) => photo !== undefined);

  return questions.map((question) => {
    let changed = false;
    const attachments = question.attachments.map((attachment) => {
      const object = /^s3:\/\/([^/?#]+)\/([^?#]+)$/.exec(attachment.url);
      if (!object) return attachment;
      const bucket = object[1].toLowerCase();
      const key = decodePath(object[2]);
      if (!key) return attachment;
      const match = photos.find((photo) =>
        photo.virtualBucket
          ? photo.virtualBucket === bucket && photo.path === key
          : (photo.hostname.startsWith(`${bucket}.`) && photo.path === key) ||
            photo.path === `${bucket}/${key}`,
      );
      if (!match) return attachment;
      changed = true;
      return { ...attachment, url: match.url };
    });
    return changed ? { ...question, attachments } : question;
  });
}
