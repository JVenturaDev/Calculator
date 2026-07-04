import { ComponentFixture, TestBed } from '@angular/core/testing';
import Complex from 'complex.js';

import { BookRenderLineComponent } from './book-render-line';
import { BookStep } from '../../../../services/book-renderer-service/book-renderer';

describe('BookRenderLineComponent', () => {
  let component: BookRenderLineComponent;
  let fixture: ComponentFixture<BookRenderLineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookRenderLineComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(BookRenderLineComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders an inline step when there is no denominator', () => {
    const element = renderStep({
      numerator: 9,
      operator: 'sqrt',
      result: 3,
      level: 0,
    });

    expect(element.querySelector('.book-step--inline')).not.toBeNull();
    expect(element.querySelector('.book-step--stacked')).toBeNull();
    expect(element.textContent).toContain('9');
    expect(element.textContent).toContain('sqrt');
    expect(element.textContent).toContain('3');
  });

  it('renders zero as a real denominator', () => {
    const element = renderStep({
      numerator: 8,
      denominator: 0,
      operator: '/',
      result: 8,
      level: 0,
    });

    expect(element.querySelector('.book-step--stacked')).not.toBeNull();
    expect(element.querySelector('.denominator')?.textContent?.trim()).toBe('0');
    expect(element.querySelector('.calculation-divider')).not.toBeNull();
  });

  it('formats complex values without changing their value representation', () => {
    const element = renderStep({
      numerator: new Complex(2, -3),
      denominator: new Complex(0, 2),
      operator: '/',
      result: new Complex(4, 5),
      level: 0,
    });

    expect(element.querySelector('.numerator')?.textContent).toContain('2-3i');
    expect(element.querySelector('.denominator')?.textContent).toContain('2i');
    expect(element.querySelector('.result')?.textContent).toContain('4+5i');
  });

  function renderStep(step: BookStep): HTMLElement {
    component.step = step;
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  }
});
