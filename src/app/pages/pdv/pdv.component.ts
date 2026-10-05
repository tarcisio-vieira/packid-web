import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  QueryList,
  ViewChild,
  effect,
  ViewChildren,
  signal
} from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../core/product.service';
import { QuickProductService } from '../../core/quick-product.service';
import { SaleService } from '../../core/sale.service';
import { SaleControlService } from '../../core/sale-control.service';
import { StoreSettingsService } from '../../core/store-settings.service';
import { AuthService } from '../../core/auth.service';
import { SaasService } from '../../core/saas.service';
import { PdvTerminalService } from '../../core/pdv-terminal.service';
import {
  BarcodeLookup,
  FeeType,
  PaymentMethod,
  PaymentTypeConfig,
  ServiceTypeConfig,
  Product,
  ProductRequest,
  ProductUnit,
  QuickProductShortcut,
  Sale,
  SaleControlCustomer
} from '../../core/models';

interface PaymentEntry {
  paymentMethod: PaymentMethod;
  paymentTypeId: number | null;
  amount: number | null;
  feeType: FeeType;
  fee: number;
  amountReceived: number | null;
}


interface ServiceEntry {
  serviceTypeId: number;
  serviceName: string;
  reference: string;
  baseAmount: number;
  serviceFee: number;
  paymentTypeId: number;
  paymentTypeName: string;
  paymentExtra: number;
  totalCharged: number;
}

interface CartLine {
  product: Product;
  quantity: number;
  unitPrice: number;
  /** Preço alterado no PDV e ainda diferente do cadastro. */
  priceDirty: boolean;
  /** Quando true, o preço vale somente para esta venda e não altera o produto. */
  saleOnlyPrice: boolean;
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DecimalPipe, RouterLink],
  templateUrl: './pdv.component.html',
  styleUrl: './pdv.component.scss'
})
export class PdvComponent implements AfterViewInit {
  @ViewChild('scanner') scanner?: ElementRef<HTMLInputElement>;
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('newNameInput') newNameInput?: ElementRef<HTMLInputElement>;
  @ViewChild('newPriceInput') newPriceInput?: ElementRef<HTMLInputElement>;
  @ViewChild('newQtyInput') newQtyInput?: ElementRef<HTMLInputElement>;
  @ViewChild('receivedInput') receivedInput?: ElementRef<HTMLInputElement>;
  @ViewChildren('qtyInput') qtyInputs?: QueryList<ElementRef<HTMLInputElement>>;
  @ViewChildren('priceInput') priceInputs?: QueryList<ElementRef<HTMLInputElement>>;

  barcode = '';
  search = '';
  results = signal<Product[]>([]);
  cart = signal<CartLine[]>([]);
  serviceEntries = signal<ServiceEntry[]>([]);
  serviceDialogOpen = signal(false);
  serviceDraftTypeId: number | null = null;
  serviceDraftReference = "";
  serviceDraftAmount: number | null = null;
  serviceDraftPaymentTypeId: number | null = null;

  pending = signal<BarcodeLookup | null>(null);
  newName = '';
  newPrice: number | null = null;
  newPriceText = '';
  newUnit: ProductUnit = 'UN';
  newQty = 1;

  quickProducts = signal<QuickProductShortcut[]>([]);
  quickConfigOpen = signal(false);
  configSlot = 1;
  configSearch = '';
  configResults = signal<Product[]>([]);
  configProduct: Product | null = null;
  configImageBase64: string | null = null;
  configImageContentType: string | null = null;
  quickSaving = signal(false);

  paymentEntries: PaymentEntry[] = [{ paymentMethod: 'OUTRO', paymentTypeId: null, amount: null, feeType: 'PERCENT', fee: 0, amountReceived: null }];
  message = signal('');
  error = signal('');
  saving = signal(false);
  completed = signal<Sale | null>(null);
  receiptMessage = '';
  printReceiptQrCode = false;
  controlCustomerSearch = '';
  controlCustomers = signal<SaleControlCustomer[]>([]);
  selectedControlCustomer: SaleControlCustomer | null = null;
  controlCustomerOpen = signal(false);
  terminalBlocked = signal(false);
  terminalMessage = signal('');

  // Quando o produto é acionado por Alt+1...Alt+9, aguardamos o usuário
  // soltar a tecla Alt antes de aplicar a regra de foco. Índice >= 0 envia
  // para Quantidade; -1 devolve para o leitor de código de barras.
  private pendingQuickQuantityFocus: number | null = null;
  private activeQuickShortcut: number | null = null;

  // No Windows, Alt + teclado NUMÉRICO pode gerar caracteres especiais ao
  // soltar Alt. A proteção abaixo é usada somente para Numpad1...Numpad9.
  // Alt+1...Alt+9 da fileira superior não bloqueia o campo do leitor.
  private suppressScannerInputUntil = 0;
  private scannerValueBeforeQuick = '';
  private defaultQrInitialized = false;
  private defaultPaymentInitialized = false;
  private receiptReturnTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private products: ProductService,
    private quick: QuickProductService,
    private sales: SaleService,
    private saleControl: SaleControlService,
    public storeSettings: StoreSettingsService,
    public auth: AuthService,
    private saas: SaasService,
    private terminal: PdvTerminalService
  ) {
    effect(() => {
      const currentSettings = this.storeSettings.settings();
      if (!this.defaultQrInitialized && currentSettings.id > 0) {
        this.printReceiptQrCode = currentSettings.receiptDefaultPrintQrCode;
        this.defaultQrInitialized = true;
      }
      if (currentSettings.id > 0) {
        if (!this.defaultPaymentInitialized && this.paymentEntries.length === 1 && !this.paymentEntries[0].amount) {
          const type = this.defaultPdvPaymentType();
          this.paymentEntries = [{ paymentMethod: this.legacyMethod(type), paymentTypeId: type?.id ?? null, amount: null, feeType: type?.defaultFeeType ?? 'PERCENT', fee: 0, amountReceived: null }];
          this.defaultPaymentInitialized = true;
        }
        this.paymentEntries.forEach(payment => this.recalculatePaymentFee(payment));
      }
    });

    // Mantém o fechamento financeiro sincronizado com o carrinho em tempo real.
    // Com um pagamento, ele acompanha 100% do total. Em pagamento combinado,
    // a última linha absorve automaticamente qualquer diferença do carrinho.
    effect(() => {
      this.cart();
      this.serviceEntries();
      this.rebalancePayments();
    });
    this.loadQuickProducts();
    this.loadControlCustomers();
  }

  ngAfterViewInit() {
    this.registerPdv();
  }

  private registerPdv() {
    this.saas.registerTerminal(this.terminal.key(), this.terminal.label()).subscribe({
      next: () => { this.terminalBlocked.set(false); this.terminalMessage.set(''); this.focusScanner(true); },
      error: e => { this.terminalBlocked.set(true); this.terminalMessage.set(e.error?.message || 'Este computador não pôde ser registrado como PDV do plano.'); }
    });
  }

  @HostListener('document:keydown', ['$event'])
  onGlobalKeydown(event: KeyboardEvent) {
    // Após a impressão/comprovante, Esc inicia imediatamente a próxima venda.
    if (this.completed()) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        this.newSale();
      }
      return;
    }

    if (this.terminalBlocked()) {
      if (event.key === 'F8' || event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.altKey) event.preventDefault();
      return;
    }

    if (this.pending() || this.quickConfigOpen()) return;

    // F8 é o atalho global para finalizar a venda, independentemente de qual
    // campo do PDV esteja com foco.
    if (event.key === 'F8') {
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat || this.saving()) return;
      this.finishByShortcut();
      return;
    }

    // Enter no campo de preço encerra a edição do item e devolve o foco
    // imediatamente ao leitor de código de barras. O focusout da linha
    // continua responsável por persistir eventual alteração de preço.
    const target = event.target as HTMLElement | null;
    if (
      event.key === 'Enter' &&
      target instanceof HTMLInputElement &&
      target.closest('.price-cell')
    ) {
      event.preventDefault();
      event.stopPropagation();
      this.focusScanner(true);
      return;
    }

    // Alt+N muda o pagamento para Dinheiro e posiciona o cursor no valor
    // recebido. A forma padrão do PDV é definida nas configurações deste comércio.
    if (
      event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      (event.code === 'KeyN' || event.key.toLowerCase() === 'n')
    ) {
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat) return;
      this.paymentEntries = [{ paymentMethod: 'DINHEIRO', paymentTypeId: this.activePaymentTypes().find(p => p.legacyMethod === 'DINHEIRO')?.id ?? null, amount: this.total(), feeType: this.defaultFeeType('DINHEIRO'), fee: 0, amountReceived: null }];
      this.recalculatePaymentFee(this.paymentEntries[0]);
      this.message.set('Pagamento: Dinheiro (Alt+N)');
      this.focusReceived();
      return;
    }

    if (event.altKey && !event.ctrlKey && !event.metaKey) {
      const slot = this.quickSlotFromEvent(event);
      if (slot !== null) {
        event.preventDefault();
        event.stopPropagation();

        // Evita múltiplas inclusões se Alt+n ficar pressionado por alguns ms.
        if (event.repeat || this.activeQuickShortcut === slot) return;

        this.scannerValueBeforeQuick = this.barcode;
        this.activeQuickShortcut = slot;

        // Somente Alt + Numpad pode produzir um caractere ao soltar Alt no
        // Windows. Para Alt+1...Alt+9 da fileira superior não bloqueamos
        // beforeinput, portanto o leitor volta a aceitar digitação imediatamente.
        const numpadShortcut = /^Numpad[1-9]$/.test(event.code || '');
        this.suppressScannerInputUntil = numpadShortcut ? Date.now() + 350 : 0;

        // Se o atalho for acionado enquanto o campo Quantidade do item
        // anterior estiver selecionado, preserve o valor atual antes de
        // reordenar o carrinho. Isso evita o input visualmente vazio quando
        // um novo produto rápido (Alt+1...Alt+9) é incluído em seguida.
        this.preserveFocusedQuantity(event.target);

        const shortcut = this.quickProducts().find(item => item.slot === slot);
        if (shortcut?.product) {
          // Aplica exatamente a mesma regra da leitura por código de barras:
          // código de barras = código interno -> Quantidade; caso contrário -> leitor.
          const index = this.addProduct(shortcut.product);
          this.pendingQuickQuantityFocus = this.requiresManualQuantity(shortcut.product) ? index : -1;
          this.message.set(`Alt+${slot}: ${shortcut.product.name}`);

          // Na fileira superior o preventDefault() já impede que o número do
          // atalho seja digitado no campo. Podemos aplicar o foco imediatamente.
          // No Numpad aguardamos o Alt ser solto para evitar Alt codes do Windows.
          if (!numpadShortcut) {
            this.applyPendingQuickFocus();
          } else {
            // Fallback: se o navegador não entregar o keyup do Alt, nunca
            // deixamos o scanner permanentemente bloqueado.
            setTimeout(() => {
              if (this.pendingQuickQuantityFocus !== null) {
                this.applyPendingQuickFocus();
              }
            }, 400);
          }
        } else {
          this.activeQuickShortcut = null;
          this.suppressScannerInputUntil = 0;
        }
        return;
      }
    }

    if (event.altKey || event.ctrlKey || event.metaKey) return;

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.focusScanner(true);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.focusSearch(true);
    }
  }

  @HostListener('document:keyup', ['$event'])
  onGlobalKeyup(event: KeyboardEvent) {
    const releasedSlot = this.quickSlotFromEvent(event);
    if (releasedSlot !== null && this.activeQuickShortcut === releasedSlot) {
      this.activeQuickShortcut = null;
    }

    if (event.key === 'Alt' && this.pendingQuickQuantityFocus !== null) {
      event.preventDefault();
      event.stopPropagation();
      this.applyPendingQuickFocus();
    }
  }

  private quickSlotFromEvent(event: KeyboardEvent): number | null {
    const codeMatch = /^(?:Digit|Numpad)([1-9])$/.exec(event.code || '');
    if (codeMatch) return Number(codeMatch[1]);

    const key = Number(event.key);
    return key >= 1 && key <= 9 ? key : null;
  }

  private applyPendingQuickFocus() {
    if (this.pendingQuickQuantityFocus === null) return;

    const index = this.pendingQuickQuantityFocus;
    this.pendingQuickQuantityFocus = null;
    this.activeQuickShortcut = null;
    this.suppressScannerInputUntil = 0;

    // Remove somente qualquer resíduo que o próprio atalho possa ter tentado
    // inserir. Depois disso o campo fica totalmente liberado para digitação.
    this.barcode = this.scannerValueBeforeQuick;
    if (this.scanner?.nativeElement) {
      this.scanner.nativeElement.value = this.scannerValueBeforeQuick;
    }

    if (index >= 0) {
      this.focusQuantity(index);
    } else {
      this.focusScanner(true);
    }
  }

  guardScannerInput(event: Event) {
    // Nunca use pendingQuickQuantityFocus/activeQuickShortcut como trava do
    // input: se um keyup se perder, isso deixaria o leitor bloqueado sem fim.
    // A única proteção necessária é a janela curta de Alt+Numpad.
    if (Date.now() < this.suppressScannerInputUntil) {
      event.preventDefault();
      setTimeout(() => {
        this.barcode = this.scannerValueBeforeQuick;
        if (this.scanner?.nativeElement) {
          this.scanner.nativeElement.value = this.scannerValueBeforeQuick;
        }
      }, 0);
    }
  }

  scannerTab(event: Event) {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.shiftKey) return;
    event.preventDefault();

    if (this.cart().length) {
      this.focusQuantity(0);
    } else {
      this.focusSearch(true);
    }
  }

  scan() {
    const code = this.barcode.trim();
    this.barcode = '';
    if (!code) return;

    this.error.set('');
    this.products.lookup(code).subscribe({
      next: response => {
        if (response.product) {
          const index = this.addProduct(response.product);

          if (this.requiresManualQuantity(response.product)) {
            this.focusQuantity(index);
            this.message.set(`${response.product.name}: informe a quantidade e pressione Enter para voltar ao leitor`);
          } else {
            this.message.set(`${response.product.name} adicionado`);
            this.focusScanner(true);
          }
          return;
        }

        this.pending.set(response);
        this.newName = response.suggestedName || '';
        this.newPrice = null;
        this.newPriceText = '';
        this.newUnit = 'UN';
        this.newQty = 1;

        setTimeout(() => {
          if (response.suggestedName?.trim()) {
            this.focusNewPrice();
          } else {
            this.focusNewName();
          }
        }, 50);
      },
      error: e => {
        this.error.set(e.error?.message || 'Falha na leitura');
        this.focusScanner(true);
      }
    });
  }

  find() {
    const q = this.search.trim();
    if (q.length < 2) {
      this.results.set([]);
      return;
    }
    this.products.search(q).subscribe(r => this.results.set(r));
  }

  selectSearchProduct(product: Product) {
    const index = this.addProduct(product);
    if (this.requiresManualQuantity(product)) {
      this.focusQuantity(index);
    } else {
      this.focusScanner(true);
    }
  }

  private addProduct(product: Product, quantity = 1): number {
    const lines = [...this.cart()];
    const existingIndex = lines.findIndex(line => line.product.id === product.id);

    if (existingIndex >= 0) {
      const current = lines.splice(existingIndex, 1)[0];
      lines.unshift({
        ...current,
        quantity: +(current.quantity + quantity).toFixed(3)
      });
    } else {
      lines.unshift({ product, quantity, unitPrice: product.price, priceDirty: false, saleOnlyPrice: false });
    }

    this.cart.set(lines);
    this.results.set([]);
    this.search = '';
    return 0;
  }

  private addProductAndFocusQuantity(product: Product, quantity = 1) {
    const index = this.addProduct(product, quantity);
    this.focusQuantity(index);
  }

  private addWithFinalQuantity(product: Product, quantity: number) {
    const lines = [...this.cart()];
    const index = lines.findIndex(line => line.product.id === product.id);
    if (index >= 0) {
      const current = lines.splice(index, 1)[0];
      lines.unshift({
        ...current,
        quantity: +(current.quantity + quantity).toFixed(3)
      });
    } else {
      lines.unshift({ product, quantity, unitPrice: product.price, priceDirty: false, saleOnlyPrice: false });
    }
    this.cart.set(lines);
    this.results.set([]);
    this.search = '';
  }

  onPriceInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '');
    if (!digits) {
      this.newPrice = null;
      this.newPriceText = '';
      input.value = '';
      return;
    }
    const value = Number(digits) / 100;
    this.newPrice = value;
    this.newPriceText = value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    input.value = this.newPriceText;
  }

  createAndAdd() {
    const pending = this.pending();
    if (!pending || !this.newName.trim() || !this.newPrice || this.newPrice <= 0 || this.newQty <= 0) return;

    const request: ProductRequest = {
      barcode: pending.barcode,
      internalCode: null,
      name: this.newName.trim(),
      unit: this.newUnit,
      price: this.newPrice,
      active: true
    };

    this.products.create(request).subscribe({
      next: product => {
        this.addWithFinalQuantity(product, Number(this.newQty));
        this.pending.set(null);
        this.message.set('Produto cadastrado e adicionado à venda');
        this.focusScanner(true);
      },
      error: e => this.error.set(e.error?.message || 'Erro ao cadastrar produto')
    });
  }

  cancelPending() {
    this.pending.set(null);
    this.focusScanner(true);
  }

  qty(index: number, value: number | string | null) {
    const currentLine = this.cart()[index];
    if (!currentLine) return;

    // Ao substituir o valor 1 por uma quantidade fracionada (ex.: 0,350),
    // o primeiro caractere digitado é 0. Zero é um estado transitório válido
    // durante a digitação e não deve fazer o campo voltar imediatamente para 1.
    const quantity = this.parseQuantity(value);
    if (quantity === null || quantity <= 0) return;

    const normalized = +quantity.toFixed(3);
    if (normalized === currentLine.quantity) return;

    const lines = [...this.cart()];
    lines[index] = { ...currentLine, quantity: normalized };
    this.cart.set(lines);
  }

  quantityBlur(index: number, event: Event) {
    this.commitQuantity(index, event.target as HTMLInputElement);
  }

  private preserveFocusedQuantity(target: EventTarget | null) {
    if (!(target instanceof HTMLInputElement) || !target.classList.contains('quantity-input')) return;

    const inputs = this.qtyInputs?.toArray() || [];
    const index = inputs.findIndex(ref => ref.nativeElement === target);
    if (index < 0) return;

    const line = this.cart()[index];
    if (!line) return;

    const typed = this.parseQuantity(target.value);
    if (typed !== null && typed > 0) {
      const normalized = +typed.toFixed(3);
      if (normalized !== line.quantity) {
        const lines = [...this.cart()];
        lines[index] = { ...line, quantity: normalized };
        this.cart.set(lines);
      }
      return;
    }

    // Se o campo estiver vazio por causa da seleção/atalho, nunca transformamos
    // a quantidade em vazio: mantemos a quantidade válida já existente (1 por
    // padrão em uma nova inclusão).
    target.value = String(line.quantity);
  }

  quantityEnter(index: number, event: Event) {
    event.preventDefault();
    this.commitQuantity(index, event.target as HTMLInputElement);
    this.focusScanner(true);
  }

  private commitQuantity(index: number, input: HTMLInputElement) {
    const line = this.cart()[index];
    if (!line) return;

    const quantity = this.parseQuantity(input.value);
    if (quantity === null || quantity <= 0) {
      // Só restauramos o último valor válido quando o operador termina a
      // edição (Enter/saída do campo), nunca enquanto ele ainda está digitando.
      input.value = String(line.quantity);
      return;
    }

    const normalized = +quantity.toFixed(3);
    if (normalized !== line.quantity) {
      const lines = [...this.cart()];
      lines[index] = { ...line, quantity: normalized };
      this.cart.set(lines);
    }
    input.value = String(normalized);
  }

  private parseQuantity(value: number | string | null | undefined): number | null {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (value === null || value === undefined) return null;

    const text = String(value).trim().replace(',', '.');
    if (!text) return null;

    const quantity = Number(text);
    return Number.isFinite(quantity) ? quantity : null;
  }

  linePrice(index: number, value: number | string | null) {
    const price = Number(value);
    // Zero é aceito temporariamente no carrinho para que o operador possa
    // marcar Desconto. Valor negativo continua inválido.
    if (!Number.isFinite(price) || price < 0) return;

    const lines = [...this.cart()];
    const line = lines[index];
    if (!line) return;

    lines[index] = {
      ...line,
      unitPrice: price,
      priceDirty: Math.abs(price - Number(line.product.price)) > 0.00001
    };
    this.cart.set(lines);
  }

  setSaleOnlyPrice(index: number, saleOnly: boolean) {
    const lines = [...this.cart()];
    if (!lines[index]) return;
    lines[index] = { ...lines[index], saleOnlyPrice: saleOnly };
    this.cart.set(lines);

    if (saleOnly) {
      this.message.set('Preço promocional: válido somente para esta venda');
    }
  }

  lineFocusOut(productId: number, event: FocusEvent) {
    const row = event.currentTarget as HTMLElement | null;
    const next = event.relatedTarget as Node | null;

    // Enquanto o Tab/click estiver dentro do mesmo item, o operador ainda
    // pode marcar "Só nesta venda". Persistimos apenas ao sair da linha.
    if (row && next && row.contains(next)) return;
    this.persistLinePriceByProduct(productId);
  }

  private persistLinePrice(index: number) {
    const line = this.cart()[index];
    if (!line) return;
    this.persistLinePriceByProduct(line.product.id);
  }

  private persistLinePriceByProduct(productId: number) {
    const line = this.cart().find(item => item.product.id === productId);
    if (!line || !line.priceDirty || line.saleOnlyPrice || line.unitPrice <= 0) return;

    const requestedPrice = line.unitPrice;

    this.products.price(productId, requestedPrice).subscribe({
      next: product => {
        this.applyUpdatedProduct(product, requestedPrice);
        this.message.set(`Preço de ${product.name} atualizado no cadastro`);
      },
      error: e => this.error.set(e.error?.message || 'Preço não atualizado no cadastro')
    });
  }

  private applyUpdatedProduct(product: Product, requestedPrice: number) {
    const lines = this.cart().map(line => {
      if (line.product.id !== product.id) return line;
      const stillSamePrice = Math.abs(line.unitPrice - requestedPrice) < 0.00001;
      return {
        ...line,
        product,
        priceDirty: stillSamePrice ? false : Math.abs(line.unitPrice - Number(product.price)) > 0.00001
      };
    });
    this.cart.set(lines);

    // Mantém Alt+1...Alt+9 sincronizado sem exigir recarregar a página.
    this.quickProducts.set(this.quickProducts().map(item =>
      item.product?.id === product.id ? { ...item, product } : item
    ));

    this.results.set(this.results().map(item => item.id === product.id ? product : item));
  }

  remove(index: number) {
    const lines = [...this.cart()];
    lines.splice(index, 1);
    this.cart.set(lines);
    this.focusScanner(true);
  }

  private requiresManualQuantity(product: Product) {
    const barcode = product.barcode?.trim();
    const internalCode = product.internalCode?.trim();
    return !!barcode && !!internalCode && barcode === internalCode;
  }

  blockingZeroPriceLines() {
    return this.cart().filter(line => Number(line.unitPrice) <= 0 && !line.saleOnlyPrice);
  }

  zeroPriceWarning() {
    const lines = this.blockingZeroPriceLines();
    if (!lines.length) return '';

    const names = lines.slice(0, 3).map(line => line.product.name).join(', ');
    const extra = lines.length > 3 ? ` e mais ${lines.length - 3}` : '';
    return `${names}${extra}. Informe um preço maior que zero ou marque Desconto para permitir R$ 0,00 nesta venda.`;
  }

  private validateZeroPrices(): boolean {
    const index = this.cart().findIndex(line => Number(line.unitPrice) <= 0 && !line.saleOnlyPrice);
    if (index < 0) return true;

    this.error.set('');
    this.message.set('');
    this.focusPrice(index);
    return false;
  }

  private focusPrice(index: number) {
    setTimeout(() => {
      const input = this.priceInputs?.get(index)?.nativeElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
  }

  total() {
    const productsTotal = this.cart().reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
    const servicesTotal = this.serviceEntries().reduce((sum, line) => sum + line.totalCharged, 0);
    return this.roundMoney(productsTotal + servicesTotal);
  }

  productsTotal() { return this.roundMoney(this.cart().reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)); }
  servicesTotal() { return this.roundMoney(this.serviceEntries().reduce((sum, line) => sum + line.totalCharged, 0)); }

  activeServiceTypes(): ServiceTypeConfig[] { return (this.storeSettings.settings().serviceTypes || []).filter(s => s.active); }

  openServiceDialog() {
    const service=this.activeServiceTypes()[0];
    if(!service){ this.message.set('Nenhum serviço ativo foi cadastrado em Configurações.'); return; }
    const payment=this.defaultPdvPaymentType();
    this.serviceDraftTypeId=service.id; this.serviceDraftReference=''; this.serviceDraftAmount=null; this.serviceDraftPaymentTypeId=payment?.id ?? null;
    this.serviceDialogOpen.set(true);
  }

  closeServiceDialog(){ this.serviceDialogOpen.set(false); }

  selectedServiceType(): ServiceTypeConfig | null { return this.activeServiceTypes().find(s=>s.id===this.serviceDraftTypeId) || null; }
  selectedServicePaymentType(): PaymentTypeConfig | null { return this.activePaymentTypes().find(p=>p.id===this.serviceDraftPaymentTypeId) || null; }

  serviceDraftFee(){
    const service=this.selectedServiceType(), amount=Number(this.serviceDraftAmount||0); if(!service || amount<=0)return 0;
    const band=(service.feeBands||[]).find(b=>amount>=Number(b.minAmount||0) && (b.maxAmount==null || amount<=Number(b.maxAmount)));
    if(!band)return 0;
    return band.feeType==='PERCENT' ? this.roundMoney(amount*Number(band.feeValue||0)/100) : this.roundMoney(Number(band.feeValue||0));
  }

  serviceDraftPaymentExtra(){
    const service=this.selectedServiceType(), amount=Number(this.serviceDraftAmount||0); if(!service || amount<=0 || !this.serviceDraftPaymentTypeId)return 0;
    const extra=(service.paymentExtras||[]).find(e=>e.paymentTypeId===this.serviceDraftPaymentTypeId); if(!extra)return 0;
    return extra.feeType==='PERCENT' ? this.roundMoney(amount*Number(extra.feeValue||0)/100) : this.roundMoney(Number(extra.feeValue||0));
  }

  serviceDraftTotal(){ return this.roundMoney(Number(this.serviceDraftAmount||0)+this.serviceDraftFee()+this.serviceDraftPaymentExtra()); }

  addServiceToSale(){
    const service=this.selectedServiceType(), payment=this.selectedServicePaymentType(), amount=Number(this.serviceDraftAmount||0);
    if(!service?.id || !payment?.id || amount<=0){ this.error.set('Informe o serviço, o valor da conta e a forma de pagamento.'); return; }
    const entry:ServiceEntry={serviceTypeId:service.id,serviceName:service.name,reference:this.serviceDraftReference.trim(),baseAmount:this.roundMoney(amount),serviceFee:this.serviceDraftFee(),paymentTypeId:payment.id,paymentTypeName:payment.name,paymentExtra:this.serviceDraftPaymentExtra(),totalCharged:this.serviceDraftTotal()};
    this.serviceEntries.set([...this.serviceEntries(),entry]); this.serviceDialogOpen.set(false); this.error.set('');
    this.syncPaymentsFromServicesIfServiceOnly();
  }

  removeService(index:number){ const lines=[...this.serviceEntries()]; lines.splice(index,1); this.serviceEntries.set(lines); this.syncPaymentsFromServicesIfServiceOnly(); }

  private syncPaymentsFromServicesIfServiceOnly(){
    if(this.cart().length || !this.serviceEntries().length){ this.rebalancePayments(); return; }
    const grouped=new Map<number,number>();
    for(const item of this.serviceEntries()) grouped.set(item.paymentTypeId,this.roundMoney((grouped.get(item.paymentTypeId)||0)+item.totalCharged));
    this.paymentEntries=[...grouped.entries()].map(([paymentTypeId,amount])=>{
      const type=this.activePaymentTypes().find(p=>p.id===paymentTypeId) || this.defaultPdvPaymentType();
      const payment:PaymentEntry={paymentMethod:this.legacyMethod(type),paymentTypeId:type?.id??null,amount,feeType:type?.defaultFeeType??'PERCENT',fee:0,amountReceived:type?.cashPayment?amount:null};
      this.recalculatePaymentFee(payment); return payment;
    });
  }

  paymentBaseTotal() {
    return this.paymentEntries.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  }

  paymentFeeTotal() {
    return this.paymentEntries.reduce((sum, payment) => sum + Number(payment.fee || 0), 0);
  }

  grandTotal() {
    return this.total() + this.paymentFeeTotal();
  }

  paymentRemaining() {
    return Math.max(0, this.roundMoney(this.total() - this.paymentBaseTotal()));
  }

  paymentDistributionInvalid() {
    return Math.abs(this.paymentBaseTotal() - this.total()) > 0.005;
  }

  activePaymentTypes(): PaymentTypeConfig[] {
    return (this.storeSettings.settings().paymentTypes || []).filter(type => type.active);
  }

  private paymentType(payment: PaymentEntry): PaymentTypeConfig | null {
    return (this.storeSettings.settings().paymentTypes || []).find(type => type.id === payment.paymentTypeId) || null;
  }

  private defaultPdvPaymentType(): PaymentTypeConfig | null {
    const active = this.activePaymentTypes();
    return active.find(type => type.defaultPdv) || active[0] || null;
  }

  private legacyMethod(type: PaymentTypeConfig | null): PaymentMethod {
    return type?.legacyMethod || 'OUTRO';
  }

  isCashPayment(payment: PaymentEntry): boolean {
    return !!this.paymentType(payment)?.cashPayment;
  }

  paymentChange(payment: PaymentEntry) {
    return this.isCashPayment(payment) && payment.amountReceived != null && payment.amount != null
      ? Math.max(0, payment.amountReceived - payment.amount)
      : 0;
  }

  addPaymentEntry() {
    const type = this.defaultPdvPaymentType();
    const payment: PaymentEntry = {
      paymentMethod: this.legacyMethod(type), paymentTypeId: type?.id ?? null, amount: 0,
      feeType: type?.defaultFeeType ?? 'PERCENT', fee: 0, amountReceived: null
    };
    this.paymentEntries = [...this.paymentEntries, payment];
    this.rebalancePayments();
  }

  removePaymentEntry(index: number) {
    if (this.paymentEntries.length === 1) return;
    this.paymentEntries = this.paymentEntries.filter((_, i) => i !== index);
    this.rebalancePayments();
  }

  paymentMethodChanged(payment: PaymentEntry) {
    const type = this.paymentType(payment);
    payment.paymentMethod = this.legacyMethod(type);
    if (!type?.cashPayment) payment.amountReceived = null;
    payment.feeType = type?.defaultFeeType ?? 'PERCENT';
    this.recalculatePaymentFee(payment);
  }

  paymentFeeTypeChanged(payment: PaymentEntry) { this.recalculatePaymentFee(payment); }

  paymentAmountChanged(index: number) { this.rebalancePayments(index); }

  paymentFeePercent(payment: PaymentEntry): number { return Number(this.paymentType(payment)?.feePercent || 0); }

  paymentFeeFixed(payment: PaymentEntry): number { return Number(this.paymentType(payment)?.feeFixed || 0); }

  defaultPdvPaymentMethod(): PaymentMethod { return this.legacyMethod(this.defaultPdvPaymentType()); }

  defaultFeeType(method: PaymentMethod): FeeType {
    const type = this.activePaymentTypes().find(p => p.legacyMethod === method) || this.defaultPdvPaymentType();
    return type?.defaultFeeType ?? 'PERCENT';
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  /**
   * Fecha automaticamente a composição dos pagamentos no valor dos produtos.
   * - 1 forma: recebe sempre 100% da venda.
   * - várias formas: a última é o saldo automático.
   * - se o operador alterar a última, a imediatamente anterior passa a absorver
   *   a diferença naquele momento. O valor digitado pelo operador é preservado
   *   sempre que couber no total da venda.
   */
  private rebalancePayments(changedIndex: number | null = null) {
    if (!this.paymentEntries.length) return;

    const total = this.roundMoney(this.total());

    if (this.paymentEntries.length === 1) {
      const payment = this.paymentEntries[0];
      payment.amount = total;
      this.recalculatePaymentFee(payment);
      return;
    }

    const lastIndex = this.paymentEntries.length - 1;

    // Normaliza tudo para valores monetários válidos antes de distribuir.
    this.paymentEntries.forEach(payment => {
      const amount = Number(payment.amount ?? 0);
      payment.amount = Number.isFinite(amount) && amount > 0 ? this.roundMoney(amount) : 0;
    });

    if (changedIndex !== null && changedIndex >= 0 && changedIndex < this.paymentEntries.length) {
      const changed = this.paymentEntries[changedIndex];
      changed.amount = Math.min(total, Math.max(0, this.roundMoney(Number(changed.amount || 0))));

      // Normalmente a última linha fecha o saldo. Se ela própria foi editada,
      // usamos a linha anterior para que a digitação do operador seja mantida.
      const balanceIndex = changedIndex === lastIndex ? Math.max(0, lastIndex - 1) : lastIndex;

      // Mantém a parcela digitada como prioritária. Se as demais parcelas já
      // ultrapassarem o total, reduzimos automaticamente as outras da direita
      // para a esquerda até existir espaço para fechar a venda.
      let fixedSum = this.paymentEntries.reduce((sum, payment, index) =>
        index === balanceIndex ? sum : sum + Number(payment.amount || 0), 0);

      if (fixedSum > total) {
        let overflow = this.roundMoney(fixedSum - total);
        for (let i = this.paymentEntries.length - 1; i >= 0 && overflow > 0; i--) {
          if (i === changedIndex || i === balanceIndex) continue;
          const current = Number(this.paymentEntries[i].amount || 0);
          const reduction = Math.min(current, overflow);
          this.paymentEntries[i].amount = this.roundMoney(current - reduction);
          overflow = this.roundMoney(overflow - reduction);
        }
        fixedSum = this.paymentEntries.reduce((sum, payment, index) =>
          index === balanceIndex ? sum : sum + Number(payment.amount || 0), 0);
      }

      this.paymentEntries[balanceIndex].amount = this.roundMoney(Math.max(0, total - fixedSum));
    } else {
      // Alteração do carrinho: preserve as parcelas anteriores e faça a última
      // acompanhar o novo saldo. Se o novo total for menor que a soma delas,
      // reduza as anteriores começando pela mais recente.
      let previousSum = this.paymentEntries
        .slice(0, lastIndex)
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

      if (previousSum > total) {
        let overflow = this.roundMoney(previousSum - total);
        for (let i = lastIndex - 1; i >= 0 && overflow > 0; i--) {
          const current = Number(this.paymentEntries[i].amount || 0);
          const reduction = Math.min(current, overflow);
          this.paymentEntries[i].amount = this.roundMoney(current - reduction);
          overflow = this.roundMoney(overflow - reduction);
        }
        previousSum = this.paymentEntries
          .slice(0, lastIndex)
          .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      }

      this.paymentEntries[lastIndex].amount = this.roundMoney(Math.max(0, total - previousSum));
    }

    this.paymentEntries.forEach(payment => this.recalculatePaymentFee(payment));
  }

  private recalculatePaymentFee(payment: PaymentEntry) {
    const amount = Number(payment.amount || 0);
    if (amount <= 0) {
      payment.fee = 0;
      return;
    }
    const value = payment.feeType === 'FIXED'
      ? this.paymentFeeFixed(payment)
      : amount * this.paymentFeePercent(payment) / 100;
    payment.fee = this.roundMoney(value);
  }

  paymentsValid() {
    const epsilon = 0.005;
    if (!this.paymentEntries.length) return false;
    if (this.paymentEntries.some(p => !p.amount || p.amount <= 0 || p.fee < 0)) return false;
    if (Math.abs(this.paymentBaseTotal() - this.total()) > epsilon) return false;
    return this.paymentEntries.every(p => !this.isCashPayment(p) || (p.amountReceived != null && p.amountReceived >= Number(p.amount || 0)));
  }

  private ensureSinglePaymentAmount() {
    this.rebalancePayments();
  }

  finishByShortcut() {
    if (!this.cart().length && !this.serviceEntries().length) {
      this.message.set('Inclua pelo menos um produto ou serviço antes de finalizar a venda');
      this.focusScanner(true);
      return;
    }

    if (!this.validateZeroPrices()) return;
    this.ensureSinglePaymentAmount();

    if (!this.paymentsValid()) {
      this.message.set('Confira os pagamentos: a soma dos valores deve ser igual ao total da venda e o dinheiro recebido deve cobrir sua parcela.');
      return;
    }

    this.finish();
  }

  finish() {
    if ((!this.cart().length && !this.serviceEntries().length) || this.saving()) return;

    if (!this.validateZeroPrices()) return;
    this.ensureSinglePaymentAmount();

    if (!this.paymentsValid()) {
      this.message.set('Confira os pagamentos antes de finalizar.');
      return;
    }

    // Garante que qualquer preço normal alterado ainda na linha seja enviado
    // ao cadastro antes de encerrar a venda. Preços marcados como promocionais
    // são deliberadamente ignorados.
    this.cart().forEach((line, index) => {
      if (line.priceDirty && !line.saleOnlyPrice) this.persistLinePrice(index);
    });

    this.saving.set(true);
    this.error.set('');
    const singlePayment = this.paymentEntries.length === 1 ? this.paymentEntries[0] : null;
    this.sales.create({
      items: this.cart().map(line => ({
        productId: line.product.id,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discount: line.saleOnlyPrice
      })),
      services: this.serviceEntries().map(line => ({serviceTypeId:line.serviceTypeId,reference:line.reference||null,baseAmount:line.baseAmount,paymentTypeId:line.paymentTypeId})),
      paymentMethod: singlePayment?.paymentMethod ?? 'OUTRO',
      amountReceived: singlePayment && this.isCashPayment(singlePayment) ? singlePayment.amountReceived : null,
      payments: this.paymentEntries.map(payment => ({
        paymentMethod: payment.paymentMethod,
        paymentTypeId: payment.paymentTypeId,
        amount: Number(payment.amount),
        feeType: payment.feeType,
        fee: Number(payment.fee || 0),
        amountReceived: this.isCashPayment(payment) ? payment.amountReceived : null
      })),
      receiptMessage: this.receiptMessage.trim() || null,
      printReceiptQrCode: this.printReceiptQrCode,
      saleControlCustomerId: this.selectedControlCustomer?.id ?? null
    }).subscribe({
      next: sale => {
        this.completed.set(sale);
        this.cart.set([]);
        this.serviceEntries.set([]);
        this.saving.set(false);
        this.scheduleReturnToPdv();

        // Aguarda o Angular renderizar o comprovante e abre imediatamente a
        // caixa de impressão.
        this.printAfterQrReady(sale);
      },
      error: e => {
        this.error.set(e.error?.message || 'Não foi possível finalizar');
        this.saving.set(false);
      }
    });
  }


  receiptQrUrl(token: string | null) {
    return token ? this.sales.publicReceiptQrUrl(token) : '';
  }

  publicReceiptUrl(token: string | null) {
    return token ? this.sales.publicReceiptUrl(token) : '';
  }

  private printAfterQrReady(sale: Sale) {
    if (!sale.printReceiptQrCode || !sale.publicReceiptToken) {
      setTimeout(() => window.print(), 120);
      return;
    }

    const image = new Image();
    let printed = false;
    const printOnce = () => {
      if (printed) return;
      printed = true;
      setTimeout(() => window.print(), 80);
    };
    image.onload = printOnce;
    image.onerror = printOnce;
    image.src = this.sales.publicReceiptQrUrl(sale.publicReceiptToken);
    setTimeout(printOnce, 1800);
  }

  private scheduleReturnToPdv() {
    if (this.receiptReturnTimer) clearTimeout(this.receiptReturnTimer);
    this.receiptReturnTimer = setTimeout(() => {
      if (this.completed()) this.newSale();
    }, 60000);
  }

  newSale() {
    if (this.receiptReturnTimer) { clearTimeout(this.receiptReturnTimer); this.receiptReturnTimer = null; }
    this.completed.set(null);
    this.serviceEntries.set([]);
    const defaultType = this.defaultPdvPaymentType();
    this.paymentEntries = [{ paymentMethod: this.legacyMethod(defaultType), paymentTypeId: defaultType?.id ?? null, amount: null, feeType: defaultType?.defaultFeeType ?? 'PERCENT', fee: 0, amountReceived: null }];
    this.receiptMessage = '';
    this.printReceiptQrCode = this.storeSettings.settings().receiptDefaultPrintQrCode;
    this.controlCustomerSearch = '';
    this.selectedControlCustomer = null;
    this.controlCustomerOpen.set(false);
    this.focusScanner(true);
  }

  print() {
    window.print();
  }

  downloadReceipt() {
    const sale = this.completed();
    if (!sale) return;
    fetch(this.sales.receiptUrl(sale.id), {
      headers: { Authorization: `Bearer ${localStorage.getItem('caixa_facil_token') || ''}` }
    }).then(r => r.blob()).then(blob => {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Venda-${sale.id}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    });
  }


  loadControlCustomers(query = '') {
    this.saleControl.customers(query).subscribe({
      next: items => this.controlCustomers.set(items),
      error: () => this.controlCustomers.set([])
    });
  }

  searchControlCustomers() {
    if (this.selectedControlCustomer && this.controlCustomerSearch !== this.selectedControlCustomer.name) {
      this.selectedControlCustomer = null;
    }
    this.controlCustomerOpen.set(true);
    this.loadControlCustomers(this.controlCustomerSearch.trim());
  }

  openControlCustomers() {
    this.controlCustomerOpen.set(true);
    this.loadControlCustomers(this.controlCustomerSearch.trim());
  }

  closeControlCustomerLater() {
    setTimeout(() => this.controlCustomerOpen.set(false), 180);
  }

  chooseControlCustomer(customer: SaleControlCustomer) {
    this.selectedControlCustomer = customer;
    this.controlCustomerSearch = customer.name;
    this.controlCustomerOpen.set(false);
  }

  clearControlCustomer() {
    this.selectedControlCustomer = null;
    this.controlCustomerSearch = '';
    this.controlCustomerOpen.set(false);
  }


  loadQuickProducts() {
    this.quick.list().subscribe({
      next: items => this.quickProducts.set(items),
      error: () => this.error.set('Não foi possível carregar os 9 produtos rápidos')
    });
  }

  quickImage(item: QuickProductShortcut) {
    if (!item.imageBase64) return null;
    return `data:${item.imageContentType || 'image/jpeg'};base64,${item.imageBase64}`;
  }

  activateQuick(item: QuickProductShortcut) {
    if (!item.product) {
      if (this.auth.isManager()) this.openQuickConfig(item.slot);
      return;
    }

    this.preserveFocusedQuantity(document.activeElement);

    const index = this.addProduct(item.product);
    if (this.requiresManualQuantity(item.product)) {
      this.focusQuantity(index);
    } else {
      this.focusScanner(true);
    }
    this.message.set(`Alt+${item.slot}: ${item.product.name}`);
  }

  openQuickConfig(slot = 1) {
    if (!this.auth.isManager()) return;
    this.quickConfigOpen.set(true);
    this.loadConfigSlot(slot);
  }

  loadConfigSlot(slot: number) {
    this.configSlot = Number(slot);
    const item = this.quickProducts().find(q => q.slot === this.configSlot);
    this.configProduct = item?.product || null;
    this.configImageBase64 = item?.imageBase64 || null;
    this.configImageContentType = item?.imageContentType || null;
    this.configSearch = '';
    this.configResults.set([]);
  }

  findConfigProducts() {
    const q = this.configSearch.trim();
    if (q.length < 2) {
      this.configResults.set([]);
      return;
    }
    this.products.search(q).subscribe(items => this.configResults.set(items));
  }

  chooseConfigProduct(product: Product) {
    this.configProduct = product;
    this.configSearch = product.name;
    this.configResults.set([]);
  }

  onQuickImage(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.error.set('Selecione um arquivo de imagem');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxWidth = 520;
        const maxHeight = 360;
        const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        this.configImageContentType = 'image/jpeg';
        this.configImageBase64 = dataUrl.split(',')[1] || null;
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  saveQuickConfig() {
    if (!this.configProduct) {
      this.error.set('Selecione o produto que ficará neste atalho');
      return;
    }

    this.quickSaving.set(true);
    this.quick.save(this.configSlot, {
      productId: this.configProduct.id,
      imageBase64: this.configImageBase64,
      imageContentType: this.configImageContentType
    }).subscribe({
      next: saved => {
        this.replaceQuick(saved);
        this.quickSaving.set(false);
        this.quickConfigOpen.set(false);
        this.message.set(`Atalho Alt+${saved.slot} configurado`);
        this.focusScanner(true);
      },
      error: e => {
        this.quickSaving.set(false);
        this.error.set(e.error?.message || 'Não foi possível salvar o atalho');
      }
    });
  }

  clearQuickConfig() {
    this.quickSaving.set(true);
    this.quick.save(this.configSlot, {
      productId: null,
      imageBase64: null,
      imageContentType: null
    }).subscribe({
      next: saved => {
        this.replaceQuick(saved);
        this.quickSaving.set(false);
        this.loadConfigSlot(this.configSlot);
      },
      error: e => {
        this.quickSaving.set(false);
        this.error.set(e.error?.message || 'Não foi possível remover o atalho');
      }
    });
  }

  closeQuickConfig() {
    this.quickConfigOpen.set(false);
    this.focusScanner(true);
  }

  private replaceQuick(saved: QuickProductShortcut) {
    const items = [...this.quickProducts()];
    const index = items.findIndex(item => item.slot === saved.slot);
    if (index >= 0) items[index] = saved;
    else items.push(saved);
    items.sort((a, b) => a.slot - b.slot);
    this.quickProducts.set(items);
  }

  private focusReceived() {
    setTimeout(() => {
      const input = this.receivedInput?.nativeElement;
      if (!input) return;
      input.focus();
      input.select();
    }, 40);
  }

  focusScanner(select = false) {
    setTimeout(() => {
      const input = this.scanner?.nativeElement;
      if (!input) return;
      input.focus();
      if (select) input.select();
    }, 40);
  }

  focusSearch(select = false) {
    setTimeout(() => {
      const input = this.searchInput?.nativeElement;
      if (!input) return;
      input.focus();
      if (select) input.select();
    }, 40);
  }

  private focusQuantity(index: number) {
    setTimeout(() => {
      const input = this.qtyInputs?.toArray()[index]?.nativeElement;
      if (!input) return;
      input.focus();
      input.select();
    }, 70);
  }

  focusNewName() {
    setTimeout(() => {
      this.newNameInput?.nativeElement.focus();
      this.newNameInput?.nativeElement.select();
    }, 20);
  }

  focusNewPrice(event?: Event) {
    event?.preventDefault();
    setTimeout(() => {
      this.newPriceInput?.nativeElement.focus();
      this.newPriceInput?.nativeElement.select();
    }, 20);
  }

  focusNewQty(event?: Event) {
    event?.preventDefault();
    setTimeout(() => {
      this.newQtyInput?.nativeElement.focus();
      this.newQtyInput?.nativeElement.select();
    }, 20);
  }

  selectInput(event: Event) {
    (event.target as HTMLInputElement).select();
  }
}
