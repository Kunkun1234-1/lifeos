import { z } from "zod";

/**
 * McpServer only exports top-level ZodObject schemas; intersections/effects
 * otherwise silently become an empty object in tools/list. Publish their input
 * fields as an object and keep the original schema.parse in every handler for
 * cross-field refinements and discriminated-union validation.
 */
export function mcpInputSchema(schema: z.ZodTypeAny): z.AnyZodObject {
  if (schema instanceof z.ZodObject) return schema;
  if (schema instanceof z.ZodEffects && schema._def.effect.type === "refinement") {
    return mcpInputSchema(schema.innerType());
  }
  if (schema instanceof z.ZodIntersection) {
    const left = mcpInputSchema(schema._def.left).shape;
    const right = mcpInputSchema(schema._def.right).shape;
    const shape: z.ZodRawShape = { ...left };
    for (const [key, value] of Object.entries(right) as [string, z.ZodTypeAny][]) {
      shape[key] = left[key] && left[key] !== value ? z.intersection(left[key], value) : value;
    }
    return z.object(shape);
  }
  if (schema instanceof z.ZodDiscriminatedUnion || schema instanceof z.ZodUnion) {
    const branches: z.ZodRawShape[] = schema.options.map((option: z.ZodTypeAny) => mcpInputSchema(option).shape);
    const shape: z.ZodRawShape = {};
    for (const key of new Set(branches.flatMap((branch) => Object.keys(branch)))) {
      const values = [...new Set(branches.map((branch) => branch[key]).filter(Boolean))];
      const field = values.length === 1 ? values[0] : z.union(values as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
      shape[key] = branches.every((branch) => key in branch) ? field : field.optional();
    }
    return z.object(shape);
  }
  throw new Error(`Unsupported MCP input schema: ${schema._def.typeName}`);
}
