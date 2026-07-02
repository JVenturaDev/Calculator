import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisplayComponent } from './display';
import { CALCULATION_ENGINE } from '../../services/engine-services/calculation-engine.contract';

describe('Display', () => {
  let component: DisplayComponent;
  let fixture: ComponentFixture<DisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisplayComponent],
      providers: [
        { provide: CALCULATION_ENGINE, useValue: { evaluate: () => 0 } },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(DisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
