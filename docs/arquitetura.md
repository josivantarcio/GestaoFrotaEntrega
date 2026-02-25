# Arquitetura do Sistema

## Visão Geral

O app segue uma arquitetura **offline-first**: todos os dados ficam no SQLite local do dispositivo. Não há servidor backend, não há autenticação — é um sistema de uso único pelo gestor da operação.

```
┌─────────────────────────────────────────┐
│              Telas (app/)               │
│  index · rota · historico · cadastros   │
│  manutencao · relatorios                │
└───────────────────┬─────────────────────┘
                    │ chama
┌───────────────────▼─────────────────────┐
│           Camada de dados               │
│         src/lib/db.ts                   │
│         expo-sqlite (SQLite)            │
└───────────────────┬─────────────────────┘
                    │ persiste em
┌───────────────────▼─────────────────────┐
│         logistica.db (SQLite)           │
│         Armazenamento local             │
└─────────────────────────────────────────┘
```

---

## Navegação

Usa **expo-router** com convenção file-based idêntica ao Next.js App Router.

```
app/
├── _layout.tsx          → Root: Tabs com 5 abas principais
├── index.tsx            → /  (Dashboard)
├── rota/nova.tsx        → /rota/nova
├── rota/[id].tsx        → /rota/123  (hidden — sem aba)
├── historico/index.tsx  → /historico
├── historico/[id].tsx   → /historico/123  (hidden)
├── cadastros/index.tsx  → /cadastros
├── manutencao/index.tsx → /manutencao
└── ...
```

Telas "hidden" são registradas no `_layout.tsx` com `options={{ href: null }}` para não aparecerem na tab bar.

---

## Banco de Dados (`src/lib/db.ts`)

### Padrão de acesso

```typescript
const db = await SQLite.openDatabaseAsync("logistica.db");

// Leitura
const rows = await db.getAllAsync<RowType>("SELECT * FROM tabela");

// Escrita
const result = await db.runAsync("INSERT INTO tabela VALUES (?, ?)", [val1, val2]);
return result.lastInsertRowId;
```

### Serialização de arrays/objetos

SQLite não suporta arrays nativamente. Arrays e objetos aninhados são armazenados como JSON:

```typescript
// Ao salvar:
JSON.stringify(entregador.cidadesIds)   // "[1, 2, 3]"
JSON.stringify(rota.itens)              // "[{...}, {...}]"

// Ao ler:
JSON.parse(row.cidadesIds)
JSON.parse(row.itens)
```

### Inicialização

`initDB()` é chamada uma vez e cria todas as tabelas com `CREATE TABLE IF NOT EXISTS`. As telas chamam as funções CRUD diretamente — não há ORM.

---

## Componentes

### `SelectModal`
Substitui o `<select>` HTML (inexistente no React Native). Renderiza um `TouchableOpacity` como trigger e abre um `Modal` com `FlatList` de opções. Suporta busca com filtro de texto.

### `PageHeader`
Cabeçalho padrão com fundo `#ee4d2d`, título e botão de voltar. Recebe `acao` opcional (ex: botão `+`). Usa `useSafeAreaInsets` para o padding do status bar.

### `BarChart`
Gráfico de barras em SVG puro via `react-native-svg`. Recebe dados e renderiza `<Rect>` com altura proporcional ao valor máximo. Mesma lógica de cálculo do PWA original.

### `Btn`
`TouchableOpacity` com variantes:
- `primario` — laranja `#ee4d2d` (padrão)
- `secundario` — branco com borda
- `whatsapp` — verde `#25d366`

---

## Integração WhatsApp (`src/lib/whatsapp.ts`)

```typescript
// Tenta abrir o app WhatsApp diretamente
const whatsappUrl = `whatsapp://send?text=${encoded}`;
const canOpen = await Linking.canOpenURL(whatsappUrl);

if (canOpen) {
  await Linking.openURL(whatsappUrl);
} else {
  // Fallback: abre wa.me no navegador
  await Linking.openURL(`https://wa.me/?text=${encoded}`);
}
```

Funções de mensagem disponíveis:

| Função | Quando é usada |
|---|---|
| `mensagemSaidaRota` | Ao iniciar uma rota |
| `mensagemCidadeConcluida` | Ao concluir uma parada |
| `mensagemEncerramentoRota` | Ao finalizar a rota |
| `mensagemAbastecimento` | Ao registrar abastecimento |
| `mensagemManutencao` | Ao registrar manutenção |
| `mensagemRelatorioAbastecimentos` | Relatório de período |
| `mensagemRelatorioManutencoes` | Histórico de manutenções |

---

## Safe Area

O app usa `react-native-safe-area-context` em todos os lugares onde o conteúdo pode colidir com a interface do sistema:

- **Tab bar** (`_layout.tsx`): `height = 56 + insets.bottom` — respeita a gesture bar do Android
- **PageHeader**: `paddingTop = insets.top` — respeita a status bar
- **ScrollView**: `paddingBottom = insets.bottom + 16` — conteúdo não fica atrás da tab bar

---

## Fluxo da Rota

```
Nova Rota
   │
   ├── Seleciona veículo → preenche motorista padrão automaticamente
   ├── Seleciona cidades + entregadores + volumes
   │   (AsyncStorage salva rascunho a cada mudança)
   │
   ├── "Iniciar e Avisar no WhatsApp" → mensagemSaidaRota → WhatsApp
   │
   ▼
Rota em Andamento (/rota/[id])
   │
   ├── Cada parada: registrar ocorrências → concluir parada
   │   └── Modal de conclusão: volumes entregues + devolvidos + hora editável
   │   └── mensagemCidadeConcluida → WhatsApp (opcional)
   │
   ├── Todas as paradas concluídas → botão "Encerrar Rota"
   │   └── Modal: KM chegada + hora chegada
   │   └── mensagemEncerramentoRota → WhatsApp (opcional)
   │
   ▼
Histórico (/historico/[id]) — somente leitura
```
