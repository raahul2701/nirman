export type ConflictRecord = {
  id: string;
  local: Record<string, unknown>;
  remote: Record<string, unknown>;
  field: string;
  resolvedAt?: string;
  resolution?: 'keep_local' | 'keep_remote' | 'merge';
};

export function resolveConflict(conflict: ConflictRecord, strategy: 'keep_local' | 'keep_remote' | 'merge'): ConflictRecord {
  const resolvedAt = new Date().toISOString();
  return {
    ...conflict,
    resolution: strategy,
    resolvedAt,
    local: strategy === 'keep_remote' ? conflict.remote : conflict.local,
    remote: strategy === 'keep_local' ? conflict.local : conflict.remote,
  };
}

export function autoResolveConflict(conflict: ConflictRecord): ConflictRecord {
  const localTime = new Date(conflict.local.updated_at as string || '').getTime();
  const remoteTime = new Date(conflict.remote.updated_at as string || '').getTime();
  return resolveConflict(conflict, localTime >= remoteTime ? 'keep_local' : 'keep_remote');
}
