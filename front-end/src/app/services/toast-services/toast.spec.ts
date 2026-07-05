import { TestBed, fakeAsync, tick } from '@angular/core/testing';

import { ToastService } from './toast';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  afterEach(() => service.clear());

  it('adds success, info and error messages', () => {
    service.success('Saved', null);
    service.info('Working', null);
    service.error('Unavailable');

    expect(service.messages().map(toast => toast.kind)).toEqual([
      'success',
      'info',
      'error',
    ]);
    expect(service.messages().map(toast => toast.message)).toEqual([
      'Saved',
      'Working',
      'Unavailable',
    ]);
  });

  it('automatically dismisses success and info messages', fakeAsync(() => {
    service.success('Saved', 1000);
    service.info('Working', 1500);

    tick(1000);
    expect(service.messages().map(toast => toast.message)).toEqual(['Working']);

    tick(500);
    expect(service.messages()).toEqual([]);
  }));

  it('dismisses one message and clears its timer', fakeAsync(() => {
    const id = service.success('Saved', 1000);

    service.dismiss(id);
    tick(1000);

    expect(service.messages()).toEqual([]);
  }));

  it('clears every message and pending timer', fakeAsync(() => {
    service.success('Saved', 1000);
    service.info('Working', 1500);

    service.clear();
    tick(1500);

    expect(service.messages()).toEqual([]);
  }));

  it('keeps errors visible by default', fakeAsync(() => {
    service.error('Unavailable');

    tick(60_000);

    expect(service.messages().map(toast => toast.message)).toEqual([
      'Unavailable',
    ]);
  }));
});
