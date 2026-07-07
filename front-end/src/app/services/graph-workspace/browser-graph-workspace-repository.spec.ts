import type { GraphWorkspaceState } from './graph-workspace-state';
import { GraphWorkspaceSerializer } from './graph-workspace-serializer';
import {
  BrowserGraphWorkspaceRepository,
  DEFAULT_GRAPH_WORKSPACE_STORAGE_KEY,
} from './browser-graph-workspace-repository';

describe('BrowserGraphWorkspaceRepository', () => {
  let storage: MemoryStorage;
  let repository: BrowserGraphWorkspaceRepository;

  beforeEach(() => {
    storage = new MemoryStorage();
    repository = new BrowserGraphWorkspaceRepository(
      storage,
      DEFAULT_GRAPH_WORKSPACE_STORAGE_KEY,
      new GraphWorkspaceSerializer()
    );
  });

  it('loads an empty result when the key does not exist', () => {
    expect(repository.load()).toEqual({ state: null });
  });

  it('saves and loads a complete state', () => {
    const state = createState();

    repository.save(state);

    expect(repository.load()).toEqual({ state });
  });

  it('reports corrupt JSON without throwing', () => {
    storage.setItem(DEFAULT_GRAPH_WORKSPACE_STORAGE_KEY, '{invalid');

    const result = repository.load();

    expect(result.state).toBeNull();
    expect(result.issue).toBe('corrupt');
    expect(result.error).toBeDefined();
  });

  it('reports an invalid schema as corrupt', () => {
    storage.setItem(
      DEFAULT_GRAPH_WORKSPACE_STORAGE_KEY,
      JSON.stringify({ version: 1, functions: 'invalid' })
    );

    const result = repository.load();

    expect(result.state).toBeNull();
    expect(result.issue).toBe('corrupt');
  });

  it('reports an unsupported version separately', () => {
    storage.setItem(
      DEFAULT_GRAPH_WORKSPACE_STORAGE_KEY,
      JSON.stringify({ version: 2 })
    );

    expect(repository.load()).toEqual({
      state: null,
      issue: 'unsupported-version',
    });
  });

  it('reports blocked storage as unavailable', () => {
    const error = new DOMException('Storage blocked', 'SecurityError');
    spyOn(storage, 'getItem').and.callFake(() => {
      throw error;
    });

    expect(repository.load()).toEqual({
      state: null,
      issue: 'unavailable',
      error,
    });
  });

  it('propagates quota and storage errors from save', () => {
    const quota = new DOMException('Quota exceeded', 'QuotaExceededError');
    spyOn(storage, 'setItem').and.callFake(() => {
      throw quota;
    });

    expect(() => repository.save(createState())).toThrow(quota);

    const blockedStorage = new MemoryStorage();
    const blockedRepository = new BrowserGraphWorkspaceRepository(
      blockedStorage,
      DEFAULT_GRAPH_WORKSPACE_STORAGE_KEY,
      new GraphWorkspaceSerializer()
    );
    const security = new DOMException('Storage blocked', 'SecurityError');
    spyOn(blockedStorage, 'setItem').and.callFake(() => {
      throw security;
    });

    expect(() => blockedRepository.save(createState())).toThrow(security);
  });

  it('clears the configured key', () => {
    repository.save(createState());

    repository.clear();

    expect(storage.getItem(DEFAULT_GRAPH_WORKSPACE_STORAGE_KEY)).toBeNull();
  });

  function createState(): GraphWorkspaceState {
    const timestamp = new Date('2026-04-05T06:07:08.000Z');
    return {
      version: 1,
      id: 'graph-workspace-1',
      name: 'Graph Workspace',
      functions: [
        {
          id: 'function-1',
          expression: 'sin(x)',
          label: 'f1',
          color: '#78a9ff',
          visible: true,
          plotKind: 'line',
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
      selectedFunctionId: 'function-1',
      viewport: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }
});

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}
