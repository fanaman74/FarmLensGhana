import type { TaskState } from '../types';

export function classifyWithThreshold<T extends { className: string; confidence: number }>(prediction: T, threshold: number) { return prediction.confidence >= threshold ? prediction : { ...prediction, className: 'unknown' }; }
export function normalizeOlmoTask<T>(taskId: string, status: string, result?: T): TaskState<T> {
  switch (status.toLowerCase()) {
    case 'completed': case 'done': return { status: 'done', taskId, result: result as T };
    case 'running': case 'processing': return { status: 'processing', taskId };
    case 'failed': case 'error': return { status: 'error', taskId, message: 'OlmoEarth inference failed.' };
    default: return { status: 'pending', taskId };
  }
}
