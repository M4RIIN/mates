type Options = {
  apiHostedWeb: boolean;
  webOrigin?: string | undefined;
  configuredApiUrl?: string | undefined;
  configuredProfileShareBaseUrl?: string | undefined;
};

export function resolveServiceUrls(options: Options) {
  // The API serves this bundle under /app; use that same server at runtime.
  // Expo development and native builds continue to use their explicit config.
  if (options.apiHostedWeb && options.webOrigin) {
    return { apiUrl: options.webOrigin, profileShareBaseUrl: options.webOrigin };
  }
  const apiUrl = options.configuredApiUrl?.trim() || "http://localhost:3000";
  return { apiUrl, profileShareBaseUrl: options.configuredProfileShareBaseUrl?.trim() || apiUrl };
}
