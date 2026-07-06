import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { DemoEnvironmentService } from './demo-environment';

describe('DemoEnvironmentService', () => {
  it('allows the offline demo on the Calculator GitHub Pages deployment', () => {
    const service = createService(
      'jventuradev.github.io',
      '/Calculator/login',
      'https://jventuradev.github.io/Calculator/'
    );

    expect(service.isDemoAllowed()).toBeTrue();
  });

  it('does not allow the offline demo on localhost', () => {
    const service = createService(
      'localhost',
      '/Calculator/login',
      'http://localhost:4200/Calculator/'
    );

    expect(service.isDemoAllowed()).toBeFalse();
  });

  it('does not allow the offline demo on other hosts', () => {
    const service = createService(
      'calculator.example.com',
      '/Calculator/login',
      'https://calculator.example.com/Calculator/'
    );

    expect(service.isDemoAllowed()).toBeFalse();
  });

  it('requires the Calculator base path on GitHub Pages', () => {
    const service = createService(
      'jventuradev.github.io',
      '/another-project/login',
      'https://jventuradev.github.io/another-project/'
    );

    expect(service.isDemoAllowed()).toBeFalse();
  });

  function createService(
    hostname: string,
    pathname: string,
    baseURI: string
  ): DemoEnvironmentService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        DemoEnvironmentService,
        {
          provide: DOCUMENT,
          useValue: {
            baseURI,
            location: { hostname, pathname },
          } as unknown as Document,
        },
      ],
    });

    return TestBed.inject(DemoEnvironmentService);
  }
});
