import { describe, expect, it } from "vitest";
import { resolveServiceUrls } from "../../mobile/src/domain/service-urls.js";

describe("API-hosted web configuration", () => {
  it("uses the local host for API requests and profile sharing despite production build config", () => {
    expect(resolveServiceUrls({ apiHostedWeb: true, webOrigin: "http://192.168.1.45:3000", configuredApiUrl: "https://matesapi-production.up.railway.app", configuredProfileShareBaseUrl: "https://matesapi-production.up.railway.app" })).toEqual({ apiUrl: "http://192.168.1.45:3000", profileShareBaseUrl: "http://192.168.1.45:3000" });
  });
  it("uses Railway when that same bundle is served by Railway", () => {
    expect(resolveServiceUrls({ apiHostedWeb: true, webOrigin: "https://matesapi-production.up.railway.app", configuredApiUrl: "http://localhost:3000" }).apiUrl).toBe("https://matesapi-production.up.railway.app");
  });
  it("keeps the configured local API for Expo development and native builds", () => {
    expect(resolveServiceUrls({ apiHostedWeb: false, webOrigin: "http://localhost:8081", configuredApiUrl: "http://192.168.1.45:3000" })).toEqual({ apiUrl: "http://192.168.1.45:3000", profileShareBaseUrl: "http://192.168.1.45:3000" });
    expect(resolveServiceUrls({ apiHostedWeb: true, configuredApiUrl: "http://192.168.1.45:3000" }).apiUrl).toBe("http://192.168.1.45:3000");
  });
});
