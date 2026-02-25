# Banco de Dados

Banco SQLite local gerenciado pelo `expo-sqlite`. Arquivo: `logistica.db` (criado automaticamente no primeiro uso).

---

## Schema Completo

### `cidades`
```sql
CREATE TABLE IF NOT EXISTS cidades (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nome        TEXT    NOT NULL,
  uf          TEXT    NOT NULL,
  distanciaKm REAL,
  criadoEm   TEXT    NOT NULL
)
```

### `entregadores`
```sql
CREATE TABLE IF NOT EXISTS entregadores (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nome        TEXT    NOT NULL,
  telefone    TEXT    NOT NULL,
  cidadesIds  TEXT    NOT NULL,  -- JSON: [1, 2, 3]
  ativo       INTEGER NOT NULL DEFAULT 1,
  criadoEm   TEXT    NOT NULL
)
```

### `veiculos`
```sql
CREATE TABLE IF NOT EXISTS veiculos (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  placa           TEXT    NOT NULL,
  modelo          TEXT    NOT NULL,
  motoristaPadrao TEXT,
  ativo           INTEGER NOT NULL DEFAULT 1,
  kmAtual         REAL,
  criadoEm       TEXT    NOT NULL
)
```

### `rotas`
```sql
CREATE TABLE IF NOT EXISTS rotas (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  data        TEXT    NOT NULL,
  veiculoId   INTEGER NOT NULL,
  veiculoPlaca TEXT   NOT NULL,
  motorista   TEXT    NOT NULL,
  kmSaida     REAL    NOT NULL,
  kmChegada   REAL,
  horaSaida   TEXT    NOT NULL,
  horaChegada TEXT,
  status      TEXT    NOT NULL,  -- 'em_andamento' | 'concluida'
  itens       TEXT    NOT NULL,  -- JSON: ItemRota[]
  criadoEm   TEXT    NOT NULL
)
```

**Estrutura de `itens` (JSON):**
```typescript
interface ItemRota {
  cidadeId: number;
  cidadeNome: string;
  entregadorId: number;
  entregadorNome: string;
  volumesSaida: number;
  volumesEntregues?: number;
  volumesDevolvidos?: number;
  concluido: boolean;
  horaConclusao?: string;
  ocorrencias: Ocorrencia[];
}

interface Ocorrencia {
  id: string;         // UUID gerado no app
  tipo: TipoOcorrencia;
  quantidade: number;
  descricao?: string;
}
```

### `rotasModelo`
```sql
CREATE TABLE IF NOT EXISTS rotasModelo (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nome        TEXT    NOT NULL,
  descricao   TEXT,
  veiculoId   INTEGER NOT NULL,
  veiculoPlaca TEXT   NOT NULL,
  itens       TEXT    NOT NULL,  -- JSON: ItemRotaModelo[]
  criadoEm   TEXT    NOT NULL
)
```

### `abastecimentos`
```sql
CREATE TABLE IF NOT EXISTS abastecimentos (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  veiculoId       INTEGER NOT NULL,
  veiculoPlaca    TEXT    NOT NULL,
  data            TEXT    NOT NULL,
  kmAtual         REAL    NOT NULL,
  litros          REAL    NOT NULL,
  valorTotal      REAL    NOT NULL,
  tipoCombustivel TEXT    NOT NULL,
  posto           TEXT,
  observacao      TEXT,
  kmAnterior      REAL,
  consumoKmL      REAL,   -- calculado automaticamente
  custoKm         REAL,   -- calculado automaticamente
  criadoEm       TEXT    NOT NULL
)
```

> `consumoKmL` e `custoKm` são calculados pela função `salvarAbastecimento` com base no KM do abastecimento anterior do mesmo veículo.

### `manutencoes`
```sql
CREATE TABLE IF NOT EXISTS manutencoes (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  veiculoId        INTEGER NOT NULL,
  veiculoPlaca     TEXT    NOT NULL,
  data             TEXT    NOT NULL,
  kmAtual          REAL    NOT NULL,
  tipoOleo         TEXT    NOT NULL,
  itensSubstituidos TEXT   NOT NULL,  -- JSON: string[]
  proximaTrocaKm   REAL,
  proximaTrocaData TEXT,
  observacao       TEXT,
  criadoEm        TEXT    NOT NULL
)
```

---

## Funções CRUD (`src/lib/db.ts`)

### Cidades
| Função | Descrição |
|---|---|
| `listarCidades()` | Retorna todas ordenadas por nome |
| `salvarCidade(cidade)` | Insert, retorna o id gerado |
| `deletarCidade(id)` | Delete por id |

### Entregadores
| Função | Descrição |
|---|---|
| `listarEntregadores()` | Retorna todos, `cidadesIds` deserializado |
| `salvarEntregador(entregador)` | Insert com `cidadesIds` serializado |
| `atualizarEntregador(id, dados)` | Update parcial |
| `deletarEntregador(id)` | Delete por id |

### Veículos
| Função | Descrição |
|---|---|
| `listarVeiculos()` | Retorna todos |
| `buscarVeiculo(id)` | Retorna um ou `undefined` |
| `salvarVeiculo(veiculo)` | Insert |
| `atualizarVeiculo(id, dados)` | Update parcial (usado para atualizar `kmAtual`) |
| `deletarVeiculo(id)` | Delete por id |

### Rotas
| Função | Descrição |
|---|---|
| `listarRotas()` | Retorna todas, `itens` deserializado, ordenadas por data desc |
| `buscarRota(id)` | Retorna uma rota completa |
| `salvarRota(rota)` | Insert com `itens` serializado |
| `atualizarRota(id, dados)` | Update parcial (salva progresso em tempo real) |

### Abastecimentos
| Função | Descrição |
|---|---|
| `listarAbastecimentosPorVeiculo(veiculoId)` | Ordena por KM desc |
| `listarAbastecimentosPorPeriodo(inicio, fim, veiculoId?)` | Filtra por data e veículo opcional |
| `salvarAbastecimento(a)` | Insert + calcula consumo automaticamente |
| `deletarAbastecimento(id)` | Delete por id |

### Manutenções
| Função | Descrição |
|---|---|
| `listarManutencoesPorVeiculo(veiculoId)` | Ordena por KM desc |
| `buscarUltimaManutencao(veiculoId)` | Retorna a mais recente |
| `salvarManutencao(m)` | Insert + atualiza `kmAtual` do veículo |
| `deletarManutencao(id)` | Delete por id |
| `manutencaoVencida(ultima, kmAtual)` | Retorna `true` se KM ou data vencidos |

---

## Tipos Principais

```typescript
type TipoCombustivel = "gasolina" | "etanol" | "diesel" | "gnv";

type ItemSubstituido =
  | "oleo_motor" | "filtro_oleo" | "filtro_ar" | "filtro_combustivel"
  | "filtro_cabine" | "velas" | "correias" | "pneus" | "freios" | "outro";

type TipoOcorrencia =
  | "recusa_cliente" | "duplicidade" | "nao_localizado" | "cliente_ausente"
  | "produto_danificado" | "produto_fora_sistema" | "rota_errada" | "outro";
```
