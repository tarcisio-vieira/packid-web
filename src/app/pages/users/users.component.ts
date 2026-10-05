import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppUser, AppUserRequest } from '../../core/models';
import { AuthService } from '../../core/auth.service';
import { UserService } from '../../core/user.service';
import { PlatformService } from '../../core/platform.service';
import { Router } from '@angular/router';
import { AlertService } from '../../core/alert.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent {
  users = signal<AppUser[]>([]);
  editing = signal<AppUser | null>(null);
  showForm = signal(false);
  error = signal('');
  success = signal('');
  platformAdmin = false;
  form: AppUserRequest = { username: '', password: null, googleEmail: null, role: 'CASHIER', active: true };

  constructor(private service: UserService, private platform: PlatformService, private alerts: AlertService, public auth: AuthService, router: Router) {
    this.platformAdmin = auth.isPlatformAdmin();
    if (!auth.isAdmin()) {
      router.navigateByUrl('/pdv');
      return;
    }
    this.load();
  }

  load() { this.service.list().subscribe(r => this.users.set(r)); }
  create() {
    this.editing.set(null);
    this.form = { username: '', password: '', googleEmail: null, role: 'CASHIER', active: true };
    this.showForm.set(true);
  }
  edit(user: AppUser) {
    this.editing.set(user);
    this.form = { username: user.username, password: null, googleEmail: user.googleEmail, role: user.role, active: user.active };
    this.showForm.set(true);
  }
  async unlinkGoogle() {
    const user = this.editing();
    if (!user?.googleEmail || !this.platformAdmin) return;
    const confirmed = await this.alerts.confirm(
      'Desvincular e-mail Google?',
      `${user.googleEmail} será removido de todos os comércios aos quais este usuário pertence e ficará livre para outro vínculo. O usuário e o acesso por senha não serão apagados.`,
      'Desvincular',
      'warning'
    );
    if (!confirmed) return;
    this.error.set('');
    this.success.set('');
    this.platform.unlinkGoogleIdentity(user.userId).subscribe({
      next: () => {
        this.form.googleEmail = null;
        this.editing.set({ ...user, googleEmail: null });
        this.success.set('E-mail Google desvinculado. Agora ele pode ser cadastrado no operador de caixa desejado.');
        this.load();
      },
      error: e => this.error.set(e.error?.message || 'Não foi possível desvincular o e-mail Google')
    });
  }

  save() {
    this.error.set('');
    this.success.set('');
    const operation = this.editing()
      ? this.service.update(this.editing()!.id, this.form)
      : this.service.create(this.form);
    operation.subscribe({
      next: () => { this.showForm.set(false); this.load(); },
      error: e => this.error.set(e.error?.message || 'Erro ao salvar usuário')
    });
  }
}
