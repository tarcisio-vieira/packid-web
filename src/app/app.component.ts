import { Component,OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/navbar.component';
import { StoreSettingsService } from './core/store-settings.service';
import { AuthService } from './core/auth.service';
@Component({selector:'app-root',standalone:true,imports:[RouterOutlet,NavbarComponent],template:'<app-navbar/><router-outlet/>'})
export class AppComponent implements OnInit{constructor(private storeSettings:StoreSettingsService,private auth:AuthService){}ngOnInit(){if(this.auth.logged()){this.storeSettings.applySession(this.auth.store(),this.auth.storeTheme());this.storeSettings.loadCurrent().subscribe({error:()=>{}});return;}this.storeSettings.applyNeutral();}}
