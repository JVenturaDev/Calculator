import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemoryComponent } from './memory';
import { CALCULATION_ENGINE } from '../../services/engine-services/calculation-engine.contract';

describe('Memory', () => {
  let component: MemoryComponent;
  let fixture: ComponentFixture<MemoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemoryComponent],
      providers: [
        { provide: CALCULATION_ENGINE, useValue: { evaluate: () => 0 } },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(MemoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
