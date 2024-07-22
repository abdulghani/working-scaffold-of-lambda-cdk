import { expect, it } from "vitest";
import { calculateTax } from "./calculate-tax";

const ACCEPTANCE_CRITERIA = {
  "calculate tax": async () => {
    const total = 100_000;
    const rate = 10;
    const tax = calculateTax(total, rate);

    expect(tax).toBe(10_000);
  },
  "calculate tax with string": async () => {
    const total = "200000" as any;
    const rate = "10" as any;
    const tax = calculateTax(total, rate);

    expect(tax).toBe(20_000);
  }
};

Object.entries(ACCEPTANCE_CRITERIA).forEach(([name, test]) => {
  it(name, test);
});
