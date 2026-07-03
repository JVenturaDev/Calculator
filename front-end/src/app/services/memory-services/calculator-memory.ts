import { Injectable } from '@angular/core';
import { CalculatorFacade } from '../calculator-state/calculator-facade';
import { MemoryService, type MemoryRecord } from './memory';

@Injectable({ providedIn: 'root' })
export class CalculatorMemoryService {
  constructor(
    private readonly repository: MemoryService,
    private readonly calculator: CalculatorFacade
  ) {}

  /**
   * Returns false without writing when the current result is absent,
   * non-numeric or non-finite.
   */
  async saveCurrent(): Promise<boolean> {
    const result = this.currentNumericResult();
    if (result === null) return false;

    const state = this.calculator.snapshot;
    const expression =
      state.lastExpression || state.expression || String(result);

    if (state.editingMemoryId !== null) {
      await this.repository.updateRecord(
        state.editingMemoryId,
        expression,
        result
      );
      this.calculator.finishMemoryEdit();
    } else {
      await this.repository.saveRecord(expression, result);
    }

    return true;
  }

  async recallLast(): Promise<boolean> {
    const record = await this.repository.getLastRecord();
    if (!record) return false;

    this.calculator.restoreMemoryRecord(record.ecuacion, record.resultado);
    return true;
  }

  async addCurrentToLast(): Promise<boolean> {
    return this.adjust(await this.repository.getLastRecord(), 1);
  }

  async subtractCurrentFromLast(): Promise<boolean> {
    return this.adjust(await this.repository.getLastRecord(), -1);
  }

  async beginEdit(id: number): Promise<boolean> {
    const record = await this.repository.getRecord(id);
    if (!record) return false;

    this.calculator.beginMemoryEdit(
      record.id ?? id,
      record.ecuacion,
      record.resultado
    );
    return true;
  }

  async addCurrentToRecord(id: number): Promise<boolean> {
    return this.adjust(await this.repository.getRecord(id), 1);
  }

  async subtractCurrentFromRecord(id: number): Promise<boolean> {
    return this.adjust(await this.repository.getRecord(id), -1);
  }

  async delete(id: number): Promise<void> {
    await this.repository.delete(id);
  }

  async clearAll(): Promise<void> {
    await this.repository.clear();
  }

  private async adjust(
    record: MemoryRecord | null,
    direction: 1 | -1
  ): Promise<boolean> {
    const current = this.currentNumericResult();
    if (!record || record.id === undefined || current === null) return false;

    await this.repository.updateRecord(
      record.id,
      record.ecuacion,
      record.resultado + direction * current
    );
    return true;
  }

  private currentNumericResult(): number | null {
    const result = this.calculator.snapshot.result;
    if (result === null || typeof result === 'object') return null;
    if (typeof result === 'string' && result.trim() === '') return null;

    const numericResult = Number(result);
    return Number.isFinite(numericResult) ? numericResult : null;
  }
}
