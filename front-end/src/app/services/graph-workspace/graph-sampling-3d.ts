export const GRAPH_SURFACE_SAMPLE_COUNT = 48;

export type GraphSurfaceSampleStatus =
  | 'ready'
  | 'hidden'
  | 'empty'
  | 'unsupported'
  | 'invalid';

interface GraphSurfaceTraceBase {
  readonly functionId: string;
  readonly label: string;
  readonly expression: string;
  readonly color: string;
}

export interface GraphSurfaceTraceData extends GraphSurfaceTraceBase {
  readonly kind: 'surface';
  readonly x: readonly number[];
  readonly y: readonly number[];
  readonly z: readonly (readonly number[])[];
}

export interface GraphSurfaceSample {
  readonly functionId: string;
  readonly status: GraphSurfaceSampleStatus;
  readonly trace: GraphSurfaceTraceData | null;
  readonly totalSamples: number;
  readonly invalidSamples: number;
  readonly firstError?: string;
}
