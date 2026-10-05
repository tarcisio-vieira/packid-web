import { Component, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../core/report.service';
import { ReportMode, ReportPeriod, ReportPreview, ReportSummary } from '../../core/models';

@Component({standalone:true,imports:[CommonModule,FormsModule,CurrencyPipe,DatePipe],templateUrl:'./reports.component.html',styleUrl:'./reports.component.scss'})
export class ReportsComponent {
  period:ReportPeriod='DAY';
  mode:ReportMode='SIMPLE_BY_SALE';
  date=new Date().toISOString().slice(0,10);
  summary=signal<ReportSummary|null>(null);
  preview=signal<ReportPreview|null>(null);
  loading=signal(false);
  previewLoading=signal(false);

  constructor(private reports:ReportService){this.load()}

  load(){
    this.preview.set(null);
    this.reports.summary(this.period,this.date).subscribe(r=>this.summary.set(r));
  }

  visualize(){
    this.previewLoading.set(true);
    this.reports.preview(this.period,this.mode,this.date).subscribe({
      next:r=>{this.preview.set(r);this.previewLoading.set(false);setTimeout(()=>document.querySelector('.preview-report')?.scrollIntoView({behavior:'smooth',block:'start'}),0)},
      error:()=>this.previewLoading.set(false)
    });
  }

  download(){
    this.loading.set(true);
    this.reports.pdf(this.period,this.mode,this.date).subscribe({
      next:b=>{const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=`relatorio-${this.period.toLowerCase()}.pdf`;a.click();URL.revokeObjectURL(u);this.loading.set(false)},
      error:()=>this.loading.set(false)
    });
  }
}
