import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { PlatformTenant,TenantProvisionRequest } from './models';
@Injectable({providedIn:'root'}) export class PlatformService{constructor(private http:HttpClient){}list(){return this.http.get<PlatformTenant[]>(`${environment.apiUrl}/platform/tenants`);}create(request:TenantProvisionRequest){return this.http.post<PlatformTenant>(`${environment.apiUrl}/platform/tenants`,request);}
  unlinkGoogleIdentity(userId:number){return this.http.delete<void>(`${environment.apiUrl}/platform/users/${userId}/google-identity`);}
}
