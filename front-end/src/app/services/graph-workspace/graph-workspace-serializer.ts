import { Injectable } from '@angular/core';

import {
  cloneDefaultGraphScene3D,
  type GraphCamera3D,
  type GraphFunction,
  type GraphScene3D,
  type GraphVector3,
  type GraphViewMode,
  type GraphViewport2D,
  type GraphWorkspaceState,
} from './graph-workspace-state';

const SNAPSHOT_VERSION = 2 as const;
const LEGACY_SNAPSHOT_VERSION = 1 as const;
const MAX_SERIALIZED_FUNCTIONS = 12;

export interface SerializedGraphViewport2D {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface SerializedGraphVector3 {
  x: number;
  y: number;
  z: number;
}

export interface SerializedGraphCamera3D {
  eye: SerializedGraphVector3;
  up: SerializedGraphVector3;
  center: SerializedGraphVector3;
}

export interface SerializedGraphScene3D {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  zMin: number;
  zMax: number;
  camera: SerializedGraphCamera3D;
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

export interface SerializedLegacyGraphWorkspaceState {
  version: typeof LEGACY_SNAPSHOT_VERSION;
  id: string;
  name: 'Graph Workspace';
  functions: SerializedGraphFunction[];
  selectedFunctionId: string | null;
  viewport: SerializedGraphViewport2D;
  createdAt: string;
  updatedAt: string;
}

export interface SerializedGraphWorkspaceState {
  version: typeof SNAPSHOT_VERSION;
  id: string;
  name: 'Graph Workspace';
  viewMode: GraphViewMode;
  functions: SerializedGraphFunction[];
  selectedFunctionId: string | null;
  viewport2D: SerializedGraphViewport2D;
  scene3D: SerializedGraphScene3D;
  createdAt: string;
  updatedAt: string;
}

export type SerializedGraphWorkspaceSnapshot =
  | SerializedLegacyGraphWorkspaceState
  | SerializedGraphWorkspaceState;

@Injectable({ providedIn: 'root' })
export class GraphWorkspaceSerializer {
  serialize(state: GraphWorkspaceState): SerializedGraphWorkspaceState {
    const serialized: SerializedGraphWorkspaceState = {
      version: SNAPSHOT_VERSION,
      id: state.id,
      name: state.name,
      viewMode: state.viewMode,
      functions: state.functions.map(graphFunction =>
        this.serializeFunction(graphFunction)
      ),
      selectedFunctionId: state.selectedFunctionId,
      viewport2D: this.serializeViewport(state.viewport2D),
      scene3D: this.serializeScene3D(state.scene3D),
      createdAt: state.createdAt.toISOString(),
      updatedAt: state.updatedAt.toISOString(),
    };

    const normalized = this.deserialize(serialized);
    return {
      version: SNAPSHOT_VERSION,
      id: normalized.id,
      name: normalized.name,
      viewMode: normalized.viewMode,
      functions: normalized.functions.map(graphFunction =>
        this.serializeFunction(graphFunction)
      ),
      selectedFunctionId: normalized.selectedFunctionId,
      viewport2D: this.serializeViewport(normalized.viewport2D),
      scene3D: this.serializeScene3D(normalized.scene3D),
      createdAt: normalized.createdAt.toISOString(),
      updatedAt: normalized.updatedAt.toISOString(),
    };
  }

  deserialize(value: unknown): GraphWorkspaceState {
    if (!this.isRecord(value)) {
      throw new Error('Invalid graph workspace snapshot');
    }

    if (value['version'] === LEGACY_SNAPSHOT_VERSION) {
      return this.deserializeLegacy(value);
    }

    if (value['version'] !== SNAPSHOT_VERSION) {
      throw new Error('Unsupported graph workspace snapshot version');
    }

    if (
      typeof value['id'] !== 'string' ||
      value['name'] !== 'Graph Workspace' ||
      !this.isValidViewMode(value['viewMode']) ||
      !Array.isArray(value['functions']) ||
      value['functions'].length > MAX_SERIALIZED_FUNCTIONS ||
      !this.isRecord(value['viewport2D']) ||
      !this.isRecord(value['scene3D'])
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

    const viewport2D = this.deserializeViewport2D(value['viewport2D']);
    const scene3D = this.deserializeScene3D(value['scene3D']);

    return {
      version: SNAPSHOT_VERSION,
      id: value['id'],
      name: 'Graph Workspace',
      viewMode: value['viewMode'],
      functions,
      selectedFunctionId:
        selectedFunctionId !== null && functionIds.has(selectedFunctionId)
          ? selectedFunctionId
          : null,
      viewport2D,
      viewport: viewport2D,
      scene3D,
      createdAt: this.deserializeDate(value['createdAt']),
      updatedAt: this.deserializeDate(value['updatedAt']),
    };
  }

  private deserializeLegacy(value: Record<string, unknown>): GraphWorkspaceState {
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

    const viewport2D = this.deserializeViewport2D(value['viewport']);
    const scene3D = cloneDefaultGraphScene3D();

    return {
      version: SNAPSHOT_VERSION,
      id: value['id'],
      name: 'Graph Workspace',
      viewMode: '2d',
      functions,
      selectedFunctionId:
        selectedFunctionId !== null && functionIds.has(selectedFunctionId)
          ? selectedFunctionId
          : null,
      viewport2D,
      viewport: viewport2D,
      scene3D,
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

  private deserializeViewport2D(value: unknown): GraphViewport2D {
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

  private serializeScene3D(scene: GraphScene3D): SerializedGraphScene3D {
    return {
      xMin: scene.xMin,
      xMax: scene.xMax,
      yMin: scene.yMin,
      yMax: scene.yMax,
      zMin: scene.zMin,
      zMax: scene.zMax,
      camera: this.serializeCamera(scene.camera),
    };
  }

  private serializeCamera(
    camera: GraphCamera3D
  ): SerializedGraphCamera3D {
    return {
      eye: this.serializeVector3(camera.eye),
      up: this.serializeVector3(camera.up),
      center: this.serializeVector3(camera.center),
    };
  }

  private serializeVector3(
    vector: GraphVector3
  ): SerializedGraphVector3 {
    return {
      x: vector.x,
      y: vector.y,
      z: vector.z,
    };
  }

  private deserializeScene3D(value: unknown): GraphScene3D {
    if (
      !this.isRecord(value) ||
      !this.isFiniteNumber(value['xMin']) ||
      !this.isFiniteNumber(value['xMax']) ||
      !this.isFiniteNumber(value['yMin']) ||
      !this.isFiniteNumber(value['yMax']) ||
      !this.isFiniteNumber(value['zMin']) ||
      !this.isFiniteNumber(value['zMax']) ||
      value['xMin'] >= value['xMax'] ||
      value['yMin'] >= value['yMax'] ||
      value['zMin'] >= value['zMax'] ||
      !this.isRecord(value['camera'])
    ) {
      throw new Error('Invalid graph scene 3D');
    }

    return {
      xMin: value['xMin'],
      xMax: value['xMax'],
      yMin: value['yMin'],
      yMax: value['yMax'],
      zMin: value['zMin'],
      zMax: value['zMax'],
      camera: this.deserializeCamera(value['camera']),
    };
  }

  private deserializeCamera(value: unknown): GraphCamera3D {
    if (
      !this.isRecord(value) ||
      !this.isRecord(value['eye']) ||
      !this.isRecord(value['up']) ||
      !this.isRecord(value['center'])
    ) {
      throw new Error('Invalid graph camera 3D');
    }

    return {
      eye: this.deserializeVector3(value['eye']),
      up: this.deserializeVector3(value['up']),
      center: this.deserializeVector3(value['center']),
    };
  }

  private deserializeVector3(value: unknown): GraphVector3 {
    if (
      !this.isRecord(value) ||
      !this.isFiniteNumber(value['x']) ||
      !this.isFiniteNumber(value['y']) ||
      !this.isFiniteNumber(value['z'])
    ) {
      throw new Error('Invalid graph vector 3D');
    }

    return {
      x: value['x'],
      y: value['y'],
      z: value['z'],
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

  private isValidViewMode(value: unknown): value is GraphViewMode {
    return value === '2d' || value === '3d';
  }
}
