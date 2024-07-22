import { expect, it } from "vitest";
import { padNumber } from "./pad-number";

const ACCEPTANCE_CRITERIA = {
  "pad number": async () => {
    const value = 10;
    const result = padNumber(value);

    expect(result).toBe("010");
  },
  "pad number with string": async () => {
    const value = "20" as any;
    const result = padNumber(value);

    expect(result).toBe("020");
  },
  "pad number with custom pad": async () => {
    const value = 100;
    const result = padNumber(value, 5);

    expect(result).toBe("00100");
  }
};

Object.entries(ACCEPTANCE_CRITERIA).forEach(([name, test]) => {
  it(name, test);
});
