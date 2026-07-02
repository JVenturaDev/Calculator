import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraphicComponentPlot } from './graphic-plot';
import { CALCULATION_ENGINE } from '../../services/engine-services/calculation-engine.contract';

describe('GraphicPlot', () => {
  let component: GraphicComponentPlot;
  let fixture: ComponentFixture<GraphicComponentPlot>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GraphicComponentPlot],
      providers: [
        { provide: CALCULATION_ENGINE, useValue: { evaluate: () => 0 } },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(GraphicComponentPlot);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
