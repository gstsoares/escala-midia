// =====================================================================
//  CONFIGURAÇÃO DO FIREBASE
//  1) Crie o projeto em https://console.firebase.google.com
//  2) Em "Configurações do projeto" > "Seus apps" > Web (</>), copie o
//     objeto firebaseConfig e cole abaixo, substituindo os valores.
//  Enquanto apiKey começar com "COLE", o sistema roda em MODO DEMONSTRAÇÃO
//  (dados salvos só no navegador, para testar).
// =====================================================================
export const firebaseConfig = {
  apiKey: "AIzaSyDvv78iRmZ0FLNQ3zHFhzF7nFca3wYXAA8",
  authDomain: "escala-midia-79c69.firebaseapp.com",
  projectId: "escala-midia-79c69",
  storageBucket: "escala-midia-79c69.firebasestorage.app",
  messagingSenderId: "512118759319",
  appId: "1:512118759319:web:bf2f5f228ffee69cbe2ed2"
};

// Nome que aparece no sistema
export const MINISTERIO = "Escala da Mídia";

// Domínio "de mentira" usado só por dentro para o login com PIN (ninguém recebe e-mail)
export const DOMINIO_LOGIN = "escala-midia.app";
