import { HttpInterceptorFn, HttpErrorResponse, HttpClient } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { BehaviorSubject, catchError, throwError, switchMap, filter, take } from "rxjs";
import { environment } from "../../../environments/environment";
import { StorageService } from "../../shared/services/storage.service";


let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.includes('/auth/refresh') || req.url.includes('/auth/login') || req.url.includes('/auth/register')) {
    return next(req);
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        const storageService = inject(StorageService);
        const router = inject(Router);
        const http = inject(HttpClient);

        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          const refreshToken = storageService.getRefreshToken();

          if (!refreshToken) {
            isRefreshing = false;
            storageService.removeAll();
            router.navigate(['/auth']);
            return throwError(() => error);
          }

          const url = `${environment.apiUrl}/auth/refresh`;

          return http.post<{ token: string; refreshToken: string }>(url, { refreshToken }).pipe(
            switchMap((response) => {
              isRefreshing = false;
              storageService.setToken(response.token);
              storageService.setRefreshToken(response.refreshToken);
              refreshTokenSubject.next(response.token);

              return next(
                req.clone({
                  setHeaders: { Authorization: `Bearer ${response.token}` },
                }),
              );
            }),
            catchError(() => {
              isRefreshing = false;
              storageService.removeAll();
              router.navigate(['/auth']);
              return throwError(() => error);
            }),
          );
        } else {
          return refreshTokenSubject.pipe(
            filter((token) => token !== null),
            take(1),
            switchMap((token) => {
              return next(
                req.clone({
                  setHeaders: { Authorization: `Bearer ${token}` },
                }),
              );
            }),
          );
        }
      }

      return throwError(() => error);
    }),
  );
};
