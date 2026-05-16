export type PublicTagSuffixGenerator = () => number;

export const defaultPublicTagSuffixGenerator: PublicTagSuffixGenerator = () => Math.floor(Math.random() * 10_000);

export function generatePublicTag(pseudo: string, suffixGenerator: PublicTagSuffixGenerator = defaultPublicTagSuffixGenerator): string {
  const suffix = suffixGenerator();
  const safeSuffix = Math.abs(Math.trunc(suffix)) % 10_000;
  return `${pseudo}#${safeSuffix.toString().padStart(4, "0")}`;
}
