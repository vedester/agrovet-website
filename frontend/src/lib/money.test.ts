import { describe, expect, it } from "vitest";

import { formatKes, parsePriceToCents } from "./money";

describe("parsePriceToCents", () => {
  it.each<[string, number]>([
    ["4500.00", 450000],
    ["650", 65000],
    ["0.05", 5],
    ["1250.5", 125050],
  ])("reads %s as %i cents", (raw, cents) => {
    expect(parsePriceToCents(raw)).toBe(cents);
  });

  it.each(["", "abc", "-5", "12.345", "1,200"])("rejects %j", (raw) => {
    expect(() => parsePriceToCents(raw)).toThrow();
  });
});

describe("formatKes", () => {
  it.each<[number, string]>([
    [450000, "KES 4,500"],
    [125050, "KES 1,250.50"],
    [5, "KES 0.05"],
    [0, "KES 0"],
  ])("formats %i cents as %s", (cents, label) => {
    expect(formatKes(cents)).toBe(label);
  });
});
