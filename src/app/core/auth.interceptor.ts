import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor:HttpInterceptorFn=(req,next)=>{
 const auth=inject(AuthService); const token=auth.token(); const authReq=token?req.clone({setHeaders:{Authorization:`Bearer ${token}`}}):req;
 return next(authReq).pipe(catchError((err:HttpErrorResponse)=>{
   const isAuthEndpoint=req.url.includes('/auth/login')||req.url.includes('/auth/refresh')||req.url.includes('/auth/select-tenant')||req.url.includes('/auth/tenant-options');
   if(err.status!==401||isAuthEndpoint||!auth.refreshToken())return throwError(()=>err);
   return auth.refreshSession().pipe(switchMap(newToken=>next(req.clone({setHeaders:{Authorization:`Bearer ${newToken}`}}))),catchError(refreshErr=>{auth.logout();return throwError(()=>refreshErr);}));
 }));
};
