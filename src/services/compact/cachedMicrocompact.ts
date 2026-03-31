// Stub: cached micro compact for external builds
export interface CachedMCState { entries: unknown[] }
export interface CacheEditsBlock { type: string }
export interface PinnedCacheEdits { block: CacheEditsBlock }
export function createCachedMCState(): CachedMCState { return { entries: [] } }
export async function cachedMicrocompactPath(..._args: unknown[]): Promise<unknown> { return null }
