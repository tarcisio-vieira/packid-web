import { Component,signal } from '@angular/core';
import { CommonModule,CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../core/product.service';
import { Product,ProductRequest } from '../../core/models';
import { firstValueFrom } from 'rxjs';
import { downloadProductsXlsx } from '../../core/xlsx-export';

@Component({
  standalone:true,
  imports:[CommonModule,FormsModule,CurrencyPipe],
  templateUrl:'./products.component.html',
  styleUrl:'./products.component.scss'
})
export class ProductsComponent {
  query='';
  list=signal<Product[]>([]);
  total=signal(0);
  totalPages=signal(0);
  page=0;
  pageSize=10;
  readonly pageSizes=[10,50,100];

  editing=signal<Product|null>(null);
  showForm=signal(false);
  form:ProductRequest={barcode:null,internalCode:null,name:'',unit:'UN',price:0,active:true};
  error=signal('');
  exporting=signal(false);

  constructor(private service:ProductService){this.load()}

  load(){
    this.service.page(this.query,this.page,this.pageSize).subscribe({
      next:r=>{
        this.list.set(r.items);
        this.total.set(r.total);
        this.totalPages.set(r.totalPages);
        this.page=r.page;
      },
      error:e=>this.error.set(e.error?.message||'Erro ao carregar produtos')
    });
  }

  searchChanged(){
    this.page=0;
    this.load();
  }

  pageSizeChanged(){
    this.page=0;
    this.load();
  }

  previousPage(){
    if(this.page<=0)return;
    this.page--;
    this.load();
  }

  nextPage(){
    if(this.page+1>=this.totalPages())return;
    this.page++;
    this.load();
  }

  rangeStart(){return this.total()?this.page*this.pageSize+1:0}
  rangeEnd(){return Math.min((this.page+1)*this.pageSize,this.total())}

  async exportExcel(){
    if(this.exporting())return;
    this.exporting.set(true);
    this.error.set('');
    try{
      const first=await firstValueFrom(this.service.page('',0,100));
      const products=[...first.items];
      for(let currentPage=1;currentPage<first.totalPages;currentPage++){
        const result=await firstValueFrom(this.service.page('',currentPage,100));
        products.push(...result.items);
      }
      downloadProductsXlsx(products,'produtos.xlsx');
    }catch(e:any){
      this.error.set(e?.error?.message||'Erro ao gerar Excel de produtos');
    }finally{
      this.exporting.set(false);
    }
  }

  newProduct(){
    this.editing.set(null);
    this.form={barcode:null,internalCode:null,name:'',unit:'UN',price:0,active:true};
    this.showForm.set(true);
  }

  edit(p:Product){
    this.editing.set(p);
    this.form={barcode:p.barcode,internalCode:p.internalCode,name:p.name,unit:p.unit,price:p.price,active:p.active};
    this.showForm.set(true);
  }

  save(){
    this.error.set('');
    const op=this.editing()?this.service.update(this.editing()!.id,this.form):this.service.create(this.form);
    op.subscribe({
      next:()=>{this.showForm.set(false);this.load()},
      error:e=>this.error.set(e.error?.message||'Erro ao salvar')
    });
  }
}
