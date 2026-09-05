import type { TaskState } from '../types';

const states = ['pending','processing','done','error'] as const;
export function normalizeAppEearsState(taskId: string, status: string, result?: unknown): TaskState<unknown> {
  const normalized = status.toLowerCase();
  if (normalized === 'done' || normalized === 'success') return { status: 'done', taskId, result };
  if (normalized === 'processing' || normalized === 'running') return { status: 'processing', taskId };
  if (normalized === 'error' || normalized === 'failed') return { status: 'error', taskId, message: 'The AppEEARS task failed.' };
  return { status: 'pending', taskId };
}
export const appEearsStates = states;
