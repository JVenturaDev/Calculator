import { Injectable } from '@angular/core';
import Complex from 'complex.js';

import {
  WorkspaceCalculation,
  WorkspaceItem,
} from '../../components/work-space/work-space';
import { Step } from '../polish-services/polish-evaluator';

const STORAGE_KEY = 'calculator.demoWorkspace.v1';
const SNAPSHOT_VERSION = 1 as const;
const COMPLEX_TYPE = 'complex' as const;

type CalculationValue = number | string | Complex;

interface SerializedComplex {
  type: typeof COMPLEX_TYPE;
  re: number;
  im: number;
}

type SerializedValue = number | string | SerializedComplex;

interface SerializedStep {
  type: Step['type'];
  name: string;
  operands: SerializedValue[];
  result: SerializedValue;
  stackBefore?: SerializedValue[];
  stackAfter?: SerializedValue[];
}

interface SerializedCalculation {
  id?: string;
  expression: string;
  result: SerializedValue;
  steps: SerializedStep[];
  timestamp: string;
}

interface SerializedWorkspaceItem {
  id: string;
  title: string;
  type: WorkspaceItem['type'];
  currentExpression: string;
  calculations: SerializedCalculation[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface SerializedSnapshot {
  version: typeof SNAPSHOT_VERSION;
  activeItemId: string | null;
  items: SerializedWorkspaceItem[];
}

export interface DemoWorkspaceSnapshot {
  version: typeof SNAPSHOT_VERSION;
  activeItemId: string | null;
  items: WorkspaceItem[];
}

export type DemoWorkspaceLoadIssue =
  | 'corrupt'
  | 'unsupported-version'
  | 'unavailable';

export interface DemoWorkspaceLoadResult {
  snapshot: DemoWorkspaceSnapshot;
  issue?: DemoWorkspaceLoadIssue;
  error?: unknown;
}

@Injectable({ providedIn: 'root' })
export class DemoWorkspaceStorageService {
  load(): DemoWorkspaceSnapshot {
    return this.loadWithDiagnostics().snapshot;
  }

  loadWithDiagnostics(): DemoWorkspaceLoadResult {
    let stored: string | null;
    try {
      stored = sessionStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return {
        snapshot: this.emptySnapshot(),
        issue: 'unavailable',
        error,
      };
    }

    if (!stored) return { snapshot: this.emptySnapshot() };

    let snapshot: Partial<SerializedSnapshot>;
    try {
      snapshot = JSON.parse(stored) as Partial<SerializedSnapshot>;
    } catch (error) {
      return {
        snapshot: this.emptySnapshot(),
        issue: 'corrupt',
        error,
      };
    }

    if (
      typeof snapshot === 'object' &&
      snapshot !== null &&
      'version' in snapshot &&
      snapshot.version !== SNAPSHOT_VERSION
    ) {
      return {
        snapshot: this.emptySnapshot(),
        issue: 'unsupported-version',
      };
    }

    try {
      if (
        snapshot.version !== SNAPSHOT_VERSION ||
        !Array.isArray(snapshot.items) ||
        (snapshot.activeItemId !== null &&
          typeof snapshot.activeItemId !== 'string')
      ) {
        throw new Error('Invalid demo workspace snapshot');
      }

      return {
        snapshot: {
          version: SNAPSHOT_VERSION,
          activeItemId: snapshot.activeItemId,
          items: snapshot.items.map(item => this.deserializeItem(item)),
        },
      };
    } catch (error) {
      return {
        snapshot: this.emptySnapshot(),
        issue: 'corrupt',
        error,
      };
    }
  }

  save(snapshot: DemoWorkspaceSnapshot): void {
    const serialized: SerializedSnapshot = {
      version: SNAPSHOT_VERSION,
      activeItemId: snapshot.activeItemId,
      items: snapshot.items.map(item => this.serializeItem(item)),
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  }

  clear(): void {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  private emptySnapshot(): DemoWorkspaceSnapshot {
    return {
      version: SNAPSHOT_VERSION,
      activeItemId: null,
      items: [],
    };
  }

  private serializeItem(item: WorkspaceItem): SerializedWorkspaceItem {
    return {
      id: item.id,
      title: item.title,
      type: item.type,
      currentExpression: item.currentExpression,
      calculations: item.calculations.map(calculation =>
        this.serializeCalculation(calculation)
      ),
      tags: [...item.tags],
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private deserializeItem(item: SerializedWorkspaceItem): WorkspaceItem {
    if (
      typeof item?.id !== 'string' ||
      typeof item.title !== 'string' ||
      (item.type !== 'scientific' && item.type !== 'graphical') ||
      typeof item.currentExpression !== 'string' ||
      !Array.isArray(item.calculations) ||
      !Array.isArray(item.tags)
    ) {
      throw new Error('Invalid demo workspace item');
    }

    return {
      id: item.id,
      title: item.title,
      type: item.type,
      currentExpression: item.currentExpression,
      calculations: item.calculations.map(calculation =>
        this.deserializeCalculation(calculation)
      ),
      tags: item.tags.map(tag => {
        if (typeof tag !== 'string') throw new Error('Invalid workspace tag');
        return tag;
      }),
      createdAt: this.deserializeDate(item.createdAt),
      updatedAt: this.deserializeDate(item.updatedAt),
    };
  }

  private serializeCalculation(
    calculation: WorkspaceCalculation
  ): SerializedCalculation {
    return {
      id: calculation.id,
      expression: calculation.expression,
      result: this.serializeValue(calculation.result),
      steps: calculation.steps.map(step => this.serializeStep(step)),
      timestamp: calculation.timestamp.toISOString(),
    };
  }

  private deserializeCalculation(
    calculation: SerializedCalculation
  ): WorkspaceCalculation {
    if (
      typeof calculation?.expression !== 'string' ||
      !Array.isArray(calculation.steps) ||
      (calculation.id !== undefined && typeof calculation.id !== 'string')
    ) {
      throw new Error('Invalid demo workspace calculation');
    }

    return {
      id: calculation.id,
      expression: calculation.expression,
      result: this.deserializeValue(calculation.result) as number | Complex,
      steps: calculation.steps.map(step => this.deserializeStep(step)),
      timestamp: this.deserializeDate(calculation.timestamp),
    };
  }

  private serializeStep(step: Step): SerializedStep {
    return {
      type: step.type,
      name: step.name,
      operands: step.operands.map(value => this.serializeValue(value)),
      result: this.serializeValue(step.result),
      ...(step.stackBefore
        ? {
            stackBefore: step.stackBefore.map(value =>
              this.serializeValue(value)
            ),
          }
        : {}),
      ...(step.stackAfter
        ? {
            stackAfter: step.stackAfter.map(value =>
              this.serializeValue(value)
            ),
          }
        : {}),
    };
  }

  private deserializeStep(step: SerializedStep): Step {
    if (
      (step?.type !== 'Operator' && step.type !== 'Function') ||
      typeof step.name !== 'string' ||
      !Array.isArray(step.operands) ||
      (step.stackBefore !== undefined && !Array.isArray(step.stackBefore)) ||
      (step.stackAfter !== undefined && !Array.isArray(step.stackAfter))
    ) {
      throw new Error('Invalid demo workspace step');
    }

    return {
      type: step.type,
      name: step.name,
      operands: step.operands.map(value =>
        this.deserializeValue(value)
      ) as Step['operands'],
      result: this.deserializeValue(step.result) as Step['result'],
      ...(step.stackBefore
        ? {
            stackBefore: step.stackBefore.map(value =>
              this.deserializeValue(value)
            ) as Step['stackBefore'],
          }
        : {}),
      ...(step.stackAfter
        ? {
            stackAfter: step.stackAfter.map(value =>
              this.deserializeValue(value)
            ) as Step['stackAfter'],
          }
        : {}),
    };
  }

  private serializeValue(value: unknown): SerializedValue {
    if (value instanceof Complex) {
      return {
        type: COMPLEX_TYPE,
        re: value.re,
        im: value.im,
      };
    }

    if (typeof value === 'number' || typeof value === 'string') {
      return value;
    }

    throw new Error('Unsupported demo workspace value');
  }

  private deserializeValue(value: SerializedValue): CalculationValue {
    if (typeof value === 'number' || typeof value === 'string') {
      return value;
    }

    if (
      value?.type === COMPLEX_TYPE &&
      typeof value.re === 'number' &&
      typeof value.im === 'number'
    ) {
      return new Complex(value.re, value.im);
    }

    throw new Error('Invalid demo workspace value');
  }

  private deserializeDate(value: string): Date {
    const date = new Date(value);
    if (typeof value !== 'string' || Number.isNaN(date.getTime())) {
      throw new Error('Invalid demo workspace date');
    }
    return date;
  }
}
