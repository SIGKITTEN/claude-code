// Stub: filePersistence types
export interface FilesPersistedEventData { files: PersistedFile[] }
export const OUTPUTS_SUBDIR = 'outputs'
export interface PersistedFile { path: string; content: string }
export type TurnStartTime = number
export const DEFAULT_UPLOAD_CONCURRENCY = 5
export const FILE_COUNT_LIMIT = 100
