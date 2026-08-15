import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  pt: {
    translation: {
      app: {
        title: "VSGI",
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
        identifyPackage: "PackID - Encomendas",
        registry: "Gestão do condomínio",
      },
      home: {
        title: "Início",
        welcome: "Bem-vindo ao VSGI",
        useMenu:
          'Use o menu para acessar o recebimento de encomendas ou a Gestão do condomínio.',
      },
      identify: {
        title: "PackID - Recebimento de encomendas",
        description:
          "Leia o código do pacote ou digite manualmente. Depois informe página + bloco + apartamento e imprima a etiqueta.",
        packageCode: "pacote",
        apartment: "Página + Bloco + Apartamento",
        unitCodeHelp: "Ex.: 0992608 = página 099, bloco 2, apartamento 608",
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
        print: "Imprimir",
        printTable: "Imprimir tabela",
        printSingleLabel: "Imprimir etiqueta",
        noRecords: "Nenhum registro.",
        filters: {
          search: "Pesquisar",
          searchPlaceholder: "Código, página+bloco+apto ou bloco+apto",
          from: "De",
          to: "Até",
        },
        columns: {
          time: "Data / Hora",
          page: "Página",
          block: "Bloco",
          apartment: "Apartamento",
          residentFullName: "Condômino",
          packageCode: "pacote",
          observations: "Assinatura",
          status: "Status",
          actions: "Ações",
        },
        status: { saving: "Salvando...", saved: "Salvo", error: "Erro" },
      },
      common: {
        close: "Fechar",
      },
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "pt",
  fallbackLng: "pt",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
