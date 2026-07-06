import { TestBed } from '@angular/core/testing';
import Complex from 'complex.js';

import {
  WorkspaceCalculation,
  WorkspaceItem,
} from '../../components/work-space/work-space';
import {
  DemoWorkspaceSnapshot,
  DemoWorkspaceStorageService,
} from './demo-workspace-storage';

describe('DemoWorkspaceStorageService', () => {
  const storageKey = 'calculator.demoWorkspace.v1';
  let service: DemoWorkspaceStorageService;

  beforeEach(() => {
    sessionStorage.removeItem(storageKey);
    TestBed.configureTestingModule({});
    service = TestBed.inject(DemoWorkspaceStorageService);
  });

  afterEach(() => sessionStorage.removeItem(storageKey));

  it('returns an empty versioned snapshot when storage is empty', () => {
    expect(service.load()).toEqual({
      version: 1,
      activeItemId: null,
      items: [],
    });
  });

  it('saves and restores workspace items and the active item', () => {
    const snapshot = createSnapshot();

    service.save(snapshot);

    const restored = service.load();
    expect(restored.activeItemId).toBe('workspace-1');
    expect(restored.items.length).toBe(1);
    expect(restored.items[0].title).toBe('Demo científica');
    expect(restored.items[0].tags).toEqual(['álgebra', 'demo']);
    expect(restored.items[0].currentExpression).toBe('2+i');
    expect(restored.items[0].calculations[0].expression).toBe('2+i');
  });

  it('restores item and calculation dates as Date instances', () => {
    service.save(createSnapshot());

    const item = service.load().items[0];
    expect(item.createdAt instanceof Date).toBeTrue();
    expect(item.updatedAt instanceof Date).toBeTrue();
    expect(item.calculations[0].timestamp instanceof Date).toBeTrue();
    expect(item.createdAt.toISOString()).toBe('2026-01-01T10:00:00.000Z');
    expect(item.calculations[0].timestamp.toISOString())
      .toBe('2026-01-03T12:00:00.000Z');
  });

  it('serializes and restores Complex calculation results', () => {
    service.save(createSnapshot());

    const result = service.load().items[0].calculations[0].result;
    expect(result instanceof Complex).toBeTrue();
    expect((result as Complex).re).toBe(2);
    expect((result as Complex).im).toBe(1);
  });

  it('restores complex values throughout steps and stack snapshots', () => {
    service.save(createSnapshot());

    const step = service.load().items[0].calculations[0].steps[0];
    const operand = step.operands[1] as Complex;
    const result = step.result as Complex;
    const stackBefore = step.stackBefore?.[1] as Complex;
    const stackAfter = step.stackAfter?.[0] as Complex;

    expect(operand instanceof Complex).toBeTrue();
    expect([operand.re, operand.im]).toEqual([0, 1]);
    expect(result instanceof Complex).toBeTrue();
    expect([result.re, result.im]).toEqual([2, 1]);
    expect(stackBefore instanceof Complex).toBeTrue();
    expect(stackAfter instanceof Complex).toBeTrue();
  });

  it('preserves string calculation values without coercing them', () => {
    const snapshot = createSnapshot();
    const calculation = snapshot.items[0].calculations[0];
    calculation.result = 'symbolic' as unknown as WorkspaceCalculation['result'];

    service.save(snapshot);

    expect(service.load().items[0].calculations[0].result as unknown)
      .toBe('symbolic');
  });

  it('does not persist renderer-derived fields or extra tree data', () => {
    const snapshot = createSnapshot();
    const calculation = snapshot.items[0].calculations[0] as
      WorkspaceCalculation & { tree?: unknown };
    calculation.humanSteps = [
      { text: 'derived', level: 0, type: 'operator' },
    ];
    calculation.bookSteps = [
      {
        numerator: 2,
        denominator: 1,
        operator: '+',
        result: 2,
        level: 0,
      },
    ];
    calculation.tree = { label: 'derived', children: [] };

    service.save(snapshot);

    const restored = service.load().items[0].calculations[0] as
      WorkspaceCalculation & { tree?: unknown };
    expect(restored.humanSteps).toBeUndefined();
    expect(restored.bookSteps).toBeUndefined();
    expect(restored.tree).toBeUndefined();
  });

  it('returns an empty snapshot for corrupt JSON', () => {
    sessionStorage.setItem(storageKey, '{not-json');

    const diagnostic = service.loadWithDiagnostics();
    expect(diagnostic.snapshot).toEqual({
      version: 1,
      activeItemId: null,
      items: [],
    });
    expect(diagnostic.issue).toBe('corrupt');
    expect(diagnostic.error).toBeDefined();
    expect(service.load()).toEqual(diagnostic.snapshot);
  });

  it('returns an empty snapshot for an unknown version', () => {
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({ version: 99, activeItemId: null, items: [] })
    );

    const diagnostic = service.loadWithDiagnostics();
    expect(diagnostic.snapshot).toEqual({
      version: 1,
      activeItemId: null,
      items: [],
    });
    expect(diagnostic.issue).toBe('unsupported-version');
    expect(service.load()).toEqual(diagnostic.snapshot);
  });

  it('returns an unavailable diagnostic when sessionStorage access is blocked', () => {
    const securityError = new DOMException('Storage blocked', 'SecurityError');
    spyOn(Storage.prototype, 'getItem').and.throwError(securityError);

    const diagnostic = service.loadWithDiagnostics();

    expect(diagnostic.snapshot).toEqual({
      version: 1,
      activeItemId: null,
      items: [],
    });
    expect(diagnostic.issue).toBe('unavailable');
    expect(diagnostic.error).toBe(securityError);
  });

  it('removes only the demo workspace key when cleared', () => {
    sessionStorage.setItem(storageKey, '{}');
    sessionStorage.setItem('calculator.demoGuest', '1');

    service.clear();

    expect(sessionStorage.getItem(storageKey)).toBeNull();
    expect(sessionStorage.getItem('calculator.demoGuest')).toBe('1');
  });

  it('propagates quota errors from sessionStorage', () => {
    const quotaError = new DOMException('Storage quota exceeded', 'QuotaExceededError');
    spyOn(Storage.prototype, 'setItem').and.throwError(quotaError);

    let thrown: unknown;
    try {
      service.save(createSnapshot());
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBe(quotaError);
  });

  function createSnapshot(): DemoWorkspaceSnapshot {
    const complexOperand = new Complex(0, 1);
    const complexResult = new Complex(2, 1);
    const calculation: WorkspaceCalculation = {
      id: 'calculation-1',
      expression: '2+i',
      result: complexResult,
      steps: [
        {
          type: 'Operator',
          name: '+',
          operands: [2, complexOperand],
          result: complexResult,
          stackBefore: [2, complexOperand],
          stackAfter: [complexResult],
        },
      ],
      timestamp: new Date('2026-01-03T12:00:00.000Z'),
    };
    const item: WorkspaceItem = {
      id: 'workspace-1',
      title: 'Demo científica',
      type: 'scientific',
      currentExpression: '2+i',
      calculations: [calculation],
      tags: ['álgebra', 'demo'],
      createdAt: new Date('2026-01-01T10:00:00.000Z'),
      updatedAt: new Date('2026-01-02T11:00:00.000Z'),
    };

    return {
      version: 1,
      activeItemId: item.id,
      items: [item],
    };
  }
});
