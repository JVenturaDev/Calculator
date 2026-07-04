import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HumanRenderLineComponent } from './human-render-line';
import { HumanStep } from '../../../services/calculation-renderers/human-render/human-renderer';

describe('HumanRenderLineComponent', () => {
  let component: HumanRenderLineComponent;
  let fixture: ComponentFixture<HumanRenderLineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HumanRenderLineComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HumanRenderLineComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders an operator with its real visual variant', () => {
    const element = renderStep({
      type: 'operator',
      text: '2 + 3 = 5',
      level: 0,
    });

    expect(element.classList).toContain('human-step--operator');
    expect(element.dataset['stepType']).toBe('operator');
    expect(element.querySelector('.human-step-text')?.textContent).toContain('2 + 3 = 5');
  });

  it('renders a function with its real visual variant', () => {
    const element = renderStep({
      type: 'function',
      text: 'sin(0) = 0',
      level: 0,
    });

    expect(element.classList).toContain('human-step--function');
    expect(element.dataset['stepType']).toBe('function');
  });

  it('renders a result with its real visual variant', () => {
    const element = renderStep({
      type: 'result',
      text: 'Resultado final: 5',
      level: 0,
    });

    expect(element.classList).toContain('human-step--result');
    expect(element.dataset['stepType']).toBe('result');
    expect(element.textContent).toContain('Resultado final: 5');
  });

  function renderStep(step: HumanStep): HTMLElement {
    component.step = step;
    fixture.detectChanges();

    return fixture.nativeElement.querySelector('.human-step') as HTMLElement;
  }
});
