import { inject, Injectable } from '@angular/core';
import { debounceTime, map, shareReplay } from 'rxjs';

import { GraphFunctionSampler3DService } from './graph-function-sampler-3d';
import { GraphWorkspaceFacade } from './graph-workspace-facade';
import type { GraphSurfaceSample } from './graph-sampling-3d';
import type {
  GraphFunction,
  GraphScene3D,
  GraphWorkspaceState,
} from './graph-workspace-state';

export interface GraphWorkspaceSamplingViewModel3D {
  readonly state: GraphWorkspaceState;
  readonly scene: GraphScene3D;
  readonly samples: readonly GraphSurfaceSample[];
  readonly selectedFunctionId: string | null;
  readonly compatibleFunctions: number;
  readonly unsupportedFunctions: number;
  readonly readyFunctions: number;
  readonly invalidFunctions: number;
  readonly error: string | null;
}

@Injectable({ providedIn: 'root' })
export class GraphWorkspaceSamplingViewModel3DService {
  private readonly facade = inject(GraphWorkspaceFacade);
  private readonly sampler = inject(GraphFunctionSampler3DService);

  readonly vm$ = this.facade.state$.pipe(
    debounceTime(120),
    map(state => this.createViewModel(state)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private createViewModel(
    state: GraphWorkspaceState
  ): GraphWorkspaceSamplingViewModel3D {
    if (state.viewMode !== '3d') {
      return this.toViewModel(state, [], null);
    }

    try {
      const samples = this.sampler.sampleFunctions(
        state.functions,
        state.scene3D
      );
      return this.toViewModel(state, samples, null);
    } catch {
      return this.toViewModel(
        state,
        [],
        'No se pudo muestrear la vista gráfica 3D.'
      );
    }
  }

  private toViewModel(
    state: GraphWorkspaceState,
    samples: readonly GraphSurfaceSample[],
    error: string | null
  ): GraphWorkspaceSamplingViewModel3D {
    return {
      state,
      scene: state.scene3D,
      samples,
      selectedFunctionId: state.selectedFunctionId,
      compatibleFunctions: this.countCompatibleFunctions(state.functions),
      unsupportedFunctions: samples.filter(
        sample => sample.status === 'unsupported'
      ).length,
      readyFunctions: samples.filter(sample => sample.status === 'ready').length,
      invalidFunctions: samples.filter(sample => sample.status === 'invalid').length,
      error,
    };
  }

  private countCompatibleFunctions(functions: readonly GraphFunction[]): number {
    return functions.filter(
      graphFunction =>
        graphFunction.visible &&
        graphFunction.plotKind === 'contour' &&
        graphFunction.expression.trim().length > 0
    ).length;
  }
}
