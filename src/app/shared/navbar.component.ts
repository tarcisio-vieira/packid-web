import { Component } from '@angular/core';
import { RouterLink,RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { StoreSettingsService } from '../core/store-settings.service';

@Component({selector:'app-navbar',standalone:true,imports:[RouterLink,RouterLinkActive],template:`
@if(auth.logged()){
<header class="nav no-print">
  <a class="brand" routerLink="/pdv"><img [src]="settings.logoPath()" alt="VSGI Caixa Fácil"></a><div class="commerce-context"><b>{{auth.store()}}</b><small>{{auth.tenant()}}</small></div>
  <nav>
    <a routerLink="/pdv" routerLinkActive="active">🛒 <span>Caixa</span></a>
    <a routerLink="/vendas" routerLinkActive="active">🧾 <span>Vendas</span></a>
    <a routerLink="/controle-vendas" routerLinkActive="active">💳 <span>Controle</span></a>
    <a routerLink="/produtos" routerLinkActive="active">🏷️ <span>Produtos</span></a>
    @if(auth.isPlatformAdmin()){<a routerLink="/saas" routerLinkActive="active">💼 <span>SaaS</span></a>}
    @if(auth.isAdmin()){<a routerLink="/usuarios" routerLinkActive="active">👥 <span>Usuários</span></a><a routerLink="/configuracoes" routerLinkActive="active">⚙️ <span>Configuração</span></a>}
    <a routerLink="/relatorios" routerLinkActive="active">📊 <span>Relatórios</span></a>
  </nav>
  <div class="account"><span>{{auth.user()}}</span><button title="Sair" (click)="logout()">↪</button></div>
</header>}`,
styles:[`.nav{height:72px;background:#fff;border-bottom:1px solid var(--cf-border);display:flex;align-items:center;padding:0 clamp(14px,4vw,48px);gap:28px;position:sticky;top:0;z-index:20}.brand{display:flex;align-items:center;text-decoration:none;min-width:150px}.brand img{width:145px;display:block}.commerce-context{display:flex;flex-direction:column;min-width:130px;max-width:190px;line-height:1.15}.commerce-context b,.commerce-context small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.commerce-context b{font-size:13px;color:var(--cf-dark)}.commerce-context small{font-size:10px;color:#6d8277;margin-top:3px}.nav nav{display:flex;gap:6px;flex:1}.nav nav a{padding:11px 12px;border-radius:12px;text-decoration:none;color:#466354;font-weight:700;white-space:nowrap}.nav nav a:hover,.nav nav a.active{background:var(--cf-soft);color:var(--cf-primary)}.account{display:flex;align-items:center;gap:10px;color:#557061;font-size:12px}.account>span{max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.account button{border:0;background:var(--cf-soft);color:var(--cf-dark);width:38px;height:38px;border-radius:11px;font-size:19px;cursor:pointer}@media(max-width:1050px){.commerce-context{display:none}}@media(max-width:950px){.brand{min-width:auto}.brand img{width:125px}.nav{gap:10px}.nav nav a{padding:9px}.nav nav a span{display:none}}@media(max-width:700px){.nav{height:62px;padding:0 10px;gap:8px}.brand img{width:105px}.nav nav{justify-content:center}.account>span{display:none}.account button{width:34px;height:34px}}`]
})
export class NavbarComponent{
 constructor(public auth:AuthService,public settings:StoreSettingsService){}
 logout(){
  this.auth.logout();
  this.settings.applyNeutral();
  // Reinicia a aplicação para eliminar qualquer estado/requisição do tenant anterior.
  window.location.replace(new URL('login', document.baseURI).toString());
 }
}
