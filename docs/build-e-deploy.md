# Build e Deploy

## Requisitos

- Node.js 18+
- Conta em [expo.dev](https://expo.dev) (gratuita)
- EAS CLI: `npm install -g eas-cli`

---

## Desenvolvimento Local

```bash
npm install
npm start
```

Escanear o QR code com o **Expo Go** (Android/iOS) ou pressionar `a` para abrir no emulador Android.

> **Atenção:** em desenvolvimento local o app usa o bundler do Metro. Mudanças nos arquivos são refletidas em tempo real (Fast Refresh).

---

## Gerar APK (Build na Nuvem)

O EAS Build compila o app nos servidores da Expo. Não é necessário instalar Android Studio ou Java.

```bash
# Autenticar (apenas na primeira vez)
eas login

# Gerar APK para distribuição interna
eas build --platform android --profile preview
```

O processo leva aproximadamente **5–10 minutos**. Ao final é exibido um link e QR code para download direto no dispositivo Android.

### Perfis disponíveis

| Comando | Perfil | Saída | Uso |
|---|---|---|---|
| `--profile preview` | preview | `.apk` | Testes internos, instalação direta |
| `--profile production` | production | `.aab` | Google Play Store |

---

## Atualizar o App

Para enviar uma nova versão após mudanças no código:

1. Incrementar a versão em `app.json`:
   ```json
   "version": "1.1.0"
   ```
2. Gerar novo build:
   ```bash
   eas build --platform android --profile preview
   ```

> Cada build gera um novo APK independente. O usuário precisa desinstalar e reinstalar, ou o novo APK pode ser instalado por cima do anterior se a assinatura for a mesma (chave gerenciada pelo EAS).

---

## Credenciais Android (Keystore)

O EAS gerencia o keystore automaticamente. A chave está associada à conta Expo e é usada em todos os builds subsequentes.

Para ver as credenciais configuradas:
```bash
eas credentials
```

> **Importante:** não perca o acesso à conta Expo, pois o keystore é necessário para publicar atualizações de um app já publicado na Play Store.

---

## Variáveis de Ambiente

O projeto não utiliza variáveis de ambiente. Todos os dados ficam no SQLite local do dispositivo.

---

## `eas.json` — Configuração Completa

```json
{
  "cli": {
    "version": ">= 12.0.0",
    "appVersionSource": "local"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "android": { "buildType": "apk" },
      "distribution": "internal"
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

- `appVersionSource: "local"` — versão lida do `app.json`, não controlada pelo EAS
- `distribution: "internal"` — build disponível para download direto (sem revisão da Play Store)
