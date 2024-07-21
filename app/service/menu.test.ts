import { beforeAll, expect, it } from "vitest";
import { dbconn } from "./db";
import { toggleMenu } from "./menu";

const ACCEPTANCE_CRITERIA = {
  "initial state": async () => {
    const entry = await dbconn?.("menu").where({ id: "1" }).first();
    expect(entry.active).toBe(false);
  },
  "toggle menu": async () => {
    const result = await toggleMenu?.({ menuId: "1", value: true });
    expect(result.active).toBe(true);
  },
  "menu toggled": async () => {
    const entry = await dbconn?.("menu").where({ id: "1" }).first();
    expect(entry.active).toBe(true);
  }
};

beforeAll(async () => {
  await dbconn?.("menu").insert({
    id: "1",
    active: false,
    pos_id: "1",
    title: "menu"
  });
});

Object.entries(ACCEPTANCE_CRITERIA).forEach(([key, value]) => {
  it(key, value);
});
