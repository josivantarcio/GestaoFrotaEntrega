import * as SQLite from "expo-sqlite";

// ── Types ─────────────────────────────────────────────────────

export type TipoOcorrencia =
  | "recusa_cliente"
  | "duplicidade"
  | "nao_localizado"
  | "cliente_ausente"
  | "produto_danificado"
  | "produto_fora_sistema"
  | "rota_errada"
  | "outro";

export type TipoCombustivel = "gasolina" | "etanol" | "diesel" | "gnv";

export type ItemSubstituido =
  | "oleoMotor"
  | "oleoCambio"
  | "oleoDiferencial"
  | "filtroOleo"
  | "filtroAr"
  | "filtroCabine"
  | "filtroCombustivel";

export interface Cidade {
  id?: number;
  nome: string;
  uf: string;
  distanciaKm?: number;
  criadoEm: string;
}

export interface Entregador {
  id?: number;
  nome: string;
  telefone: string;
  cidadesIds: number[];
  ativo: boolean;
  criadoEm: string;
}

export interface Veiculo {
  id?: number;
  placa: string;
  modelo: string;
  motoristaPadrao?: string;
  ativo: boolean;
  kmAtual?: number;
  criadoEm: string;
}

export interface ItemRota {
  cidadeId: number;
  cidadeNome: string;
  entregadorId: number;
  entregadorNome: string;
  volumesSaida: number;
  volumesEntregues?: number;
  volumesDevolvidos?: number;
  horaConclusao?: string;
  concluido: boolean;
  ocorrencias: Ocorrencia[];
}

export interface Ocorrencia {
  id: string;
  tipo: TipoOcorrencia;
  descricao?: string;
  quantidade: number;
  registradoEm: string;
}

export interface Rota {
  id?: number;
  data: string;
  veiculoId: number;
  veiculoPlaca: string;
  motorista: string;
  kmSaida: number;
  kmChegada?: number;
  horaSaida: string;
  horaChegada?: string;
  status: "em_andamento" | "concluida";
  itens: ItemRota[];
  criadoEm: string;
}

export interface ItemRotaModelo {
  cidadeId: number;
  cidadeNome: string;
  entregadorId: number;
  entregadorNome: string;
}

export interface RotaModelo {
  id?: number;
  nome: string;
  descricao?: string;
  veiculoId: number;
  veiculoPlaca: string;
  itens: ItemRotaModelo[];
  criadoEm: string;
}

export interface Abastecimento {
  id?: number;
  veiculoId: number;
  veiculoPlaca: string;
  data: string;
  kmAtual: number;
  litros: number;
  valorTotal: number;
  tipoCombustivel: TipoCombustivel;
  posto?: string;
  observacao?: string;
  kmAnterior?: number;
  consumoKmL?: number;
  custoKm?: number;
  criadoEm: string;
}

export interface Manutencao {
  id?: number;
  veiculoId: number;
  veiculoPlaca: string;
  data: string;
  kmAtual: number;
  tipoOleo: string;
  itensSubstituidos: ItemSubstituido[];
  proximaTrocaKm?: number;
  proximaTrocaData?: string;
  observacao?: string;
  criadoEm: string;
}

// ── Database instance ─────────────────────────────────────────

let dbInstance: SQLite.SQLiteDatabase | null = null;

async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync("logistica.db");
  await initDB(dbInstance);
  return dbInstance;
}

async function initDB(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS cidades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      uf TEXT NOT NULL,
      distanciaKm REAL,
      criadoEm TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS entregadores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      telefone TEXT NOT NULL,
      cidadesIds TEXT NOT NULL DEFAULT '[]',
      ativo INTEGER NOT NULL DEFAULT 1,
      criadoEm TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS veiculos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      placa TEXT NOT NULL,
      modelo TEXT NOT NULL,
      motoristaPadrao TEXT,
      ativo INTEGER NOT NULL DEFAULT 1,
      kmAtual REAL,
      criadoEm TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rotas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      veiculoId INTEGER NOT NULL,
      veiculoPlaca TEXT NOT NULL,
      motorista TEXT NOT NULL,
      kmSaida REAL NOT NULL,
      kmChegada REAL,
      horaSaida TEXT NOT NULL,
      horaChegada TEXT,
      status TEXT NOT NULL DEFAULT 'em_andamento',
      itens TEXT NOT NULL DEFAULT '[]',
      criadoEm TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS abastecimentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      veiculoId INTEGER NOT NULL,
      veiculoPlaca TEXT NOT NULL,
      data TEXT NOT NULL,
      kmAtual REAL NOT NULL,
      litros REAL NOT NULL,
      valorTotal REAL NOT NULL,
      tipoCombustivel TEXT NOT NULL,
      posto TEXT,
      observacao TEXT,
      kmAnterior REAL,
      consumoKmL REAL,
      custoKm REAL,
      criadoEm TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS manutencoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      veiculoId INTEGER NOT NULL,
      veiculoPlaca TEXT NOT NULL,
      data TEXT NOT NULL,
      kmAtual REAL NOT NULL,
      tipoOleo TEXT NOT NULL,
      itensSubstituidos TEXT NOT NULL DEFAULT '[]',
      proximaTrocaKm REAL,
      proximaTrocaData TEXT,
      observacao TEXT,
      criadoEm TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rotasModelo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      descricao TEXT,
      veiculoId INTEGER NOT NULL,
      veiculoPlaca TEXT NOT NULL,
      itens TEXT NOT NULL DEFAULT '[]',
      criadoEm TEXT NOT NULL
    );
  `);
}

// ── Row mappers ───────────────────────────────────────────────

function rowToCidade(row: any): Cidade {
  return {
    id: row.id,
    nome: row.nome,
    uf: row.uf,
    distanciaKm: row.distanciaKm ?? undefined,
    criadoEm: row.criadoEm,
  };
}

function rowToEntregador(row: any): Entregador {
  return {
    id: row.id,
    nome: row.nome,
    telefone: row.telefone,
    cidadesIds: JSON.parse(row.cidadesIds || "[]"),
    ativo: row.ativo === 1,
    criadoEm: row.criadoEm,
  };
}

function rowToVeiculo(row: any): Veiculo {
  return {
    id: row.id,
    placa: row.placa,
    modelo: row.modelo,
    motoristaPadrao: row.motoristaPadrao ?? undefined,
    ativo: row.ativo === 1,
    kmAtual: row.kmAtual ?? undefined,
    criadoEm: row.criadoEm,
  };
}

function rowToRota(row: any): Rota {
  return {
    id: row.id,
    data: row.data,
    veiculoId: row.veiculoId,
    veiculoPlaca: row.veiculoPlaca,
    motorista: row.motorista,
    kmSaida: row.kmSaida,
    kmChegada: row.kmChegada ?? undefined,
    horaSaida: row.horaSaida,
    horaChegada: row.horaChegada ?? undefined,
    status: row.status,
    itens: JSON.parse(row.itens || "[]"),
    criadoEm: row.criadoEm,
  };
}

function rowToAbastecimento(row: any): Abastecimento {
  return {
    id: row.id,
    veiculoId: row.veiculoId,
    veiculoPlaca: row.veiculoPlaca,
    data: row.data,
    kmAtual: row.kmAtual,
    litros: row.litros,
    valorTotal: row.valorTotal,
    tipoCombustivel: row.tipoCombustivel,
    posto: row.posto ?? undefined,
    observacao: row.observacao ?? undefined,
    kmAnterior: row.kmAnterior ?? undefined,
    consumoKmL: row.consumoKmL ?? undefined,
    custoKm: row.custoKm ?? undefined,
    criadoEm: row.criadoEm,
  };
}

function rowToManutencao(row: any): Manutencao {
  return {
    id: row.id,
    veiculoId: row.veiculoId,
    veiculoPlaca: row.veiculoPlaca,
    data: row.data,
    kmAtual: row.kmAtual,
    tipoOleo: row.tipoOleo,
    itensSubstituidos: JSON.parse(row.itensSubstituidos || "[]"),
    proximaTrocaKm: row.proximaTrocaKm ?? undefined,
    proximaTrocaData: row.proximaTrocaData ?? undefined,
    observacao: row.observacao ?? undefined,
    criadoEm: row.criadoEm,
  };
}

function rowToRotaModelo(row: any): RotaModelo {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao ?? undefined,
    veiculoId: row.veiculoId,
    veiculoPlaca: row.veiculoPlaca,
    itens: JSON.parse(row.itens || "[]"),
    criadoEm: row.criadoEm,
  };
}

// ── Cidades ──────────────────────────────────────────────────

export async function listarCidades(): Promise<Cidade[]> {
  const db = await getDB();
  const rows = await db.getAllAsync("SELECT * FROM cidades ORDER BY nome");
  return rows.map(rowToCidade);
}

export async function salvarCidade(cidade: Cidade): Promise<number> {
  const db = await getDB();
  if (cidade.id) {
    await db.runAsync(
      "UPDATE cidades SET nome=?, uf=?, distanciaKm=? WHERE id=?",
      [cidade.nome, cidade.uf, cidade.distanciaKm ?? null, cidade.id]
    );
    return cidade.id;
  }
  const result = await db.runAsync(
    "INSERT INTO cidades (nome, uf, distanciaKm, criadoEm) VALUES (?,?,?,?)",
    [cidade.nome, cidade.uf, cidade.distanciaKm ?? null, new Date().toISOString()]
  );
  return result.lastInsertRowId;
}

export async function deletarCidade(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync("DELETE FROM cidades WHERE id=?", [id]);
}

// ── Entregadores ─────────────────────────────────────────────

export async function listarEntregadores(): Promise<Entregador[]> {
  const db = await getDB();
  const rows = await db.getAllAsync("SELECT * FROM entregadores ORDER BY nome");
  return rows.map(rowToEntregador);
}

export async function salvarEntregador(e: Entregador): Promise<number> {
  const db = await getDB();
  const cidadesJson = JSON.stringify(e.cidadesIds);
  if (e.id) {
    await db.runAsync(
      "UPDATE entregadores SET nome=?, telefone=?, cidadesIds=?, ativo=? WHERE id=?",
      [e.nome, e.telefone, cidadesJson, e.ativo ? 1 : 0, e.id]
    );
    return e.id;
  }
  const result = await db.runAsync(
    "INSERT INTO entregadores (nome, telefone, cidadesIds, ativo, criadoEm) VALUES (?,?,?,?,?)",
    [e.nome, e.telefone, cidadesJson, e.ativo ? 1 : 0, new Date().toISOString()]
  );
  return result.lastInsertRowId;
}

export async function deletarEntregador(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync("DELETE FROM entregadores WHERE id=?", [id]);
}

// ── Veículos ─────────────────────────────────────────────────

export async function listarVeiculos(): Promise<Veiculo[]> {
  const db = await getDB();
  const rows = await db.getAllAsync("SELECT * FROM veiculos ORDER BY placa");
  return rows.map(rowToVeiculo);
}

export async function salvarVeiculo(v: Veiculo): Promise<number> {
  const db = await getDB();
  if (v.id) {
    await db.runAsync(
      "UPDATE veiculos SET placa=?, modelo=?, motoristaPadrao=?, ativo=?, kmAtual=? WHERE id=?",
      [v.placa, v.modelo, v.motoristaPadrao ?? null, v.ativo ? 1 : 0, v.kmAtual ?? null, v.id]
    );
    return v.id;
  }
  const result = await db.runAsync(
    "INSERT INTO veiculos (placa, modelo, motoristaPadrao, ativo, kmAtual, criadoEm) VALUES (?,?,?,?,?,?)",
    [v.placa, v.modelo, v.motoristaPadrao ?? null, v.ativo ? 1 : 0, v.kmAtual ?? null, new Date().toISOString()]
  );
  return result.lastInsertRowId;
}

export async function deletarVeiculo(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync("DELETE FROM veiculos WHERE id=?", [id]);
}

export async function buscarVeiculo(id: number): Promise<Veiculo | undefined> {
  const db = await getDB();
  const row = await db.getFirstAsync("SELECT * FROM veiculos WHERE id=?", [id]);
  return row ? rowToVeiculo(row) : undefined;
}

// ── Rotas ─────────────────────────────────────────────────────

export async function listarRotas(): Promise<Rota[]> {
  const db = await getDB();
  const rows = await db.getAllAsync("SELECT * FROM rotas ORDER BY criadoEm DESC");
  return rows.map(rowToRota);
}

export async function buscarRota(id: number): Promise<Rota | undefined> {
  const db = await getDB();
  const row = await db.getFirstAsync("SELECT * FROM rotas WHERE id=?", [id]);
  return row ? rowToRota(row) : undefined;
}

export async function salvarRota(rota: Rota): Promise<number> {
  const db = await getDB();
  const itensJson = JSON.stringify(rota.itens);
  if (rota.id) {
    await db.runAsync(
      "UPDATE rotas SET data=?, veiculoId=?, veiculoPlaca=?, motorista=?, kmSaida=?, kmChegada=?, horaSaida=?, horaChegada=?, status=?, itens=? WHERE id=?",
      [rota.data, rota.veiculoId, rota.veiculoPlaca, rota.motorista, rota.kmSaida, rota.kmChegada ?? null, rota.horaSaida, rota.horaChegada ?? null, rota.status, itensJson, rota.id]
    );
    return rota.id;
  }
  const result = await db.runAsync(
    "INSERT INTO rotas (data, veiculoId, veiculoPlaca, motorista, kmSaida, kmChegada, horaSaida, horaChegada, status, itens, criadoEm) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
    [rota.data, rota.veiculoId, rota.veiculoPlaca, rota.motorista, rota.kmSaida, rota.kmChegada ?? null, rota.horaSaida, rota.horaChegada ?? null, rota.status, itensJson, new Date().toISOString()]
  );
  return result.lastInsertRowId;
}

export async function rotaEmAndamento(): Promise<Rota | undefined> {
  const db = await getDB();
  const row = await db.getFirstAsync("SELECT * FROM rotas WHERE status='em_andamento' LIMIT 1");
  return row ? rowToRota(row) : undefined;
}

// ── Abastecimentos ────────────────────────────────────────────

export async function listarAbastecimentosPorVeiculo(veiculoId: number): Promise<Abastecimento[]> {
  const db = await getDB();
  const rows = await db.getAllAsync(
    "SELECT * FROM abastecimentos WHERE veiculoId=? ORDER BY kmAtual DESC",
    [veiculoId]
  );
  return rows.map(rowToAbastecimento);
}

export async function listarAbastecimentosPorPeriodo(
  dataInicio: string,
  dataFim: string,
  veiculoId?: number
): Promise<Abastecimento[]> {
  const db = await getDB();
  let rows: any[];
  if (veiculoId !== undefined) {
    rows = await db.getAllAsync(
      "SELECT * FROM abastecimentos WHERE data>=? AND data<=? AND veiculoId=? ORDER BY data DESC",
      [dataInicio, dataFim, veiculoId]
    );
  } else {
    rows = await db.getAllAsync(
      "SELECT * FROM abastecimentos WHERE data>=? AND data<=? ORDER BY data DESC",
      [dataInicio, dataFim]
    );
  }
  return rows.map(rowToAbastecimento);
}

export async function buscarUltimoAbastecimento(
  veiculoId: number,
  kmMenorQue: number
): Promise<Abastecimento | undefined> {
  const db = await getDB();
  const row = await db.getFirstAsync(
    "SELECT * FROM abastecimentos WHERE veiculoId=? AND kmAtual<? ORDER BY kmAtual DESC LIMIT 1",
    [veiculoId, kmMenorQue]
  );
  return row ? rowToAbastecimento(row) : undefined;
}

export async function salvarAbastecimento(a: Abastecimento): Promise<number> {
  const db = await getDB();
  const dados = { ...a };

  if (!dados.id) {
    const anterior = await buscarUltimoAbastecimento(a.veiculoId, a.kmAtual);
    if (anterior) {
      const kmPercorridos = a.kmAtual - anterior.kmAtual;
      if (kmPercorridos > 0 && anterior.litros > 0) {
        dados.kmAnterior = anterior.kmAtual;
        dados.consumoKmL = kmPercorridos / anterior.litros;
        dados.custoKm = a.valorTotal / kmPercorridos;
      }
    }
    dados.criadoEm = new Date().toISOString();

    const veiculo = await buscarVeiculo(a.veiculoId);
    if (veiculo && (veiculo.kmAtual === undefined || a.kmAtual > veiculo.kmAtual)) {
      await salvarVeiculo({ ...veiculo, kmAtual: a.kmAtual });
    }

    const result = await db.runAsync(
      "INSERT INTO abastecimentos (veiculoId, veiculoPlaca, data, kmAtual, litros, valorTotal, tipoCombustivel, posto, observacao, kmAnterior, consumoKmL, custoKm, criadoEm) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [dados.veiculoId, dados.veiculoPlaca, dados.data, dados.kmAtual, dados.litros, dados.valorTotal, dados.tipoCombustivel, dados.posto ?? null, dados.observacao ?? null, dados.kmAnterior ?? null, dados.consumoKmL ?? null, dados.custoKm ?? null, dados.criadoEm]
    );
    return result.lastInsertRowId;
  }

  await db.runAsync(
    "UPDATE abastecimentos SET veiculoId=?, veiculoPlaca=?, data=?, kmAtual=?, litros=?, valorTotal=?, tipoCombustivel=?, posto=?, observacao=?, kmAnterior=?, consumoKmL=?, custoKm=? WHERE id=?",
    [dados.veiculoId, dados.veiculoPlaca, dados.data, dados.kmAtual, dados.litros, dados.valorTotal, dados.tipoCombustivel, dados.posto ?? null, dados.observacao ?? null, dados.kmAnterior ?? null, dados.consumoKmL ?? null, dados.custoKm ?? null, dados.id!]
  );
  return dados.id!;
}

export async function deletarAbastecimento(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync("DELETE FROM abastecimentos WHERE id=?", [id]);
}

// ── Manutenções ───────────────────────────────────────────────

export async function listarManutencoesPorVeiculo(veiculoId: number): Promise<Manutencao[]> {
  const db = await getDB();
  const rows = await db.getAllAsync(
    "SELECT * FROM manutencoes WHERE veiculoId=? ORDER BY kmAtual DESC",
    [veiculoId]
  );
  return rows.map(rowToManutencao);
}

export async function buscarUltimaManutencao(veiculoId: number): Promise<Manutencao | undefined> {
  const db = await getDB();
  const row = await db.getFirstAsync(
    "SELECT * FROM manutencoes WHERE veiculoId=? ORDER BY kmAtual DESC LIMIT 1",
    [veiculoId]
  );
  return row ? rowToManutencao(row) : undefined;
}

export async function salvarManutencao(m: Manutencao): Promise<number> {
  const db = await getDB();
  const itensJson = JSON.stringify(m.itensSubstituidos);

  if (m.id) {
    await db.runAsync(
      "UPDATE manutencoes SET veiculoId=?, veiculoPlaca=?, data=?, kmAtual=?, tipoOleo=?, itensSubstituidos=?, proximaTrocaKm=?, proximaTrocaData=?, observacao=? WHERE id=?",
      [m.veiculoId, m.veiculoPlaca, m.data, m.kmAtual, m.tipoOleo, itensJson, m.proximaTrocaKm ?? null, m.proximaTrocaData ?? null, m.observacao ?? null, m.id]
    );
    return m.id;
  }

  const veiculo = await buscarVeiculo(m.veiculoId);
  if (veiculo && (veiculo.kmAtual === undefined || m.kmAtual > veiculo.kmAtual)) {
    await salvarVeiculo({ ...veiculo, kmAtual: m.kmAtual });
  }

  const result = await db.runAsync(
    "INSERT INTO manutencoes (veiculoId, veiculoPlaca, data, kmAtual, tipoOleo, itensSubstituidos, proximaTrocaKm, proximaTrocaData, observacao, criadoEm) VALUES (?,?,?,?,?,?,?,?,?,?)",
    [m.veiculoId, m.veiculoPlaca, m.data, m.kmAtual, m.tipoOleo, itensJson, m.proximaTrocaKm ?? null, m.proximaTrocaData ?? null, m.observacao ?? null, new Date().toISOString()]
  );
  return result.lastInsertRowId;
}

export async function deletarManutencao(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync("DELETE FROM manutencoes WHERE id=?", [id]);
}

export function manutencaoVencida(ultima: Manutencao, kmAtual: number): boolean {
  if (ultima.proximaTrocaKm && kmAtual >= ultima.proximaTrocaKm) return true;
  if (ultima.proximaTrocaData) {
    const hoje = new Date().toISOString().split("T")[0];
    if (hoje >= ultima.proximaTrocaData) return true;
  }
  return false;
}

// ── Rotas Modelo ──────────────────────────────────────────────

export async function listarRotasModelo(): Promise<RotaModelo[]> {
  const db = await getDB();
  const rows = await db.getAllAsync("SELECT * FROM rotasModelo ORDER BY nome");
  return rows.map(rowToRotaModelo);
}

export async function salvarRotaModelo(m: RotaModelo): Promise<number> {
  const db = await getDB();
  const itensJson = JSON.stringify(m.itens);
  if (m.id) {
    await db.runAsync(
      "UPDATE rotasModelo SET nome=?, descricao=?, veiculoId=?, veiculoPlaca=?, itens=? WHERE id=?",
      [m.nome, m.descricao ?? null, m.veiculoId, m.veiculoPlaca, itensJson, m.id]
    );
    return m.id;
  }
  const result = await db.runAsync(
    "INSERT INTO rotasModelo (nome, descricao, veiculoId, veiculoPlaca, itens, criadoEm) VALUES (?,?,?,?,?,?)",
    [m.nome, m.descricao ?? null, m.veiculoId, m.veiculoPlaca, itensJson, new Date().toISOString()]
  );
  return result.lastInsertRowId;
}

export async function deletarRotaModelo(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync("DELETE FROM rotasModelo WHERE id=?", [id]);
}

// ── Helpers ───────────────────────────────────────────────────

export const TIPOS_OCORRENCIA: Record<TipoOcorrencia, string> = {
  recusa_cliente: "Recusa do Cliente",
  duplicidade: "Duplicidade (já entregue)",
  nao_localizado: "Endereço Não Localizado",
  cliente_ausente: "Cliente Ausente",
  produto_danificado: "Produto Danificado",
  produto_fora_sistema: "Produto Fora do Sistema",
  rota_errada: "Produto em Rota Errada",
  outro: "Outro",
};

export const TIPOS_COMBUSTIVEL: Record<TipoCombustivel, string> = {
  gasolina: "Gasolina",
  etanol: "Etanol",
  diesel: "Diesel",
  gnv: "GNV",
};

export const ITENS_SUBSTITUIDOS_LABELS: Record<ItemSubstituido, string> = {
  oleoMotor: "Óleo do Motor",
  oleoCambio: "Óleo do Câmbio",
  oleoDiferencial: "Óleo do Diferencial",
  filtroOleo: "Filtro de Óleo",
  filtroAr: "Filtro de Ar",
  filtroCabine: "Filtro de Cabine",
  filtroCombustivel: "Filtro de Combustível",
};

export function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function horaAtual(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function dataHojeISO(): string {
  return new Date().toISOString().split("T")[0];
}
