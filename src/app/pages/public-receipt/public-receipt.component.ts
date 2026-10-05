import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { PublicReceipt } from '../../core/models';
import { SaleService } from '../../core/sale.service';

@Component({
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, DecimalPipe],
  templateUrl: './public-receipt.component.html',
  styleUrl: './public-receipt.component.scss'
})
export class PublicReceiptComponent implements OnInit {
  receipt = signal<PublicReceipt | null>(null);
  loading = signal(true);
  error = signal('');
  token = '';

  constructor(private route: ActivatedRoute, private sales: SaleService) {}

  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (!this.token) {
      this.loading.set(false);
      this.error.set('Comprovante não encontrado.');
      return;
    }
    this.sales.publicReceipt(this.token).subscribe({
      next: receipt => {
        this.receipt.set(receipt);
        this.loading.set(false);
        if (this.route.snapshot.queryParamMap.get('print') === '1') {
          setTimeout(() => window.print(), 350);
        }
      },
      error: () => { this.loading.set(false); this.error.set('Este comprovante não foi encontrado ou o link é inválido.'); }
    });
  }

  logoDataUrl() {
    const store = this.receipt()?.store;
    if (!store?.receiptLogoBase64) return null;
    return `data:${store.receiptLogoContentType || 'image/png'};base64,${store.receiptLogoBase64}`;
  }

  formatCnpj(value: string | null) {
    const digits = (value || '').replace(/\D/g, '');
    return digits.length === 14
      ? `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8,12)}-${digits.slice(12)}`
      : value || '';
  }

  paymentLabel(value: string) {
    return ({DINHEIRO:'Dinheiro',PIX:'PIX',DEBITO:'Débito',CREDITO:'Crédito',OUTRO:'Outro'} as Record<string,string>)[value] || value;
  }

  pdfUrl() { return this.sales.publicReceiptPdfUrl(this.token); }
  print() { window.print(); }
}
