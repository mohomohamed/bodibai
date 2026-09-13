export function parseCsv(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const text = source.replace(/^\uFEFF/, "");
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(cell.trim()); cell = ""; }
    else if (char === "\n") {
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; cell = "";
    } else if (char !== "\r") cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export const importFields = [
  ["", "Do not import"], ["id", "ID"], ["name", "Name *"], ["phone", "Phone"], ["email", "Email"],
  ["category", "Category"], ["groupName", "Group"], ["area", "Area"], ["portions", "Portions"],
  ["deliveryStatus", "Delivery status"], ["status", "Status"], ["notes", "Notes"],
  ["addressLabel", "Address label"], ["addressLine1", "Address line 1"], ["addressLine2", "Address line 2"],
  ["islandCity", "Island / city"], ["atollRegion", "Atoll / region"], ["country", "Country"],
] as const;

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const aliases: Record<string, string[]> = {
  id: ["id", "recordid"], name: ["name", "fullname", "household", "person"], phone: ["phone", "telephone", "mobile"],
  email: ["email", "emailaddress"], category: ["category", "type"], groupName: ["group", "groupname"],
  area: ["area", "zone"], portions: ["portions", "portion", "quantity", "qty"],
  deliveryStatus: ["deliverystatus", "delivery", "statusdelivery"], status: ["status", "active"], notes: ["notes", "note"],
  addressLabel: ["addresslabel", "label"], addressLine1: ["address", "addressline1", "address1"],
  addressLine2: ["addressline2", "address2"], islandCity: ["island", "city", "islandcity"],
  atollRegion: ["atoll", "region", "atollregion"], country: ["country"],
};

export function suggestMapping(headers: string[]): Record<number, string> {
  return Object.fromEntries(headers.map((header, index) => {
    const normalized = normalize(header);
    const field = Object.entries(aliases).find(([, values]) => values.includes(normalized))?.[0] || "";
    return [index, field];
  }));
}

export function mapRows(rows: string[][], mapping: Record<number, string>): Record<string, unknown>[] {
  return rows.map((row) => {
    const output: Record<string, unknown> = {};
    Object.entries(mapping).forEach(([column, field]) => {
      if (field) output[field] = row[Number(column)] || "";
    });
    if (output.portions) output.portions = Number(output.portions) || 1;
    return output;
  });
}
