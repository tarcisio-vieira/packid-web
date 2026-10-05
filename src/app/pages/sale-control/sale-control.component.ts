import { Component,computed,signal } from '@angular/core';
import { CommonModule,CurrencyPipe,DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SaleControlService } from '../../core/sale-control.service';
import { AlertService } from '../../core/alert.service';
import { SaleControlCustomer,SaleControlCustomerRequest,SaleControlSummary,Sale } from '../../core/models';

@Component({standalone:true,imports:[CommonModule,FormsModule,CurrencyPipe,DatePipe],templateUrl:'./sale-control.component.html',styleUrl:'./sale-control.component.scss'})
export class SaleControlComponent{
  query='';customers=signal<SaleControlCustomer[]>([]);selected=signal<SaleControlCustomer|null>(null);summary=signal<SaleControlSummary|null>(null);loading=signal(false);error=signal('');message=signal('');
  readonly pageSizeOptions=[10,50,100];
  customerPage=signal(1);customerPageSize=signal(10);
  salesPage=signal(1);salesPageSize=signal(10);
  formOpen=signal(false);editingCustomer:SaleControlCustomer|null=null;form:SaleControlCustomerRequest={name:'',phone:null,email:null,notes:null,active:true};saving=signal(false);
  partialSaleId:number|null=null;partialAmount:number|null=null;

  customerTotalPages=computed(()=>Math.max(1,Math.ceil(this.customers().length/this.customerPageSize())));
  pagedCustomers=computed(()=>{
    const start=(this.customerPage()-1)*this.customerPageSize();
    return this.customers().slice(start,start+this.customerPageSize());
  });
  customerFirstRecord=computed(()=>this.customers().length?(this.customerPage()-1)*this.customerPageSize()+1:0);
  customerLastRecord=computed(()=>Math.min(this.customerPage()*this.customerPageSize(),this.customers().length));

  sales=computed(()=>this.summary()?.sales||[]);
  salesTotalPages=computed(()=>Math.max(1,Math.ceil(this.sales().length/this.salesPageSize())));
  pagedSales=computed(()=>{
    const start=(this.salesPage()-1)*this.salesPageSize();
    return this.sales().slice(start,start+this.salesPageSize());
  });
  salesFirstRecord=computed(()=>this.sales().length?(this.salesPage()-1)*this.salesPageSize()+1:0);
  salesLastRecord=computed(()=>Math.min(this.salesPage()*this.salesPageSize(),this.sales().length));

  constructor(private api:SaleControlService,private alerts:AlertService){this.search()}
  search(){this.customerPage.set(1);this.api.customers(this.query.trim()).subscribe({next:r=>{this.customers.set(r);this.ensureCustomerPage()},error:e=>this.error.set(e.error?.message||'Não foi possível pesquisar os nomes')})}
  select(c:SaleControlCustomer){this.selected.set(c);this.salesPage.set(1);this.loadSummary(c.id)}
  loadSummary(id:number){this.loading.set(true);this.error.set('');this.api.summary(id).subscribe({next:r=>{this.summary.set(r);this.ensureSalesPage();this.loading.set(false)},error:e=>{this.error.set(e.error?.message||'Não foi possível carregar o controle');this.loading.set(false)}})}
  changeCustomerPageSize(value:number|string){this.customerPageSize.set(Number(value)||10);this.customerPage.set(1)}
  previousCustomerPage(){if(this.customerPage()>1)this.customerPage.update(p=>p-1)}
  nextCustomerPage(){if(this.customerPage()<this.customerTotalPages())this.customerPage.update(p=>p+1)}
  private ensureCustomerPage(){if(this.customerPage()>this.customerTotalPages())this.customerPage.set(this.customerTotalPages())}
  changeSalesPageSize(value:number|string){this.salesPageSize.set(Number(value)||10);this.salesPage.set(1)}
  previousSalesPage(){if(this.salesPage()>1)this.salesPage.update(p=>p-1)}
  nextSalesPage(){if(this.salesPage()<this.salesTotalPages())this.salesPage.update(p=>p+1)}
  private ensureSalesPage(){if(this.salesPage()>this.salesTotalPages())this.salesPage.set(this.salesTotalPages())}
  newCustomer(){this.editingCustomer=null;this.form={name:'',phone:null,email:null,notes:null,active:true};this.formOpen.set(true)}
  editCustomer(c:SaleControlCustomer){this.editingCustomer=c;this.form={name:c.name,phone:c.phone,email:c.email,notes:c.notes,active:c.active};this.formOpen.set(true)}
  closeForm(){this.formOpen.set(false)}
  saveCustomer(){if(!this.form.name.trim()||this.saving())return;this.saving.set(true);const req={...this.form,name:this.form.name.trim(),phone:this.blank(this.form.phone),email:this.blank(this.form.email),notes:this.blank(this.form.notes)};const call=this.editingCustomer?this.api.updateCustomer(this.editingCustomer.id,req):this.api.createCustomer(req);call.subscribe({next:c=>{this.saving.set(false);this.formOpen.set(false);this.search();this.select(c);this.message.set('Cadastro salvo.')},error:e=>{this.saving.set(false);this.error.set(e.error?.message||'Não foi possível salvar o cadastro')}})}
  async payAll(s:Sale){
    if(s.balanceAmount<=0)return;
    const confirmed=await this.alerts.confirm('Registrar pagamento?',`Confirmar o pagamento de ${this.money(s.balanceAmount)} para a venda #${s.id}?`,'Registrar pagamento','question');
    if(!confirmed)return;
    this.addPayment(s,s.balanceAmount);
  }
  startPartial(s:Sale){this.partialSaleId=s.id;this.partialAmount=null;setTimeout(()=>document.querySelector<HTMLInputElement>('#partial-'+s.id)?.focus(),0)}
  cancelPartial(){this.partialSaleId=null;this.partialAmount=null}
  payPartial(s:Sale){const amount=Number(this.partialAmount||0);if(amount<=0)return;this.addPayment(s,amount)}
  addPayment(s:Sale,amount:number){this.error.set('');this.api.addPayment(s.id,amount).subscribe({next:()=>{this.message.set('Pagamento registrado.');this.cancelPartial();const c=this.selected();if(c)this.loadSummary(c.id)},error:e=>this.error.set(e.error?.message||'Não foi possível registrar o pagamento')})}
  async undo(s:Sale){
    if(s.paidAmount<=0)return;
    const confirmed=await this.alerts.confirm('Desfazer pagamento?',`Desfazer o último pagamento registrado para a venda #${s.id}?`,'Desfazer','warning');
    if(!confirmed)return;
    this.api.undoLatestPayment(s.id).subscribe({next:r=>{this.message.set(`Pagamento de ${this.money(r.amount)} desfeito.`);const c=this.selected();if(c)this.loadSummary(c.id)},error:e=>this.error.set(e.error?.message||'Não foi possível desfazer o pagamento')});
  }
  status(s:Sale){return s.controlPaymentStatus==='PAID'?'Pago':s.controlPaymentStatus==='PARTIAL'?'Pago parcialmente':'A pagar'}
  statusClass(s:Sale){return s.controlPaymentStatus.toLowerCase()}
  private blank(v:string|null){return v&&v.trim()?v.trim():null}
  private money(v:number){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)}
}
