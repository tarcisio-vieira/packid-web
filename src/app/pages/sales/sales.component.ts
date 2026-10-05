import { Component,computed,signal } from '@angular/core';
import { CommonModule,CurrencyPipe,DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SaleService } from '../../core/sale.service';
import { ProductService } from '../../core/product.service';
import { SaleControlService } from '../../core/sale-control.service';
import { AuthService } from '../../core/auth.service';
import { AlertService } from '../../core/alert.service';
import { PaymentMethod,Product,Sale,SaleControlCustomer } from '../../core/models';

interface EditItem { productId:number; productName:string; unit:string; quantity:number; unitPrice:number; }

@Component({standalone:true,imports:[CommonModule,FormsModule,CurrencyPipe,DatePipe],templateUrl:'./sales.component.html',styleUrl:'./sales.component.scss'})
export class SalesComponent{
  sales=signal<Sale[]>([]); loading=signal(false); error=signal(''); search=signal(''); includeDeleted=false;
  page=signal(1); pageSize=signal(10); readonly pageSizeOptions=[10,50,100];
  editing=signal<Sale|null>(null); editItems:EditItem[]=[]; editPayment:PaymentMethod='OUTRO'; editReceived:number|null=null; editFee=0; editMessage=''; editQr=false; editCustomerId:number|null=null;
  customers=signal<SaleControlCustomer[]>([]); productSearch=''; productResults=signal<Product[]>([]); saving=signal(false);

  filtered=computed(()=>{
    const q=this.search().trim().toLowerCase();
    if(!q)return this.sales();
    return this.sales().filter(s=>String(s.id).includes(q)||s.operator.toLowerCase().includes(q)||(s.saleControlCustomerName||'').toLowerCase().includes(q)||s.items.some(i=>i.productName.toLowerCase().includes(q))||(s.services||[]).some(i=>i.serviceName.toLowerCase().includes(q)||(i.reference||'').toLowerCase().includes(q)));
  });
  totalPages=computed(()=>Math.max(1,Math.ceil(this.filtered().length/this.pageSize())));
  paged=computed(()=>{
    const start=(this.page()-1)*this.pageSize();
    return this.filtered().slice(start,start+this.pageSize());
  });
  firstRecord=computed(()=>this.filtered().length?(this.page()-1)*this.pageSize()+1:0);
  lastRecord=computed(()=>Math.min(this.page()*this.pageSize(),this.filtered().length));

  constructor(private api:SaleService,private products:ProductService,private controls:SaleControlService,public auth:AuthService,private alerts:AlertService){this.load();this.controls.customers('').subscribe({next:r=>this.customers.set(r),error:()=>{}})}

  load(){this.loading.set(true);this.error.set('');this.api.all('',this.includeDeleted).subscribe({next:r=>{this.sales.set(r);this.ensureValidPage();this.loading.set(false)},error:e=>{this.error.set(e.error?.message||'Não foi possível carregar as vendas');this.loading.set(false)}})}
  toggleDeleted(){this.page.set(1);this.load()}
  onSearchChange(value:string){this.search.set(value);this.page.set(1)}
  changePageSize(value:number|string){this.pageSize.set(Number(value)||10);this.page.set(1)}
  previousPage(){if(this.page()>1)this.page.update(p=>p-1)}
  nextPage(){if(this.page()<this.totalPages())this.page.update(p=>p+1)}
  private ensureValidPage(){if(this.page()>this.totalPages())this.page.set(this.totalPages())}

  openEdit(s:Sale){
    if(!this.auth.isManager()||s.deleted)return;
    if(s.payments?.length>1){this.error.set('Venda com pagamento combinado: faça uma nova venda para corrigir a composição dos pagamentos sem perder o histórico das taxas.');return;}
    this.editing.set(s);this.editItems=s.items.map(i=>({productId:i.productId,productName:i.productName,unit:i.unit,quantity:i.quantity,unitPrice:i.unitPrice}));
    this.editPayment=s.paymentMethod;this.editReceived=s.amountReceived;this.editFee=s.payments?.[0]?.fee||0;this.editMessage=s.receiptMessage||'';this.editQr=s.printReceiptQrCode;this.editCustomerId=s.saleControlCustomerId;
    this.productSearch='';this.productResults.set([]);this.error.set('');
  }
  closeEdit(){this.editing.set(null);this.productResults.set([])}
  itemTotal(i:EditItem){return +(Number(i.quantity||0)*Number(i.unitPrice||0)).toFixed(2)}
  editTotal(){const serviceTotal=this.editing()?.services?.reduce((a,i)=>a+Number(i.totalCharged||0),0)||0;return +(this.editItems.reduce((a,i)=>a+this.itemTotal(i),0)+serviceTotal).toFixed(2)}
  removeItem(index:number){if(this.editItems.length<=1 && !(this.editing()?.services?.length)){this.error.set('A venda precisa manter pelo menos um produto ou serviço.');return}this.editItems.splice(index,1);this.editItems=[...this.editItems]}
  findProducts(){const q=this.productSearch.trim();if(q.length<2){this.productResults.set([]);return}this.products.search(q).subscribe({next:r=>this.productResults.set(r.slice(0,20)),error:()=>this.productResults.set([])})}
  addProduct(p:Product){const found=this.editItems.find(i=>i.productId===p.id);if(found)found.quantity=+(found.quantity+1).toFixed(3);else this.editItems.push({productId:p.id,productName:p.name,unit:p.unit,quantity:1,unitPrice:p.price});this.editItems=[...this.editItems];this.productSearch='';this.productResults.set([])}
  save(){const s=this.editing();if(!s||(!this.editItems.length && !(s.services?.length))||this.saving())return;this.saving.set(true);this.error.set('');this.api.update(s.id,{items:this.editItems.map(i=>({productId:i.productId,quantity:Number(i.quantity),unitPrice:Number(i.unitPrice),discount:false})),services:(s.services||[]).filter(x=>x.serviceTypeId&&x.paymentTypeId).map(x=>({serviceTypeId:Number(x.serviceTypeId),reference:x.reference,baseAmount:Number(x.baseAmount),paymentTypeId:Number(x.paymentTypeId)})),paymentMethod:this.editPayment,amountReceived:this.editPayment==='DINHEIRO'?this.editReceived:null,payments:[{paymentMethod:this.editPayment,paymentTypeId:s.payments?.[0]?.paymentTypeId??null,amount:this.editTotal(),feeType:s.payments?.[0]?.feeType||'PERCENT',fee:this.editPayment==='DINHEIRO'?0:Number(this.editFee||0),amountReceived:this.editPayment==='DINHEIRO'?this.editReceived:null}],receiptMessage:this.editMessage.trim()||null,printReceiptQrCode:this.editQr,saleControlCustomerId:this.editCustomerId}).subscribe({next:updated=>{this.saving.set(false);this.editing.set(null);this.sales.update(list=>list.map(x=>x.id===updated.id?updated:x))},error:e=>{this.saving.set(false);this.error.set(e.error?.message||'Não foi possível alterar a venda')}})}
  async deleteSale(s:Sale){
    if(!this.auth.isManager()||s.deleted)return;
    const confirmed=await this.alerts.confirm('Excluir venda?',`A venda #${s.id} deixará de contar nos relatórios e no Controle de Vendas.`,'Excluir','warning');
    if(!confirmed)return;
    this.api.delete(s.id).subscribe({next:()=>this.load(),error:e=>this.error.set(e.error?.message||'Não foi possível excluir a venda')});
  }
  download(s:Sale){fetch(this.api.receiptUrl(s.id),{headers:{Authorization:`Bearer ${localStorage.getItem('caixa_facil_token')||''}`}}).then(r=>{if(!r.ok)throw new Error();return r.blob()}).then(blob=>{const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=`Venda-${s.id}.pdf`;a.click();URL.revokeObjectURL(u)}).catch(()=>this.error.set('Não foi possível baixar o comprovante.'))}
  reprint(s:Sale){
    if(s.deleted)return;
    if(s.publicReceiptToken){
      const url=new URL(this.api.publicReceiptUrl(s.publicReceiptToken));
      url.searchParams.set('print','1');
      window.open(url.toString(),'_blank','noopener,noreferrer');
      return;
    }
    fetch(this.api.receiptUrl(s.id),{headers:{Authorization:`Bearer ${localStorage.getItem('caixa_facil_token')||''}`}})
      .then(r=>{if(!r.ok)throw new Error();return r.blob()})
      .then(blob=>{const u=URL.createObjectURL(blob);const w=window.open(u,'_blank');if(!w){URL.revokeObjectURL(u);throw new Error()}setTimeout(()=>URL.revokeObjectURL(u),60000)})
      .catch(()=>this.error.set('Não foi possível abrir o cupom para reimpressão.'));
  }
  status(s:Sale){if(!s.saleControlCustomerId)return '';return s.controlPaymentStatus==='PAID'?'Pago':s.controlPaymentStatus==='PARTIAL'?'Parcial':'A pagar'}
}
