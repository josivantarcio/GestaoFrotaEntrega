import { Linking } from "react-native";
import { Rota, ItemRota, Abastecimento, Manutencao, Veiculo, TIPOS_COMBUSTIVEL, ITENS_SUBSTITUIDOS_LABELS, TIPOS_OCORRENCIA } from "./db";

function dataBR(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function reais(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function kmL(valor: number): string {
  return valor.toFixed(1).replace(".", ",");
}

const RODAPE = "_RouteLog · Josevan Oliveira_";

export function mensagemSaidaRota(rota: Rota): string {
  const totalVolumes = rota.itens.reduce((s, i) => s + i.volumesSaida, 0);
  const paradas = rota.itens
    .map((item, i) => `${i + 1}. ${item.cidadeNome} — ${item.volumesSaida} vol. (${item.entregadorNome})`)
    .join("\n");

  return (
    `*SAÍDA DE ROTA* — ${dataBR(rota.data)} às ${rota.horaSaida}\n` +
    `Veículo: *${rota.veiculoPlaca}* · Motorista: *${rota.motorista}*\n` +
    `Volumes: *${totalVolumes}* · KM saída: *${rota.kmSaida}*\n` +
    `\n` +
    `*Roteiro:*\n${paradas}\n` +
    `\n${RODAPE}`
  );
}

export function mensagemCidadeConcluida(rota: Rota, item: ItemRota): string {
  const devolvidos = item.volumesDevolvidos ?? 0;
  const entregues = item.volumesEntregues ?? item.volumesSaida - devolvidos;
  const ocorrencias = item.ocorrencias ?? [];
  const concluidas = rota.itens.filter((i) => i.concluido).length;

  let linhaOcorrencias = "";
  if (ocorrencias.length > 0) {
    const resumo = ocorrencias
      .map((o) => `  • ${TIPOS_OCORRENCIA[o.tipo]}${o.quantidade > 1 ? ` (${o.quantidade}x)` : ""}`)
      .join("\n");
    linhaOcorrencias = `\nOcorrências:\n${resumo}\n`;
  }

  return (
    `*ENTREGA CONCLUÍDA* — ${item.cidadeNome}\n` +
    `Entregador: ${item.entregadorNome} · ${item.horaConclusao ?? ""}\n` +
    `Entregues: *${entregues}* | Devolvidos: *${devolvidos}*\n` +
    `Progresso: ${concluidas}/${rota.itens.length} cidades` +
    linhaOcorrencias +
    `\n${RODAPE}`
  );
}

export function mensagemEncerramentoRota(rota: Rota, consumoMedioVeiculo?: number, alertaManutencao?: boolean): string {
  const totalVolumes = rota.itens.reduce((s, i) => s + i.volumesSaida, 0);
  const totalEntregues = rota.itens.reduce(
    (s, i) => s + (i.volumesEntregues ?? i.volumesSaida - (i.volumesDevolvidos ?? 0)),
    0
  );
  const totalDevolvidos = rota.itens.reduce((s, i) => s + (i.volumesDevolvidos ?? 0), 0);
  const totalOcorrencias = rota.itens.reduce((s, i) => s + (i.ocorrencias?.length ?? 0), 0);
  const kmRodados = rota.kmChegada && rota.kmSaida ? rota.kmChegada - rota.kmSaida : null;

  const paradas = rota.itens
    .map((item) => {
      const dev = item.volumesDevolvidos ?? 0;
      const ent = item.volumesEntregues ?? item.volumesSaida - dev;
      const ocos = item.ocorrencias?.length ?? 0;
      const status = item.concluido ? "✓" : "✗";
      return `${status} ${item.cidadeNome}: ${ent}/${item.volumesSaida} entregues${dev > 0 ? `, ${dev} dev.` : ""}${ocos > 0 ? `, ${ocos} ocorr.` : ""}`;
    })
    .join("\n");

  return (
    `*ROTA ENCERRADA* — ${dataBR(rota.data)}\n` +
    `Veículo: *${rota.veiculoPlaca}* · Motorista: *${rota.motorista}*\n` +
    `Saída: *${rota.horaSaida}* → Chegada: *${rota.horaChegada ?? "--"}*\n` +
    (kmRodados !== null ? `KM rodados: *${kmRodados} km*\n` : "") +
    (consumoMedioVeiculo !== undefined ? `Consumo médio: *${kmL(consumoMedioVeiculo)} km/L*\n` : "") +
    (alertaManutencao ? `⚠️ *Manutenção vencida — verificar!*\n` : "") +
    `\n` +
    `Volumes: *${totalEntregues}/${totalVolumes}* entregues${totalDevolvidos > 0 ? ` · ${totalDevolvidos} devolvidos` : ""}${totalOcorrencias > 0 ? ` · ${totalOcorrencias} ocorrências` : ""}\n` +
    `\n${paradas}\n` +
    `\n${RODAPE}`
  );
}

export function mensagemAbastecimento(a: Abastecimento, veiculo: Veiculo): string {
  const combustivel = TIPOS_COMBUSTIVEL[a.tipoCombustivel];
  return (
    `*ABASTECIMENTO* — ${veiculo.placa}\n` +
    `${dataBR(a.data)} · KM ${a.kmAtual.toLocaleString("pt-BR")}\n` +
    `${combustivel}: *${a.litros.toFixed(2).replace(".", ",")} L* · *${reais(a.valorTotal)}*\n` +
    (a.posto ? `Posto: ${a.posto}\n` : "") +
    (a.consumoKmL !== undefined
      ? `Consumo: *${kmL(a.consumoKmL)} km/L*${a.custoKm !== undefined ? ` · *${reais(a.custoKm)}/km*` : ""}\n`
      : "") +
    (a.observacao ? `Obs: ${a.observacao}\n` : "") +
    `\n${RODAPE}`
  );
}

export function mensagemManutencao(m: Manutencao, veiculo: Veiculo): string {
  const itens = m.itensSubstituidos
    .map((i) => `  • ${ITENS_SUBSTITUIDOS_LABELS[i]}`)
    .join("\n");

  const proximaTroca =
    m.proximaTrocaKm || m.proximaTrocaData
      ? `Próxima troca:${m.proximaTrocaKm ? ` KM ${m.proximaTrocaKm.toLocaleString("pt-BR")}` : ""}${m.proximaTrocaData ? ` · ${dataBR(m.proximaTrocaData)}` : ""}\n`
      : "";

  return (
    `*MANUTENÇÃO* — ${veiculo.placa}\n` +
    `${dataBR(m.data)} · KM ${m.kmAtual.toLocaleString("pt-BR")}\n` +
    `Óleo: *${m.tipoOleo}*\n` +
    `\nItens substituídos:\n${itens}\n` +
    (proximaTroca ? `\n${proximaTroca}` : "") +
    (m.observacao ? `Obs: ${m.observacao}\n` : "") +
    `\n${RODAPE}`
  );
}

export function mensagemRelatorioAbastecimentos(
  veiculo: Veiculo | null,
  dataInicio: string,
  dataFim: string,
  lista: Abastecimento[]
): string {
  const totalGasto = lista.reduce((s, a) => s + a.valorTotal, 0);
  const totalLitros = lista.reduce((s, a) => s + a.litros, 0);
  const comConsumo = lista.filter((a) => a.consumoKmL !== undefined);
  const consumoMedio =
    comConsumo.length > 0
      ? comConsumo.reduce((s, a) => s + a.consumoKmL!, 0) / comConsumo.length
      : null;

  const historico = lista
    .map(
      (a) =>
        `${dataBR(a.data)} · KM ${a.kmAtual} · ${a.litros.toFixed(1).replace(".", ",")}L · ${reais(a.valorTotal)}` +
        (a.consumoKmL !== undefined ? ` · ${kmL(a.consumoKmL)} km/L` : "")
    )
    .join("\n");

  return (
    `*ABASTECIMENTOS* — ${dataBR(dataInicio)} a ${dataBR(dataFim)}\n` +
    (veiculo ? `Veículo: *${veiculo.placa}* — ${veiculo.modelo}\n` : `Veículo: *Todos*\n`) +
    `\n` +
    `Total gasto: *${reais(totalGasto)}* · Litros: *${totalLitros.toFixed(1).replace(".", ",")} L*\n` +
    (consumoMedio !== null ? `Consumo médio: *${kmL(consumoMedio)} km/L*\n` : "") +
    `Registros: *${lista.length}*\n` +
    (lista.length > 0 ? `\n${historico}\n` : "") +
    `\n${RODAPE}`
  );
}

export function mensagemRelatorioManutencoes(veiculo: Veiculo, lista: Manutencao[]): string {
  const historico = lista
    .map(
      (m) =>
        `${dataBR(m.data)} · KM ${m.kmAtual} · ${m.tipoOleo}\n` +
        `  ${m.itensSubstituidos.map((i) => ITENS_SUBSTITUIDOS_LABELS[i]).join(", ")}`
    )
    .join("\n");

  return (
    `*MANUTENÇÕES* — ${veiculo.placa} · ${veiculo.modelo}\n` +
    `Registros: *${lista.length}*\n` +
    (lista.length > 0 ? `\n${historico}\n` : "") +
    `\n${RODAPE}`
  );
}

export async function abrirWhatsApp(mensagem: string, telefone?: string): Promise<void> {
  const texto = encodeURIComponent(mensagem);
  const url = telefone
    ? `https://wa.me/${telefone}?text=${texto}`
    : `https://wa.me/?text=${texto}`;
  const whatsappUrl = telefone
    ? `whatsapp://send?phone=${telefone}&text=${texto}`
    : `whatsapp://send?text=${texto}`;

  try {
    const canOpen = await Linking.canOpenURL(whatsappUrl);
    if (canOpen) {
      await Linking.openURL(whatsappUrl);
    } else {
      await Linking.openURL(url);
    }
  } catch {
    await Linking.openURL(url);
  }
}
