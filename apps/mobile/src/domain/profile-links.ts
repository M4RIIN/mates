import { publicTagSchema } from "@mates/shared";

export function validProfileTag(value: unknown): string | null {
  const result = publicTagSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function profileLink(tag: string, baseUrl: string): string {
  if (!validProfileTag(tag)) throw new Error("Identifiant invalide");
  const base = new URL(baseUrl);
  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password) throw new Error("Adresse de partage invalide");
  return new URL(`/u/${encodeURIComponent(tag)}`, base).href;
}

export function nativeProfileLink(tag: string): string {
  if (!validProfileTag(tag)) throw new Error("Identifiant invalide");
  return `mates://u/${encodeURIComponent(tag)}`;
}
