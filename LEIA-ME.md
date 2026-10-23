# Escala da Mídia — como colocar no ar

Enquanto o arquivo `firebase-config.js` estiver com `COLE_AQUI_SUA_API_KEY`, o sistema roda em **modo demonstração** (dados só no navegador).
Camila (líder) usa o PIN `1234` e as demais pessoas usam `1111`.

## 1. Firebase (plano gratuito Spark)
1. Acesse https://console.firebase.google.com e clique em **Adicionar projeto** (ex.: `escala-midia`).
2. Em **Configurações do projeto > Seus apps**, clique no ícone **Web (</>)**, dê um nome e registre.
3. Copie o objeto `firebaseConfig` e cole no arquivo `firebase-config.js`, no lugar dos valores de exemplo.
4. Menu **Authentication > Começar > Método de login**: ative **E-mail/senha**.
5. Menu **Firestore Database > Criar banco de dados**: modo de produção, região `southamerica-east1 (São Paulo)`.
6. Na aba **Regras** do Firestore, apague tudo, cole o conteúdo do arquivo `firestore.rules` e clique em **Publicar**.

As fotos ficam guardadas dentro do próprio Firestore (reduzidas), então não precisa do Storage nem do plano pago.

## 2. GitHub Pages
1. Crie um repositório novo (ex.: `escala-midia`).
2. Envie os arquivos desta pasta: `index.html`, os arquivos `.js` e `style.css`, e o `firestore.rules`.
3. Em **Settings > Pages**, escolha **Branch: main** e pasta **/ (root)** e salve.
4. Em 1 a 2 minutos o site fica em `https://SEU-USUARIO.github.io/escala-midia/`.

## 3. Liberar o domínio no Firebase
Em **Authentication > Configurações > Domínios autorizados**, clique em **Adicionar domínio** e coloque `SEU-USUARIO.github.io`.

## 4. Primeiro acesso
1. Abra o link do site. Aparece a tela **Primeiro acesso**: crie a Camila com o PIN dela.
2. Camila entra em **Equipe > + Adicionar** e cadastra cada pessoa com equipe, WhatsApp e PIN.
3. Abrindo cada pessoa na lista, ela coloca a foto. Cada pessoa também pode trocar a própria foto e o próprio PIN em **Meu perfil**.

## Quem vê o quê
- **Camila (líder)**: tudo. Painel, montar e publicar a escala, eventos e prazos, equipe (WhatsApp, observações, dias bloqueados, PINs), respostas de culto e ceia e histórico.
- **Demais pessoas**: só as próprias respostas, a escala depois de publicada e o próprio perfil. Isso é garantido pelas regras do Firestore, não só pela tela.
