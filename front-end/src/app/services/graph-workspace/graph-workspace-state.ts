export type GraphPlotKind = 'line' | 'contour';

export interface GraphViewport2D {
  readonly xMin: number;
  readonly xMax: number;
  readonly yMin: number;
  readonly yMax: number;
}

export interface GraphFunction {
  readonly id: string;
  readonly expression: string;
  readonly label: string;
  readonly color: string;
  readonly visible: boolean;
  readonly plotKind: GraphPlotKind;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface GraphWorkspaceState {
  readonly version: 1;
  readonly id: string;
  readonly name: 'Graph Workspace';
  readonly functions: readonly GraphFunction[];
  readonly selectedFunctionId: string | null;
  readonly viewport: GraphViewport2D;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export const DEFAULT_GRAPH_VIEWPORT: GraphViewport2D = Object.freeze({
  xMin: -10,
  xMax: 10,
  yMin: -10,
  yMax: 10,
});

export function createInitialGraphWorkspaceState(
  id: string,
  timestamp = new Date()
): GraphWorkspaceState {
  return {
    version: 1,
    id,
    name: 'Graph Workspace',
    functions: [],
    selectedFunctionId: null,
    viewport: { ...DEFAULT_GRAPH_VIEWPORT },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
