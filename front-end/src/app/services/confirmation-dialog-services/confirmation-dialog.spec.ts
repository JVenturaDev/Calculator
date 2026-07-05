import {
  TestBed,
  fakeAsync,
  flushMicrotasks,
} from '@angular/core/testing';

import { ConfirmationDialogService } from './confirmation-dialog';

describe('ConfirmationDialogService', () => {
  let service: ConfirmationDialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConfirmationDialogService);
  });

  afterEach(() => service.cancel());

  it('resolves true when the active request is accepted', async () => {
    const result = service.confirm({
      title: 'Delete',
      message: 'Delete this item?',
    });

    service.accept();

    await expectAsync(result).toBeResolvedTo(true);
  });

  it('resolves false when the active request is cancelled', async () => {
    const result = service.confirm({
      title: 'Delete',
      message: 'Delete this item?',
    });

    service.cancel();

    await expectAsync(result).toBeResolvedTo(false);
  });

  it('presents simultaneous requests in order', fakeAsync(() => {
    const first = service.confirm({
      title: 'First',
      message: 'First request',
    });
    const second = service.confirm({
      title: 'Second',
      message: 'Second request',
    });
    let firstResult: boolean | undefined;
    let secondResult: boolean | undefined;
    void first.then(result => firstResult = result);
    void second.then(result => secondResult = result);

    expect(service.activeRequest()?.title).toBe('First');
    service.accept();
    flushMicrotasks();

    expect(firstResult).toBeTrue();
    expect(service.activeRequest()?.title).toBe('Second');

    service.cancel();
    flushMicrotasks();

    expect(secondResult).toBeFalse();
    expect(service.activeRequest()).toBeNull();
  }));

  it('resolves each request only once', fakeAsync(() => {
    let resolutions = 0;
    const result = service.confirm({
      title: 'Delete',
      message: 'Delete this item?',
    });
    void result.then(() => resolutions++);

    service.accept();
    service.cancel();
    service.accept();
    flushMicrotasks();

    expect(resolutions).toBe(1);
  }));
});
