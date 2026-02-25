# Gestão de Frota & Entrega — Shopee

Aplicativo Android nativo para controle operacional de rotas de entrega Shopee. Desenvolvido com React Native + Expo, funciona 100% offline com banco de dados local.

---

## Funcionalidades

### Rotas
- Criação de rota com veículo, motorista, KM de saída e paradas
- Rascunho auto-salvo: retoma de onde parou ao reabrir o app
- Rotas modelo: templates reutilizáveis para rotas frequentes
- Gestão em tempo real: registro de volumes entregues, devolvidos e ocorrências por parada
- Conclusão de parada com hora editável
- Encerramento de rota com KM de chegada e hora de retorno
- Avisos automáticos via WhatsApp na saída, conclusão de parada e encerramento

### Histórico
- Lista de rotas com filtros por período e status (em andamento / concluída)
- Totalizadores: KM rodados, volumes, tempo em rota, ocorrências
- Detalhe completo de cada rota

### Dashboard
- Rota ativa em destaque
- Totais dos últimos 30 dias
- Gráficos semanais: volumes por dia, KM por dia, ocorrências por tipo
- Insights automáticos: entregador com mais devoluções, cidade mais problemática, desvio de KM e dia crítico da semana

### Frota & Manutenção
- Painel de veículos com KM atual, consumo médio e status de manutenção
- Registro de abastecimentos com cálculo automático de km/L e custo/km
- Registro de manutenções (troca de óleo, filtros, etc.) com alerta de vencimento por KM ou data
- Compartilhamento de histórico via WhatsApp

### Relatórios
- Filtros por veículo e período
- Resumo de combustível: total gasto, litros, consumo médio
- Lista de abastecimentos e manutenções com compartilhamento individual ou em lote via WhatsApp

### Cadastros
- Cidades (nome, UF, distância)
- Entregadores (cidades atendidas, ativo/inativo)
- Veículos (placa, modelo, motorista padrão, KM atual)
- Rotas modelo (paradas predefinidas por veículo)

---

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Framework | React Native + Expo SDK 54 (managed workflow) |
| Navegação | expo-router v6 (file-based, igual ao Next.js) |
| Banco de dados | expo-sqlite (SQLite local, offline-first) |
| Armazenamento leve | @react-native-async-storage/async-storage |
| Estilização | NativeWind v4 (Tailwind CSS no React Native) |
| Ícones | lucide-react-native |
| Gráficos | react-native-svg |
| Build | EAS Build (Expo Application Services) |

---

## Estrutura do Projeto

```
app/
├── _layout.tsx                          # Root layout com Tabs + SafeArea
├── index.tsx                            # Dashboard
├── rota/
│   ├── nova.tsx                         # Criação de rota
│   └── [id].tsx                         # Rota em andamento
├── historico/
│   ├── index.tsx                        # Lista de rotas
│   └── [id].tsx                         # Detalhe da rota
├── cadastros/
│   ├── index.tsx                        # Hub de cadastros
│   ├── cidades.tsx
│   ├── entregadores.tsx
│   ├── veiculos.tsx
│   └── modelos.tsx                      # Rotas modelo
├── manutencao/
│   ├── index.tsx                        # Painel da frota
│   └── [veiculoId]/
│       ├── abastecimentos.tsx
│       └── manutencoes.tsx
└── relatorios.tsx

src/
├── components/
│   ├── Btn.tsx                          # Botão customizável
│   ├── Input.tsx                        # Campo de texto
│   ├── PageHeader.tsx                   # Cabeçalho de tela
│   ├── SelectModal.tsx                  # Seletor em modal (substitui <select>)
│   └── BarChart.tsx                     # Gráfico de barras SVG
└── lib/
    ├── db.ts                            # Camada de dados (expo-sqlite)
    └── whatsapp.ts                      # Mensagens e abertura do WhatsApp
```

---

## Banco de Dados

Banco SQLite local (`logistica.db`). Nenhum dado sai do dispositivo.

| Tabela | Descrição |
|---|---|
| `cidades` | Cidades de entrega |
| `entregadores` | Entregadores e suas cidades |
| `veiculos` | Frota de veículos |
| `rotas` | Rotas com todos os itens e ocorrências (JSON) |
| `rotasModelo` | Templates de rota |
| `abastecimentos` | Histórico de abastecimentos |
| `manutencoes` | Histórico de manutenções |

### Tipos de Ocorrência

`recusa_cliente` · `duplicidade` · `nao_localizado` · `cliente_ausente` · `produto_danificado` · `produto_fora_sistema` · `rota_errada` · `outro`

---

## Como Executar Localmente

### Pré-requisitos
- Node.js 18+
- Expo Go instalado no celular **ou** emulador Android configurado

```bash
# Instalar dependências
npm install

# Iniciar o servidor de desenvolvimento
npm start

# Escanear o QR code com o Expo Go ou pressionar 'a' para abrir no emulador Android
```

---

## Gerar APK

O build é feito na nuvem via [EAS Build](https://expo.dev/eas), sem necessidade de Android Studio ou Java instalados localmente.

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Fazer login na conta Expo
eas login

# Gerar APK (perfil preview)
eas build --platform android --profile preview
```

O link para download do APK será exibido ao final do build (cerca de 5–10 minutos).

### Perfis de build (`eas.json`)

| Perfil | Tipo | Uso |
|---|---|---|
| `preview` | APK | Testes internos, instalação direta |
| `production` | AAB | Publicação na Google Play Store |

---

## Configuração

### `app.json`
- **`name`**: Nome exibido no dispositivo
- **`android.package`**: Identificador único do app (`com.shopee.logistica`)
- **`scheme`**: Deep link scheme (`logistica`)

### `eas.json`
- **`cli.appVersionSource`**: `"local"` — versão controlada pelo `app.json`

---

## Dependências Principais

```json
{
  "expo": "~54.0.33",
  "expo-router": "~6.0.23",
  "expo-sqlite": "~16.0.10",
  "@react-native-async-storage/async-storage": "2.2.0",
  "nativewind": "^4.2.2",
  "tailwindcss": "^3.3.3",
  "lucide-react-native": "^0.575.0",
  "react-native-svg": "15.12.1",
  "react-native-safe-area-context": "~5.6.0"
}
```

---

## Licença

Uso interno — JTarcio Softhouse.
