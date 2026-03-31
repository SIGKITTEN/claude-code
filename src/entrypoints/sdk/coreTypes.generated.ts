// Auto-generated stub for external builds
// In a full build, run: bun scripts/generate-sdk-types.ts

import { z } from 'zod/v4'
import * as schemas from './coreSchemas.js'

// Re-export inferred types from schemas
export type ModelUsage = z.infer<ReturnType<typeof schemas.ModelUsageSchema>>
export type OutputFormatType = z.infer<ReturnType<typeof schemas.OutputFormatTypeSchema>>
export type BaseOutputFormat = z.infer<ReturnType<typeof schemas.BaseOutputFormatSchema>>
export type JsonSchemaOutputFormat = z.infer<ReturnType<typeof schemas.JsonSchemaOutputFormatSchema>>
export type OutputFormat = z.infer<ReturnType<typeof schemas.OutputFormatSchema>>
