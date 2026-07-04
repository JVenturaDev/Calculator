import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import {
  WorkSpace,
  type WorkspaceCalculation,
  type WorkspaceItem,
} from './work-space';
import { WorkspaceService } from '../../services/workSpace-services/worsk-space-service';
import { InputService, type InputTarget } from '../../services/input-services/input-services';
import { Tokenizer } from '../../services/polish-services/tokenizer';
import { parser } from '../../services/polish-services/polish-notation-parser-service';
import { evaluator } from '../../services/polish-services/polish-evaluator';
import { CalculationParserService } from '../../services/calculation/calculation-parser';
import { BookRenderer } from '../../services/book-renderer-service/book-renderer';
import { TreeRendererService } from '../../services/TreeRendererService/tree-render';

describe('WorkSpace', () => {
  let component: WorkSpace;
  let fixture: ComponentFixture<WorkSpace>;
  let tokenizer: jasmine.SpyObj<Tokenizer>;
  let polishParser: jasmine.SpyObj<parser>;
  let polishEvaluator: jasmine.SpyObj<evaluator>;
  let items$: BehaviorSubject<WorkspaceItem[]>;
  let activeItemId$: BehaviorSubject<string | null>;
  let target$: BehaviorSubject<InputTarget>;
  let workspaceService: {
    workspaceItems$: BehaviorSubject<WorkspaceItem[]>;
    activeItemId$: BehaviorSubject<string | null>;
    setActiveItem: jasmine.Spy;
    deleteItem: jasmine.Spy;
    createItem: jasmine.Spy;
    updateTags: jasmine.Spy;
    updateCurrentExpression: jasmine.Spy;
    addCalculationToActiveItem: jasmine.Spy;
  };
  let inputService: {
    target$: BehaviorSubject<InputTarget>;
    target: InputTarget;
    setWorkspaceItemTarget: jasmine.Spy;
  };

  beforeEach(async () => {
    items$ = new BehaviorSubject<WorkspaceItem[]>([]);
    activeItemId$ = new BehaviorSubject<string | null>(null);
    target$ = new BehaviorSubject<InputTarget>({ type: 'calculator' });
    workspaceService = {
      workspaceItems$: items$,
      activeItemId$,
      setActiveItem: jasmine.createSpy('setActiveItem'),
      deleteItem: jasmine.createSpy('deleteItem'),
      createItem: jasmine.createSpy('createItem'),
      updateTags: jasmine.createSpy('updateTags'),
      updateCurrentExpression: jasmine.createSpy('updateCurrentExpression'),
      addCalculationToActiveItem: jasmine.createSpy('addCalculationToActiveItem'),
    };
    inputService = {
      target$,
      target: { type: 'calculator' },
      setWorkspaceItemTarget: jasmine.createSpy('setWorkspaceItemTarget'),
    };
    tokenizer = jasmine.createSpyObj<Tokenizer>('Tokenizer', ['tokenize']);
    polishParser = jasmine.createSpyObj<parser>('parser', ['toPostFix']);
    polishEvaluator = jasmine.createSpyObj<evaluator>('evaluator', ['evaluatePostFix']);

    workspaceService.setActiveItem.and.callFake((id: string) => activeItemId$.next(id));
    inputService.setWorkspaceItemTarget.and.callFake((itemId: string) => {
      const target: InputTarget = { type: 'workspace-item', itemId };
      inputService.target = target;
      target$.next(target);
    });

    await TestBed.configureTestingModule({
      imports: [WorkSpace],
      providers: [
        { provide: WorkspaceService, useValue: workspaceService },
        { provide: InputService, useValue: inputService },
        { provide: Tokenizer, useValue: tokenizer },
        { provide: parser, useValue: polishParser },
        { provide: evaluator, useValue: polishEvaluator },
        {
          provide: CalculationParserService,
          useValue: {
            parse: jasmine.createSpy('parse'),
            formatValue: (value: unknown) => String(value),
          },
        },
        {
          provide: BookRenderer,
          useValue: { convertToBookSteps: jasmine.createSpy('convertToBookSteps') },
        },
        {
          provide: TreeRendererService,
          useValue: { buildTree: jasmine.createSpy('buildTree') },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkSpace);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    items$.complete();
    activeItemId$.complete();
    target$.complete();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not react to workspace streams after destroy', () => {
    const focus = spyOn(HTMLInputElement.prototype, 'focus');
    const laterItem = createWorkspaceItem('item-2');

    fixture.destroy();

    expect(() => {
      items$.next([laterItem]);
      activeItemId$.next(laterItem.id);
      target$.next({ type: 'workspace-item', itemId: laterItem.id });
    }).not.toThrow();
    expect(component.workspaceItems).toEqual([]);
    expect(component.activeItemId).toBeNull();
    expect(focus).not.toHaveBeenCalled();
  });

  it('focuses the only rendered input when activating a later item', () => {
    const firstItem = createWorkspaceItem('item-1');
    const secondItem = createWorkspaceItem('item-2');
    const focus = spyOn(HTMLInputElement.prototype, 'focus');
    items$.next([firstItem, secondItem]);
    fixture.detectChanges();

    component.activateItem(secondItem.id);
    fixture.detectChanges();

    const input = nativeElement().querySelector<HTMLInputElement>('.expression-editor input');
    expect(component.activeItemId).toBe(secondItem.id);
    expect(input?.id).toBe('workspace-input-item-2');
    expect(focus).toHaveBeenCalled();
  });

  it('keeps evaluation connected to the existing engine and workspace flow', () => {
    showActiveItem(undefined, '2+2');
    configureEvaluation();

    component.evaluateWorkspaceItem();

    expect(tokenizer.tokenize).toHaveBeenCalledOnceWith('2+2');
    expect(polishParser.toPostFix).toHaveBeenCalled();
    expect(polishEvaluator.evaluatePostFix).toHaveBeenCalled();
    expect(workspaceService.addCalculationToActiveItem).toHaveBeenCalledTimes(1);

    const calculation = workspaceService.addCalculationToActiveItem.calls
      .mostRecent().args[0] as WorkspaceCalculation;
    expect(calculation.expression).toBe('2+2');
    expect(calculation.result).toBe(4);
    expect(calculation.steps).toEqual([]);
  });

  it('does not steal the active item after evaluating when the user changes it', fakeAsync(() => {
    const firstItem = createWorkspaceItem('item-1', undefined, '2+2');
    const secondItem = createWorkspaceItem('item-2');
    items$.next([firstItem, secondItem]);
    activeItemId$.next(firstItem.id);
    fixture.detectChanges();
    configureEvaluation();

    component.evaluateWorkspaceItem();
    component.activateItem(secondItem.id);
    tick();

    expect(component.activeItemId).toBe(secondItem.id);
    expect(workspaceService.setActiveItem).toHaveBeenCalledOnceWith(secondItem.id);
  }));

  it('renders the empty workspace state', () => {
    expect(nativeElement().querySelector('.workspace-empty')?.textContent)
      .toContain('No hay espacios de cálculo');
  });

  it('renders each calculation as a card with real metadata', () => {
    const calculation: WorkspaceCalculation = {
      id: 'calc-1',
      expression: '2+2',
      result: 4,
      steps: [],
      timestamp: new Date('2026-01-02T03:04:05'),
      humanSteps: [{ text: '2 + 2 = 4', level: 0, type: 'operator' }],
      bookSteps: [],
    };
    showActiveItem(calculation);

    const card = nativeElement().querySelector('.calculation-card');

    expect(card?.tagName).toBe('ARTICLE');
    expect(card?.querySelector('.calculation-expression')?.textContent).toContain('2+2');
    expect(card?.querySelector('.calculation-result')?.textContent).toContain('4');
    expect(card?.querySelector('.calculation-id')?.textContent).toContain('calc-1');
    expect(card?.querySelector('time')).not.toBeNull();
    expect(card?.querySelector('app-human-render-line')).not.toBeNull();
  });

  it('keeps the renderer selector global and accessible', () => {
    showActiveItem();
    const bookButton = nativeElement().querySelector<HTMLButtonElement>('[data-view="book"]');

    bookButton?.click();
    fixture.detectChanges();

    expect(component.viewMode).toBe('book');
    expect(bookButton?.getAttribute('aria-pressed')).toBe('true');
    expect(nativeElement().querySelectorAll('.view-switch').length).toBe(1);
  });

  it('keeps expression editing connected to WorkspaceService', async () => {
    showActiveItem();
    const input = nativeElement().querySelector<HTMLInputElement>('.expression-editor input');

    if (input) {
      input.value = 'sin(1)';
      input.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();

    expect(workspaceService.updateCurrentExpression)
      .toHaveBeenCalledWith('item-1', 'sin(1)');
  });

  it('keeps evaluation connected to the existing component method', () => {
    showActiveItem();
    const evaluate = spyOn(component, 'evaluateWorkspaceItem');
    const button = nativeElement().querySelector<HTMLButtonElement>('.evaluate-button');

    button?.click();

    expect(evaluate).toHaveBeenCalledTimes(1);
  });

  it('shows the calculation empty state for an active item', () => {
    showActiveItem();

    expect(nativeElement().querySelector('.active-workspace .empty-state')?.textContent)
      .toContain('Aún no hay cálculos');
  });

  function configureEvaluation(): void {
    tokenizer.tokenize.and.returnValue([]);
    polishParser.toPostFix.and.returnValue([]);
    polishEvaluator.evaluatePostFix.and.returnValue({ result: 4, steps: [] });
  }

  function showActiveItem(
    calculation?: WorkspaceCalculation,
    currentExpression = '',
  ): void {
    const item: WorkspaceItem = {
      id: 'item-1',
      title: 'Pruebas científicas',
      type: 'scientific',
      currentExpression,
      calculations: calculation ? [calculation] : [],
      tags: ['álgebra'],
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-02'),
    };

    items$.next([item]);
    activeItemId$.next(item.id);
    fixture.detectChanges();
  }

  function createWorkspaceItem(
    id: string,
    calculation?: WorkspaceCalculation,
    currentExpression = '',
  ): WorkspaceItem {
    return {
      id,
      title: `Workspace ${id}`,
      type: 'scientific',
      currentExpression,
      calculations: calculation ? [calculation] : [],
      tags: [],
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-02'),
    };
  }

  function nativeElement(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }
});
