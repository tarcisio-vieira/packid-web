import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PlatformService } from '../../core/platform.service';
import { SaasService } from '../../core/saas.service';
import { AuthService } from '../../core/auth.service';
import { BillingCycle,SaasDashboard,SaasPlan,SaasPlanUpdate,SaasSubscription,SaasSubscriptionUpdate,StoreTheme,SubscriptionStatus,TenantProvisionRequest } from '../../core/models';

@Component({standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./platform-tenants.component.html',styleUrl:'./platform-tenants.component.scss'})
export class PlatformTenantsComponent{
 dashboard=signal<SaasDashboard|null>(null);plans=signal<SaasPlan[]>([]);subscriptions=signal<SaasSubscription[]>([]);
 showForm=signal(false);showSubscription=signal(false);showPlan=signal(false);error=signal('');message=signal('');saving=signal(false);
 selectedSubscription:SaasSubscription|null=null; selectedPlan:SaasPlan|null=null;
 themes:{value:StoreTheme;label:string}[]=[{value:'HORTIFRUTI',label:'Hortifruti'},{value:'LANCHONETE',label:'Lanchonete'},{value:'PADARIA',label:'Padaria'},{value:'PAPELARIA',label:'Papelaria'},{value:'UTENSILIOS',label:'Utensílios'},{value:'DIVERSOS',label:'Produtos diversos'}];
 statuses:{value:SubscriptionStatus;label:string}[]=[{value:'TRIAL',label:'Em teste'},{value:'ACTIVE',label:'Ativa'},{value:'PAST_DUE',label:'Em atraso'},{value:'SUSPENDED',label:'Suspensa'},{value:'CANCELED',label:'Cancelada'}];
 form:TenantProvisionRequest={tenantName:'',tenantSlug:'',storeName:'',adminUsername:'admin',adminPassword:'',adminGoogleEmail:null,theme:'DIVERSOS',planCode:'PROFISSIONAL',billingCycle:'MONTHLY'};
 subForm:SaasSubscriptionUpdate={planCode:'PROFISSIONAL',billingCycle:'MONTHLY',status:'ACTIVE',contractAmount:null,trialEndsAt:null,currentPeriodStart:null,currentPeriodEnd:null,nextDueDate:null,notes:null};
 planForm:SaasPlanUpdate={name:'',description:null,monthlyPrice:0,annualPrice:0,maxUsers:1,maxPdvs:1,maxStores:1,trialDays:15,graceDays:5,displayOrder:0,active:true};

 constructor(private platform:PlatformService,private saas:SaasService,auth:AuthService,router:Router){if(!auth.isPlatformAdmin()){router.navigateByUrl('/pdv');return;}this.load();}
 load(){this.error.set('');forkJoin({dashboard:this.saas.dashboard(),plans:this.saas.plans(),subscriptions:this.saas.subscriptions()}).subscribe({next:r=>{this.dashboard.set(r.dashboard);this.plans.set(r.plans);this.subscriptions.set(r.subscriptions);},error:e=>this.error.set(e.error?.message||'Erro ao carregar administração SaaS')});}
 create(){this.form={tenantName:'',tenantSlug:'',storeName:'',adminUsername:'admin',adminPassword:'',adminGoogleEmail:null,theme:'DIVERSOS',planCode:this.plans().find(p=>p.code==='PROFISSIONAL')?.code||this.plans()[0]?.code||'PROFISSIONAL',billingCycle:'MONTHLY'};this.error.set('');this.showForm.set(true);}
 slugify(){if(!this.form.tenantSlug&&this.form.tenantName)this.form.tenantSlug=this.form.tenantName.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80);if(!this.form.storeName)this.form.storeName=this.form.tenantName;}
 save(){this.error.set('');this.saving.set(true);this.platform.create(this.form).subscribe({next:()=>{this.saving.set(false);this.showForm.set(false);this.message.set('Novo comércio criado em período de teste.');this.load();},error:e=>{this.saving.set(false);this.error.set(e.error?.message||'Erro ao criar comércio');}});}
 editSubscription(s:SaasSubscription){this.selectedSubscription=s;this.subForm={planCode:s.planCode,billingCycle:s.billingCycle,status:s.status,contractAmount:s.contractAmount,trialEndsAt:this.toLocalDateTime(s.trialEndsAt),currentPeriodStart:s.currentPeriodStart,currentPeriodEnd:s.currentPeriodEnd,nextDueDate:s.nextDueDate,notes:s.notes};this.error.set('');this.showSubscription.set(true);}
 planOrCycleChanged(){const p=this.plans().find(x=>x.code===this.subForm.planCode);if(p)this.subForm.contractAmount=this.subForm.billingCycle==='ANNUAL'?p.annualPrice:p.monthlyPrice;}
 saveSubscription(){if(!this.selectedSubscription)return;this.saving.set(true);this.error.set('');this.saas.updateSubscription(this.selectedSubscription.tenantId,this.subForm).subscribe({next:()=>{this.saving.set(false);this.showSubscription.set(false);this.message.set('Assinatura atualizada.');this.load();},error:e=>{this.saving.set(false);this.error.set(e.error?.message||'Erro ao atualizar assinatura');}});}
 editPlan(p:SaasPlan){this.selectedPlan=p;this.planForm={name:p.name,description:p.description,monthlyPrice:p.monthlyPrice,annualPrice:p.annualPrice,maxUsers:p.maxUsers,maxPdvs:p.maxPdvs,maxStores:p.maxStores,trialDays:p.trialDays,graceDays:p.graceDays,displayOrder:p.displayOrder,active:p.active};this.error.set('');this.showPlan.set(true);}
 savePlan(){if(!this.selectedPlan)return;this.saving.set(true);this.error.set('');this.saas.updatePlan(this.selectedPlan.id,this.planForm).subscribe({next:()=>{this.saving.set(false);this.showPlan.set(false);this.message.set('Plano atualizado.');this.load();},error:e=>{this.saving.set(false);this.error.set(e.error?.message||'Erro ao atualizar plano');}});}
 statusLabel(status:string){return ({TRIAL:'Teste',ACTIVE:'Ativa',PAST_DUE:'Em atraso',SUSPENDED:'Suspensa',SUSPENDED_DUE:'Vencida/Bloqueada',TRIAL_EXPIRED:'Teste encerrado',CANCELED:'Cancelada'} as Record<string,string>)[status]||status;}
 statusClass(status:string){return status==='ACTIVE'?'ok':status==='TRIAL'?'trial':status==='PAST_DUE'?'warn':'danger';}
 private toLocalDateTime(v:string|null){return v?v.substring(0,16):null;}
}
