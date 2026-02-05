import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HumanRenderLineComponent } from './human-render-line';

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
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
