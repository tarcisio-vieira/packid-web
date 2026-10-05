import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { PdvTerminal,SaasDashboard,SaasPlan,SaasPlanUpdate,SaasSubscription,SaasSubscriptionUpdate } from './models';
@Injectable({providedIn:'root'})
export class SaasService{
 constructor(private http:HttpClient){}
 current(){return this.http.get<SaasSubscription>(`${environment.apiUrl}/subscription`);}
 registerTerminal(terminalKey:string,name:string){return this.http.post<PdvTerminal>(`${environment.apiUrl}/subscription/pdvs/register`,{terminalKey,name});}
 terminals(){return this.http.get<PdvTerminal[]>(`${environment.apiUrl}/subscription/pdvs`);}
 deactivateTerminal(id:number){return this.http.delete<void>(`${environment.apiUrl}/subscription/pdvs/${id}`);}
 dashboard(){return this.http.get<SaasDashboard>(`${environment.apiUrl}/platform/saas/dashboard`);}
 plans(){return this.http.get<SaasPlan[]>(`${environment.apiUrl}/platform/saas/plans`);}
 updatePlan(id:number,request:SaasPlanUpdate){return this.http.put<SaasPlan>(`${environment.apiUrl}/platform/saas/plans/${id}`,request);}
 subscriptions(){return this.http.get<SaasSubscription[]>(`${environment.apiUrl}/platform/saas/subscriptions`);}
 updateSubscription(tenantId:number,request:SaasSubscriptionUpdate){return this.http.put<SaasSubscription>(`${environment.apiUrl}/platform/saas/subscriptions/${tenantId}`,request);}
}
