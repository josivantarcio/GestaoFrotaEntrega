import React, { useEffect, useState, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Clock, Truck, Package, CheckCircle2, AlertTriangle, ArrowRight, Filter, ChevronDown, ChevronUp, MapPin } from "lucide-react-native";
import PageHeader from "@/components/PageHeader";
import Input from "@/components/Input";
import { listarRotas, Rota, formatarData, dataHojeISO, isoParaBR, parseDateBR } from "@/lib/db";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function calcularDuracao(horaSaida: string, horaChegada?: string): string {
  if (!horaChegada) return "—";
  const [hS, mS] = horaSaida.split(":").map(Number);
  const [hC, mC] = horaChegada.split(":").map(Number);
  const totalMin = hC * 60 + mC - (hS * 60 + mS);
  if (totalMin <= 0) return "—";
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

function dataHaMesesISO(meses: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - meses);
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export default function HistoricoPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [dataInicio, setDataInicio] = useState(isoParaBR(dataHaMesesISO(1)));
  const [dataFim, setDataFim] = useState(isoParaBR(dataHojeISO()));
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "em_andamento" | "concluida">("todos");

  useEffect(() => {
    listarRotas().then((r) => { setRotas(r); setLoading(false); });
  }, []);

  const rotasFiltradas = useMemo(() => {
    const inicioISO = parseDateBR(dataInicio) ?? dataInicio;
    const fimISO = parseDateBR(dataFim) ?? dataFim;
    return rotas.filter((r) => {
      const dentroPeriodo = r.data >= inicioISO && r.data <= fimISO;
      const statusOk = filtroStatus === "todos" || r.status === filtroStatus;
      return dentroPeriodo && statusOk;
    });
  }, [rotas, dataInicio, dataFim, filtroStatus]);

  const totais = useMemo(() => {
    const concluidas = rotasFiltradas.filter((r) => r.status === "concluida");
    const kmTotal = concluidas.reduce((s, r) => s + (r.kmChegada && r.kmSaida ? r.kmChegada - r.kmSaida : 0), 0);
    const volumesTotal = rotasFiltradas.reduce((s, r) => s + r.itens.reduce((ss, i) => ss + i.volumesSaida, 0), 0);
    const ocorrenciasTotal = rotasFiltradas.reduce((s, r) => s + r.itens.reduce((ss, i) => ss + (i.ocorrencias?.length ?? 0), 0), 0);
    let minTotal = 0;
    concluidas.forEach((r) => {
      if (r.horaSaida && r.horaChegada) {
        const [hS, mS] = r.horaSaida.split(":").map(Number);
        const [hC, mC] = r.horaChegada.split(":").map(Number);
        const diff = hC * 60 + mC - (hS * 60 + mS);
        if (diff > 0) minTotal += diff;
      }
    });
    const tempoH = Math.floor(minTotal / 60);
    const tempoM = minTotal % 60;
    const tempoStr = tempoH > 0 ? `${tempoH}h ${tempoM}min` : minTotal > 0 ? `${tempoM}min` : "—";
    return { kmTotal, volumesTotal, ocorrenciasTotal, tempoStr, concluidas: concluidas.length };
  }, [rotasFiltradas]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
        <PageHeader titulo="Histórico" voltar="/" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#ee4d2d" />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      <PageHeader titulo="Histórico" voltar="/" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 16 }}>
        {/* Filtros */}
        <TouchableOpacity
          onPress={() => setFiltroAberto(!filtroAberto)}
          style={{ backgroundColor: "#ffffff", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Filter size={16} color="#ee4d2d" />
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}>Filtros</Text>
            {filtroStatus !== "todos" && (
              <View style={{ backgroundColor: "#ee4d2d", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontSize: 11, color: "#ffffff" }}>{filtroStatus === "em_andamento" ? "Em andamento" : "Concluídas"}</Text>
              </View>
            )}
          </View>
          {filtroAberto ? <ChevronUp size={16} color="#9ca3af" /> : <ChevronDown size={16} color="#9ca3af" />}
        </TouchableOpacity>

        {filtroAberto && (
          <View style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 16, gap: 12 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: "500", color: "#4b5563", marginBottom: 4 }}>Data início</Text>
                <Input value={dataInicio} onChangeText={setDataInicio} placeholder="DD/MM/AAAA" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: "500", color: "#4b5563", marginBottom: 4 }}>Data fim</Text>
                <Input value={dataFim} onChangeText={setDataFim} placeholder="DD/MM/AAAA" />
              </View>
            </View>

            <View>
              <Text style={{ fontSize: 12, fontWeight: "500", color: "#4b5563", marginBottom: 4 }}>Status</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(["todos", "em_andamento", "concluida"] as const).map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setFiltroStatus(s)}
                    style={{ flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: "center", backgroundColor: filtroStatus === s ? "#ee4d2d" : "#ffffff", borderColor: filtroStatus === s ? "#ee4d2d" : "#e5e7eb" }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "600", color: filtroStatus === s ? "#ffffff" : "#4b5563" }}>
                      {s === "todos" ? "Todos" : s === "em_andamento" ? "Andamento" : "Concluídas"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {[{ label: "7 dias", dias: 7, meses: 0 }, { label: "30 dias", dias: 0, meses: 1 }, { label: "3 meses", dias: 0, meses: 3 }].map(({ label, dias, meses }) => (
                <TouchableOpacity
                  key={label}
                  onPress={() => {
                    const d = new Date();
                    if (dias > 0) d.setDate(d.getDate() - dias); else d.setMonth(d.getMonth() - meses);
                    const ano = d.getFullYear(), mes = String(d.getMonth() + 1).padStart(2, "0"), dia = String(d.getDate()).padStart(2, "0");
                    setDataInicio(isoParaBR(`${ano}-${mes}-${dia}`));
                    setDataFim(isoParaBR(dataHojeISO()));
                  }}
                  style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
                >
                  <Text style={{ fontSize: 12, color: "#4b5563", fontWeight: "500" }}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Totalizadores */}
        {rotasFiltradas.length > 0 && (
          <View style={{ backgroundColor: "#ee4d2d", borderRadius: 16, padding: 16 }}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.7)", textTransform: "uppercase", marginBottom: 8, letterSpacing: 0.5 }}>
              Totais do período — {rotasFiltradas.length} rota(s)
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {[
                { label: "KM rodados", valor: `${totais.kmTotal} km` },
                { label: "Volumes saída", valor: String(totais.volumesTotal) },
                { label: "Tempo em rota", valor: totais.tempoStr },
                { label: "Ocorrências", valor: String(totais.ocorrenciasTotal) },
              ].map((item) => (
                <View key={item.label} style={{ flex: 1, minWidth: "45%", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10, padding: 10 }}>
                  <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}>{item.label}</Text>
                  <Text style={{ fontWeight: "700", fontSize: 16, color: "#ffffff" }}>{item.valor}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {rotasFiltradas.length === 0 && (
          <View style={{ alignItems: "center", paddingVertical: 48 }}>
            <Clock size={44} color="#d1d5db" />
            <Text style={{ fontWeight: "500", color: "#9ca3af", marginTop: 12 }}>Nenhuma rota no período</Text>
            <Text style={{ fontSize: 13, color: "#d1d5db" }}>Ajuste os filtros para ver outras rotas</Text>
          </View>
        )}

        {rotasFiltradas.map((rota) => {
          const totalVolumes = rota.itens.reduce((s, i) => s + i.volumesSaida, 0);
          const totalEntregues = rota.itens.reduce((s, i) => s + (i.volumesEntregues ?? (i.concluido ? i.volumesSaida - (i.volumesDevolvidos ?? 0) : 0)), 0);
          const totalDevolucoes = rota.itens.reduce((s, i) => s + (i.volumesDevolvidos ?? 0), 0);
          const totalOcorrencias = rota.itens.reduce((s, i) => s + (i.ocorrencias?.length ?? 0), 0);
          const kmRodados = rota.kmChegada && rota.kmSaida ? rota.kmChegada - rota.kmSaida : null;
          const duracao = calcularDuracao(rota.horaSaida, rota.horaChegada);

          return (
            <TouchableOpacity
              key={rota.id}
              onPress={() => router.push((rota.status === "em_andamento" ? `/rota/${rota.id}` : `/historico/${rota.id}`) as any)}
              activeOpacity={0.8}
            >
              <View style={{ backgroundColor: "#ffffff", borderRadius: 16, overflow: "hidden", borderLeftWidth: 4, borderLeftColor: "#ee4d2d" }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Truck size={16} color="#ee4d2d" />
                    <Text style={{ fontWeight: "700", color: "#111827" }}>{rota.veiculoPlaca}</Text>
                    <View style={{ backgroundColor: rota.status === "em_andamento" ? "#dbeafe" : "#dcfce7", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 11, fontWeight: "600", color: rota.status === "em_andamento" ? "#1d4ed8" : "#15803d" }}>
                        {rota.status === "em_andamento" ? "Em andamento" : "Concluída"}
                      </Text>
                    </View>
                  </View>
                  <ArrowRight size={16} color="#9ca3af" />
                </View>

                <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 13, color: "#9ca3af" }}>{formatarData(rota.data)}</Text>
                    <Text style={{ fontSize: 13, color: "#9ca3af" }}>
                      {rota.horaSaida}{rota.horaChegada ? ` → ${rota.horaChegada}` : ""}
                      {duracao !== "—" ? ` (${duracao})` : ""}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, color: "#374151" }}>Motorista: {rota.motorista}</Text>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Package size={13} color="#3b82f6" />
                      <Text style={{ fontSize: 12, color: "#4b5563" }}>{totalVolumes} vol.</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <CheckCircle2 size={13} color="#22c55e" />
                      <Text style={{ fontSize: 12, color: "#4b5563" }}>{totalEntregues} entregues</Text>
                    </View>
                    {totalDevolucoes > 0 && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <AlertTriangle size={13} color="#f59e0b" />
                        <Text style={{ fontSize: 12, color: "#4b5563" }}>{totalDevolucoes} dev.</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: "row", gap: 12, borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 8, flexWrap: "wrap" }}>
                    <Text style={{ fontSize: 12, color: "#6b7280" }}>KM saída: {rota.kmSaida}</Text>
                    {rota.kmChegada ? <Text style={{ fontSize: 12, color: "#6b7280" }}>Chegada: {rota.kmChegada}</Text> : null}
                    {kmRodados !== null && <Text style={{ fontSize: 12, fontWeight: "600", color: "#374151" }}>{kmRodados} km rodados</Text>}
                    {totalOcorrencias > 0 && <Text style={{ fontSize: 12, fontWeight: "500", color: "#d97706" }}>{totalOcorrencias} ocorrência(s)</Text>}
                  </View>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                    {rota.itens.map((item, idx) => (
                      <View key={idx} style={{ backgroundColor: item.concluido ? "#dcfce7" : "#f3f4f6", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, flexDirection: "row", alignItems: "center", gap: 3 }}>
                        <MapPin size={9} color={item.concluido ? "#16a34a" : "#9ca3af"} />
                        <Text style={{ fontSize: 11, color: item.concluido ? "#15803d" : "#6b7280" }}>{item.cidadeNome}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
