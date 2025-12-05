export function formatIsoToYmdHm(iso?: string | null): string {
  const s = (iso ?? "").trim();
  if (!s) return "—";

  // Si viene en formato ISO (YYYY-MM-DDTHH:mm:ssZ), recortamos sin cambiar TZ
  const tIdx = s.indexOf("T");
  if (tIdx > 0 && s.length >= tIdx + 6) {
    return s.slice(0, tIdx) + " " + s.slice(tIdx + 1, tIdx + 6); // YYYY-MM-DD HH:mm
  }

  // Fallback: intentar parsear y volver a ISO (UTC) y recortar
  try {
    const iso2 = new Date(s).toISOString();
    return iso2.slice(0, 16).replace("T", " ");
  } catch {
    return s;
  }
}
