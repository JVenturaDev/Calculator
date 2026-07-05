import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  flushMicrotasks,
} from '@angular/core/testing';

import { ConfirmationDialogService } from '../../services/confirmation-dialog-services/confirmation-dialog';
import { ConfirmationDialogComponent } from './confirmation-dialog';

describe('ConfirmationDialogComponent', () => {
  let fixture: ComponentFixture<ConfirmationDialogComponent>;
  let service: ConfirmationDialogService;
  let showModal: jasmine.Spy;
  let close: jasmine.Spy;

  beforeEach(async () => {
    showModal = spyOn(HTMLDialogElement.prototype, 'showModal').and.callFake(
      function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
      }
    );
    close = spyOn(HTMLDialogElement.prototype, 'close').and.callFake(
      function (this: HTMLDialogElement) {
        this.removeAttribute('open');
      }
    );

    await TestBed.configureTestingModule({
      imports: [ConfirmationDialogComponent],
    }).compileComponents();

    service = TestBed.inject(ConfirmationDialogService);
    fixture = TestBed.createComponent(ConfirmationDialogComponent);
    fixture.detectChanges();
  });

  afterEach(() => service.cancel());

  it('opens modally and focuses Cancel for a request', fakeAsync(() => {
    void service.confirm({
      title: 'Eliminar espacio',
      message: 'Esta acción no se puede deshacer.',
      tone: 'danger',
    });
    fixture.detectChanges();
    flushMicrotasks();

    const dialog = nativeElement().querySelector('dialog') as HTMLDialogElement;
    const cancel = nativeElement().querySelector(
      '.dialog-button--cancel'
    ) as HTMLButtonElement;

    expect(showModal).toHaveBeenCalledTimes(1);
    expect(dialog.getAttribute('role')).toBe('alertdialog');
    expect(document.activeElement).toBe(cancel);
  }));

  it('resolves false on Escape', async () => {
    const result = service.confirm({
      title: 'Eliminar espacio',
      message: 'Esta acción no se puede deshacer.',
    });
    fixture.detectChanges();

    const dialog = nativeElement().querySelector('dialog') as HTMLDialogElement;
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));

    await expectAsync(result).toBeResolvedTo(false);
    expect(close).toHaveBeenCalled();
  });

  it('cancels on backdrop but not on content clicks', async () => {
    const result = service.confirm({
      title: 'Eliminar espacio',
      message: 'Esta acción no se puede deshacer.',
    });
    fixture.detectChanges();

    const dialog = nativeElement().querySelector('dialog') as HTMLDialogElement;
    const card = nativeElement().querySelector('.dialog-card') as HTMLElement;
    card.click();
    expect(service.activeRequest()).not.toBeNull();

    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    await expectAsync(result).toBeResolvedTo(false);
  });

  it('restores focus to the previous element when it remains connected', fakeAsync(() => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();

    void service.confirm({
      title: 'Eliminar espacio',
      message: 'Esta acción no se puede deshacer.',
    });
    fixture.detectChanges();
    flushMicrotasks();

    const cancel = nativeElement().querySelector(
      '.dialog-button--cancel'
    ) as HTMLButtonElement;
    cancel.click();

    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  }));

  function nativeElement(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }
});
