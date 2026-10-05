import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { SaleControlCustomer,SaleControlCustomerRequest,SaleControlPayment,SaleControlSummary } from './models';

@Injectable({providedIn:'root'})
export class SaleControlService{
  constructor(private http:HttpClient){}
  customers(query=''){return this.http.get<SaleControlCustomer[]>(`${environment.apiUrl}/sale-control/customers`,{params:{query}});}
  createCustomer(r:SaleControlCustomerRequest){return this.http.post<SaleControlCustomer>(`${environment.apiUrl}/sale-control/customers`,r);}
  updateCustomer(id:number,r:SaleControlCustomerRequest){return this.http.put<SaleControlCustomer>(`${environment.apiUrl}/sale-control/customers/${id}`,r);}
  summary(customerId:number){return this.http.get<SaleControlSummary>(`${environment.apiUrl}/sale-control/customers/${customerId}/summary`);}
  payments(saleId:number){return this.http.get<SaleControlPayment[]>(`${environment.apiUrl}/sale-control/sales/${saleId}/payments`);}
  addPayment(saleId:number,amount:number){return this.http.post<SaleControlPayment>(`${environment.apiUrl}/sale-control/sales/${saleId}/payments`,{amount});}
  undoLatestPayment(saleId:number){return this.http.delete<SaleControlPayment>(`${environment.apiUrl}/sale-control/sales/${saleId}/payments/latest`);}
}
