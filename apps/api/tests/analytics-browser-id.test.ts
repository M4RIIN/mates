import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), uuid: vi.fn() }));
vi.mock("../../mobile/node_modules/@react-native-async-storage/async-storage", () => ({ default: { getItem: mocks.get, setItem: mocks.set } }));
vi.mock("../../mobile/node_modules/expo-crypto", () => ({ randomUUID: mocks.uuid }));

beforeEach(() => {
  vi.resetModules(); vi.resetAllMocks();
  mocks.get.mockResolvedValue(null); mocks.set.mockResolvedValue(undefined); mocks.uuid.mockImplementation(randomUUID);
});

describe("optional browser identity", () => {
  it("shares a single persistent UUID across concurrent requests and subsequent outings", async () => {
    let stored: string | null = null;
    mocks.get.mockImplementation(async () => stored);
    mocks.set.mockImplementation(async (_: string, id: string) => { stored = id; });
    const { getAnalyticsBrowserId } = await import("../../mobile/src/infrastructure/storage/analytics-browser-id");
    const [first, concurrent] = await Promise.all([getAnalyticsBrowserId(), getAnalyticsBrowserId()]);
    expect(first).toMatch(/^[a-f0-9-]{36}$/);
    expect(concurrent).toBe(first);
    expect(await getAnalyticsBrowserId()).toBe(first);
    expect(mocks.uuid).toHaveBeenCalledTimes(1);
    expect(mocks.set).toHaveBeenCalledWith("mates:analytics-browser-id", first);
  });
  it("omits analytics if browser storage cannot be read or written, and allows retry", async () => {
    const { getAnalyticsBrowserId } = await import("../../mobile/src/infrastructure/storage/analytics-browser-id");
    mocks.get.mockRejectedValueOnce(new Error("storage disabled"));
    expect(await getAnalyticsBrowserId()).toBeUndefined();
    mocks.set.mockRejectedValueOnce(new Error("storage full"));
    expect(await getAnalyticsBrowserId()).toBeUndefined();
    expect(await getAnalyticsBrowserId()).toMatch(/^[a-f0-9-]{36}$/);
  });
  it("replaces malformed values without reusing any invitation credential", async () => {
    mocks.get.mockResolvedValue("a".repeat(64));
    const { getAnalyticsBrowserId } = await import("../../mobile/src/infrastructure/storage/analytics-browser-id");
    expect(await getAnalyticsBrowserId()).not.toBe("a".repeat(64));
    expect(mocks.get).toHaveBeenCalledWith("mates:analytics-browser-id");
  });
});
