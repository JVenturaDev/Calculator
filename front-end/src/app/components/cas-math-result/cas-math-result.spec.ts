import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CasMathResultComponent } from './cas-math-result';

describe('CasMathResultComponent', () => {
  let fixture: ComponentFixture<CasMathResultComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CasMathResultComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CasMathResultComponent);
  });

  it('keeps the canonical result in the DOM while rendering supported mathematics', async () => {
    const canonical = 'ln(abs(x + 1)) * 1 / 2';
    fixture.componentRef.setInput('text', canonical);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const source = fixture.nativeElement.querySelector('.cas-canonical-result');
    expect(source.textContent.trim()).toBe(canonical);
    expect(fixture.componentInstance.latex).toContain('\\frac{1}{2}');
  });

  it('falls back to visible canonical text when the expression cannot be parsed', async () => {
    fixture.componentRef.setInput('text', 'x +');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const source = fixture.nativeElement.querySelector('.cas-canonical-result');
    expect(source.textContent.trim()).toBe('x +');
    expect(source.classList).not.toContain('sr-only');
    expect(fixture.componentInstance.rendered).toBeFalse();
  });
});
