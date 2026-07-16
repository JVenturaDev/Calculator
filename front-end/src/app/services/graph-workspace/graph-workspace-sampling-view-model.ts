import { inject, Injectable } from '@angular/core';
import { debounceTime, map, shareReplay } from 'rxjs';

import { GraphFunctionSamplerService } from './graph-function-sampler';
import { GraphWorkspaceFacade } from './graph-workspace-facade';
import {
  type GraphFunctionSample,
} from './graph-sampling';
import {
  type GraphFunction,
  type GraphViewport2D,
  type GraphWorkspaceState,
} from './graph-workspace-state';

export interface GraphWorkspaceSamplingViewModel {
  readonly state: GraphWorkspaceState;
  readonly samples: readonly GraphFunctionSample[];
  readonly selectedFunction: GraphFunction | null;
  readonly selectedSample: GraphFunctionSample | null;
  readonly viewport: GraphViewport2D;
  readonly hasFunctions: boolean;
  readonly visibleFunctions: number;
  readonly readyFunctions: number;
  readonly invalidFunctions: number;
  readonly error: string | null;
}

@Injectable({ providedIn: 'root' })
export class GraphWorkspaceSamplingViewModelService {
  private readonly facade = inject(GraphWorkspaceFacade);
  private readonly sampler = inject(GraphFunctionSamplerService);

  readonly vm$ = this.facade.state$.pipe(
    debounceTime(100),
    map(state => this.createViewModel(state)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private createViewModel(
    state: GraphWorkspaceState
  ): GraphWorkspaceSamplingViewModel {
    const selectedFunction = this.findSelectedFunction(state);

    try {
      const samples = this.sampler.sampleFunctions(
        state.functions,
        state.viewport2D
      );

      return this.toViewModel(state, samples, selectedFunction, null);
    } catch {
      return this.toViewModel(
        state,
        [],
        selectedFunction,
        'No se pudo muestrear el Workspace gráfico.'
      );
    }
  }

  private toViewModel(
    state: GraphWorkspaceState,
    samples: readonly GraphFunctionSample[],
    selectedFunction: GraphFunction | null,
    error: string | null
  ): GraphWorkspaceSamplingViewModel {
    return {
      state,
      samples,
      selectedFunction,
      selectedSample: selectedFunction
        ? samples.find(sample => sample.functionId === selectedFunction.id) ??
          null
        : null,
      viewport: state.viewport2D,
      hasFunctions: state.functions.length > 0,
      visibleFunctions: state.functions.filter(graphFunction =>
        graphFunction.visible
      ).length,
      readyFunctions: samples.filter(sample => sample.status === 'ready')
        .length,
      invalidFunctions: samples.filter(sample => sample.status === 'invalid')
        .length,
      error,
    };
  }

  private findSelectedFunction(
    state: GraphWorkspaceState
  ): GraphFunction | null {
    return state.selectedFunctionId === null
      ? null
      : state.functions.find(
          graphFunction => graphFunction.id === state.selectedFunctionId
        ) ?? null;
  }
}
