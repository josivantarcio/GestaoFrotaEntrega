import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { Share2, Fuel, Wrench, BarChart2 } from "lucide-react-native";
import PageHeader from "@/components/PageHeader";
import Input from "@/components/Input";
import SelectModal from "@/components/SelectModal";
import {
  listarVeiculos,
  listarAbastecimentosPorPeriodo,
  listarManutencoesPorVeiculo,
  dataHojeISO,
  isoParaBR,
  parseDateBR,
  Veiculo,
  Abastecimento,
  Manutencao,
  TIPOS_COMBUSTIVEL,
  ITENS_SUBSTITUIDOS_LABELS,
} from "@/lib/db";
import {
  mensagemAbastecimento,
  mensagemManutencao,
  mensagemRelatorioAbastecimentos,
  mensagemRelatorioManutencoes,
  abrirWhatsApp,
} from "@/lib/whatsapp";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AbaAtiva = "abastecimentos" | "manutencoes";

function primeiroDoMesISO(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function RelatoriosPage() {
  const insets = useSafeAreaInsets();
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [veiculoId, setVeiculoId] = useState<string>("todos");
  const [dataInicio, setDataInicio] = useState(isoParaBR(primeiroDoMesISO()));
  const [dataFim, setDataFim] = useState(isoParaBR(dataHojeISO()));
  const [aba, setAba] = useState<AbaAtiva>("abastecimentos");
  const [abastecimentos, setAbastecimentos] = useState<Abastecimento[]>([]);
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
  const [loading, setLoading] = useState(false);

  const veiculoOptions = [
    { value: "todos", label: "Todos os veículos" },
    ...veiculos.map((v) => ({ value: String(v.id), label: `${v.placa} — ${v.modelo}` })),
  ];

  useEffect(() => {
    async function init() {
      const vs = await listarVeiculos();
      setVeiculos(vs);
      await buscarDados("todos", dataInicio, dataFim, vs);
    }
    init();
  }, []);

  useEffect(() => {
    if (veiculos.length > 0) {
      buscarDados(veiculoId, dataInicio, dataFim, veiculos);
    }
  }, [veiculoId, dataInicio, dataFim]);

  async function buscarDados(vid: string, di: string, df: string, vs: Veiculo[]) {
    setLoading(true);
    try {
      const vidNum = vid === "todos" ? undefined : Number(vid);
      const diISO = parseDateBR(di) ?? di;
      const dfISO = parseDateBR(df) ?? df;
      const [abs, mans] = await Promise.all([
        listarAbastecimentosPorPeriodo(diISO, dfISO, vidNum),
        vidNum !== undefined
          ? listarManutencoesPorVeiculo(vidNum).then((list) =>
              list.filter((m) => m.data >= diISO && m.data <= dfISO)
            )
          : Promise.all(vs.map((v) => listarManutencoesPorVeiculo(v.id!))).then(
              (listas) => listas.flat().filter((m) => m.data >= diISO && m.data <= dfISO)
            ),
      ]);
      setAbastecimentos(abs);
      setManutencoes(mans);
    } finally {
      setLoading(false);
    }
  }

  const totalGasto = abastecimentos.reduce((s, a) => s + a.valorTotal, 0);
  const totalLitros = abastecimentos.reduce((s, a) => s + a.litros, 0);
  const comConsumo = abastecimentos.filter((a) => a.consumoKmL !== undefined);
  const consumoMedio =
    comConsumo.length > 0
      ? comConsumo.reduce((s, a) => s + a.consumoKmL!, 0) / comConsumo.length
      : null;

  const veiculoSelecionado = veiculos.find((v) => String(v.id) === veiculoId) ?? null;

  function compartilharAbastecimentos() {
    const diISO = parseDateBR(dataInicio) ?? dataInicio;
    const dfISO = parseDateBR(dataFim) ?? dataFim;
    const msg = mensagemRelatorioAbastecimentos(veiculoSelecionado, diISO, dfISO, abastecimentos);
    abrirWhatsApp(msg);
  }

  function compartilharManutencoes() {
    if (!veiculoSelecionado) return;
    const msg = mensagemRelatorioManutencoes(veiculoSelecionado, manutencoes);
    abrirWhatsApp(msg);
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      <PageHeader titulo="Relatórios" voltar="/" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 16 }}>
        {/* Filtros */}
        <View style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 16, gap: 12 }}>
          <Text style={{ fontWeight: "600", color: "#374151", fontSize: 14 }}>Filtros</Text>
          <SelectModal
            label="Veículo"
            value={veiculoId}
            options={veiculoOptions}
            onChange={setVeiculoId}
            placeholder="Selecione o veículo"
          />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: "500", color: "#4b5563", marginBottom: 4 }}>De</Text>
              <Input value={dataInicio} onChangeText={setDataInicio} placeholder="DD/MM/AAAA" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: "500", color: "#4b5563", marginBottom: 4 }}>Até</Text>
              <Input value={dataFim} onChangeText={setDataFim} placeholder="DD/MM/AAAA" />
            </View>
          </View>
        </View>

        {/* Card resumo combustível */}
        <View style={{ backgroundColor: "#fff5f3", borderWidth: 1, borderColor: "#fecaca", borderRadius: 16, padding: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <BarChart2 size={18} color="#ee4d2d" />
              <Text style={{ fontWeight: "700", color: "#ee4d2d", fontSize: 14 }}>Resumo — Combustível</Text>
            </View>
            <TouchableOpacity
              onPress={compartilharAbastecimentos}
              style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f0fdf4", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
            >
              <Share2 size={12} color="#15803d" />
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#15803d" }}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[
              { label: "Total gasto", valor: totalGasto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
              { label: "Total litros", valor: `${totalLitros.toFixed(1).replace(".", ",")} L` },
              { label: "Consumo", valor: consumoMedio !== null ? `${consumoMedio.toFixed(1).replace(".", ",")} km/L` : "—" },
            ].map((stat) => (
              <View key={stat.label} style={{ flex: 1, backgroundColor: "#ffffff", borderRadius: 12, padding: 10, alignItems: "center" }}>
                <Text style={{ fontSize: 10, color: "#9ca3af" }}>{stat.label}</Text>
                <Text style={{ fontWeight: "700", color: "#1f2937", fontSize: 13 }}>{stat.valor}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: "row", backgroundColor: "#f3f4f6", padding: 4, borderRadius: 12, gap: 4 }}>
          {(["abastecimentos", "manutencoes"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setAba(tab)}
              style={{
                flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
                paddingVertical: 8, borderRadius: 10,
                backgroundColor: aba === tab ? "#ffffff" : "transparent",
              }}
            >
              {tab === "abastecimentos" ? <Fuel size={14} color={aba === tab ? "#ee4d2d" : "#9ca3af"} /> : <Wrench size={14} color={aba === tab ? "#ee4d2d" : "#9ca3af"} />}
              <Text style={{ fontSize: 13, fontWeight: "600", color: aba === tab ? "#ee4d2d" : "#9ca3af" }}>
                {tab === "abastecimentos" ? "Abastecimentos" : "Manutenções"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Conteúdo */}
        {loading && (
          <View style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 24, alignItems: "center" }}>
            <ActivityIndicator color="#ee4d2d" />
          </View>
        )}

        {!loading && aba === "abastecimentos" && (
          <View style={{ gap: 8 }}>
            {abastecimentos.length === 0 && (
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <Fuel size={36} color="#d1d5db" />
                <Text style={{ fontSize: 13, color: "#9ca3af", marginTop: 8 }}>Nenhum abastecimento no período</Text>
              </View>
            )}
            {abastecimentos.map((a) => (
              <View key={a.id} style={{ backgroundColor: "#ffffff", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "700", color: "#1f2937", fontSize: 13 }}>
                      {a.veiculoPlaca} · {a.data.split("-").reverse().join("/")}
                    </Text>
                    <Text style={{ fontSize: 13, color: "#4b5563" }}>
                      {TIPOS_COMBUSTIVEL[a.tipoCombustivel]} · {a.litros.toFixed(2).replace(".", ",")} L ·{" "}
                      {a.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </Text>
                    <Text style={{ fontSize: 12, color: "#9ca3af" }}>KM {a.kmAtual.toLocaleString("pt-BR")}</Text>
                    {a.consumoKmL !== undefined && (
                      <View style={{ backgroundColor: "#dcfce7", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start", marginTop: 4 }}>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: "#15803d" }}>
                          ⚡ {a.consumoKmL.toFixed(2).replace(".", ",")} km/L
                        </Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      const v = veiculos.find((x) => x.id === a.veiculoId);
                      if (v) abrirWhatsApp(mensagemAbastecimento(a, v));
                    }}
                    style={{ padding: 6 }}
                  >
                    <Share2 size={15} color="#16a34a" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {!loading && aba === "manutencoes" && (
          <View style={{ gap: 8 }}>
            {manutencoes.length === 0 && (
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <Wrench size={36} color="#d1d5db" />
                <Text style={{ fontSize: 13, color: "#9ca3af", marginTop: 8 }}>Nenhuma manutenção no período</Text>
              </View>
            )}
            {veiculoSelecionado && manutencoes.length > 0 && (
              <TouchableOpacity
                onPress={compartilharManutencoes}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#f0fdf4", paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "#bbf7d0" }}
              >
                <Share2 size={15} color="#15803d" />
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#15803d" }}>Compartilhar histórico no WhatsApp</Text>
              </TouchableOpacity>
            )}
            {manutencoes.map((m) => (
              <View key={m.id} style={{ backgroundColor: "#ffffff", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "700", color: "#1f2937", fontSize: 13 }}>
                      {m.veiculoPlaca} · {m.data.split("-").reverse().join("/")}
                    </Text>
                    <Text style={{ fontSize: 13, color: "#4b5563" }}>🛢️ {m.tipoOleo} · KM {m.kmAtual.toLocaleString("pt-BR")}</Text>
                    <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                      {m.itensSubstituidos.map((i) => ITENS_SUBSTITUIDOS_LABELS[i]).join(", ")}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      const v = veiculos.find((x) => x.id === m.veiculoId);
                      if (v) abrirWhatsApp(mensagemManutencao(m, v));
                    }}
                    style={{ padding: 6 }}
                  >
                    <Share2 size={15} color="#16a34a" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
