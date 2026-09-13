import { CheckCircle2, FileSpreadsheet, UploadCloud, XCircle } from "lucide-react";
import { useMemo, useState, type ChangeEvent } from "react";
import { importFields, parseCsv } from "../csv";

type Summary = { imported: number; updated: number; skipped: number; failed: number; errors: { row: number; message: string }[] };

const aliases: Record<string, string> = {
  fullname: "name", household: "name", person: "name", mobile: "phone", telephone: "phone", emailaddress: "email",
  group: "groupName", groupname: "groupName", zone: "area", quantity: "portions", qty: "portions",
  deliverystatus: "deliveryStatus", address: "addressLine1", addressline1: "addressLine1", addressline2: "addressLine2",
  island: "islandCity", city: "islandCity", islandcity: "islandCity", atoll: "atollRegion", region: "atollRegion",
};
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

export function ImportPanel({ onImport }: { onImport: (rows: Record<string, unknown>[]) => Promise<Summary> }) {
  const [fileName, setFileName] = useState(""), [table, setTable] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, string>>({}), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [summary, setSummary] = useState<Summary | null>(null);
  const headers = table[0] || [], dataRows = table.slice(1);
  const normalized = useMemo(() => dataRows.map((row) => {
    const output: Record<string, unknown> = {};
    headers.forEach((_, index) => { const field = mapping[index]; if (field) output[field] = row[index] || ""; });
    return output;
  }).filter((row) => Object.values(row).some(Boolean)), [dataRows, headers, mapping]);

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    setError(""); setSummary(null);
    if (!file.name.toLowerCase().endsWith(".csv")) { setError("Choose a CSV file. You can export XLSX files as CSV first."); return; }
    if (file.size > 1_500_000) { setError("The file is larger than the 1.5 MB import limit."); return; }
    const parsed = parseCsv(await file.text());
    if (parsed.length < 2) { setError("The CSV needs a header row and at least one data row."); return; }
    const nextMapping: Record<number, string> = {};
    parsed[0].forEach((header, index) => {
      const key = normalize(header);
      const exact = importFields.find(([value, label]) => normalize(value) === key || normalize(label.replace(" *", "")) === key)?.[0];
      nextMapping[index] = exact || aliases[key] || "";
    });
    setFileName(file.name); setTable(parsed); setMapping(nextMapping);
  };

  const submit = async () => {
    if (!Object.values(mapping).includes("name")) { setError("Map one column to Name before importing."); return; }
    if (!navigator.onLine) { setError("Connect to the internet to validate and import this file."); return; }
    setBusy(true); setError("");
    try { setSummary(await onImport(normalized)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Import failed."); }
    finally { setBusy(false); }
  };

  return <div className="content-narrow">
    <div className="page-heading"><div><p className="eyebrow">Bring existing data</p><h1>Import records</h1><p>Review and map every column before anything is written to D1.</p></div></div>
    {!table.length ? <section className="upload-card card">
      <div className="upload-icon"><UploadCloud /></div><h2>Choose a CSV file</h2><p>Up to 2,000 rows and 1.5 MB. Your file is parsed in this browser first.</p>
      <label className="button primary file-button">Choose file<input type="file" accept=".csv,text/csv" onChange={(event) => void choose(event)} /></label>
      <small>Nothing is imported until you confirm the preview.</small>
    </section> : <>
      <section className="import-file card"><FileSpreadsheet /><div><h2>{fileName}</h2><p>{dataRows.length} data row{dataRows.length === 1 ? "" : "s"} found</p></div><label className="text-button file-button">Choose another<input type="file" accept=".csv,text/csv" onChange={(event) => void choose(event)} /></label></section>
      <section className="card import-section"><div className="section-title"><div><h2>Map columns</h2><p>Choose what each CSV column means.</p></div></div>
        <div className="mapping-list">{headers.map((header, index) => <label key={`${header}-${index}`}><span><strong>{header || `Column ${index + 1}`}</strong><small>{dataRows[0]?.[index] || "No sample"}</small></span><select value={mapping[index] || ""} onChange={(event) => setMapping({ ...mapping, [index]: event.target.value })}>{importFields.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>)}</div>
      </section>
      <section className="card import-section"><div className="section-title"><div><h2>Preview</h2><p>{normalized.length} normalized row{normalized.length === 1 ? "" : "s"}; first five shown.</p></div></div>
        <div className="table-scroll"><table className="preview-table"><thead><tr>{[...new Set(Object.values(mapping).filter(Boolean))].map((field) => <th key={field}>{importFields.find(([value]) => value === field)?.[1]}</th>)}</tr></thead><tbody>{normalized.slice(0, 5).map((row, index) => <tr key={index}>{[...new Set(Object.values(mapping).filter(Boolean))].map((field) => <td key={field}>{String(row[field] || "—")}</td>)}</tr>)}</tbody></table></div>
        <div className="confirm-row"><p>D1 will create new UUIDs when no ID is present. Matching IDs are updated.</p><button className="button primary" disabled={busy || !normalized.length} onClick={() => void submit()}>{busy ? "Importing…" : `Import ${normalized.length} rows`}</button></div>
      </section>
    </>}
    {error && <p className="alert error-alert"><XCircle size={18} />{error}</p>}
    {summary && <section className="card result-card"><CheckCircle2 /><div><h2>Import complete</h2><p>Imported: {summary.imported} · Updated: {summary.updated} · Skipped: {summary.skipped} · Failed: {summary.failed}</p>{summary.errors.length > 0 && <ul>{summary.errors.slice(0, 20).map((item) => <li key={`${item.row}-${item.message}`}>Row {item.row}: {item.message}</li>)}</ul>}</div></section>}
  </div>;
}
