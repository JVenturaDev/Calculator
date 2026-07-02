import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './services/auth/auth.interceptor';
import { CALCULATION_ENGINE } from './services/engine-services/calculation-engine.contract';
import { PolishCalculationEngine } from './services/engine-services/polish-calculation-engine';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),

    provideHttpClient(withInterceptors([authInterceptor])),

    provideRouter(routes),
    { provide: CALCULATION_ENGINE, useExisting: PolishCalculationEngine },
  ]
};
