import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

const LEGACY_KEY='caixa_facil_pdv_terminal_key';
const PREFIX='caixa_facil_pdv_terminal_key_';

@Injectable({providedIn:'root'})
export class PdvTerminalService{
 constructor(private auth:AuthService){}

 key(){
  const tenant=(this.auth.tenantSlug()||'sem-tenant').trim().toLowerCase();
  const storageKey=`${PREFIX}${tenant}`;
  let value=localStorage.getItem(storageKey);

  if(!value){
   // Migra a chave antiga para nao consumir uma nova licenca de PDV ao atualizar.
   value=localStorage.getItem(LEGACY_KEY);
   if(!value){
    value=globalThis.crypto?.randomUUID?.()||`pdv-${Date.now()}-${Math.random().toString(36).slice(2)}`;
   }
   localStorage.setItem(storageKey,value);
  }
  return value;
 }

 label(){
  const platform=(navigator.platform||'Computador').replace(/Win32/i,'Windows');
  return `PDV ${platform}`;
 }
}
