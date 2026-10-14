import { describe, expect, it } from "vitest";
import { MissingWorkspaceIdError, TenantRepository, assertWorkspaceId } from "../../src/tenant.js";
import type { Db } from "../../src/client.js";

const WS = "0192f3a4-0000-7000-8000-000000000001";
const fakeDb = {} as Db;

class NotesRepository extends TenantRepository {}

describe("assertWorkspaceId", () => {
  it("accepts a UUID and returns it", () => {
    expect(assertWorkspaceId(WS)).toBe(WS);
  });

  it.each([undefined, null, "", "not-a-uuid", 42, {}])("throws for %j", (value) => {
    expect(() => assertWorkspaceId(value)).toThrow(MissingWorkspaceIdError);
  });
});

describe("TenantRepository", () => {
  it("cannot be constructed without a workspaceId", () => {
    // @ts-expect-error — the runtime guard is the point of this test
    expect(() => new NotesRepository(fakeDb)).toThrow(MissingWorkspaceIdError);
    expect(() => new NotesRepository(fakeDb, "nope")).toThrow(MissingWorkspaceIdError);
  });

  it("exposes the validated workspaceId", () => {
    expect(new NotesRepository(fakeDb, WS).workspaceId).toBe(WS);
  });
});
