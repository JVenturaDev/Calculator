import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToastService } from '../../services/toast-services/toast';
import { ToastViewportComponent } from './toast-viewport';

describe('ToastViewportComponent', () => {
  let fixture: ComponentFixture<ToastViewportComponent>;
  let service: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastViewportComponent],
    }).compileComponents();

    service = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(ToastViewportComponent);
    fixture.detectChanges();
  });

  afterEach(() => service.clear());

  it('renders success and info as status and errors as alerts', () => {
    service.success('Saved', null);
    service.info('Working', null);
    service.error('Unavailable');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('[role="status"]').length).toBe(2);
    expect(element.querySelectorAll('[role="alert"]').length).toBe(1);
    expect(element.querySelectorAll('[aria-atomic="true"]').length).toBe(3);
  });

  it('closes a toast through an accessible button', () => {
    service.error('Unavailable');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      '.toast-close'
    ) as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toContain('Unavailable');

    button.click();
    fixture.detectChanges();

    expect(service.messages()).toEqual([]);
    expect(fixture.nativeElement.querySelector('.toast')).toBeNull();
  });
});
