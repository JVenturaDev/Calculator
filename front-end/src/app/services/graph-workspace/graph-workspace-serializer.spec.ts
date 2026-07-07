import type { GraphWorkspaceState } from './graph-workspace-state';
import { GraphWorkspaceSerializer } from './graph-workspace-serializer';

describe('GraphWorkspaceSerializer', () => {
  let serializer: GraphWorkspaceSerializer;

  beforeEach(() => {
    serializer = new GraphWorkspaceSerializer();
  });

  it('round-trips the complete persisted domain state', () => {
    const state = createState();

    const restored = serializer.deserialize(serializer.serialize(state));

    expect(restored).toEqual(state);
  });

  it('preserves an existing selected function ID', () => {
    const state = createState();

    const restored = serializer.deserialize(serializer.serialize(state));

    expect(restored.selectedFunctionId).toBe('function-2');
  });

  it('clears a selected function ID that does not exist', () => {
    const serialized = serializer.serialize(createState());
    serialized.selectedFunctionId = 'missing';

    const restored = serializer.deserialize(serialized);

    expect(restored.selectedFunctionId).toBeNull();
  });

  it('restores workspace and function dates as Date instances', () => {
    const restored = serializer.deserialize(
      serializer.serialize(createState())
    );

    expect(restored.createdAt).toBeInstanceOf(Date);
    expect(restored.updatedAt).toBeInstanceOf(Date);
    expect(restored.functions[0].createdAt).toBeInstanceOf(Date);
    expect(restored.functions[0].updatedAt).toBeInstanceOf(Date);
  });

  it('rejects an invalid viewport', () => {
    const serialized = serializer.serialize(createState());
    const invalid = {
      ...serialized,
      viewport: { xMin: 10, xMax: -10, yMin: -5, yMax: 5 },
    };

    expect(() => serializer.deserialize(invalid))
      .toThrowError('Invalid graph viewport');
  });

  it('rejects a non-finite viewport', () => {
    const serialized = serializer.serialize(createState());
    const invalid = {
      ...serialized,
      viewport: { ...serialized.viewport, xMax: Number.POSITIVE_INFINITY },
    };

    expect(() => serializer.deserialize(invalid))
      .toThrowError('Invalid graph viewport');
  });

  it('rejects an invalid plot kind', () => {
    const serialized = serializer.serialize(createState());
    const invalid = {
      ...serialized,
      functions: [
        { ...serialized.functions[0], plotKind: 'surface' },
      ],
    };

    expect(() => serializer.deserialize(invalid))
      .toThrowError('Invalid graph function');
  });

  it('rejects snapshots with more than twelve functions', () => {
    const serialized = serializer.serialize(createState());
    const functions = Array.from({ length: 13 }, (_, index) => ({
      ...serialized.functions[0],
      id: `function-${index}`,
      label: `f${index + 1}`,
    }));

    expect(() => serializer.deserialize({ ...serialized, functions }))
      .toThrowError('Invalid graph workspace snapshot');
  });

  it('serializes only domain fields and omits derived data', () => {
    const base = createState();
    const stateWithDerivedData = {
      ...base,
      traces: [{ x: [0], y: [0] }],
      functions: base.functions.map(graphFunction => ({
        ...graphFunction,
        sampledValues: [0, 1],
        error: null,
      })),
    } as GraphWorkspaceState;

    const serialized = serializer.serialize(stateWithDerivedData);

    expect('traces' in serialized).toBeFalse();
    expect('sampledValues' in serialized.functions[0]).toBeFalse();
    expect('error' in serialized.functions[0]).toBeFalse();
  });

  function createState(): GraphWorkspaceState {
    const createdAt = new Date('2026-01-02T03:04:05.000Z');
    const updatedAt = new Date('2026-01-02T04:05:06.000Z');

    return {
      version: 1,
      id: 'workspace-1',
      name: 'Graph Workspace',
      functions: [
        {
          id: 'function-1',
          expression: 'sin(x)',
          label: 'f1',
          color: '#78a9ff',
          visible: true,
          plotKind: 'line',
          createdAt,
          updatedAt,
        },
        {
          id: 'function-2',
          expression: 'x+y',
          label: 'f2',
          color: '#ff7eb6',
          visible: false,
          plotKind: 'contour',
          createdAt,
          updatedAt,
        },
      ],
      selectedFunctionId: 'function-2',
      viewport: { xMin: -10, xMax: 10, yMin: -6, yMax: 6 },
      createdAt,
      updatedAt,
    };
  }
});
