import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon } from 'sweetalert2';

@Injectable({ providedIn: 'root' })
export class AlertService {
  async confirm(
    title: string,
    text: string,
    confirmButtonText = 'Confirmar',
    icon: SweetAlertIcon = 'question'
  ): Promise<boolean> {
    const result = await Swal.fire({
      title,
      text,
      icon,
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      focusCancel: true,
      buttonsStyling: false,
      customClass: {
        popup: 'cf-swal-popup',
        confirmButton: 'cf-swal-confirm',
        cancelButton: 'cf-swal-cancel'
      }
    });

    return result.isConfirmed;
  }
}
