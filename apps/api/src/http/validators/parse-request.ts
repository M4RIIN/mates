import type { Context } from "hono";
import { z } from "zod";
import { AppErrors } from "../../domain/shared/app-error.js";

export async function parseJsonBody<TOutput>(schema: z.ZodType<TOutput>, context: Context): Promise<TOutput> {
  let payload: unknown;

  try {
    payload = await context.req.json();
  } catch {
    throw AppErrors.validation("Invalid JSON body");
  }

  return parseWithSchema(schema, payload);
}

export function parseQuery<TOutput>(schema: z.ZodType<TOutput>, value: unknown): TOutput {
  return parseWithSchema(schema, value);
}

export function parseParam<TOutput>(schema: z.ZodType<TOutput>, value: unknown): TOutput {
  return parseWithSchema(schema, value);
}

function parseWithSchema<TOutput>(schema: z.ZodType<TOutput>, value: unknown): TOutput {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw AppErrors.validation("Validation failed", result.error.flatten());
  }

  return result.data;
}
