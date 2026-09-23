/**
 * Formatos del PDF del reporte, copiados de reports-worker
 * (pdf_service.go y report_formatter_service.go) para que la vista previa
 * muestre exactamente lo que se va a imprimir.
 */

/** Importe con 2 decimales y separador de miles; ".00" se omite. */
export function formatReportAmount(amount: number): string {
  const [intPart = "0", decPart = "00"] = amount.toFixed(2).split(".");
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decPart === "00" ? withCommas : `${withCommas}.${decPart}`;
}

export const formatReportCurrency = (amount: number) =>
  `$${formatReportAmount(amount)}`;

/** Unidad en mayúsculas y sin punto final ("ea." → "EA"). */
export function normalizeUnitLabel(raw: string | null | undefined): string {
  const unit = (raw ?? "").trim().replace(/\.$/, "");
  return unit.toUpperCase();
}

/** Unidad de la mitigación: el PDF usa EA cuando no hay. */
export const mitigationUnitLabel = (unit: string | null | undefined) =>
  unit ? normalizeUnitLabel(unit) : "EA";

/** Número compacto, como `%g` en Go (3, 9.5). */
export const formatCompactNumber = (value: number) => String(value);

const MEASUREMENT_LABELS = ["Measurement", "Measurement 1", "Measurement 2"];

/**
 * Líneas de medición del PDF. Las etiquetas son posicionales: la primera es
 * "Measurement", la segunda "Measurement 1", la tercera "Measurement 2".
 * Las mediciones sin valor positivo no se imprimen.
 */
export function formatMeasurementLines(
  measurements: readonly { value: number; unit: string | null }[]
): string[] {
  const lines: string[] = [];
  measurements.forEach((measurement, index) => {
    if (!(measurement.value > 0)) return;
    const label = MEASUREMENT_LABELS[index] ?? "Measurement";
    lines.push(`${label}: ${formatMeasurementValue(measurement.value, measurement.unit)}`);
  });
  return lines;
}

function formatMeasurementValue(value: number, unit: string | null): string {
  const formatted = formatCompactNumber(value);
  const suffix = normalizeUnitLabel(unit);
  if (suffix === "%" || suffix === '"') return formatted + suffix;
  return suffix ? `${formatted} ${suffix}` : formatted;
}

/** "3" o "3 LF": el PDF omite la unidad EA en la cantidad. */
export function formatQuantityValue(quantity: number, unitLabel: string): string {
  const formatted = formatCompactNumber(quantity);
  return unitLabel === "" || unitLabel === "EA" ? formatted : `${formatted} ${unitLabel}`;
}

/** "Unit Cost: $833.33 EA". */
export function formatUnitCostLine(unitCost: number, unitLabel: string): string {
  const amount = formatReportCurrency(unitCost);
  return unitLabel ? `Unit Cost: ${amount} ${unitLabel}` : `Unit Cost: ${amount}`;
}
