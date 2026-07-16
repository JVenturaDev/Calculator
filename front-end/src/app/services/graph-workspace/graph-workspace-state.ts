export type GraphPlotKind = 'line' | 'contour';

export type GraphViewMode = '2d' | '3d';

export interface GraphViewport2D {
  readonly xMin: number;
  readonly xMax: number;
  readonly yMin: number;
  readonly yMax: number;
}

export interface GraphVector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface GraphCamera3D {
  readonly eye: GraphVector3;
  readonly up: GraphVector3;
  readonly center: GraphVector3;
}

export interface GraphScene3D {
  readonly xMin: number;
  readonly xMax: number;
  readonly yMin: number;
  readonly yMax: number;
  readonly zMin: number;
  readonly zMax: number;
  readonly camera: GraphCamera3D;
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
  readonly version: 2;
  readonly id: string;
  readonly name: 'Graph Workspace';
  readonly viewMode: GraphViewMode;
  readonly functions: readonly GraphFunction[];
  readonly selectedFunctionId: string | null;
  readonly viewport2D: GraphViewport2D;
  /**
   * Compatibility alias for the 2D viewport. Keep it until every consumer
   * is migrated to viewport2D.
   */
  readonly viewport: GraphViewport2D;
  readonly scene3D: GraphScene3D;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export const DEFAULT_GRAPH_VIEWPORT_2D: GraphViewport2D = Object.freeze({
  xMin: -10,
  xMax: 10,
  yMin: -10,
  yMax: 10,
});

export const DEFAULT_GRAPH_VIEWPORT = DEFAULT_GRAPH_VIEWPORT_2D;

export const DEFAULT_GRAPH_SCENE_3D: GraphScene3D = Object.freeze({
  xMin: -10,
  xMax: 10,
  yMin: -10,
  yMax: 10,
  zMin: -10,
  zMax: 10,
  camera: Object.freeze({
    eye: Object.freeze({ x: 1.25, y: 1.25, z: 1.25 }),
    up: Object.freeze({ x: 0, y: 0, z: 1 }),
    center: Object.freeze({ x: 0, y: 0, z: 0 }),
  }),
});

export function createInitialGraphWorkspaceState(
  id: string,
  timestamp = new Date()
): GraphWorkspaceState {
  const viewport2D = { ...DEFAULT_GRAPH_VIEWPORT_2D };
  const scene3D = cloneDefaultGraphScene3D();

  return {
    version: 2,
    id,
    name: 'Graph Workspace',
    viewMode: '2d',
    functions: [],
    selectedFunctionId: null,
    viewport2D,
    viewport: viewport2D,
    scene3D,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function cloneDefaultGraphScene3D(): GraphScene3D {
  return {
    xMin: DEFAULT_GRAPH_SCENE_3D.xMin,
    xMax: DEFAULT_GRAPH_SCENE_3D.xMax,
    yMin: DEFAULT_GRAPH_SCENE_3D.yMin,
    yMax: DEFAULT_GRAPH_SCENE_3D.yMax,
    zMin: DEFAULT_GRAPH_SCENE_3D.zMin,
    zMax: DEFAULT_GRAPH_SCENE_3D.zMax,
    camera: {
      eye: { ...DEFAULT_GRAPH_SCENE_3D.camera.eye },
      up: { ...DEFAULT_GRAPH_SCENE_3D.camera.up },
      center: { ...DEFAULT_GRAPH_SCENE_3D.camera.center },
    },
  };
}
