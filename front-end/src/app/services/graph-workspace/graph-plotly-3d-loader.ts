import { Inject, Injectable, InjectionToken } from '@angular/core';

export interface GraphPlotly3DModule {
  newPlot: (...args: unknown[]) => Promise<unknown>;
  react: (...args: unknown[]) => Promise<unknown>;
  purge: (...args: unknown[]) => void;
  Plots: {
    resize: (...args: unknown[]) => Promise<unknown>;
  };
}

export type GraphPlotly3DImporter = () => Promise<unknown>;

export const GRAPH_PLOTLY_3D_IMPORTER = new InjectionToken<GraphPlotly3DImporter>(
  'GRAPH_PLOTLY_3D_IMPORTER',
  {
    providedIn: 'root',
    factory: () => defaultGraphPlotly3DImporter,
  }
);

@Injectable({ providedIn: 'root' })
export class GraphPlotly3DLoaderService {
  private resolvedModule: GraphPlotly3DModule | null = null;
  private pendingLoad: Promise<GraphPlotly3DModule> | null = null;

  constructor(
    @Inject(GRAPH_PLOTLY_3D_IMPORTER)
    private readonly importer: GraphPlotly3DImporter
  ) {}

  load(): Promise<GraphPlotly3DModule> {
    if (this.resolvedModule) {
      return Promise.resolve(this.resolvedModule);
    }

    if (this.pendingLoad) {
      return this.pendingLoad;
    }

    this.pendingLoad = this.importer()
      .then(module => this.normalizeModule(module))
      .then(module => {
        this.resolvedModule = module;
        return module;
      })
      .catch(error => {
        this.pendingLoad = null;
        throw error;
      });

    return this.pendingLoad;
  }

  private normalizeModule(module: unknown): GraphPlotly3DModule {
    const candidate = this.isRecord(module) && 'default' in module
      ? (module as Record<string, unknown>)['default']
      : module;

    if (!this.isGraphPlotly3DModule(candidate)) {
      throw new Error(
        'Invalid Plotly 3D module: missing newPlot, react, purge or Plots.resize.'
      );
    }

    return candidate;
  }

  private isGraphPlotly3DModule(
    module: unknown
  ): module is GraphPlotly3DModule {
    return (
      this.isRecord(module) &&
      typeof module['newPlot'] === 'function' &&
      typeof module['react'] === 'function' &&
      typeof module['purge'] === 'function' &&
      this.isRecord(module['Plots']) &&
      typeof module['Plots']['resize'] === 'function'
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}

function defaultGraphPlotly3DImporter(): Promise<unknown> {
  return import('plotly.js-gl3d-dist-min');
}
