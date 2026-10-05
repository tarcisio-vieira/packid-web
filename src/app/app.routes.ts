import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/auth.guard';
export const routes:Routes=[
 {path:'',redirectTo:'pdv',pathMatch:'full'},
 {path:'login',loadComponent:()=>import('./pages/login/login.component').then(m=>m.LoginComponent)},
 {path:'cupom/:token',loadComponent:()=>import('./pages/public-receipt/public-receipt.component').then(m=>m.PublicReceiptComponent)},
 {path:'pdv',canActivate:[authGuard],loadComponent:()=>import('./pages/pdv/pdv.component').then(m=>m.PdvComponent)},
 {path:'vendas',canActivate:[authGuard],loadComponent:()=>import('./pages/sales/sales.component').then(m=>m.SalesComponent)},
 {path:'controle-vendas',canActivate:[authGuard],loadComponent:()=>import('./pages/sale-control/sale-control.component').then(m=>m.SaleControlComponent)},
 {path:'produtos',canActivate:[authGuard],loadComponent:()=>import('./pages/products/products.component').then(m=>m.ProductsComponent)},
 {path:'usuarios',canActivate:[authGuard,adminGuard],loadComponent:()=>import('./pages/users/users.component').then(m=>m.UsersComponent)},
 {path:'configuracoes',canActivate:[authGuard,adminGuard],loadComponent:()=>import('./pages/settings/settings.component').then(m=>m.SettingsComponent)},
 {path:'saas',canActivate:[authGuard],loadComponent:()=>import('./pages/platform-tenants/platform-tenants.component').then(m=>m.PlatformTenantsComponent)},
 {path:'clientes',redirectTo:'saas'},
 {path:'relatorios',canActivate:[authGuard],loadComponent:()=>import('./pages/reports/reports.component').then(m=>m.ReportsComponent)},
 {path:'**',redirectTo:'pdv'}
];
