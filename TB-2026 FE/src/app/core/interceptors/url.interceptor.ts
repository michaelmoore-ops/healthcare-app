import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';
export const URLInterceptor: HttpInterceptorFn = (request, next) => {
  try {
    new URL(request.url); // if it's already an absolute URL, leave it
  } catch {
    const apiURL = environment.apiUrl.endsWith('/')
      ? environment.apiUrl
      : environment.apiUrl + '/';

    request = request.clone({
      url: new URL(request.url, apiURL).href,
    });
  }


  return next(request);
};
