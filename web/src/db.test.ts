import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { addPending, listPending, removePending } from "./db";
import type { PendingMutation } from "./types";

describe("offline mutation queue", () => {
  beforeEach(async () => {
    for (const item of await listPending()) await removePending(item.id);
  });

  it("keeps changes in chronological order until explicitly removed", async () => {
    const later: PendingMutation = {
      id: "later", type: "UPDATE_RECORD", method: "PUT", path: "/api/records/a",
      entityType: "record", entityId: "a", createdAt: 20, payload: { name: "Later" },
    };
    const earlier: PendingMutation = { ...later, id: "earlier", createdAt: 10, payload: { name: "Earlier" } };
    await addPending(later);
    await addPending(earlier);
    expect((await listPending()).map((item) => item.id)).toEqual(["earlier", "later"]);
    await removePending("earlier");
    expect((await listPending()).map((item) => item.id)).toEqual(["later"]);
  });
});
