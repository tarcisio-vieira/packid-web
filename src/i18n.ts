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
        identifyPackage: "Identify Package",
      },
      home: {
        title: "Home",
        welcome: "Welcome to PackID",
        useMenu:
          'Use the menu to access available features. For now, you can choose "Identify Package" from the side menu.',
      },
      identify: {
        title: "Identify Package",
        description:
          "Scan the package code or type it manually, then enter the apartment number. Press Enter to move between fields and open the print dialog.",
        packageCode: "Package code",
        apartment: "Apartment / Room",
        printLabel: "Print label",
        scanCode: "Scan package code",
        scanTitle: "Scan the package code",
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
        identifyPackage: "Identificar Pacote",
      },
      home: {
        title: "Início",
        welcome: "Bem-vindo ao PackID",
        useMenu:
          'Use o menu para acessar as funcionalidades. Por enquanto, você pode escolher "Identificar Pacote" no menu lateral.',
      },
      identify: {
        title: "Identificar Pacote",
        description:
          "Leia o código do pacote (câmera ou manual) e depois informe o apartamento. No teclado, use Enter para avançar e abrir a tela de impressão.",
        packageCode: "Código do pacote",
        apartment: "Apartamento / Sala",
        printLabel: "Imprimir etiqueta",
        scanCode: "Ler código com a câmera",
        scanTitle: "Ler código do pacote",
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
        identifyPackage: "Identificar Paquete",
      },
      home: {
        title: "Inicio",
        welcome: "Bienvenido a PackID",
        useMenu:
          'Use el menú para acceder a las funciones disponibles. Por ahora, puede elegir "Identificar Paquete" en el menú lateral.',
      },
      identify: {
        title: "Identificar Paquete",
        description:
          "Escanee el código del paquete o escríbalo manualmente y luego introduzca el número del apartamento. Con Enter puede cambiar de campo y abrir la pantalla de impresión.",
        packageCode: "Código del paquete",
        apartment: "Apartamento / Habitación",
        printLabel: "Imprimir etiqueta",
        scanCode: "Leer código con la cámara",
        scanTitle: "Leer código del paquete",
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
