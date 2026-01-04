import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const savedLang = localStorage.getItem("lang") ?? "en";

const resources = {
  en: {
    translation: {
      app: {
        title: "PackID",
      },
      header: {
        signOut: "Sign out",
      },
      auth: {
        loading: "Loading...",
        description:
          "To access the system, please sign in with your Google account.",
        signInButton: "Sign in with Google",
      },
      menu: {
        main: "Main menu",
        home: "Home",
        identifyPackage: "Labels", // mais curto no menu
      },
      home: {
        title: "Home",
        welcome: "Welcome to PackID",
        useMenu:
          'Use the menu to access the features. For now, you can choose "Identify Package".',
      },
      identify: {
        title: "Identify Package",
        description:
          "Scan the package code (QR or barcode) or type it manually, then enter the apartment/room number and print the label.",
        packageCode: "Package code",
        apartment: "Apartment / Room",
        printLabel: "Print label",
        scanButton: "Scan",
        scanTitle: "Scan code",
        scanHelp:
          "Point the camera at the QR code or barcode. When the code is read, the field will be filled automatically.",
      },
      history: {
        title: "Recent labels",
        empty: "No labels yet.",
        clear: "Clear",
        columns: {
          time: "Time",
          apartment: "Apt",
          packageCode: "Package code",
          status: "Status",
        },
        status: { saving: "Saving...", saved: "Saved", error: "Error" },
      },
      common: {
        close: "Close",
      },
    },
  },
  pt: {
    translation: {
      app: {
        title: "PackID",
      },
      header: {
        signOut: "Sair",
      },
      auth: {
        loading: "Carregando...",
        description:
          "Para acessar o sistema, faça login com a sua conta do Google.",
        signInButton: "Entrar com Google",
      },
      menu: {
        main: "Menu principal",
        home: "Início",
        identifyPackage: "Etiquetas", // curto para caber bem no celular
      },
      home: {
        title: "Início",
        welcome: "Bem-vindo ao PackID",
        useMenu:
          'Use o menu para acessar as funcionalidades. Por enquanto, você pode escolher "Etiquetas" no menu lateral.',
      },
      identify: {
        title: "Identificar pacote",
        description:
          "Leia o código do pacote (QR ou código de barras) ou digite manualmente. Depois informe o número do apartamento/sala e imprima a etiqueta.",
        packageCode: "Código do pacote",
        apartment: "Apartamento / Sala",
        printLabel: "Imprimir etiqueta",
        scanButton: "Ler código",
        scanTitle: "Ler código",
        scanHelp:
          "Aponte a câmera para o QR code ou código de barras. Quando o código for lido, o campo será preenchido automaticamente.",
      },
      history: {
        title: "Últimas etiquetas",
        empty: "Nenhuma etiqueta registrada ainda.",
        clear: "Limpar",
        columns: {
          time: "Hora",
          apartment: "Apto",
          packageCode: "Código",
          status: "Status",
        },
        status: { saving: "Salvando...", saved: "Salvo", error: "Erro" },
      },
      common: {
        close: "Fechar",
      },
    },
  },
  es: {
    translation: {
      app: {
        title: "PackID",
      },
      header: {
        signOut: "Cerrar sesión",
      },
      auth: {
        loading: "Cargando...",
        description:
          "Para acceder al sistema, inicie sesión con su cuenta de Google.",
        signInButton: "Iniciar sesión con Google",
      },
      menu: {
        main: "Menú principal",
        home: "Inicio",
        identifyPackage: "Etiquetas",
      },
      home: {
        title: "Inicio",
        welcome: "Bienvenido a PackID",
        useMenu:
          'Use el menú para acceder a las funciones disponibles. Por ahora, puede elegir "Etiquetas" en el menú lateral.',
      },
      identify: {
        title: "Identificar paquete",
        description:
          "Escanee el código del paquete (QR o código de barras) o escríbalo manualmente. Luego introduzca el número del apartamento/habitación e imprima la etiqueta.",
        packageCode: "Código del paquete",
        apartment: "Apartamento / Habitación",
        printLabel: "Imprimir etiqueta",
        scanButton: "Escanear",
        scanTitle: "Escanear código",
        scanHelp:
          "Apunte la cámara al código QR o código de barras. Cuando se lea el código, el campo se rellenará automáticamente.",
      },
      history: {
        title: "Etiquetas recientes",
        empty: "Aún no hay etiquetas.",
        clear: "Limpiar",
        columns: {
          time: "Hora",
          apartment: "Apto",
          packageCode: "Código",
          status: "Estado",
        },
        status: { saving: "Guardando...", saved: "Guardado", error: "Error" },
      },
      common: {
        close: "Cerrar",
      },
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: savedLang,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
