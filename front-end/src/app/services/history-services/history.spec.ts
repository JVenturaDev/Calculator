import { TestBed } from '@angular/core/testing';
import { HistoryItem, HistoryService } from './history';

describe('HistoryService', () => {
  let service: HistoryService;

  beforeEach(() => {
    localStorage.removeItem('historial');
    TestBed.configureTestingModule({});
    service = TestBed.inject(HistoryService);
  });

  afterEach(() => {
    localStorage.removeItem('historial');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('adds and persists an item without changing calculator state', () => {
    service.addToHistory(1, '2+2', 4);

    expect(service.getHistory()).toEqual([
      { idi: 1, expression: '2+2', result: 4 },
    ]);
    expect(JSON.parse(localStorage.getItem('historial') ?? '[]')).toEqual([
      { idi: 1, expression: '2+2', result: 4 },
    ]);
  });

  it('preserves the generated-id history format', () => {
    service.agregarId('sqrt(9)', 3);

    const [item] = service.getHistory();
    expect(typeof item.idi).toBe('number');
    expect(item.expression).toBe('sqrt(9)');
    expect(item.result).toBe(3);
  });

  it('removes and clears persisted history', () => {
    service.addToHistory(1, '1+1', 2);
    service.addToHistory(2, '2+2', 4);

    service.removeFromLocalStorage(1);
    expect(service.getHistory()).toEqual([
      { idi: 2, expression: '2+2', result: 4 },
    ]);

    service.clearHistory();
    expect(service.getHistory()).toEqual([]);
    expect(localStorage.getItem('historial')).toBeNull();
  });

  it('stores optional CAS metadata retrocompatibly', () => {
    const calculationResult = {
      kind: 'symbolic' as const,
      operation: 'simplify' as const,
      source: 'simplify(2*x + 3*x)',
      display: '5 * x',
      exact: true,
      expression: '5 * x',
      latex: '5 * x',
    };

    service.addToHistory(3, 'simplify(2*x + 3*x)', '5 * x', calculationResult);

    expect(service.getHistory()).toEqual([
      {
        idi: 3,
        expression: 'simplify(2*x + 3*x)',
        result: '5 * x',
        calculationResult,
      },
    ]);
    expect(JSON.parse(localStorage.getItem('historial') ?? '[]')).toEqual([
      {
        idi: 3,
        expression: 'simplify(2*x + 3*x)',
        result: '5 * x',
        calculationResult,
      },
    ]);
  });

  it('falls back to empty history when persisted JSON is corrupt', () => {
    localStorage.setItem('historial', '{invalid');
    const consoleError = spyOn(console, 'error');

    const restored = new HistoryService();

    expect(restored.getHistory()).toEqual([]);
    expect(consoleError).toHaveBeenCalled();
  });

  it('falls back to empty history when persisted data is not an array', () => {
    localStorage.setItem('historial', JSON.stringify({ expression: '2+2' }));
    const consoleError = spyOn(console, 'error');

    const restored = new HistoryService();

    expect(restored.getHistory()).toEqual([]);
    expect(consoleError).toHaveBeenCalled();
  });

  it('keeps valid legacy entries and ignores malformed array entries', () => {
    localStorage.setItem(
      'historial',
      JSON.stringify([
        { idi: 1, expression: '2+2', result: 4, unknown: true },
        { idi: 2, expression: null, result: 5 },
      ])
    );
    const consoleError = spyOn(console, 'error');

    const restored = new HistoryService();

    expect(restored.getHistory()).toEqual([
      { idi: 1, expression: '2+2', result: 4, unknown: true } as HistoryItem,
    ]);
    expect(consoleError).toHaveBeenCalledWith(
      'Some invalid persisted history entries were ignored.'
    );
  });

  it('falls back to empty history when localStorage reads are blocked', () => {
    const storageError = new DOMException('Blocked', 'SecurityError');
    spyOn(Storage.prototype, 'getItem').and.throwError(storageError);
    const consoleError = spyOn(console, 'error');

    const restored = new HistoryService();

    expect(restored.getHistory()).toEqual([]);
    expect(consoleError).toHaveBeenCalledWith(
      'Error loading history from localStorage:',
      storageError
    );
  });

  it('keeps new entries in memory when localStorage writes are blocked', () => {
    const storageError = new DOMException('Blocked', 'SecurityError');
    spyOn(Storage.prototype, 'setItem').and.throwError(storageError);
    const consoleError = spyOn(console, 'error');

    expect(() => service.addToHistory(4, '3+3', 6)).not.toThrow();
    expect(service.getHistory()).toEqual([
      { idi: 4, expression: '3+3', result: 6 },
    ]);
    expect(consoleError).toHaveBeenCalledWith(
      'Error saving history to localStorage:',
      storageError
    );
  });

  it('keeps history cleared in memory when localStorage removal is blocked', () => {
    service.addToHistory(5, '4+4', 8);
    const storageError = new DOMException('Blocked', 'SecurityError');
    const removeItem = spyOn(Storage.prototype, 'removeItem').and.throwError(
      storageError
    );
    const consoleError = spyOn(console, 'error');

    expect(() => service.clearHistory()).not.toThrow();
    expect(service.getHistory()).toEqual([]);
    expect(consoleError).toHaveBeenCalledWith(
      'Error clearing history from localStorage:',
      storageError
    );
    removeItem.and.callThrough();
  });
});
