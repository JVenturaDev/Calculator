import { inject, Injectable, InjectionToken } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { BrowserGraphWorkspaceRepository } from './browser-graph-workspace-repository';
import {
  createInitialGraphWorkspaceState,
  DEFAULT_GRAPH_VIEWPORT,
  type GraphFunction,
  type GraphPlotKind,
  type GraphViewport2D,
  type GraphWorkspaceState,
} from './graph-workspace-state';

export const MAX_GRAPH_FUNCTIONS = 12;

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

  removeFunction(id: string): void {
    if (!this.hasFunction(id)) return;

    const timestamp = this.nextTimestamp();
    this.commit({
      ...this.snapshot,
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
      viewport: { ...viewport },
      updatedAt: this.nextTimestamp(),
    });
  }

  resetViewport(): void {
    if (this.sameViewport(this.snapshot.viewport, DEFAULT_GRAPH_VIEWPORT)) {
      return;
    }

    this.commit({
      ...this.snapshot,
      viewport: { ...DEFAULT_GRAPH_VIEWPORT },
      updatedAt: this.nextTimestamp(),
    });
  }

  clear(): void {
    this.commit({
      ...this.snapshot,
      functions: [],
      selectedFunctionId: null,
      viewport: { ...DEFAULT_GRAPH_VIEWPORT },
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

  private loadInitialState(): GraphWorkspaceState {
    const result = this.repository.load();
    if (result.state) return result.state;

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
}

function createId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `graph-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
