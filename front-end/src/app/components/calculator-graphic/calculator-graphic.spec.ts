import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { GraphicComponent } from './calculator-graphic';
import { StateService } from '../../services/core-services/state-object';
import { CALCULATION_ENGINE } from '../../services/engine-services/calculation-engine.contract';

describe('GraphicComponent', () => {
  let component: GraphicComponent;
  let fixture: ComponentFixture<GraphicComponent>;

  let mockState: any;
  let mockEngine: any;
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
    };

    mockEngine = {
      evaluate: jasmine.createSpy('evaluate').and.returnValue(0),
    };

    await TestBed.configureTestingModule({
      imports: [GraphicComponent],
      providers: [
        { provide: StateService, useValue: mockState },
        { provide: CALCULATION_ENGINE, useValue: mockEngine },
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
