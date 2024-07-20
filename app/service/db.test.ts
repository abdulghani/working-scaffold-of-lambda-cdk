import { afterAll, describe, expect, it } from "vitest";
import { dbconn } from "./db";

describe("test basic db activity", () => {
  afterAll(async () => {
    await dbconn?.("user").delete();
  });

  it("creates a user", async () => {
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
  });

  it("stored a user", async () => {
    const user = await dbconn?.("user").where({ id: "one" }).first();

    expect(user?.id).toBe("one");
    expect(user?.name).toBe("Ghani");
  });
});
