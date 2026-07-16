import { Inject, Injectable, InjectionToken } from '@angular/core';

import type { GraphWorkspaceState } from './graph-workspace-state';
import { GraphWorkspaceSerializer } from './graph-workspace-serializer';

export const DEFAULT_GRAPH_WORKSPACE_STORAGE_KEY =
  'calculator.graphWorkspace.v1';

export const GRAPH_WORKSPACE_STORAGE = new InjectionToken<Storage>(
  'GRAPH_WORKSPACE_STORAGE',
  { providedIn: 'root', factory: () => globalThis.localStorage }
);

export const GRAPH_WORKSPACE_STORAGE_KEY = new InjectionToken<string>(
  'GRAPH_WORKSPACE_STORAGE_KEY',
  {
    providedIn: 'root',
    factory: () => DEFAULT_GRAPH_WORKSPACE_STORAGE_KEY,
  }
);

export type GraphWorkspaceLoadIssue =
  | 'corrupt'
  | 'unsupported-version'
  | 'unavailable';

export interface GraphWorkspaceLoadResult {
  state: GraphWorkspaceState | null;
  issue?: GraphWorkspaceLoadIssue;
  error?: unknown;
}

@Injectable({ providedIn: 'root' })
export class BrowserGraphWorkspaceRepository {
  constructor(
    @Inject(GRAPH_WORKSPACE_STORAGE) private readonly storage: Storage,
    @Inject(GRAPH_WORKSPACE_STORAGE_KEY) private readonly storageKey: string,
    private readonly serializer: GraphWorkspaceSerializer
  ) {}

  load(): GraphWorkspaceLoadResult {
    let stored: string | null;
    try {
      stored = this.storage.getItem(this.storageKey);
    } catch (error) {
      return { state: null, issue: 'unavailable', error };
    }

    if (stored === null) return { state: null };

    let parsed: unknown;
    try {
      parsed = JSON.parse(stored);
    } catch (error) {
      return { state: null, issue: 'corrupt', error };
    }

    if (
      this.isRecord(parsed) &&
      'version' in parsed &&
      parsed['version'] !== 1 &&
      parsed['version'] !== 2
    ) {
      return { state: null, issue: 'unsupported-version' };
    }

    try {
      return { state: this.serializer.deserialize(parsed) };
    } catch (error) {
      return { state: null, issue: 'corrupt', error };
    }
  }

  save(state: GraphWorkspaceState): void {
    const serialized = this.serializer.serialize(state);
    this.storage.setItem(this.storageKey, JSON.stringify(serialized));
  }

  clear(): void {
    this.storage.removeItem(this.storageKey);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
