import { UnprocessableEntityException } from '@nestjs/common';
import type { RuleResult } from '../domain/transitions';

/**
 * Regla del workflow no cumplida → 422 con la lista de faltantes en `details`.
 * El frontend (HttpApiClient) la muestra como lista en el toast.
 */
export class WorkflowException extends UnprocessableEntityException {
  constructor(message: string, details: readonly string[] = []) {
    super({ message, details });
  }
}

export function enforce(rule: RuleResult, message: string): void {
  if (!rule.ok) throw new WorkflowException(message, rule.missing);
}
