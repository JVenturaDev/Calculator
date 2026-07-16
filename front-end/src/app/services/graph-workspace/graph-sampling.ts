export const GRAPH_LINE_SAMPLE_COUNT = 400;
export const GRAPH_CONTOUR_SAMPLE_COUNT = 64;

export type GraphFunctionSampleStatus =
  | 'ready'
  | 'hidden'
  | 'empty'
  | 'invalid'
  | 'unsupported';

interface GraphTraceBase {
  readonly functionId: string;
  readonly label: string;
  readonly expression: string;
  readonly color: string;
}

export interface GraphLineTraceData extends GraphTraceBase {
  readonly kind: 'line';
  readonly x: number[];
  readonly y: number[];
}

export interface GraphContourTraceData extends GraphTraceBase {
  readonly kind: 'contour';
  readonly x: number[];
  readonly y: number[];
  readonly z: number[][];
}

export type GraphTraceData = GraphLineTraceData | GraphContourTraceData;

export interface GraphFunctionSample {
  readonly functionId: string;
  readonly status: GraphFunctionSampleStatus;
  readonly trace: GraphTraceData | null;
  readonly totalSamples: number;
  readonly invalidSamples: number;
  readonly firstError?: string;
}
