import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { StoreSettings, StoreSettingsRequest, StoreTheme } from './models';

const FALLBACK: StoreSettings = {
  id: 0,
  name: 'VSGI Caixa Fácil',
  theme: 'DIVERSOS',
  cnpj: null,
  receiptLogoBase64: null,
  receiptLogoContentType: null,
  receiptHeader: null,
  receiptFooter: 'Obrigado pela preferência.',
  receiptPrintLogo: true,
  receiptDefaultPrintQrCode: false,
  paymentFeeCashPercent: 0,
  paymentFeePixPercent: 0,
  paymentFeeDebitPercent: 0,
  paymentFeeCreditPercent: 0,
  paymentFeeOtherPercent: 0,
  paymentFeeCashFixed: 0,
  paymentFeePixFixed: 0,
  paymentFeeDebitFixed: 0,
  paymentFeeCreditFixed: 0,
  paymentFeeOtherFixed: 0,
  paymentFeeCashDefaultFixed: false,
  paymentFeePixDefaultFixed: false,
  paymentFeeDebitDefaultFixed: false,
  paymentFeeCreditDefaultFixed: false,
  paymentFeeOtherDefaultFixed: false,
  paymentCashDefaultPdv: false,
  paymentPixDefaultPdv: false,
  paymentDebitDefaultPdv: false,
  paymentCreditDefaultPdv: false,
  paymentOtherDefaultPdv: true,
  serviceTypes: [],
  paymentTypes: [
    {id:null,name:'Dinheiro',legacyMethod:'DINHEIRO',feePercent:0,feeFixed:0,defaultFeeType:'PERCENT',defaultPdv:false,active:true,cashPayment:true,displayOrder:10},
    {id:null,name:'PIX',legacyMethod:'PIX',feePercent:0,feeFixed:0,defaultFeeType:'PERCENT',defaultPdv:false,active:true,cashPayment:false,displayOrder:20},
    {id:null,name:'Débito',legacyMethod:'DEBITO',feePercent:0,feeFixed:0,defaultFeeType:'PERCENT',defaultPdv:false,active:true,cashPayment:false,displayOrder:30},
    {id:null,name:'Crédito',legacyMethod:'CREDITO',feePercent:0,feeFixed:0,defaultFeeType:'PERCENT',defaultPdv:false,active:true,cashPayment:false,displayOrder:40},
    {id:null,name:'Outro',legacyMethod:'OUTRO',feePercent:0,feeFixed:0,defaultFeeType:'PERCENT',defaultPdv:true,active:true,cashPayment:false,displayOrder:50}
  ]
};

@Injectable({providedIn:'root'})
export class StoreSettingsService {
  settings = signal<StoreSettings>(FALLBACK);
  private requestGeneration = 0;

  constructor(private http: HttpClient) {}

  loadPublic(tenant?: string | null) {
    const generation = ++this.requestGeneration;
    const request = tenant
      ? this.http.get<StoreSettings>(`${environment.apiUrl}/public/store-settings`, { params: { tenant } })
      : this.http.get<StoreSettings>(`${environment.apiUrl}/public/store-settings`);
    return request.pipe(tap(s => {
      if (generation === this.requestGeneration) this.applyNow(this.withDefaults(s));
    }));
  }

  loadCurrent() {
    const generation = ++this.requestGeneration;
    return this.http.get<StoreSettings>(`${environment.apiUrl}/store-settings`).pipe(tap(s => {
      if (generation === this.requestGeneration) this.applyNow(this.withDefaults(s));
    }));
  }

  loadAdmin() { return this.loadCurrent(); }

  update(request: StoreSettingsRequest) {
    return this.http.put<StoreSettings>(`${environment.apiUrl}/store-settings`, request).pipe(
      tap(s => this.apply(this.withDefaults(s)))
    );
  }

  apply(settings: StoreSettings) {
    this.requestGeneration++;
    this.applyNow(this.withDefaults(settings));
  }

  applySession(storeName: string | null, theme: string | null) {
    this.apply({
      ...FALLBACK,
      id: 0,
      name: storeName?.trim() || FALLBACK.name,
      theme: this.normalizeTheme(theme)
    });
  }

  applyNeutral() {
    this.requestGeneration++;
    this.settings.set(FALLBACK);
    document.documentElement.dataset['storeTheme'] = 'neutral';
    document.title = 'VSGI Caixa Fácil';
    const favicon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (favicon) favicon.href = 'assets/favicon-vsgi-neutral.svg';
  }

  reset() { this.applyNeutral(); }

  theme(): StoreTheme { return this.settings().theme; }

  logoPath(theme: StoreTheme = this.theme()): string {
    const map: Record<StoreTheme, string> = {
      HORTIFRUTI: 'assets/logo-hortifruti.svg',
      LANCHONETE: 'assets/logo-lanchonete.svg',
      PADARIA: 'assets/logo-padaria.svg',
      PAPELARIA: 'assets/logo-papelaria.svg',
      UTENSILIOS: 'assets/logo-utensilios.svg',
      DIVERSOS: 'assets/logo-diversos.svg'
    };
    return map[theme] || map.DIVERSOS;
  }

  receiptLogoDataUrl(): string | null {
    const s = this.settings();
    if (!s.receiptLogoBase64) return null;
    return `data:${s.receiptLogoContentType || 'image/png'};base64,${s.receiptLogoBase64}`;
  }

  faviconPath(theme: StoreTheme = this.theme()): string {
    const map: Record<StoreTheme, string> = {
      HORTIFRUTI: 'assets/favicon-hortifruti.svg',
      LANCHONETE: 'assets/favicon-lanchonete.svg',
      PADARIA: 'assets/favicon-padaria.svg',
      PAPELARIA: 'assets/favicon-papelaria.svg',
      UTENSILIOS: 'assets/favicon-utensilios.svg',
      DIVERSOS: 'assets/favicon-diversos.svg'
    };
    return map[theme] || map.DIVERSOS;
  }

  themeEmojis(): string[] {
    const map: Record<StoreTheme, string[]> = {
      HORTIFRUTI: ['🍎','🥬','🥕','🍌','🍅'],
      LANCHONETE: ['🍔','🥤','🌭','🍟','🥪'],
      PADARIA: ['🥖','🍞','🥛','🥐','☕'],
      PAPELARIA: ['✏️','📒','🖍️','📎','✂️'],
      UTENSILIOS: ['🍳','🥄','🧹','🪣','🧽'],
      DIVERSOS: ['🛍️','📦','🏷️','🛒','✨']
    };
    return map[this.theme()] || map.DIVERSOS;
  }

  formatCnpj(value: string | null | undefined): string {
    const digits = (value || '').replace(/\D/g, '');
    if (digits.length !== 14) return value || '';
    return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8,12)}-${digits.slice(12)}`;
  }

  private applyNow(settings: StoreSettings) {
    this.settings.set(settings);
    document.documentElement.dataset['storeTheme'] = settings.theme.toLowerCase();
    document.title = `${settings.name} • VSGI Caixa Fácil`;
    const favicon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (favicon) favicon.href = this.faviconPath(settings.theme);
  }

  private withDefaults(settings: StoreSettings): StoreSettings {
    return {
      ...FALLBACK,
      ...settings,
      receiptFooter: settings.receiptFooter ?? FALLBACK.receiptFooter,
      receiptPrintLogo: settings.receiptPrintLogo ?? true,
      receiptDefaultPrintQrCode: settings.receiptDefaultPrintQrCode ?? false,
      paymentTypes: (settings.paymentTypes?.length ? settings.paymentTypes : FALLBACK.paymentTypes).map(p => ({...p})),
      serviceTypes: (settings.serviceTypes || []).map(s => ({...s, feeBands:(s.feeBands || []).map(b=>({...b})), paymentExtras:(s.paymentExtras || []).map(e=>({...e}))}))
    };
  }

  private normalizeTheme(theme: string | null | undefined): StoreTheme {
    const valid: StoreTheme[] = ['HORTIFRUTI','LANCHONETE','PADARIA','PAPELARIA','UTENSILIOS','DIVERSOS'];
    return valid.includes(theme as StoreTheme) ? theme as StoreTheme : 'DIVERSOS';
  }
}
