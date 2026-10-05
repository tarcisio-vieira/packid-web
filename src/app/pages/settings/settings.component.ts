import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { StoreSettingsService } from '../../core/store-settings.service';
import { SaasService } from '../../core/saas.service';
import { PdvTerminal, SaasSubscription, StoreSettings, StoreTheme, PaymentTypeConfig, ServiceTypeConfig } from '../../core/models';
import { AlertService } from '../../core/alert.service';

interface ThemeOption { id: StoreTheme; title: string; subtitle: string; emojis: string[]; }

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit {
  name = '';
  cnpj = '';
  selectedTheme: StoreTheme = 'HORTIFRUTI';
  receiptHeader = '';
  receiptFooter = 'Obrigado pela preferência.';
  receiptLogoBase64: string | null = null;
  receiptLogoContentType: string | null = null;
  receiptPrintLogo = true;
  receiptDefaultPrintQrCode = false;
  paymentFeeCashPercent = 0;
  paymentFeePixPercent = 0;
  paymentFeeDebitPercent = 0;
  paymentFeeCreditPercent = 0;
  paymentFeeOtherPercent = 0;
  paymentFeeCashFixed = 0;
  paymentFeePixFixed = 0;
  paymentFeeDebitFixed = 0;
  paymentFeeCreditFixed = 0;
  paymentFeeOtherFixed = 0;
  paymentFeeCashDefaultFixed = false;
  paymentFeePixDefaultFixed = false;
  paymentFeeDebitDefaultFixed = false;
  paymentFeeCreditDefaultFixed = false;
  paymentFeeOtherDefaultFixed = false;
  paymentCashDefaultPdv = false;
  paymentPixDefaultPdv = false;
  paymentDebitDefaultPdv = false;
  paymentCreditDefaultPdv = false;
  paymentOtherDefaultPdv = true;
  paymentTypes: PaymentTypeConfig[] = [];
  serviceTypes: ServiceTypeConfig[] = [];

  saving = signal(false);
  logoLoading = signal(false);
  message = signal('');
  error = signal('');
  subscription = signal<SaasSubscription | null>(null);
  pdvs = signal<PdvTerminal[]>([]);

  themes: ThemeOption[] = [
    { id:'HORTIFRUTI', title:'Hortifruti', subtitle:'Frutas, verduras, legumes e naturais', emojis:['🍎','🥬','🥕','🍌'] },
    { id:'LANCHONETE', title:'Lanchonete', subtitle:'Lanches, refrigerantes e salgados', emojis:['🍔','🥤','🌭','🍟'] },
    { id:'PADARIA', title:'Padaria', subtitle:'Pães, leite, café e produtos de balcão', emojis:['🥖','🍞','🥛','☕'] },
    { id:'PAPELARIA', title:'Papelaria', subtitle:'Cadernos, canetas e material escolar', emojis:['✏️','📒','🖍️','✂️'] },
    { id:'UTENSILIOS', title:'Utensílios', subtitle:'Casa, cozinha, limpeza e utilidades', emojis:['🍳','🥄','🧹','🧽'] },
    { id:'DIVERSOS', title:'Produtos diversos', subtitle:'Visual neutro para lojas variadas', emojis:['🛍️','📦','🏷️','🛒'] }
  ];

  constructor(public settings: StoreSettingsService, private saas: SaasService, private alerts: AlertService, auth: AuthService, router: Router) {
    if (!auth.isAdmin()) router.navigateByUrl('/pdv');
  }

  ngOnInit() {
    this.settings.loadAdmin().subscribe({
      next: s => this.loadForm(s),
      error: e => this.error.set(e.error?.message || 'Não foi possível carregar as configurações.')
    });
    this.loadCommercial();
  }

  private loadForm(s: StoreSettings) {
    this.name = s.name;
    this.selectedTheme = s.theme;
    this.cnpj = this.settings.formatCnpj(s.cnpj);
    this.receiptHeader = s.receiptHeader || '';
    this.receiptFooter = s.receiptFooter || '';
    this.receiptLogoBase64 = s.receiptLogoBase64;
    this.receiptLogoContentType = s.receiptLogoContentType;
    this.receiptPrintLogo = s.receiptPrintLogo;
    this.receiptDefaultPrintQrCode = s.receiptDefaultPrintQrCode;
    this.paymentFeeCashPercent = Number(s.paymentFeeCashPercent || 0);
    this.paymentFeePixPercent = Number(s.paymentFeePixPercent || 0);
    this.paymentFeeDebitPercent = Number(s.paymentFeeDebitPercent || 0);
    this.paymentFeeCreditPercent = Number(s.paymentFeeCreditPercent || 0);
    this.paymentFeeOtherPercent = Number(s.paymentFeeOtherPercent || 0);
    this.paymentFeeCashFixed = Number(s.paymentFeeCashFixed || 0);
    this.paymentFeePixFixed = Number(s.paymentFeePixFixed || 0);
    this.paymentFeeDebitFixed = Number(s.paymentFeeDebitFixed || 0);
    this.paymentFeeCreditFixed = Number(s.paymentFeeCreditFixed || 0);
    this.paymentFeeOtherFixed = Number(s.paymentFeeOtherFixed || 0);
    this.paymentFeeCashDefaultFixed = !!s.paymentFeeCashDefaultFixed;
    this.paymentFeePixDefaultFixed = !!s.paymentFeePixDefaultFixed;
    this.paymentFeeDebitDefaultFixed = !!s.paymentFeeDebitDefaultFixed;
    this.paymentFeeCreditDefaultFixed = !!s.paymentFeeCreditDefaultFixed;
    this.paymentFeeOtherDefaultFixed = !!s.paymentFeeOtherDefaultFixed;
    this.paymentCashDefaultPdv = !!s.paymentCashDefaultPdv;
    this.paymentPixDefaultPdv = !!s.paymentPixDefaultPdv;
    this.paymentDebitDefaultPdv = !!s.paymentDebitDefaultPdv;
    this.paymentCreditDefaultPdv = !!s.paymentCreditDefaultPdv;
    this.paymentOtherDefaultPdv = !!s.paymentOtherDefaultPdv;
    this.paymentTypes = (s.paymentTypes || []).map(p => ({...p}));
    this.serviceTypes = (s.serviceTypes || []).map(service => ({...service, feeBands:(service.feeBands || []).map(b => ({...b})), paymentExtras:(service.paymentExtras || []).map(e => ({...e}))}));
  }

  addPaymentType() {
    const order = (this.paymentTypes.reduce((max, p) => Math.max(max, p.displayOrder || 0), 0) || 0) + 10;
    this.paymentTypes = [...this.paymentTypes, {id:null,name:'',legacyMethod:null,feePercent:0,feeFixed:0,defaultFeeType:'PERCENT',defaultPdv:false,active:true,cashPayment:false,displayOrder:order}];
  }

  removePaymentType(index: number) {
    const item = this.paymentTypes[index];
    if (!item) return;
    if (item.id) {
      item.active = false;
      item.defaultPdv = false;
      this.paymentTypes = [...this.paymentTypes];
    } else {
      this.paymentTypes = this.paymentTypes.filter((_, i) => i !== index);
    }
    this.ensurePaymentDefault();
  }

  setPaymentTypeDefault(index: number) {
    this.paymentTypes = this.paymentTypes.map((p, i) => ({...p, defaultPdv: i === index, active: i === index ? true : p.active}));
  }

  paymentTypeActiveChanged(index: number) {
    const item = this.paymentTypes[index];
    if (!item) return;
    if (!item.active && item.defaultPdv) item.defaultPdv = false;
    this.ensurePaymentDefault();
  }

  private ensurePaymentDefault() {
    if (this.paymentTypes.some(p => p.active && p.defaultPdv)) return;
    const first = this.paymentTypes.findIndex(p => p.active);
    if (first >= 0) this.setPaymentTypeDefault(first);
  }


  addServiceType() {
    const order = (this.serviceTypes.reduce((max, s) => Math.max(max, s.displayOrder || 0), 0) || 0) + 10;
    this.serviceTypes = [...this.serviceTypes, {id:null,name:'',description:null,active:true,displayOrder:order,feeBands:[{id:null,minAmount:0,maxAmount:null,feeType:'FIXED',feeValue:0}],paymentExtras:[]}];
  }

  removeServiceType(index:number) {
    const service=this.serviceTypes[index]; if(!service)return;
    if(service.id){service.active=false;this.serviceTypes=[...this.serviceTypes];}
    else this.serviceTypes=this.serviceTypes.filter((_,i)=>i!==index);
  }

  addServiceBand(serviceIndex:number) {
    const service=this.serviceTypes[serviceIndex]; if(!service)return;
    const last=service.feeBands[service.feeBands.length-1];
    const min=last?.maxAmount != null ? Number(last.maxAmount)+0.01 : 0;
    service.feeBands=[...service.feeBands,{id:null,minAmount:min,maxAmount:null,feeType:'FIXED',feeValue:0}];
    this.serviceTypes=[...this.serviceTypes];
  }

  removeServiceBand(serviceIndex:number, bandIndex:number){
    const service=this.serviceTypes[serviceIndex]; if(!service)return;
    service.feeBands=service.feeBands.filter((_,i)=>i!==bandIndex); this.serviceTypes=[...this.serviceTypes];
  }

  addServicePaymentExtra(serviceIndex:number){
    const service=this.serviceTypes[serviceIndex]; if(!service)return;
    const used=new Set(service.paymentExtras.map(e=>e.paymentTypeId));
    const payment=this.paymentTypes.find(p=>p.active && p.id != null && !used.has(p.id));
    if(!payment?.id){this.error.set('Salve primeiro as formas de pagamento ou não há outra forma disponível para adicionar.');return;}
    service.paymentExtras=[...service.paymentExtras,{id:null,paymentTypeId:payment.id,feeType:'FIXED',feeValue:0}]; this.serviceTypes=[...this.serviceTypes];
  }

  removeServicePaymentExtra(serviceIndex:number, extraIndex:number){
    const service=this.serviceTypes[serviceIndex]; if(!service)return;
    service.paymentExtras=service.paymentExtras.filter((_,i)=>i!==extraIndex); this.serviceTypes=[...this.serviceTypes];
  }

  setDefaultPdv(method: 'DINHEIRO'|'PIX'|'DEBITO'|'CREDITO'|'OUTRO') {
    this.paymentCashDefaultPdv = method === 'DINHEIRO';
    this.paymentPixDefaultPdv = method === 'PIX';
    this.paymentDebitDefaultPdv = method === 'DEBITO';
    this.paymentCreditDefaultPdv = method === 'CREDITO';
    this.paymentOtherDefaultPdv = method === 'OUTRO';
  }

  loadCommercial(){
    this.saas.current().subscribe({next:s=>this.subscription.set(s),error:e=>this.error.set(e.error?.message||'Não foi possível carregar a assinatura.')});
    this.saas.terminals().subscribe({next:r=>this.pdvs.set(r),error:()=>{}});
  }

  async deactivatePdv(pdv:PdvTerminal){
    const confirmed=await this.alerts.confirm('Desativar PDV?',`${pdv.name} precisará ocupar uma licença novamente para voltar a vender.`,'Desativar','warning');
    if(!confirmed)return;
    this.saas.deactivateTerminal(pdv.id).subscribe({next:()=>{this.message.set('PDV desativado.');this.loadCommercial();},error:e=>this.error.set(e.error?.message||'Erro ao desativar PDV.')});
  }

  statusLabel(status:string){return ({TRIAL:'Em teste',ACTIVE:'Ativa',PAST_DUE:'Em atraso',SUSPENDED:'Suspensa',SUSPENDED_DUE:'Suspensa por vencimento',TRIAL_EXPIRED:'Teste encerrado',CANCELED:'Cancelada'} as Record<string,string>)[status]||status;}

  selectTheme(theme: StoreTheme) {
    this.selectedTheme = theme;
    this.applyPreview();
  }

  selectedOption() { return this.themes.find(t => t.id === this.selectedTheme); }

  applyPreview() {
    this.settings.apply({
      ...this.settings.settings(),
      name: this.name.trim() || 'VSGI Caixa Fácil',
      theme: this.selectedTheme,
      cnpj: this.cnpj,
      receiptLogoBase64: this.receiptLogoBase64,
      receiptLogoContentType: this.receiptLogoContentType,
      receiptHeader: this.receiptHeader,
      receiptFooter: this.receiptFooter,
      receiptPrintLogo: this.receiptPrintLogo,
      receiptDefaultPrintQrCode: this.receiptDefaultPrintQrCode,
      paymentFeeCashPercent: this.paymentFeeCashPercent,
      paymentFeePixPercent: this.paymentFeePixPercent,
      paymentFeeDebitPercent: this.paymentFeeDebitPercent,
      paymentFeeCreditPercent: this.paymentFeeCreditPercent,
      paymentFeeOtherPercent: this.paymentFeeOtherPercent,
      paymentFeeCashFixed: this.paymentFeeCashFixed, paymentFeePixFixed: this.paymentFeePixFixed, paymentFeeDebitFixed: this.paymentFeeDebitFixed, paymentFeeCreditFixed: this.paymentFeeCreditFixed, paymentFeeOtherFixed: this.paymentFeeOtherFixed,
      paymentFeeCashDefaultFixed: this.paymentFeeCashDefaultFixed, paymentFeePixDefaultFixed: this.paymentFeePixDefaultFixed, paymentFeeDebitDefaultFixed: this.paymentFeeDebitDefaultFixed, paymentFeeCreditDefaultFixed: this.paymentFeeCreditDefaultFixed, paymentFeeOtherDefaultFixed: this.paymentFeeOtherDefaultFixed, paymentCashDefaultPdv: this.paymentCashDefaultPdv, paymentPixDefaultPdv: this.paymentPixDefaultPdv, paymentDebitDefaultPdv: this.paymentDebitDefaultPdv, paymentCreditDefaultPdv: this.paymentCreditDefaultPdv, paymentOtherDefaultPdv: this.paymentOtherDefaultPdv,
      paymentTypes: this.paymentTypes.map(p => ({...p})),
      serviceTypes: this.serviceTypes.map(s => ({...s, feeBands:s.feeBands.map(b=>({...b})), paymentExtras:s.paymentExtras.map(e=>({...e}))}))
    });
  }

  onCnpjInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 14);
    let value = digits;
    if (digits.length > 12) value = `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8,12)}-${digits.slice(12)}`;
    else if (digits.length > 8) value = `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8)}`;
    else if (digits.length > 5) value = `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5)}`;
    else if (digits.length > 2) value = `${digits.slice(0,2)}.${digits.slice(2)}`;
    this.cnpj = value;
    input.value = value;
    this.applyPreview();
  }

  logoDataUrl() {
    if (!this.receiptLogoBase64) return null;
    return `data:${this.receiptLogoContentType || 'image/png'};base64,${this.receiptLogoBase64}`;
  }

  onLogo(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.error.set('Selecione uma imagem válida para o logo.');
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.error.set('O logo original deve ter no máximo 5 MB.');
      input.value = '';
      return;
    }

    this.logoLoading.set(true);
    this.error.set('');
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxWidth = 700;
        const maxHeight = 300;
        const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          this.error.set('Não foi possível processar o logo.');
          this.logoLoading.set(false);
          return;
        }
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        this.receiptLogoBase64 = dataUrl.split(',')[1] || null;
        this.receiptLogoContentType = 'image/png';
        this.receiptPrintLogo = true;
        this.logoLoading.set(false);
        this.applyPreview();
      };
      image.onerror = () => {
        this.error.set('Não foi possível ler essa imagem. Tente PNG ou JPEG.');
        this.logoLoading.set(false);
      };
      image.src = String(reader.result || '');
    };
    reader.onerror = () => {
      this.error.set('Não foi possível ler o arquivo do logo.');
      this.logoLoading.set(false);
    };
    reader.readAsDataURL(file);
  }

  removeLogo() {
    this.receiptLogoBase64 = null;
    this.receiptLogoContentType = null;
    this.applyPreview();
  }

  save() {
    if (!this.name.trim()) { this.error.set('Informe o nome do comércio.'); return; }
    const cnpjDigits = this.cnpj.replace(/\D/g, '');
    if (cnpjDigits && cnpjDigits.length !== 14) { this.error.set('O CNPJ deve conter 14 dígitos.'); return; }
    const activePayments = this.paymentTypes.filter(p => p.active);
    if (!activePayments.length) { this.error.set('Cadastre pelo menos uma forma de pagamento ativa.'); return; }
    if (activePayments.some(p => !p.name.trim())) { this.error.set('Informe o nome de todas as formas de pagamento ativas.'); return; }
    if (activePayments.filter(p => p.defaultPdv).length !== 1) { this.error.set('Marque exatamente uma forma de pagamento como padrão no PDV.'); return; }

    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    this.settings.update({
      name: this.name.trim(),
      theme: this.selectedTheme,
      cnpj: cnpjDigits || null,
      receiptLogoBase64: this.receiptLogoBase64,
      receiptLogoContentType: this.receiptLogoContentType,
      receiptHeader: this.receiptHeader.trim() || null,
      receiptFooter: this.receiptFooter.trim() || null,
      receiptPrintLogo: this.receiptPrintLogo,
      receiptDefaultPrintQrCode: this.receiptDefaultPrintQrCode,
      paymentFeeCashPercent: Number(this.paymentFeeCashPercent || 0),
      paymentFeePixPercent: Number(this.paymentFeePixPercent || 0),
      paymentFeeDebitPercent: Number(this.paymentFeeDebitPercent || 0),
      paymentFeeCreditPercent: Number(this.paymentFeeCreditPercent || 0),
      paymentFeeOtherPercent: Number(this.paymentFeeOtherPercent || 0),
      paymentFeeCashFixed: Number(this.paymentFeeCashFixed || 0), paymentFeePixFixed: Number(this.paymentFeePixFixed || 0), paymentFeeDebitFixed: Number(this.paymentFeeDebitFixed || 0), paymentFeeCreditFixed: Number(this.paymentFeeCreditFixed || 0), paymentFeeOtherFixed: Number(this.paymentFeeOtherFixed || 0),
      paymentFeeCashDefaultFixed: this.paymentFeeCashDefaultFixed, paymentFeePixDefaultFixed: this.paymentFeePixDefaultFixed, paymentFeeDebitDefaultFixed: this.paymentFeeDebitDefaultFixed, paymentFeeCreditDefaultFixed: this.paymentFeeCreditDefaultFixed, paymentFeeOtherDefaultFixed: this.paymentFeeOtherDefaultFixed, paymentCashDefaultPdv: this.paymentCashDefaultPdv, paymentPixDefaultPdv: this.paymentPixDefaultPdv, paymentDebitDefaultPdv: this.paymentDebitDefaultPdv, paymentCreditDefaultPdv: this.paymentCreditDefaultPdv, paymentOtherDefaultPdv: this.paymentOtherDefaultPdv,
      paymentTypes: this.paymentTypes.map((p, index) => ({...p, name:p.name.trim(), displayOrder:(index + 1) * 10})),
      serviceTypes: this.serviceTypes.map((s,index)=>({...s,name:s.name.trim(),description:s.description?.trim()||null,displayOrder:(index+1)*10,feeBands:s.feeBands.map(b=>({...b,minAmount:Number(b.minAmount||0),maxAmount:b.maxAmount==null?null:Number(b.maxAmount),feeValue:Number(b.feeValue||0)})),paymentExtras:s.paymentExtras.map(e=>({...e,feeValue:Number(e.feeValue||0)}))}))
    }).subscribe({
      next: s => {
        this.loadForm(s);
        this.message.set('Configurações salvas. Identificação e cupom atualizados.');
        this.saving.set(false);
      },
      error: e => {
        this.error.set(e.error?.message || 'Erro ao salvar as configurações.');
        this.saving.set(false);
      }
    });
  }
}
