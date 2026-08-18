import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

type ConfirmDialogOptions = {
  title?: string;
  text: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
};

export async function confirmDialog({
  title = "Confirmar ação",
  text,
  confirmButtonText = "Confirmar",
  cancelButtonText = "Cancelar",
}: ConfirmDialogOptions): Promise<boolean> {
  const result = await Swal.fire({
    title,
    text,
    icon: "warning",

    showCancelButton: true,

    confirmButtonText,
    cancelButtonText,

    reverseButtons: true,
    focusCancel: true,

    allowOutsideClick: false,
    allowEscapeKey: true,

    confirmButtonColor: "#d32f2f",
    cancelButtonColor: "#6b7280",

    heightAuto: false,
  });

  return result.isConfirmed;
}
