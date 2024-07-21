import { expect, it } from "vitest";
import { dbconn } from "./db";

const ACCEPTANCE_CRITERIA = {
  "create a user": async () => {
    const user = (
      await dbconn?.("user")
        .insert({
          id: "one",
          name: "Ghani",
          email: "ghani@example.com"
        })
        .returning("*")
    )?.find(Boolean);

    expect(user?.id).toBe("one");
    expect(user?.name).toBe("Ghani");
  },
  "stored a user": async () => {
    const user = await dbconn?.("user").where({ id: "one" }).first();

    expect(user?.id).toBe("one");
    expect(user?.name).toBe("Ghani");
  }
};

Object.entries(ACCEPTANCE_CRITERIA).forEach(([desc, test]) => {
  it(desc, test);
});
