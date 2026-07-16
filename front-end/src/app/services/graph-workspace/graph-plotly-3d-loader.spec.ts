import { TestBed } from '@angular/core/testing';

import {
  GRAPH_PLOTLY_3D_IMPORTER,
  GraphPlotly3DLoaderService,
  type GraphPlotly3DModule,
} from './graph-plotly-3d-loader';

describe('GraphPlotly3DLoaderService', () => {
  let service: GraphPlotly3DLoaderService;
  let importer: jasmine.Spy<() => Promise<unknown>>;

  beforeEach(() => {
    importer = jasmine.createSpy('graphPlotly3DImporter');

    TestBed.configureTestingModule({
      providers: [
        GraphPlotly3DLoaderService,
        {
          provide: GRAPH_PLOTLY_3D_IMPORTER,
          useValue: importer,
        },
      ],
    });

    service = TestBed.inject(GraphPlotly3DLoaderService);
  });

  it('loads the module through the dynamic importer', async () => {
    const module = createModule();
    importer.and.resolveTo(module);

    const loaded = await service.load();

    expect(importer).toHaveBeenCalledTimes(1);
    expect(loaded).toBe(module);
  });

  it('reuses the same pending promise for concurrent loads', async () => {
    const deferred = createDeferred<unknown>();
    importer.and.returnValue(deferred.promise);

    const first = service.load();
    const second = service.load();

    expect(importer).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);

    deferred.resolve(createModule());
    await expectAsync(first).toBeResolved();
    await expectAsync(second).toBeResolved();
  });

  it('reuses the resolved module for later calls', async () => {
    const module = createModule();
    importer.and.resolveTo(module);

    expect(await service.load()).toBe(module);
    expect(await service.load()).toBe(module);
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it('returns module.default when present', async () => {
    const module = createModule();
    importer.and.resolveTo({ default: module });

    await expectAsync(service.load()).toBeResolvedTo(module);
  });

  it('accepts the direct module when default is missing', async () => {
    const module = createModule();
    importer.and.resolveTo(module);

    await expectAsync(service.load()).toBeResolvedTo(module);
  });

  it('rejects an invalid module shape', async () => {
    importer.and.resolveTo({ default: { newPlot: () => {}, react: () => {} } });

    await expectAsync(service.load()).toBeRejectedWithError(
      'Invalid Plotly 3D module: missing newPlot, react, purge or Plots.resize.'
    );
  });

  it('propagates importer failures and clears the cache for retries', async () => {
    const firstError = new Error('load failed');
    const module = createModule();
    importer.and.returnValues(
      Promise.reject(firstError),
      Promise.resolve(module)
    );

    await expectAsync(service.load()).toBeRejectedWithError('load failed');
    await expectAsync(service.load()).toBeResolvedTo(module);
    expect(importer).toHaveBeenCalledTimes(2);
  });

  function createModule(): GraphPlotly3DModule {
    return {
      newPlot: jasmine.createSpy('newPlot').and.resolveTo({}),
      react: jasmine.createSpy('react').and.resolveTo({}),
      purge: jasmine.createSpy('purge'),
      Plots: {
        resize: jasmine.createSpy('resize').and.resolveTo({}),
      },
    };
  }

  function createDeferred<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((innerResolve, innerReject) => {
      resolve = innerResolve;
      reject = innerReject;
    });

    return { promise, resolve, reject };
  }
});
