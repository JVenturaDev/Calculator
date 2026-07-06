import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

const DEMO_HOSTNAME = 'jventuradev.github.io';
const DEMO_BASE_PATH = '/Calculator/';

@Injectable({ providedIn: 'root' })
export class DemoEnvironmentService {
  constructor(@Inject(DOCUMENT) private readonly document: Document) {}

  isDemoAllowed(): boolean {
    const location = this.document.location;
    if (!location || location.hostname.toLowerCase() !== DEMO_HOSTNAME) {
      return false;
    }

    const basePath = this.normalizeBasePath(
      new URL(this.document.baseURI).pathname
    );
    const currentPath = location.pathname;

    return (
      basePath === DEMO_BASE_PATH &&
      (currentPath === '/Calculator' ||
        currentPath.startsWith(DEMO_BASE_PATH))
    );
  }

  private normalizeBasePath(path: string): string {
    return path.endsWith('/') ? path : `${path}/`;
  }
}
