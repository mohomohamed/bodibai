import { describe, expect, it } from "vitest";
import { sha256 } from "../src/auth";
import { positiveInteger, requiredText } from "../src/utils/http";

describe("authentication helpers", () => {
  it("hashes session tokens with SHA-256", async () => {
    expect(await sha256("token")).toBe("3c469e9d6c5875d37a43f353d4f88e61fcf812c66eee3457465a40b0da4153e0");
  });
});

describe("input validation", () => {
  it("requires names and bounds portions", () => {
    expect(() => requiredText("", "Name")).toThrow("Name is required");
    expect(positiveInteger(-2)).toBe(1);
    expect(positiveInteger(2.4)).toBe(2);
  });
});
