import { describe, expect, it } from "vitest";
import {
  findClosestRoute,
  levenshteinDistance,
} from "@/lib/navigation/routes";

describe("levenshteinDistance", () => {
  it("calculates distance correctly", () => {
    expect(levenshteinDistance("kitten", "sitting")).toBe(3);
    expect(levenshteinDistance("/dashboard", "/dashboar")).toBe(1);
    expect(levenshteinDistance("/destinations", "/destination")).toBe(1);
    expect(levenshteinDistance("same", "same")).toBe(0);
  });
});

describe("findClosestRoute matcher", () => {
  it("suggests /destinations for single typo /destinashun or /destination", () => {
    const res1 = findClosestRoute("/destination");
    expect(res1?.path).toBe("/destinations");

    const res2 = findClosestRoute("/destinationss");
    expect(res2?.path).toBe("/destinations");
  });

  it("suggests /dashboard for /dash or /dashbaord", () => {
    const res1 = findClosestRoute("/dash");
    expect(res1?.path).toBe("/dashboard");

    const res2 = findClosestRoute("/dashbaord");
    expect(res2?.path).toBe("/dashboard");
  });

  it("ignores query strings and hashes", () => {
    const res = findClosestRoute("/destination?utm_source=test#anchor");
    expect(res?.path).toBe("/destinations");
  });

  it("returns null for completely unrelated paths", () => {
    expect(findClosestRoute("/xyz123abc")).toBeNull();
    expect(findClosestRoute("/totally/random/path")).toBeNull();
  });

  it("returns null for empty or root path", () => {
    expect(findClosestRoute("")).toBeNull();
    expect(findClosestRoute("/")).toBeNull();
  });
});
