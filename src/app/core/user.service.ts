import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AppUser, AppUserRequest } from './models';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private http: HttpClient) {}
  list() { return this.http.get<AppUser[]>(`${environment.apiUrl}/users`); }
  create(request: AppUserRequest) { return this.http.post<AppUser>(`${environment.apiUrl}/users`, request); }
  update(id: number, request: AppUserRequest) { return this.http.put<AppUser>(`${environment.apiUrl}/users/${id}`, request); }
}
