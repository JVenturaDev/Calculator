import { TestBed } from '@angular/core/testing';
import { HistoryService } from './history';

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
});
