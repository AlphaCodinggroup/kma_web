"use client";

import React from "react";
import { MessageSquare } from "lucide-react";
import type { AuditFinding } from "@entities/audit/model/audit-review";
import type { FindingDraft } from "@features/audits/lib/hooks/useReportDrafts";
import { cn } from "@shared/lib/cn";
import {
  formatMeasurementLines,
  formatQuantityValue,
  formatReportCurrency,
  formatUnitCostLine,
  measurementLabel,
  measurementUnitLabel,
  mitigationUnitLabel,
} from "@shared/lib/report-format";

/** Lo que la vista previa necesita de los borradores (ver useReportDrafts). */
export interface ReportPreviewDrafts {
  /** Clave del borrador de un hallazgo: su código, más la mitigación si el código se repite. */
  keyOf: (finding: AuditFinding) => string;
  draftOf: (key: string) => FindingDraft;
  setDraft: (key: string, patch: Partial<FindingDraft>) => void;
  errorOf: (key: string) => string | null;
  measurementErrorOf: (key: string, index: number) => string | null;
  costOf: (finding: AuditFinding) => number;
}

export interface ReportPreviewProps {
  findings: readonly AuditFinding[];
  facilityName: string;
  location?: string | null | undefined;
  /** Cantidad, mediciones y notas editables (admin, auditoría en revisión). */
  editable: boolean;
  drafts: ReportPreviewDrafts;
  canComment: boolean;
  onAddComment: (finding: AuditFinding, index: number) => void;
}

// Anchos de columna del PDF (pdf_service.go).
const COLUMN_WIDTHS = ["5.08%", "25.43%", "13.93%", "23.43%", "24.43%", "7.7%"];
const HEADERS = ["#", "Barrier Statement", "Code", "Photo", "Proposed Mitigation", "Cost"];
const MAX_PHOTOS = 3;

const cell = "border border-black px-2 py-2 align-top";

/**
 * Vista previa del reporte con el formato del PDF: la barra de la facility,
 * la tabla de hallazgos y el total. En modo edición la cantidad, las mediciones
 * y las notas se cambian en el lugar.
 */
const ReportPreview: React.FC<ReportPreviewProps> = ({
  findings,
  facilityName,
  location,
  editable,
  drafts,
  canComment,
  onAddComment,
}) => {
  const total = findings.reduce((sum, finding) => sum + drafts.costOf(finding), 0);

  return (
    <div
      className="mx-auto w-full max-w-[1100px] bg-white p-4 text-[13px] leading-snug text-black shadow-sm ring-1 ring-gray-200 sm:p-6"
      data-testid="report-preview"
    >
      <div className="bg-black px-3 py-2 text-sm font-bold text-white">{facilityName}</div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse">
          <colgroup>
            {COLUMN_WIDTHS.map((width, index) => (
              <col key={index} style={{ width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {HEADERS.map((header) => (
                <th key={header} scope="col" className={cn(cell, "text-center font-bold italic")}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {findings.length === 0 ? (
              <tr>
                <td colSpan={6} className={cn(cell, "py-8 text-center text-gray-500")}>
                  No findings to report.
                </td>
              </tr>
            ) : (
              findings.map((finding, index) => (
                <FindingRows
                  key={drafts.keyOf(finding)}
                  finding={finding}
                  index={index}
                  location={location}
                  editable={editable}
                  drafts={drafts}
                  canComment={canComment}
                  onAddComment={onAddComment}
                />
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <td
                colSpan={6}
                className="border border-black bg-[rgb(230,230,230)] px-2 py-1.5 text-right font-bold"
                data-testid="report-total"
              >
                TOTAL FOR {facilityName.toUpperCase()}: {formatReportCurrency(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

type FindingRowsProps = Omit<ReportPreviewProps, "findings" | "facilityName"> & {
  finding: AuditFinding;
  index: number;
};

function FindingRows({
  finding,
  index,
  location,
  editable,
  drafts,
  canComment,
  onAddComment,
}: FindingRowsProps) {
  const code = finding.questionCode;
  const key = drafts.keyOf(finding);
  const draft = drafts.draftOf(key);
  const error = drafts.errorOf(key);
  const unitLabel = mitigationUnitLabel(finding.unitOfMeasure);
  const measurementLines = formatMeasurementLines(finding.measurements);
  const printedPhotos = finding.photos.filter((photo) => photo.includeInReport);
  const shownPhotos = printedPhotos.slice(0, MAX_PHOTOS);
  const notPrinted = finding.photos.length - shownPhotos.length;
  // El PDF sólo arma la mitigación con texto, costo unitario y cantidad.
  const hasMitigation =
    Boolean(finding.proposedMitigation) &&
    finding.unitCost !== null &&
    (editable || finding.quantity !== null);
  const draftQuantity = Number(draft.quantity);
  const notes = draft.notes;
  const rowLabel = `finding ${index + 1}`;

  return (
    <>
      <tr data-testid={`report-row-${code}`}>
        <td className={cn(cell, "text-center")}>
          <div>{index + 1}.</div>
          <button
            type="button"
            onClick={() => onAddComment(finding, index)}
            disabled={!canComment}
            aria-label={`Comments on ${rowLabel}`}
            title={canComment ? "Comments" : "Only administrators can manage comments"}
            className="mt-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
          </button>
        </td>

        <td className={cell}>
          <p className="whitespace-pre-line">{finding.barrierStatement ?? "—"}</p>
          {editable
            ? finding.measurements.map((measurement, measurementIndex) => {
                const label = measurementLabel(measurementIndex);
                const unit = measurementUnitLabel(measurement.unit);
                const raw = draft.measurements[measurementIndex] ?? "";
                const measurementError = drafts.measurementErrorOf(key, measurementIndex);
                return (
                  <div key={measurementIndex}>
                    <label className="flex items-center gap-1">
                      {label}:
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        min={0}
                        value={raw}
                        onChange={(e) => {
                          const next = [...draft.measurements];
                          next[measurementIndex] = e.target.value;
                          drafts.setDraft(key, { measurements: next });
                        }}
                        aria-label={`${label} of ${rowLabel}`}
                        aria-invalid={Boolean(measurementError)}
                        className={cn(
                          "h-7 w-20 rounded border px-1.5 text-[13px]",
                          measurementError ? "border-red-500" : "border-gray-400"
                        )}
                      />
                      {unit}
                    </label>
                    {measurementError ? (
                      <p className="text-xs text-red-600" role="alert">
                        {measurementError}
                      </p>
                    ) : raw.trim() !== "" && Number(raw) === 0 ? (
                      <p className="text-xs text-amber-700">0 is not printed in the PDF</p>
                    ) : null}
                  </div>
                );
              })
            : measurementLines.map((line, lineIndex) => <p key={lineIndex}>{line}</p>)}
          {location ? <p>Location: {location}</p> : null}
        </td>

        <td className={cn(cell, "text-center")}>{finding.adasReference ?? ""}</td>

        <td className={cell}>
          <div className="flex flex-col gap-2">
            {shownPhotos.map((photo, photoIndex) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${photo.url}#${photoIndex}`}
                src={photo.url}
                alt={`Photo ${photoIndex + 1} of ${rowLabel}`}
                loading="lazy"
                className="h-36 w-full object-contain"
              />
            ))}
            {notPrinted > 0 && (
              <span className="text-xs text-gray-500">
                +{notPrinted} not in the report
              </span>
            )}
          </div>
        </td>

        <td className={cell}>
          {hasMitigation ? (
            <div className="space-y-0.5">
              <p className="whitespace-pre-line">{finding.proposedMitigation}</p>
              {editable ? (
                <div>
                  <label className="flex items-center gap-1">
                    Quantity:
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min={0}
                      value={draft.quantity}
                      onChange={(e) => drafts.setDraft(key, { quantity: e.target.value })}
                      aria-label={`Quantity of ${rowLabel}`}
                      aria-invalid={Boolean(error)}
                      className={cn(
                        "h-7 w-20 rounded border px-1.5 text-[13px]",
                        error ? "border-red-500" : "border-gray-400"
                      )}
                    />
                    {unitLabel !== "EA" ? unitLabel : null}
                  </label>
                  {error ? (
                    <p className="text-xs text-red-600" role="alert">
                      {error}
                    </p>
                  ) : draft.quantity.trim() !== "" && draftQuantity === 0 ? (
                    <p className="text-xs text-amber-700">0 removes the cost</p>
                  ) : null}
                </div>
              ) : finding.quantity !== null && finding.quantity > 0 ? (
                <p>Quantity: {formatQuantityValue(finding.quantity, unitLabel)}</p>
              ) : null}
              <p>{formatUnitCostLine(finding.unitCost as number, unitLabel)}</p>
            </div>
          ) : (
            "-"
          )}
        </td>

        <td className={cn(cell, "text-right")} data-testid={`report-cost-${code}`}>
          {formatReportCurrency(drafts.costOf(finding))}
        </td>
      </tr>

      {(editable || notes.trim() !== "") && (
        <tr>
          <td colSpan={6} className="border border-dashed border-gray-300 bg-gray-50 px-2 py-1.5">
            <label className="flex flex-col gap-1 text-xs text-gray-600 sm:flex-row sm:items-start sm:gap-2">
              <span className="shrink-0 pt-1">QC note (not printed in the PDF):</span>
              {editable ? (
                <textarea
                  value={notes}
                  onChange={(e) => drafts.setDraft(key, { notes: e.target.value })}
                  aria-label={`QC note for ${rowLabel}`}
                  rows={1}
                  className="min-h-8 w-full rounded border border-gray-300 bg-white px-2 py-1 text-[13px] text-black"
                />
              ) : (
                <span className="pt-1 text-[13px] text-black">{notes}</span>
              )}
            </label>
          </td>
        </tr>
      )}
    </>
  );
}

export default ReportPreview;
