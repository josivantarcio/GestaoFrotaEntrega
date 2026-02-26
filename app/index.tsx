import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Truck,
  Package,
  AlertTriangle,
  CheckCircle2,
  Plus,
  ArrowRight,
  Wrench,
  BarChart2,
  MapPin,
  TrendingUp,
} from "lucide-react-native";
import {
  rotaEmAndamento,
  listarRotas,
  listarVeiculos,
  buscarUltimaManutencao,
  manutencaoVencida,
  dataHojeISO,
  Rota,
} from "@/lib/db";
import BarChart from "@/components/BarChart";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function ultimosDias(n: number): string[] {
  const dias: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    dias.push(`${ano}-${mes}-${dia}`);
  }
  return dias;
}

interface Insight {
  tipo: "alerta" | "info" | "sucesso";
  texto: string;
  icone: string;
}

function gerarInsights(rotas: Rota[]): Insight[] {
  const insights: Insight[] = [];
  if (rotas.length < 2) return insights;

  const hoje = new Date();
  const d30 = new Date(hoje);
  d30.setDate(d30.getDate() - 30);
  const inicio30 = `${d30.getFullYear()}-${String(d30.getMonth() + 1).padStart(2, "0")}-${String(d30.getDate()).padStart(2, "0")}`;
  const rotas30 = rotas.filter((r) => r.data >= inicio30 && r.status === "concluida");

  if (rotas30.length === 0) return insights;

  const ocsPorEntregador: Record<string, number> = {};
  rotas30.forEach((r) =>
    r.itens.forEach((i) => {
      const qtd = (i.ocorrencias ?? []).reduce((s, o) => s + o.quantidade, 0);
      if (qtd > 0) {
        ocsPorEntregador[i.entregadorNome] = (ocsPorEntregador[i.entregadorNome] ?? 0) + qtd;
      }
    })
  );
  const topEntregador = Object.entries(ocsPorEntregador).sort((a, b) => b[1] - a[1])[0];
  if (topEntregador && topEntregador[1] >= 3) {
    insights.push({ tipo: "alerta", icone: "⚠️", texto: `${topEntregador[0]} acumulou ${topEntregador[1]} ocorrências nos últimos 30 dias. Atenção recomendada.` });
  }

  const kmsRotas = rotas30.filter((r) => r.kmChegada && r.kmSaida).map((r) => r.kmChegada! - r.kmSaida);
  if (kmsRotas.length >= 3) {
    const mediaKm = kmsRotas.reduce((a, b) => a + b, 0) / kmsRotas.length;
    const ultimaKm = kmsRotas[0];
    if (ultimaKm > mediaKm * 1.3) {
      insights.push({ tipo: "alerta", icone: "🛣️", texto: `Última rota rodou ${ultimaKm} km — 30% acima da média (${Math.round(mediaKm)} km).` });
    } else {
      insights.push({ tipo: "info", icone: "📏", texto: `Média de KM por rota nos últimos 30 dias: ${Math.round(mediaKm)} km.` });
    }
  }

  const totalSaida = rotas30.reduce((s, r) => s + r.itens.reduce((ss, i) => ss + i.volumesSaida, 0), 0);
  const totalDev = rotas30.reduce((s, r) => s + r.itens.reduce((ss, i) => ss + (i.volumesDevolvidos ?? 0), 0), 0);
  if (totalSaida > 0) {
    const taxaDev = (totalDev / totalSaida) * 100;
    if (taxaDev > 10) {
      insights.push({ tipo: "alerta", icone: "↩️", texto: `Taxa de devolução em ${taxaDev.toFixed(1)}% nos últimos 30 dias (${totalDev}/${totalSaida} volumes).` });
    } else if (taxaDev === 0) {
      insights.push({ tipo: "sucesso", icone: "✅", texto: `Nenhuma devolução registrada nos últimos 30 dias. Ótimo desempenho!` });
    } else {
      insights.push({ tipo: "info", icone: "📦", texto: `Taxa de devolução: ${taxaDev.toFixed(1)}% — ${totalDev} volumes devolvidos.` });
    }
  }

  return insights.slice(0, 4);
}

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [rotaAtiva, setRotaAtiva] = useState<Rota | null>(null);
  const [todasRotas, setTodasRotas] = useState<Rota[]>([]);
  const [alertasManutencao, setAlertasManutencao] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        const [ativa, todas, veiculos] = await Promise.all([
          rotaEmAndamento(),
          listarRotas(),
          listarVeiculos(),
        ]);
        setRotaAtiva(ativa ?? null);
        setTodasRotas(todas);

        let alertas = 0;
        await Promise.all(
          veiculos.filter((v) => v.ativo).map(async (v) => {
            if (!v.id) return;
            const ultima = await buscarUltimaManutencao(v.id);
            if (ultima && manutencaoVencida(ultima, v.kmAtual ?? ultima.kmAtual)) alertas++;
          })
        );
        setAlertasManutencao(alertas);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, []);

  const hoje = dataHojeISO();
  const rotasHoje = todasRotas.filter((r) => r.data === hoje);
  const totalVolumesHoje = rotasHoje.reduce((s, r) => s + r.itens.reduce((ss, i) => ss + i.volumesSaida, 0), 0);
  const totalDevolucoes = rotasHoje.reduce((s, r) => s + r.itens.reduce((ss, i) => ss + (i.volumesDevolvidos ?? 0), 0), 0);
  const cidadesConcluidas = rotasHoje.reduce((s, r) => s + r.itens.filter((i) => i.concluido).length, 0);

  const ultimos7 = ultimosDias(7);
  const dadosGraficoSemana = ultimos7.map((data) => {
    const rotasDia = todasRotas.filter((r) => r.data === data);
    const volumes = rotasDia.reduce((s, r) => s + r.itens.reduce((ss, i) => ss + i.volumesSaida, 0), 0);
    const km = rotasDia.reduce((s, r) => s + (r.kmChegada && r.kmSaida ? r.kmChegada - r.kmSaida : 0), 0);
    return { label: DIAS_SEMANA[new Date(data + "T12:00:00").getDay()], value: volumes, secondaryValue: km };
  });

  const d30 = new Date();
  d30.setDate(d30.getDate() - 30);
  const inicio30 = `${d30.getFullYear()}-${String(d30.getMonth() + 1).padStart(2, "0")}-${String(d30.getDate()).padStart(2, "0")}`;
  const rotas30 = todasRotas.filter((r) => r.data >= inicio30);
  const ocorrenciasPorTipo: Record<string, number> = {};
  rotas30.forEach((r) =>
    r.itens.forEach((i) =>
      (i.ocorrencias ?? []).forEach((o) => {
        ocorrenciasPorTipo[o.tipo] = (ocorrenciasPorTipo[o.tipo] ?? 0) + o.quantidade;
      })
    )
  );
  const LABELS_OCORRENCIA: Record<string, string> = {
    recusa_cliente: "Recusa", duplicidade: "Duplic.", nao_localizado: "N.Local.",
    cliente_ausente: "Ausente", produto_danificado: "Danif.", produto_fora_sistema: "F.Sist.",
    rota_errada: "Rt.Err.", outro: "Outro",
  };
  const dadosOcorrencias = Object.entries(ocorrenciasPorTipo)
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([tipo, qtd]) => ({ label: LABELS_OCORRENCIA[tipo] ?? tipo, value: qtd }));

  const kmTotal30 = rotas30.reduce((s, r) => s + (r.kmChegada && r.kmSaida ? r.kmChegada - r.kmSaida : 0), 0);
  const volumesTotal30 = rotas30.reduce((s, r) => s + r.itens.reduce((ss, i) => ss + i.volumesSaida, 0), 0);
  const rotasConcluidas30 = rotas30.filter((r) => r.status === "concluida").length;

  const insights = gerarInsights(todasRotas);

  const insightBg: Record<string, string> = { alerta: "#fef2f2", info: "#eff6ff", sucesso: "#f0fdf4" };
  const insightText: Record<string, string> = { alerta: "#b91c1c", info: "#1d4ed8", sucesso: "#15803d" };

  const atalhos = [
    { href: "/cadastros", label: "Cadastros", Icon: MapPin },
    { href: "/historico", label: "Histórico de Rotas", Icon: BarChart2 },
    { href: "/manutencao", label: "Manutenção & Frota", Icon: Wrench },
    { href: "/relatorios", label: "Relatórios", Icon: TrendingUp },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f3f4f6" }} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Header */}
      <View style={{ backgroundColor: "#ee4d2d", paddingTop: insets.top + 16, paddingBottom: 24, paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>Gestão de Entregas</Text>
        <Text style={{ fontSize: 26, fontWeight: "700", color: "#ffffff", letterSpacing: -0.5 }}>RouteLog</Text>
        <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </Text>
      </View>

      <View style={{ gap: 16, padding: 16 }}>
        {/* Alerta manutenção */}
        {!loading && alertasManutencao > 0 && (
          <TouchableOpacity
            onPress={() => router.push("/manutencao" as any)}
            style={{ backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}
          >
            <View style={{ backgroundColor: "#ef4444", borderRadius: 20, padding: 8 }}>
              <Wrench size={20} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", color: "#b91c1c" }}>Manutenção Vencida</Text>
              <Text style={{ fontSize: 13, color: "#dc2626" }}>
                {alertasManutencao} veículo{alertasManutencao > 1 ? "s" : ""} com manutenção atrasada
              </Text>
            </View>
            <ArrowRight size={20} color="#ef4444" />
          </TouchableOpacity>
        )}

        {/* Rota ativa */}
        {loading ? (
          <View style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 16, height: 80, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color="#ee4d2d" />
          </View>
        ) : rotaAtiva ? (
          <TouchableOpacity
            onPress={() => router.push(`/rota/${rotaAtiva.id}` as any)}
            style={{ backgroundColor: "rgba(238,77,45,0.1)", borderWidth: 1, borderColor: "rgba(238,77,45,0.3)", borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}
          >
            <View style={{ backgroundColor: "#ee4d2d", borderRadius: 20, padding: 8 }}>
              <Truck size={22} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", color: "#ee4d2d" }}>Rota em andamento</Text>
              <Text style={{ fontSize: 13, color: "#4b5563" }}>{rotaAtiva.veiculoPlaca} · saiu às {rotaAtiva.horaSaida}</Text>
              <Text style={{ fontSize: 12, color: "#6b7280" }}>
                {rotaAtiva.itens.filter((i) => i.concluido).length}/{rotaAtiva.itens.length} cidades concluídas
              </Text>
            </View>
            <ArrowRight size={20} color="#ee4d2d" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => router.push("/rota/nova" as any)}
            style={{ backgroundColor: "#ffffff", borderWidth: 2, borderColor: "#d1d5db", borderStyle: "dashed", borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}
          >
            <View style={{ backgroundColor: "#f3f4f6", borderRadius: 20, padding: 8 }}>
              <Plus size={22} color="#6b7280" />
            </View>
            <View>
              <Text style={{ fontWeight: "600", color: "#374151" }}>Iniciar nova rota</Text>
              <Text style={{ fontSize: 13, color: "#9ca3af" }}>Nenhuma rota em andamento</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Cards resumo do dia */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          {[
            { icon: <Package size={20} color="#3b82f6" />, valor: totalVolumesHoje, label: "Volumes hoje" },
            { icon: <CheckCircle2 size={20} color="#22c55e" />, valor: cidadesConcluidas, label: "Cidades OK" },
            { icon: <AlertTriangle size={20} color="#f59e0b" />, valor: totalDevolucoes, label: "Devoluções" },
          ].map((item, idx) => (
            <View key={idx} style={{ flex: 1, backgroundColor: "#ffffff", borderRadius: 16, padding: 12, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, elevation: 1 }}>
              {item.icon}
              <Text style={{ fontSize: 24, fontWeight: "700", color: "#111827", marginTop: 4 }}>{item.valor}</Text>
              <Text style={{ fontSize: 11, color: "#9ca3af" }}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Totais 30 dias */}
        {!loading && volumesTotal30 > 0 && (
          <View style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, elevation: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 12 }}>
              <TrendingUp size={13} color="#6b7280" />
              <Text style={{ fontSize: 11, fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Últimos 30 dias</Text>
            </View>
            <View style={{ flexDirection: "row" }}>
              {[
                { valor: volumesTotal30, label: "volumes", color: "#ee4d2d" },
                { valor: kmTotal30, label: "km rodados", color: "#2563eb" },
                { valor: rotasConcluidas30, label: "rotas", color: "#16a34a" },
              ].map((item, idx) => (
                <View key={idx} style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ fontSize: 20, fontWeight: "700", color: item.color }}>{item.valor}</Text>
                  <Text style={{ fontSize: 12, color: "#9ca3af" }}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Gráficos */}
        {!loading && todasRotas.length > 0 && (
          <BarChart data={dadosGraficoSemana} title="Volumes & KM — últimos 7 dias" color="#ee4d2d" secondaryColor="#93c5fd" />
        )}
        {!loading && dadosOcorrencias.length > 0 && (
          <BarChart data={dadosOcorrencias} title="Ocorrências por tipo — 30 dias" color="#f59e0b" />
        )}

        {/* Insights */}
        {!loading && insights.length > 0 && (
          <View style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 16, gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, elevation: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>🤖 Insights Automáticos</Text>
            {insights.map((ins, idx) => (
              <View key={idx} style={{ backgroundColor: insightBg[ins.tipo], borderRadius: 12, padding: 12, flexDirection: "row", gap: 8 }}>
                <Text style={{ fontSize: 16 }}>{ins.icone}</Text>
                <Text style={{ flex: 1, fontSize: 12, color: insightText[ins.tipo], lineHeight: 18 }}>{ins.texto}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Atalhos */}
        <View style={{ backgroundColor: "#ffffff", borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, elevation: 1 }}>
          <Text style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, fontSize: 11, fontWeight: "600", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Acesso rápido
          </Text>
          {atalhos.map(({ href, label, Icon }, idx) => (
            <TouchableOpacity
              key={href}
              onPress={() => router.push(href as any)}
              activeOpacity={0.7}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: idx > 0 ? 1 : 0, borderTopColor: "#f3f4f6" }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Icon size={15} color="#9ca3af" />
                <Text style={{ fontSize: 14, color: "#374151" }}>{label}</Text>
              </View>
              <ArrowRight size={16} color="#9ca3af" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Rodapé */}
      <View style={{ alignItems: "center", paddingVertical: 20, gap: 2 }}>
        <Text style={{ fontSize: 12, fontWeight: "600", color: "#9ca3af", letterSpacing: 0.5 }}>RouteLog</Text>
        <Text style={{ fontSize: 11, color: "#d1d5db" }}>Desenvolvido por Josevan Oliveira</Text>
      </View>
    </ScrollView>
  );
}
