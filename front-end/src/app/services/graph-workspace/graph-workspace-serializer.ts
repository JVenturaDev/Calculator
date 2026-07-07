import { Injectable } from '@angular/core';

import type {
  GraphFunction,
  GraphViewport2D,
  GraphWorkspaceState,
} from './graph-workspace-state';

const SNAPSHOT_VERSION = 1 as const;
const MAX_SERIALIZED_FUNCTIONS = 12;

export interface SerializedGraphViewport2D {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface SerializedGraphFunction {
  id: string;
  expression: string;
  label: string;
  color: string;
  visible: boolean;
  plotKind: 'line' | 'contour';
  createdAt: string;
  updatedAt: string;
}

export interface SerializedGraphWorkspaceState {
  version: typeof SNAPSHOT_VERSION;
  id: string;
  name: 'Graph Workspace';
  functions: SerializedGraphFunction[];
  selectedFunctionId: string | null;
  viewport: SerializedGraphViewport2D;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class GraphWorkspaceSerializer {
  serialize(state: GraphWorkspaceState): SerializedGraphWorkspaceState {
    const serialized: SerializedGraphWorkspaceState = {
      version: SNAPSHOT_VERSION,
      id: state.id,
      name: state.name,
      functions: state.functions.map(graphFunction =>
        this.serializeFunction(graphFunction)
      ),
      selectedFunctionId: state.selectedFunctionId,
      viewport: this.serializeViewport(state.viewport),
      createdAt: state.createdAt.toISOString(),
      updatedAt: state.updatedAt.toISOString(),
    };

    const normalized = this.deserialize(serialized);
    return {
      ...serialized,
      selectedFunctionId: normalized.selectedFunctionId,
    };
  }

  deserialize(value: unknown): GraphWorkspaceState {
    if (!this.isRecord(value)) {
      throw new Error('Invalid graph workspace snapshot');
    }
    if (value['version'] !== SNAPSHOT_VERSION) {
      throw new Error('Unsupported graph workspace snapshot version');
    }
    if (
      typeof value['id'] !== 'string' ||
      value['name'] !== 'Graph Workspace' ||
      !Array.isArray(value['functions']) ||
      value['functions'].length > MAX_SERIALIZED_FUNCTIONS
    ) {
      throw new Error('Invalid graph workspace snapshot');
    }

    const functions = value['functions'].map(graphFunction =>
      this.deserializeFunction(graphFunction)
    );
    const functionIds = new Set(functions.map(graphFunction => graphFunction.id));
    if (functionIds.size !== functions.length) {
      throw new Error('Duplicate graph function ID');
    }

    const selectedFunctionId = value['selectedFunctionId'];
    if (
      selectedFunctionId !== null &&
      typeof selectedFunctionId !== 'string'
    ) {
      throw new Error('Invalid selected graph function ID');
    }

    return {
      version: SNAPSHOT_VERSION,
      id: value['id'],
      name: 'Graph Workspace',
      functions,
      selectedFunctionId:
        selectedFunctionId !== null && functionIds.has(selectedFunctionId)
          ? selectedFunctionId
          : null,
      viewport: this.deserializeViewport(value['viewport']),
      createdAt: this.deserializeDate(value['createdAt']),
      updatedAt: this.deserializeDate(value['updatedAt']),
    };
  }

  private serializeFunction(
    graphFunction: GraphFunction
  ): SerializedGraphFunction {
    return {
      id: graphFunction.id,
      expression: graphFunction.expression,
      label: graphFunction.label,
      color: graphFunction.color,
      visible: graphFunction.visible,
      plotKind: graphFunction.plotKind,
      createdAt: graphFunction.createdAt.toISOString(),
      updatedAt: graphFunction.updatedAt.toISOString(),
    };
  }

  private deserializeFunction(value: unknown): GraphFunction {
    if (
      !this.isRecord(value) ||
      typeof value['id'] !== 'string' ||
      typeof value['expression'] !== 'string' ||
      typeof value['label'] !== 'string' ||
      typeof value['color'] !== 'string' ||
      typeof value['visible'] !== 'boolean' ||
      (value['plotKind'] !== 'line' && value['plotKind'] !== 'contour')
    ) {
      throw new Error('Invalid graph function');
    }

    return {
      id: value['id'],
      expression: value['expression'],
      label: value['label'],
      color: value['color'],
      visible: value['visible'],
      plotKind: value['plotKind'],
      createdAt: this.deserializeDate(value['createdAt']),
      updatedAt: this.deserializeDate(value['updatedAt']),
    };
  }

  private serializeViewport(
    viewport: GraphViewport2D
  ): SerializedGraphViewport2D {
    return {
      xMin: viewport.xMin,
      xMax: viewport.xMax,
      yMin: viewport.yMin,
      yMax: viewport.yMax,
    };
  }

  private deserializeViewport(value: unknown): GraphViewport2D {
    if (
      !this.isRecord(value) ||
      !this.isFiniteNumber(value['xMin']) ||
      !this.isFiniteNumber(value['xMax']) ||
      !this.isFiniteNumber(value['yMin']) ||
      !this.isFiniteNumber(value['yMax']) ||
      value['xMin'] >= value['xMax'] ||
      value['yMin'] >= value['yMax']
    ) {
      throw new Error('Invalid graph viewport');
    }

    return {
      xMin: value['xMin'],
      xMax: value['xMax'],
      yMin: value['yMin'],
      yMax: value['yMax'],
    };
  }

  private deserializeDate(value: unknown): Date {
    if (typeof value !== 'string') {
      throw new Error('Invalid graph workspace date');
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new Error('Invalid graph workspace date');
    }
    return date;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }
}
