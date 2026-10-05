import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { ReportMode,ReportPeriod,ReportPreview,ReportSummary } from './models';

@Injectable({providedIn:'root'})
export class ReportService {
  constructor(private http:HttpClient){}
  summary(period:ReportPeriod,date:string){return this.http.get<ReportSummary>(`${environment.apiUrl}/reports/summary`,{params:{period,date}});}
  preview(period:ReportPeriod,mode:ReportMode,date:string){return this.http.get<ReportPreview>(`${environment.apiUrl}/reports/preview`,{params:{period,mode,date}});}
  pdf(period:ReportPeriod,mode:ReportMode,date:string){return this.http.get(`${environment.apiUrl}/reports/pdf`,{params:{period,mode,date},responseType:'blob'});}
}
