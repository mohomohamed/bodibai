import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";

describe("parseCsv", () => {
  it("parses quoted commas, escaped quotes and CRLF", () => {
    expect(parseCsv('name,notes\r\n"Ahmed, Ali","Said ""hello"""\r\n')).toEqual([
      ["name", "notes"],
      ["Ahmed, Ali", 'Said "hello"'],
    ]);
  });

  it("removes a UTF-8 BOM and skips empty rows", () => {
    expect(parseCsv("\uFEFFname,phone\n\nA,123")).toEqual([["name", "phone"], ["A", "123"]]);
  });
});
