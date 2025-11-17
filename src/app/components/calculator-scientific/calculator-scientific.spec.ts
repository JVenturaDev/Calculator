import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';

import { CalculatorScientificComponent } from './calculator-scientific';
import { CalculatorEngineService } from '../../services/calculator-engine';
import { StateService } from '../../services/core-services/state-object';
import { HistoryService } from '../../services/history';

describe('CalculatorScientificComponent', () => {
  let component: CalculatorScientificComponent;
  let fixture: ComponentFixture<CalculatorScientificComponent>;

  let mockEngine: any;
  let mockState: any;
  let mockHistory: any;

  const initialState = {
    bd: null,
    result: 0,
    expression: '',
    equalPressed: 0,
    idEnEdicion: null,
    memoryContainer: null,
    valorOriginalMemoria: 0,
    idUltimoResultado: null,
  };

  beforeEach(async () => {
    mockEngine = {
      parentesisMulti: jasmine.createSpy('parentesisMulti').and.callFake((s: string) => s),
      replaceFunction: jasmine.createSpy('replaceFunction').and.callFake((s: string) => s),
      evalExpresion: jasmine.createSpy('evalExpresion').and.returnValue('9.81'),
      processAndEval: jasmine.createSpy('processAndEval').and.returnValue('9.81'),
    };

    mockState = {
      state$: new BehaviorSubject(initialState),
      value: initialState,
      update: jasmine.createSpy('update'),
    };

    mockHistory = {
      agregarId: jasmine.createSpy('agregarId'),
    };

    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [CalculatorScientificComponent],
      providers: [
        { provide: CalculatorEngineService, useValue: mockEngine },
        { provide: StateService, useValue: mockState },
        { provide: HistoryService, useValue: mockHistory },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CalculatorScientificComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    mockState.state$.complete();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('clicking a trig function token (sin() style) should append to expression', () => {
    mockState.value = { ...initialState, expression: '2+' };
    component.handleButtonClick('sin(');
    expect(mockState.update).toHaveBeenCalledWith(jasmine.objectContaining({ expression: '2+sin(' }));
  });

  it('changing mode RAD/DEG should update state (if component sets it)', () => {
    component.handleButtonClick('DEG');
    expect(mockState.update).toHaveBeenCalled();
  });

  it('Press "=" should call engine pipeline and persist history', () => {
    mockState.value = { ...initialState, expression: 'sqrt(9)' };
    component.handleButtonClick('=');
    expect(mockEngine.parentesisMulti).toHaveBeenCalledWith('sqrt(9)');
    expect(mockEngine.replaceFunction).toHaveBeenCalled();
    expect(mockEngine.evalExpresion).toHaveBeenCalled();
    expect(mockState.update).toHaveBeenCalledWith(jasmine.objectContaining({ result: '9.81', expression: '9.81', equalPressed: 1 }));
    expect(mockHistory.agregarId).toHaveBeenCalledWith('sqrt(9)', '9.81');
  });
});
