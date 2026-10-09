import { describe, expect, it, vi } from "vitest";
import { createHttpApp } from "../src/http/app.js";
import type { AppContainer } from "../src/infrastructure/container.js";
import { nativeProfileLink, profileLink, validProfileTag } from "../../mobile/src/domain/profile-links.js";

const publicUser = { id: "11111111-1111-4111-8111-111111111111", pseudo: "alex.dupont", publicTag: "alex.dupont#0047" };
function app(result: unknown = publicUser) {
  const search = vi.fn(async () => result);
  const add = vi.fn();
  const container = { tokenService: {}, useCases: { searchUserByPublicTag: { execute: search }, addFriend: { execute: add } } } as unknown as AppContainer;
  return { http: createHttpApp(container), search, add };
}

describe("profile sharing", () => {
  it("encodes the tag including # and preserves it for native links", () => {
    expect(profileLink(publicUser.publicTag, "https://matesapi-production.up.railway.app/")).toBe("https://matesapi-production.up.railway.app/u/alex.dupont%230047");
    expect(nativeProfileLink(publicUser.publicTag)).toBe("mates://u/alex.dupont%230047");
    expect(validProfileTag([publicUser.publicTag])).toBeNull();
    expect(() => profileLink("../../auth", "https://example.com")).toThrow();
    expect(() => profileLink(publicUser.publicTag, "javascript:alert(1)")).toThrow();
  });
  it("renders the verified public identity without a token or friendship mutation", async () => {
    const { http, search, add } = app();
    const response = await http.request("/u/alex.dupont%230047");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(response.headers.get("cache-control")).toBe("no-store");
    const html = await response.text();
    expect(html).toContain('href="/app/u/alex.dupont%230047"');
    expect(html).toContain('href="mates://u/alex.dupont%230047"');
    expect(html).toContain("alex.dupont#0047");
    expect(search).toHaveBeenCalledWith(publicUser.publicTag);
    expect(add).not.toHaveBeenCalled();
  });
  it("distinguishes malformed links, absent profiles and unavailable data", async () => {
    const invalid = app();
    expect((await invalid.http.request("/u/invalid")).status).toBe(400);
    expect(invalid.search).not.toHaveBeenCalled();
    expect((await app(null).http.request("/u/alex.dupont%230047")).status).toBe(404);
    const failed = app();
    failed.search.mockRejectedValueOnce(new Error("database password secret"));
    const response = await failed.http.request("/u/alex.dupont%230047");
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("secret");
  });
  it("escapes repository content before inserting it into HTML", async () => {
    const response = await app({ ...publicUser, pseudo: '<script>alert("x")</script>' }).http.request("/u/alex.dupont%230047");
    const html = await response.text();
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
  it("does not serve missing assets as HTML", async () => {
    expect((await app().http.request("/app/_expo/missing.js")).status).toBe(404);
    expect((await app().http.request("/app/assets/%2e%2e%2f%2e%2e%2fpackage.json")).status).toBe(404);
  });
});
