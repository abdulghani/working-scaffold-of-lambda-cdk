import { describe, expect, it } from "vitest";

describe("test auth service", () => {
  it("should return true", () => {
    expect(true).toBe(true);
  });

  it("assert test envs", () => {
    expect(process.env.NODE_ENV).toBe("test");
  });
});
