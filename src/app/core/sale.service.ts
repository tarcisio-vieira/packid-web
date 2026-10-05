import { Injectable } from '@angular/core';
import { HttpClient,HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { CreateSaleRequest,PublicReceipt,Sale,UpdateSaleRequest } from './models';
import { PdvTerminalService } from './pdv-terminal.service';
@Injectable({providedIn:'root'})
export class SaleService{
 constructor(private http:HttpClient,private terminal:PdvTerminalService){}
 create(r:CreateSaleRequest){return this.http.post<Sale>(`${environment.apiUrl}/sales`,r,{headers:new HttpHeaders({'X-PDV-Terminal':this.terminal.key()})});}
 recent(){return this.http.get<Sale[]>(`${environment.apiUrl}/sales`);}
 all(query='',includeDeleted=false){return this.http.get<Sale[]>(`${environment.apiUrl}/sales/all`,{params:{query,includeDeleted}});}
 get(id:number){return this.http.get<Sale>(`${environment.apiUrl}/sales/${id}`);}
 update(id:number,r:UpdateSaleRequest){return this.http.put<Sale>(`${environment.apiUrl}/sales/${id}`,r);}
 delete(id:number){return this.http.delete<void>(`${environment.apiUrl}/sales/${id}`);}
 receiptUrl(id:number){return `${environment.apiUrl}/sales/${id}/receipt.pdf`;}
 publicReceipt(token:string){return this.http.get<PublicReceipt>(`${environment.apiUrl}/public/receipts/${encodeURIComponent(token)}`);}
 publicReceiptUrl(token:string){return new URL(`cupom/${encodeURIComponent(token)}`,document.baseURI).toString();}
 publicReceiptQrUrl(token:string){return `${environment.apiUrl}/public/receipts/${encodeURIComponent(token)}/qr.png`;}
 publicReceiptPdfUrl(token:string){return `${environment.apiUrl}/public/receipts/${encodeURIComponent(token)}/receipt.pdf`;}
}
