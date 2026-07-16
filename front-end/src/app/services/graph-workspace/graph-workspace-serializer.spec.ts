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

  it('restores workspace, scene and function dates as Date instances', () => {
    const restored = serializer.deserialize(
      serializer.serialize(createState())
    );

    expect(restored.createdAt).toBeInstanceOf(Date);
    expect(restored.updatedAt).toBeInstanceOf(Date);
    expect(restored.functions[0].createdAt).toBeInstanceOf(Date);
    expect(restored.functions[0].updatedAt).toBeInstanceOf(Date);
  });

  it('migrates a legacy v1 snapshot to the v2 model', () => {
    const legacy = createLegacySnapshot();

    const restored = serializer.deserialize(legacy);

    expect(restored.version).toBe(2);
    expect(restored.viewMode).toBe('2d');
    expect(restored.viewport2D).toEqual(legacy.viewport);
    expect(restored.viewport).toBe(restored.viewport2D);
    expect(restored.scene3D).toEqual({
      xMin: -10,
      xMax: 10,
      yMin: -10,
      yMax: 10,
      zMin: -10,
      zMax: 10,
      camera: {
        eye: { x: 1.25, y: 1.25, z: 1.25 },
        up: { x: 0, y: 0, z: 1 },
        center: { x: 0, y: 0, z: 0 },
      },
    });
    expect(restored.selectedFunctionId).toBe('function-2');
  });

  it('rejects an invalid viewport', () => {
    const serialized = serializer.serialize(createState());
    const invalid = {
      ...serialized,
      viewport2D: { xMin: 10, xMax: -10, yMin: -5, yMax: 5 },
    };

    expect(() => serializer.deserialize(invalid))
      .toThrowError('Invalid graph viewport');
  });

  it('rejects an invalid scene', () => {
    const serialized = serializer.serialize(createState());
    const invalid = {
      ...serialized,
      scene3D: {
        ...serialized.scene3D,
        camera: {
          ...serialized.scene3D.camera,
          eye: { ...serialized.scene3D.camera.eye, x: Number.POSITIVE_INFINITY },
        },
      },
    };

    expect(() => serializer.deserialize(invalid))
      .toThrowError('Invalid graph vector 3D');
  });

  it('rejects an invalid view mode', () => {
    const serialized = serializer.serialize(createState());

    expect(() => serializer.deserialize({
      ...serialized,
      viewMode: 'surface',
    })).toThrowError('Invalid graph workspace snapshot');
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
    const viewport2D = { xMin: -10, xMax: 10, yMin: -6, yMax: 6 };

    return {
      version: 2,
      id: 'workspace-1',
      name: 'Graph Workspace',
      viewMode: '2d',
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
      viewport2D,
      viewport: viewport2D,
      scene3D: {
        xMin: -10,
        xMax: 10,
        yMin: -10,
        yMax: 10,
        zMin: -10,
        zMax: 10,
        camera: {
          eye: { x: 1.25, y: 1.25, z: 1.25 },
          up: { x: 0, y: 0, z: 1 },
          center: { x: 0, y: 0, z: 0 },
        },
      },
      createdAt,
      updatedAt,
    };
  }

  function createLegacySnapshot() {
    const createdAt = new Date('2026-01-02T03:04:05.000Z');
    const updatedAt = new Date('2026-01-02T04:05:06.000Z');
    return {
      version: 1 as const,
      id: 'workspace-legacy',
      name: 'Graph Workspace',
      functions: [
        {
          id: 'function-1',
          expression: 'sin(x)',
          label: 'f1',
          color: '#78a9ff',
          visible: true,
          plotKind: 'line' as const,
          createdAt: createdAt.toISOString(),
          updatedAt: updatedAt.toISOString(),
        },
        {
          id: 'function-2',
          expression: 'x+y',
          label: 'f2',
          color: '#ff7eb6',
          visible: false,
          plotKind: 'contour' as const,
          createdAt: createdAt.toISOString(),
          updatedAt: updatedAt.toISOString(),
        },
      ],
      selectedFunctionId: 'function-2',
      viewport: { xMin: -10, xMax: 10, yMin: -6, yMax: 6 },
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    };
  }
});
