import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Truck, Package, CheckCircle2, AlertTriangle, Clock, MapPin, RotateCcw, Flag } from "lucide-react-native";
import PageHeader from "@/components/PageHeader";
import { buscarRota, Rota, ItemRota, TIPOS_OCORRENCIA, formatarData } from "@/lib/db";
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

export default function DetalheRotaPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [rota, setRota] = useState<Rota | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    buscarRota(Number(id)).then((r) => { setRota(r ?? null); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
        <PageHeader titulo="Detalhes da Rota" voltar="/historico" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#ee4d2d" />
        </View>
      </View>
    );
  }

  if (!rota) {
    return (
      <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
        <PageHeader titulo="Detalhes da Rota" voltar="/historico" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#9ca3af" }}>Rota não encontrada.</Text>
        </View>
      </View>
    );
  }

  const totalVolumes = rota.itens.reduce((s, i) => s + i.volumesSaida, 0);
  const totalEntregues = rota.itens.reduce((s, i) => s + (i.volumesEntregues ?? (i.concluido ? i.volumesSaida - (i.volumesDevolvidos ?? 0) : 0)), 0);
  const totalDevolvidos = rota.itens.reduce((s, i) => s + (i.volumesDevolvidos ?? 0), 0);
  const totalOcorrencias = rota.itens.reduce((s, i) => s + (i.ocorrencias?.length ?? 0), 0);
  const kmRodados = rota.kmChegada && rota.kmSaida ? rota.kmChegada - rota.kmSaida : null;
  const duracao = calcularDuracao(rota.horaSaida, rota.horaChegada);

  return (
    <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      <PageHeader titulo="Detalhes da Rota" voltar="/historico" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>
        {/* Banner */}
        <View style={{ backgroundColor: "#ee4d2d", paddingHorizontal: 16, paddingVertical: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <Truck size={18} color="#ffffff" />
            <Text style={{ fontWeight: "700", color: "#ffffff", fontSize: 16 }}>{rota.veiculoPlaca}</Text>
            <View style={{ backgroundColor: rota.status === "em_andamento" ? "#bfdbfe" : "rgba(255,255,255,0.2)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ fontSize: 11, fontWeight: "600", color: rota.status === "em_andamento" ? "#1e3a5f" : "#ffffff" }}>
                {rota.status === "em_andamento" ? "Em andamento" : "Concluída"}
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>{rota.motorista}</Text>
        </View>

        <View style={{ padding: 16, gap: 16 }}>
          {/* Resumo */}
          <View style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 16, gap: 12 }}>
            <Text style={{ fontWeight: "600", color: "#374151" }}>Resumo</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {[
                { label: "Data", valor: formatarData(rota.data) },
                { label: "Horário", valor: `${rota.horaSaida}${rota.horaChegada ? ` → ${rota.horaChegada}` : ""}` },
                { label: "Duração", valor: duracao },
                { label: "KM rodados", valor: kmRodados !== null ? `${kmRodados} km` : "—" },
              ].map((item) => (
                <View key={item.label} style={{ flex: 1, minWidth: "45%", backgroundColor: "#f9fafb", borderRadius: 12, padding: 12 }}>
                  <Text style={{ fontSize: 12, color: "#9ca3af" }}>{item.label}</Text>
                  <Text style={{ fontWeight: "600", color: "#111827", fontSize: 14 }}>{item.valor}</Text>
                </View>
              ))}
            </View>
            <View style={{ borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 12, gap: 8 }}>
              {[
                { icon: <Package size={15} color="#3b82f6" />, texto: `${totalVolumes} volumes saída` },
                { icon: <CheckCircle2 size={15} color="#22c55e" />, texto: `${totalEntregues} entregues` },
                ...(totalDevolvidos > 0 ? [{ icon: <RotateCcw size={15} color="#f59e0b" />, texto: `${totalDevolvidos} devolvidos` }] : []),
                ...(totalOcorrencias > 0 ? [{ icon: <AlertTriangle size={15} color="#ef4444" />, texto: `${totalOcorrencias} ocorrência(s)` }] : []),
              ].map((item, idx) => (
                <View key={idx} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  {item.icon}
                  <Text style={{ fontSize: 14, color: "#374151" }}>{item.texto}</Text>
                </View>
              ))}
            </View>
            <View style={{ borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 8, flexDirection: "row", gap: 16 }}>
              <Text style={{ fontSize: 12, color: "#9ca3af" }}>KM saída: {rota.kmSaida}</Text>
              {rota.kmChegada ? <Text style={{ fontSize: 12, color: "#9ca3af" }}>KM chegada: {rota.kmChegada}</Text> : null}
            </View>
          </View>

          {/* Paradas */}
          <View style={{ gap: 12 }}>
            <Text style={{ fontWeight: "600", color: "#374151", paddingHorizontal: 4 }}>Paradas</Text>
            {rota.itens.map((item: ItemRota, idx: number) => (
              <View key={idx} style={{ backgroundColor: "#ffffff", borderRadius: 16, overflow: "hidden", borderLeftWidth: 4, borderLeftColor: item.concluido ? "#22c55e" : "#e5e7eb" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
                  <View style={{ backgroundColor: item.concluido ? "#dcfce7" : "#f3f4f6", borderRadius: 16, padding: 6 }}>
                    <MapPin size={16} color={item.concluido ? "#16a34a" : "#9ca3af"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "600", color: "#111827" }}>{item.cidadeNome}</Text>
                    <Text style={{ fontSize: 12, color: "#9ca3af" }}>{item.entregadorNome}</Text>
                  </View>
                  {item.concluido && (
                    <View style={{ backgroundColor: "#dcfce7", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 11, fontWeight: "600", color: "#15803d" }}>Concluído</Text>
                    </View>
                  )}
                </View>
                <View style={{ padding: 16, gap: 8 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {[
                      { label: "Saída", valor: String(item.volumesSaida), bg: "#eff6ff", textColor: "#1d4ed8" },
                      { label: "Entregues", valor: String(item.volumesEntregues ?? (item.concluido ? item.volumesSaida - (item.volumesDevolvidos ?? 0) : "—")), bg: "#f0fdf4", textColor: "#15803d" },
                      { label: "Devolvidos", valor: String(item.volumesDevolvidos ?? 0), bg: "#fffbeb", textColor: "#b45309" },
                    ].map((col) => (
                      <View key={col.label} style={{ flex: 1, backgroundColor: col.bg, borderRadius: 10, padding: 8, alignItems: "center" }}>
                        <Text style={{ fontSize: 10, color: col.textColor, fontWeight: "500" }}>{col.label}</Text>
                        <Text style={{ fontWeight: "700", color: col.textColor, fontSize: 16 }}>{col.valor}</Text>
                      </View>
                    ))}
                  </View>
                  {item.concluido && item.horaConclusao && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Flag size={11} color="#22c55e" />
                      <Text style={{ fontSize: 12, color: "#6b7280" }}>Concluído às {item.horaConclusao}</Text>
                    </View>
                  )}
                  {(item.ocorrencias?.length ?? 0) > 0 && (
                    <View style={{ borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 8, gap: 6 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <AlertTriangle size={13} color="#f59e0b" />
                        <Text style={{ fontSize: 12, fontWeight: "600", color: "#b45309" }}>Ocorrências ({item.ocorrencias.length})</Text>
                      </View>
                      {item.ocorrencias.map((oco) => (
                        <View key={oco.id} style={{ backgroundColor: "#fffbeb", borderRadius: 8, padding: 10 }}>
                          <Text style={{ fontSize: 12, fontWeight: "600", color: "#92400e" }}>{TIPOS_OCORRENCIA[oco.tipo]} — {oco.quantidade}x</Text>
                          {oco.descricao ? <Text style={{ fontSize: 12, color: "#b45309", marginTop: 2 }}>{oco.descricao}</Text> : null}
                        </View>
                      ))}
                    </View>
                  )}
                  {(item.ocorrencias?.length ?? 0) === 0 && (
                    <Text style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic" }}>Sem ocorrências</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
