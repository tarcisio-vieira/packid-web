import { Injectable,signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize, map, shareReplay, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginResponse, TenantOption } from './models';

const TOKEN='caixa_facil_token',REFRESH='caixa_facil_refresh',USER='caixa_facil_user',ROLE='caixa_facil_role',STORE='caixa_facil_store',STORE_THEME='caixa_facil_store_theme',TENANT='caixa_facil_tenant',TENANT_SLUG='caixa_facil_tenant_slug',PLATFORM='caixa_facil_platform_admin';

@Injectable({providedIn:'root'})
export class AuthService {
 user=signal(localStorage.getItem(USER)); role=signal(localStorage.getItem(ROLE)); store=signal(localStorage.getItem(STORE)); storeTheme=signal(localStorage.getItem(STORE_THEME)||'DIVERSOS'); tenant=signal(localStorage.getItem(TENANT)); tenantSlug=signal(localStorage.getItem(TENANT_SLUG)); platformAdmin=signal(localStorage.getItem(PLATFORM)==='true');
 private refreshInFlight:Observable<string>|null=null;
 constructor(private http:HttpClient){}

 login(username:string,password:string,tenantSlug:string|null=null){return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`,{username,password,tenantSlug}).pipe(tap(r=>{if(!r.tenantSelectionRequired)this.acceptResponse(r);}));}
 platformLogin(username:string,password:string){return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/platform-login`,{username,password}).pipe(tap(r=>this.acceptResponse(r)));}
 google(){window.location.assign(`${environment.backendUrl}/oauth2/authorization/google`);}
 tenantOptions(selectionToken:string){return this.http.get<TenantOption[]>(`${environment.apiUrl}/auth/tenant-options`,{params:{selectionToken}});}
 selectTenant(selectionToken:string,tenantSlug:string){return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/select-tenant`,{selectionToken,tenantSlug}).pipe(tap(r=>this.acceptResponse(r)));}
 acceptGoogle(token:string,refreshToken:string){try{const p=this.decode(token);if(!p.sub||!p.role||!p.exp||!p.tenantName||!p.storeName||Date.now()>=p.exp*1000)return false;this.save(token,refreshToken,p.sub,p.role,p.storeName,p.storeTheme||'DIVERSOS',p.tenantName,p.tenantSlug||'');return true;}catch{return false;}}
 token(){return localStorage.getItem(TOKEN);} refreshToken(){return localStorage.getItem(REFRESH);}
 logged(){const t=this.token(),r=this.refreshToken();if(!t||!r)return false;try{const rp=this.decode(r);if(!rp.exp||Date.now()>=rp.exp*1000){this.logout();return false;}return true;}catch{this.logout();return false;}}
 isAdmin(){return this.role()==='ADMIN';} isManager(){return this.role()==='ADMIN'||this.role()==='MANAGER';} isPlatformAdmin(){return this.platformAdmin();}
 refreshSession():Observable<string>{if(this.refreshInFlight)return this.refreshInFlight;const refreshToken=this.refreshToken();if(!refreshToken){this.logout();throw new Error('Sessão expirada');}this.refreshInFlight=this.http.post<LoginResponse>(`${environment.apiUrl}/auth/refresh`,{refreshToken}).pipe(tap(r=>this.acceptResponse(r)),map(r=>r.token!),finalize(()=>this.refreshInFlight=null),shareReplay(1));return this.refreshInFlight;}
 logout(){[TOKEN,REFRESH,USER,ROLE,STORE,STORE_THEME,TENANT,TENANT_SLUG,PLATFORM].forEach(k=>localStorage.removeItem(k));this.user.set(null);this.role.set(null);this.store.set(null);this.storeTheme.set('DIVERSOS');this.tenant.set(null);this.tenantSlug.set(null);this.platformAdmin.set(false);}
 private acceptResponse(r:LoginResponse){if(!r.token||!r.refreshToken||!r.role||!r.store||!r.tenant)throw new Error('Resposta de autenticação inválida');this.save(r.token,r.refreshToken,r.username,r.role,r.store.name,r.store.theme||'DIVERSOS',r.tenant.name,r.tenant.slug);}
 private save(t:string,rt:string,u:string,r:string,s:string,storeTheme:string,tenant:string,tenantSlug:string){const claims=this.decode(t);const platform=claims.platformAdmin===true;localStorage.setItem(TOKEN,t);localStorage.setItem(REFRESH,rt);localStorage.setItem(USER,u);localStorage.setItem(ROLE,r);localStorage.setItem(STORE,s);localStorage.setItem(STORE_THEME,storeTheme);localStorage.setItem(TENANT,tenant);localStorage.setItem(TENANT_SLUG,tenantSlug);localStorage.setItem(PLATFORM,String(platform));this.user.set(u);this.role.set(r);this.store.set(s);this.storeTheme.set(storeTheme);this.tenant.set(tenant);this.tenantSlug.set(tenantSlug);this.platformAdmin.set(platform);}
 private decode(t:string):any{const x=t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(atob(x.padEnd(Math.ceil(x.length/4)*4,'=')));}
}
