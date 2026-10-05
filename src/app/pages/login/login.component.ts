import { Component,OnInit,signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { StoreSettingsService } from '../../core/store-settings.service';
import { TenantOption } from '../../core/models';

@Component({standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./login.component.html',styleUrl:'./login.component.scss'})
export class LoginComponent implements OnInit{
 username='';password='';tenantSlug='';loading=signal(false);error=signal('');tenantOptions=signal<TenantOption[]>([]);selectionToken=signal<string|null>(null);showLocalLogin=signal(false);platformMode=signal(false);
 constructor(public auth:AuthService,public settings:StoreSettingsService){}
 ngOnInit(){
  this.settings.applyNeutral();
  if(this.auth.logged()){this.finishLogin(false);return;}
  const h=new URLSearchParams(location.hash.slice(1));const t=h.get('google_token'),rt=h.get('google_refresh'),e=h.get('google_error'),selection=h.get('google_selection');
  if(t&&rt&&this.auth.acceptGoogle(t,rt)){history.replaceState(null,'',location.pathname);this.finishLogin(false);return;}
  if(selection){history.replaceState(null,'',location.pathname);this.selectionToken.set(selection);this.loading.set(true);this.auth.tenantOptions(selection).subscribe({next:o=>{this.tenantOptions.set(o);this.loading.set(false);},error:err=>{this.error.set(err.error?.message||'Não foi possível carregar os comércios autorizados');this.loading.set(false);}});}
  if(e)this.error.set(e);
 }
 submit(){
  if(!this.username.trim()||!this.password){this.error.set('Informe usuário e senha.');return;}
  this.loading.set(true);this.error.set('');
  const request=this.platformMode()
    ? this.auth.platformLogin(this.username.trim(),this.password)
    : this.auth.login(this.username.trim(),this.password,this.tenantSlug.trim()||null);
  request.subscribe({
   next:r=>{if(r.tenantSelectionRequired){this.tenantOptions.set(r.availableTenants);this.loading.set(false);return;}this.finishLogin(this.platformMode());},
   error:e=>{this.error.set(e.error?.message||'Não foi possível entrar');this.loading.set(false);}
  });
 }
 chooseTenant(option:TenantOption){
  this.error.set('');const selection=this.selectionToken();
  if(selection){this.loading.set(true);this.auth.selectTenant(selection,option.slug).subscribe({next:()=>this.finishLogin(false),error:e=>{this.error.set(e.error?.message||'Não foi possível acessar este comércio');this.loading.set(false);}});return;}
  this.tenantSlug=option.slug;this.submit();
 }
 google(){this.error.set('');this.auth.google();}
 toggleLocalLogin(){this.showLocalLogin.update(v=>!v);this.error.set('');}
 openAdmin(){this.platformMode.set(true);this.showLocalLogin.set(false);this.username='';this.password='';this.tenantSlug='';this.error.set('');}
 closeAdmin(){this.platformMode.set(false);this.username='';this.password='';this.tenantSlug='';this.error.set('');}
 backToLogin(){this.tenantOptions.set([]);this.selectionToken.set(null);this.loading.set(false);this.password='';this.tenantSlug='';this.settings.applyNeutral();}
 private finishLogin(platform:boolean){
  this.loading.set(true);
  this.settings.applySession(this.auth.store(),this.auth.storeTheme());
  this.settings.loadCurrent().subscribe({
   next:()=>this.completeNavigation(platform),
   error:()=>this.completeNavigation(platform)
  });
 }
 private completeNavigation(platform:boolean){
  if(platform&&!this.auth.isPlatformAdmin()){
   this.auth.logout();this.settings.applyNeutral();this.platformMode.set(true);this.error.set('Este usuário não possui permissão de administração da plataforma.');this.loading.set(false);return;
  }
  this.loading.set(false);
  // Troca de identidade/tenant precisa reiniciar o contexto inteiro do SPA.
  // Uma navegação Angular simples pode manter services e requisições do tenant anterior vivos.
  const target = new URL(platform ? 'saas' : 'pdv', document.baseURI).toString();
  window.location.replace(target);
 }
}
