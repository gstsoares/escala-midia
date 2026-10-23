// =====================================================================
//  CONFIGURAÇÃO DO FIREBASE
//  1) Crie o projeto em https://console.firebase.google.com
//  2) Em "Configurações do projeto" > "Seus apps" > Web (</>), copie o
//     objeto firebaseConfig e cole abaixo, substituindo os valores.
//  Enquanto apiKey começar com "COLE", o sistema roda em MODO DEMONSTRAÇÃO
//  (dados salvos só no navegador, para testar).
// =====================================================================
export const firebaseConfig = {
  apiKey: "COLE_AQUI_SUA_API_KEY",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000"
};

// Nome que aparece no sistema
export const MINISTERIO = "Escala da Mídia";

// Domínio "de mentira" usado só por dentro para o login com PIN (ninguém recebe e-mail)
export const DOMINIO_LOGIN = "escala-midia.app";
