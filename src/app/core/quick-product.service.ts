import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { QuickProductShortcut, QuickProductShortcutRequest } from './models';

@Injectable({providedIn:'root'})
export class QuickProductService {
  constructor(private http:HttpClient) {}

  list() {
    return this.http.get<QuickProductShortcut[]>(`${environment.apiUrl}/quick-products`);
  }

  save(slot:number, request:QuickProductShortcutRequest) {
    return this.http.put<QuickProductShortcut>(`${environment.apiUrl}/quick-products/${slot}`, request);
  }
}
