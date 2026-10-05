import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { BarcodeLookup,Product,ProductPage,ProductRequest } from './models';

@Injectable({providedIn:'root'})
export class ProductService {
  constructor(private http:HttpClient){}

  search(query=''){
    return this.http.get<Product[]>(`${environment.apiUrl}/products`,{params:query?{query}:{}});
  }

  page(query='',page=0,size=10){
    const params:Record<string,string|number>={page,size};
    if(query.trim()) params['query']=query.trim();
    return this.http.get<ProductPage>(`${environment.apiUrl}/products/page`,{params});
  }

  lookup(barcode:string){return this.http.get<BarcodeLookup>(`${environment.apiUrl}/products/lookup/${encodeURIComponent(barcode)}`);}
  create(r:ProductRequest){return this.http.post<Product>(`${environment.apiUrl}/products`,r);}
  update(id:number,r:ProductRequest){return this.http.put<Product>(`${environment.apiUrl}/products/${id}`,r);}
  price(id:number,price:number){return this.http.patch<Product>(`${environment.apiUrl}/products/${id}/price`,{price});}
}
