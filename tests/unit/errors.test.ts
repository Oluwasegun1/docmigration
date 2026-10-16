import { describe, expect, it } from "vitest";
import { AppError, toErrorResponse } from "@/lib/errors";

describe("toErrorResponse", () => {
  it("maps AppError to its status and code", async () => {
    const res = toErrorResponse(new AppError("forbidden", "No access"));
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("forbidden");
  });

  it("masks unknown errors", async () => {
    const res = toErrorResponse(new Error("db password leaked"));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("leaked");
  });
});
