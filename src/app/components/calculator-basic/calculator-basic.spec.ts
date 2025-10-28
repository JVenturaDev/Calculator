import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';

import { CalculatorBasicComponent } from './calculator-basic';
import { CalculatorEngineService } from '../../services/calculator-engine';
import { StateService } from '../../services/state-object';
import { HistoryService } from '../../services/history';

describe('CalculatorBasicComponent', () => {
  let component: CalculatorBasicComponent;
  let fixture: ComponentFixture<CalculatorBasicComponent>;
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
      calcularInverso: jasmine.createSpy('calcularInverso').and.returnValue('0.2'),
      invertirUltimoNumero: jasmine.createSpy('invertirUltimoNumero').and.returnValue('-5'),
      parentesisMulti: jasmine.createSpy('parentesisMulti').and.callFake((s: string) => s),
      replaceFunction: jasmine.createSpy('replaceFunction').and.callFake((s: string) => s),
      evalExpresion: jasmine.createSpy('evalExpresion').and.returnValue('4'),
      processAndEval: jasmine.createSpy('processAndEval').and.returnValue('4'),
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
      declarations: [CalculatorBasicComponent],
      providers: [
        { provide: CalculatorEngineService, useValue: mockEngine },
        { provide: StateService, useValue: mockState },
        { provide: HistoryService, useValue: mockHistory },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CalculatorBasicComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    mockState.state$.complete();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('handleButtonClick "1/" should call engine.calcularInverso and update state', () => {
    // initial expression is ''
    component.handleButtonClick('1/');
    expect(mockEngine.calcularInverso).toHaveBeenCalledWith(initialState.expression);
    expect(mockState.update).toHaveBeenCalledWith(jasmine.objectContaining({ expression: '0.2' }));
  });

  it('handleButtonClick "+/-" should call engine.invertirUltimoNumero and update state', () => {
    component.handleButtonClick('+/-');
    expect(mockEngine.invertirUltimoNumero).toHaveBeenCalledWith(initialState.expression);
    expect(mockState.update).toHaveBeenCalledWith(jasmine.objectContaining({ expression: '-5' }));
  });

  it('handleButtonClick "DEL" should slice last char and call state.update', () => {
    // set a state value with some expression
    mockState.value = { ...initialState, expression: '1234' };
    component.handleButtonClick('DEL');
    expect(mockState.update).toHaveBeenCalledWith(jasmine.objectContaining({ expression: '123' }));
  });

  it('handleButtonClick "=" should call engine pipeline, update state and add history', () => {
    mockState.value = { ...initialState, expression: '2+2' };
    component.handleButtonClick('=');

    expect(mockEngine.parentesisMulti).toHaveBeenCalledWith('2+2');
    expect(mockEngine.replaceFunction).toHaveBeenCalled();
    expect(mockEngine.evalExpresion).toHaveBeenCalled();
    expect(mockState.update).toHaveBeenCalledWith(jasmine.objectContaining({ result: '4', expression: '4', equalPressed: 1 }));
    expect(mockHistory.agregarId).toHaveBeenCalledWith('2+2', '4');
  });

  // it('handleKeyDown Backspace should update state expression removing last char', () => {
  //   // simulate entering expression
  //   mockState.value = { ...initialState, expression: '55' };
  //   const event = new KeyboardEvent('keydown', { key: 'Backspace' });
  //   component.handleKeyDown(event);
  //   expect(mockState.update).toHaveBeenCalledWith(jasmine.objectContaining({ expression: '5' }));
  // });

  // it('handleKeyDown Enter should call calcularResultado', () => {
  //   spyOn(component, 'calcularResultado').and.callThrough();
  //   const event = new KeyboardEvent('keydown', { key: 'Enter' });
  //   component.handleKeyDown(event);
  //   expect(component.calcularResultado).toHaveBeenCalled();
  // });
});
