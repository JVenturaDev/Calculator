import { inject, Injectable, InjectionToken } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { BrowserGraphWorkspaceRepository } from './browser-graph-workspace-repository';
import {
  createInitialGraphWorkspaceState,
  DEFAULT_GRAPH_SCENE_3D,
  DEFAULT_GRAPH_VIEWPORT_2D,
  type GraphFunction,
  type GraphPlotKind,
  type GraphScene3D,
  type GraphViewMode,
  type GraphViewport2D,
  type GraphWorkspaceState,
} from './graph-workspace-state';

export const MAX_GRAPH_FUNCTIONS = 12;
const SCENE_VALUE_TOLERANCE = 1e-9;

export const GRAPH_FUNCTION_COLORS = [
  '#78a9ff',
  '#ff7eb6',
  '#42be65',
  '#f1c21b',
  '#be95ff',
  '#ff832b',
  '#08bdba',
  '#fa4d56',
  '#d2a106',
  '#33b1ff',
  '#ee5396',
  '#a56eff',
] as const;

export type GraphWorkspaceIdGenerator = () => string;

export const GRAPH_WORKSPACE_ID_GENERATOR =
  new InjectionToken<GraphWorkspaceIdGenerator>(
    'GRAPH_WORKSPACE_ID_GENERATOR',
    { providedIn: 'root', factory: () => createId }
  );

@Injectable({ providedIn: 'root' })
export class GraphWorkspaceFacade {
  private readonly generateId = inject(GRAPH_WORKSPACE_ID_GENERATOR);
  private readonly repository = inject(BrowserGraphWorkspaceRepository);
  private readonly stateSubject = new BehaviorSubject<GraphWorkspaceState>(
    this.loadInitialState()
  );

  readonly state$ = this.stateSubject.asObservable();

  get snapshot(): GraphWorkspaceState {
    return this.stateSubject.value;
  }

  addFunction(expression = ''): void {
    if (this.snapshot.functions.length >= MAX_GRAPH_FUNCTIONS) return;

    const sequence = this.nextFunctionSequence();
    const timestamp = this.nextTimestamp();
    const graphFunction: GraphFunction = {
      id: this.generateId(),
      expression,
      label: `f${sequence}`,
      color: GRAPH_FUNCTION_COLORS[
        (sequence - 1) % GRAPH_FUNCTION_COLORS.length
      ],
      visible: true,
      plotKind: 'line',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.commit({
      ...this.snapshot,
      viewport: this.snapshot.viewport2D,
      functions: [...this.snapshot.functions, graphFunction],
      selectedFunctionId: graphFunction.id,
      updatedAt: timestamp,
    });
  }

  updateExpression(id: string, expression: string): void {
    this.updateFunction(id, graphFunction => ({
      ...graphFunction,
      expression,
    }));
  }

  updateLabel(id: string, label: string): void {
    const current = this.snapshot.functions.find(
      graphFunction => graphFunction.id === id
    );
    if (!current) return;

    const nextLabel = label.trim().slice(0, 32);
    if (nextLabel.length === 0 || nextLabel === current.label) return;

    const timestamp = this.nextTimestamp();
    const updatedFunction: GraphFunction = {
      ...current,
      label: nextLabel,
      updatedAt: timestamp,
    };

    this.commit({
      ...this.snapshot,
      viewport: this.snapshot.viewport2D,
      functions: this.snapshot.functions.map(graphFunction =>
        graphFunction.id === id ? updatedFunction : graphFunction
      ),
      updatedAt: timestamp,
    });
  }

  duplicateFunction(id: string): void {
    const index = this.snapshot.functions.findIndex(
      graphFunction => graphFunction.id === id
    );
    if (index < 0) return;
    if (this.snapshot.functions.length >= MAX_GRAPH_FUNCTIONS) return;

    const source = this.snapshot.functions[index];
    const timestamp = this.nextTimestamp();
    const duplicatedFunction: GraphFunction = {
      id: this.generateId(),
      expression: source.expression,
      label: this.nextFunctionLabel(),
      color: this.nextPaletteColor(source.color),
      visible: source.visible,
      plotKind: source.plotKind,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.commit({
      ...this.snapshot,
      viewport: this.snapshot.viewport2D,
      functions: [
        ...this.snapshot.functions.slice(0, index + 1),
        duplicatedFunction,
        ...this.snapshot.functions.slice(index + 1),
      ],
      selectedFunctionId: duplicatedFunction.id,
      updatedAt: timestamp,
    });
  }

  removeFunction(id: string): void {
    if (!this.hasFunction(id)) return;

    const timestamp = this.nextTimestamp();
    this.commit({
      ...this.snapshot,
      viewport: this.snapshot.viewport2D,
      functions: this.snapshot.functions.filter(
        graphFunction => graphFunction.id !== id
      ),
      selectedFunctionId:
        this.snapshot.selectedFunctionId === id
          ? null
          : this.snapshot.selectedFunctionId,
      updatedAt: timestamp,
    });
  }

  toggleFunction(id: string): void {
    this.updateFunction(id, graphFunction => ({
      ...graphFunction,
      visible: !graphFunction.visible,
    }));
  }

  setColor(id: string, color: string): void {
    const validColor = GRAPH_FUNCTION_COLORS.find(
      candidate => candidate.toLowerCase() === color.toLowerCase()
    );
    if (!validColor) return;

    this.updateFunction(id, graphFunction => ({
      ...graphFunction,
      color: validColor,
    }));
  }

  setPlotKind(id: string, plotKind: GraphPlotKind): void {
    if (plotKind !== 'line' && plotKind !== 'contour') return;

    this.updateFunction(id, graphFunction => ({
      ...graphFunction,
      plotKind,
    }));
  }

  setViewMode(mode: GraphViewMode): void {
    if (mode !== '2d' && mode !== '3d') return;
    if (this.snapshot.viewMode === mode) return;

    const timestamp = this.nextTimestamp();
    this.commit({
      ...this.snapshot,
      viewMode: mode,
      viewport: this.snapshot.viewport2D,
      updatedAt: timestamp,
    });
  }

  selectFunction(id: string | null): void {
    if (id !== null && !this.hasFunction(id)) return;
    if (this.snapshot.selectedFunctionId === id) return;

    this.commit({
      ...this.snapshot,
      selectedFunctionId: id,
      updatedAt: this.nextTimestamp(),
    });
  }

  setViewport(viewport: GraphViewport2D): void {
    if (!this.isValidViewport(viewport)) return;

    this.commit({
      ...this.snapshot,
      viewport2D: { ...viewport },
      viewport: { ...viewport },
      updatedAt: this.nextTimestamp(),
    });
  }

  setScene3D(scene: GraphScene3D): void {
    if (!this.isValidScene3D(scene)) return;

    const nextScene = cloneScene3D(scene);
    if (this.sameScene3D(this.snapshot.scene3D, nextScene)) return;

    this.commit({
      ...this.snapshot,
      scene3D: nextScene,
      updatedAt: this.nextTimestamp(),
    });
  }

  resetScene3D(): void {
    if (this.sameScene3D(this.snapshot.scene3D, DEFAULT_GRAPH_SCENE_3D)) {
      return;
    }

    this.commit({
      ...this.snapshot,
      scene3D: cloneScene3D(DEFAULT_GRAPH_SCENE_3D),
      updatedAt: this.nextTimestamp(),
    });
  }

  resetViewport(): void {
    if (
      this.sameViewport(this.snapshot.viewport2D, DEFAULT_GRAPH_VIEWPORT_2D)
    ) {
      return;
    }

    this.commit({
      ...this.snapshot,
      viewport2D: { ...DEFAULT_GRAPH_VIEWPORT_2D },
      viewport: { ...DEFAULT_GRAPH_VIEWPORT_2D },
      updatedAt: this.nextTimestamp(),
    });
  }

  clear(): void {
    const viewport2D = { ...DEFAULT_GRAPH_VIEWPORT_2D };
    this.commit({
      ...this.snapshot,
      viewMode: '2d',
      functions: [],
      selectedFunctionId: null,
      viewport2D,
      viewport: viewport2D,
      scene3D: cloneScene3D(DEFAULT_GRAPH_SCENE_3D),
      updatedAt: this.nextTimestamp(),
    });
  }

  private updateFunction(
    id: string,
    project: (graphFunction: GraphFunction) => GraphFunction
  ): void {
    const current = this.snapshot.functions.find(
      graphFunction => graphFunction.id === id
    );
    if (!current) return;

    const projected = project(current);
    if (this.sameEditableValues(current, projected)) return;

    const timestamp = this.nextTimestamp();
    const updatedFunction: GraphFunction = {
      ...projected,
      updatedAt: timestamp,
    };

    this.commit({
      ...this.snapshot,
      viewport: this.snapshot.viewport2D,
      functions: this.snapshot.functions.map(graphFunction =>
        graphFunction.id === id ? updatedFunction : graphFunction
      ),
      updatedAt: timestamp,
    });
  }

  private hasFunction(id: string): boolean {
    return this.snapshot.functions.some(
      graphFunction => graphFunction.id === id
    );
  }

  private nextFunctionSequence(): number {
    return this.snapshot.functions.reduce((maximum, graphFunction) => {
      const match = /^f(\d+)$/.exec(graphFunction.label);
      return match ? Math.max(maximum, Number(match[1])) : maximum;
    }, 0) + 1;
  }

  private nextFunctionLabel(): string {
    return `f${this.nextFunctionSequence()}`;
  }

  private nextPaletteColor(color: string): string {
    const currentIndex = GRAPH_FUNCTION_COLORS.findIndex(
      candidate => candidate.toLowerCase() === color.toLowerCase()
    );
    if (currentIndex < 0) return GRAPH_FUNCTION_COLORS[0];

    return GRAPH_FUNCTION_COLORS[
      (currentIndex + 1) % GRAPH_FUNCTION_COLORS.length
    ];
  }

  private nextTimestamp(): Date {
    const now = Date.now();
    return new Date(
      Math.max(now, this.snapshot.updatedAt.getTime() + 1)
    );
  }

  private sameEditableValues(
    current: GraphFunction,
    projected: GraphFunction
  ): boolean {
    return (
      current.expression === projected.expression &&
      current.visible === projected.visible &&
      current.color === projected.color &&
      current.plotKind === projected.plotKind
    );
  }

  private isValidViewport(viewport: GraphViewport2D): boolean {
    return (
      Number.isFinite(viewport.xMin) &&
      Number.isFinite(viewport.xMax) &&
      Number.isFinite(viewport.yMin) &&
      Number.isFinite(viewport.yMax) &&
      viewport.xMin < viewport.xMax &&
      viewport.yMin < viewport.yMax
    );
  }

  private isValidScene3D(scene: GraphScene3D): boolean {
    return (
      Number.isFinite(scene.xMin) &&
      Number.isFinite(scene.xMax) &&
      Number.isFinite(scene.yMin) &&
      Number.isFinite(scene.yMax) &&
      Number.isFinite(scene.zMin) &&
      Number.isFinite(scene.zMax) &&
      scene.xMin < scene.xMax &&
      scene.yMin < scene.yMax &&
      scene.zMin < scene.zMax &&
      this.isValidVector3(scene.camera.eye) &&
      this.isValidVector3(scene.camera.up) &&
      this.isValidVector3(scene.camera.center)
    );
  }

  private isValidVector3(vector: GraphScene3D['camera']['eye']): boolean {
    return (
      Number.isFinite(vector.x) &&
      Number.isFinite(vector.y) &&
      Number.isFinite(vector.z)
    );
  }

  private sameViewport(
    left: GraphViewport2D,
    right: GraphViewport2D
  ): boolean {
    return (
      left.xMin === right.xMin &&
      left.xMax === right.xMax &&
      left.yMin === right.yMin &&
      left.yMax === right.yMax
    );
  }

  private sameScene3D(left: GraphScene3D, right: GraphScene3D): boolean {
    return (
      this.sameNumber(left.xMin, right.xMin) &&
      this.sameNumber(left.xMax, right.xMax) &&
      this.sameNumber(left.yMin, right.yMin) &&
      this.sameNumber(left.yMax, right.yMax) &&
      this.sameNumber(left.zMin, right.zMin) &&
      this.sameNumber(left.zMax, right.zMax) &&
      this.sameVector3(left.camera.eye, right.camera.eye) &&
      this.sameVector3(left.camera.up, right.camera.up) &&
      this.sameVector3(left.camera.center, right.camera.center)
    );
  }

  private sameVector3(
    left: GraphScene3D['camera']['eye'],
    right: GraphScene3D['camera']['eye']
  ): boolean {
    return (
      this.sameNumber(left.x, right.x) &&
      this.sameNumber(left.y, right.y) &&
      this.sameNumber(left.z, right.z)
    );
  }

  private sameNumber(left: number, right: number): boolean {
    return Math.abs(left - right) <= SCENE_VALUE_TOLERANCE;
  }

  private loadInitialState(): GraphWorkspaceState {
    const result = this.repository.load();
    if (result.state) return this.cloneState(result.state);

    if (result.error !== undefined) {
      console.error(
        `Error loading Graph Workspace (${result.issue ?? 'unknown'}):`,
        result.error
      );
    }

    return createInitialGraphWorkspaceState(this.generateId());
  }

  private commit(state: GraphWorkspaceState): void {
    this.stateSubject.next(state);

    try {
      this.repository.save(state);
    } catch (error) {
      console.error('Error saving Graph Workspace:', error);
    }
  }

  private cloneState(state: GraphWorkspaceState): GraphWorkspaceState {
    if (typeof globalThis.structuredClone === 'function') {
      return globalThis.structuredClone(state) as GraphWorkspaceState;
    }

    const viewport2D = { ...state.viewport2D };
    const scene3D = cloneScene3D(state.scene3D);
    return {
      ...state,
      functions: state.functions.map(graphFunction => ({
        ...graphFunction,
        createdAt: new Date(graphFunction.createdAt),
        updatedAt: new Date(graphFunction.updatedAt),
      })),
      viewport2D,
      viewport: viewport2D,
      scene3D,
      createdAt: new Date(state.createdAt),
      updatedAt: new Date(state.updatedAt),
    };
  }
}

function cloneScene3D(scene: GraphScene3D): GraphScene3D {
  return {
    xMin: scene.xMin,
    xMax: scene.xMax,
    yMin: scene.yMin,
    yMax: scene.yMax,
    zMin: scene.zMin,
    zMax: scene.zMax,
    camera: {
      eye: { ...scene.camera.eye },
      up: { ...scene.camera.up },
      center: { ...scene.camera.center },
    },
  };
}

function createId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `graph-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
