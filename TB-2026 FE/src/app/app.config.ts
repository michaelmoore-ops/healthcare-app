import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { URLInterceptor } from './core/interceptors/url.interceptor';
import { httpSuccessInterceptor } from './core/interceptors/http-success.interceptor';
import { loaderInterceptor } from './core/interceptors/loader.interceptor';
import { ModalModule } from 'ngx-bootstrap/modal';
import { BrowserAnimationsModule, provideAnimations } from '@angular/platform-browser/animations';
import { ToastNoAnimationModule, ToastrModule } from 'ngx-toastr';
import { provideIonicAngular } from '@ionic/angular/standalone';
export const versionConfig = {
  version: '3.0'
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([URLInterceptor,httpSuccessInterceptor,loaderInterceptor])),

    // Import the module here
    importProvidersFrom(BrowserModule, BrowserAnimationsModule, ModalModule.forRoot(), ToastNoAnimationModule.forRoot(),ToastrModule.forRoot({
      positionClass: 'toast-top-right',
      timeOut: 3000,
      extendedTimeOut: 2000,
      autoDismiss: true,
      closeButton: true,
      progressBar: false,
    })
),
    provideAnimations(),
    provideIonicAngular(),

    { provide: 'AppConfig', useValue: versionConfig }
  ]
};
