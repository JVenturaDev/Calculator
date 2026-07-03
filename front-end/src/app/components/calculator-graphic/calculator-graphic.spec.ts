import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { GraphicComponent } from './calculator-graphic';
import { StateService } from '../../services/core-services/state-object';
import { CALCULATION_ENGINE } from '../../services/engine-services/calculation-engine.contract';
import { CalculatorMemoryService } from '../../services/memory-services/calculator-memory';

describe('GraphicComponent', () => {
  let component: GraphicComponent;
  let fixture: ComponentFixture<GraphicComponent>;

  let mockState: any;
  let mockEngine: any;
  let mockMemory: jasmine.SpyObj<CalculatorMemoryService>;
  const initialState = {
    expression: 'x^2',
    result: '',
    bd: null,
    equalPressed: 0,
    idEnEdicion: null,
    memoryContainer: null,
    valorOriginalMemoria: 0,
    idUltimoResultado: null,
  };

  beforeEach(async () => {
    mockState = {
      state$: new BehaviorSubject(initialState),
      value: initialState,
      update: jasmine.createSpy('update'),
    };

    mockEngine = {
      evaluate: jasmine.createSpy('evaluate').and.returnValue(0),
    };
    mockMemory = jasmine.createSpyObj<CalculatorMemoryService>(
      'CalculatorMemoryService',
      [
        'saveCurrent',
        'clearAll',
        'addCurrentToLast',
        'subtractCurrentFromLast',
        'recallLast',
      ]
    );
    mockMemory.saveCurrent.and.resolveTo(false);
    mockMemory.clearAll.and.resolveTo();
    mockMemory.addCurrentToLast.and.resolveTo(false);
    mockMemory.subtractCurrentFromLast.and.resolveTo(false);
    mockMemory.recallLast.and.resolveTo(false);

    await TestBed.configureTestingModule({
      imports: [GraphicComponent],
      providers: [
        { provide: StateService, useValue: mockState },
        { provide: CALCULATION_ENGINE, useValue: mockEngine },
        { provide: CalculatorMemoryService, useValue: mockMemory },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GraphicComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    mockState.state$.complete();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('delegates memory commands to CalculatorMemoryService', async () => {
    await component.saveMemory();
    await component.clearMemory();
    await component.memoryPlus();
    await component.memoryMinus();
    await component.recallLast();

    expect(mockMemory.saveCurrent).toHaveBeenCalled();
    expect(mockMemory.clearAll).toHaveBeenCalled();
    expect(mockMemory.addCurrentToLast).toHaveBeenCalled();
    expect(mockMemory.subtractCurrentFromLast).toHaveBeenCalled();
    expect(mockMemory.recallLast).toHaveBeenCalled();
  });

  // it('should subscribe to state and update expression', () => {
  //   expect(component.expression).toBe('x^2');
  //   mockState.state$.next({ ...initialState, expression: 'sin(x)' });
  //   expect(component.expression).toBe('sin(x)');
  // });

  // it('should call processAndEval on generarGrafica', () => {
  //   component.generarGrafica();
  //   expect(mockEngine.processAndEval).toHaveBeenCalledWith('x^2');
  // });

  // it('should alert if expression is empty', () => {
  //   spyOn(window, 'alert');
  //   component.expression = '';
  //   component.generarGrafica();
  //   expect(window.alert).toHaveBeenCalledWith('No hay expresión para graficar.');
  // });
});
