import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Wrench, Fuel, ArrowRight, AlertTriangle } from "lucide-react-native";
import PageHeader from "@/components/PageHeader";
import { listarVeiculos, listarAbastecimentosPorVeiculo, buscarUltimaManutencao, manutencaoVencida, Veiculo, Manutencao, Abastecimento } from "@/lib/db";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface VeiculoInfo {
  veiculo: Veiculo;
  ultimaManutencao?: Manutencao;
  vencida: boolean;
  consumoMedio?: number;
  ultimoConsumo?: number;
  totalAbastecimentos: number;
}

export default function ManutencaoPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [infos, setInfos] = useState<VeiculoInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        const veiculos = await listarVeiculos();
        const ativos = veiculos.filter((v) => v.ativo);

        const resultados = await Promise.all(
          ativos.map(async (v): Promise<VeiculoInfo> => {
            const [ultima, abastecimentos] = await Promise.all([
              buscarUltimaManutencao(v.id!),
              listarAbastecimentosPorVeiculo(v.id!),
            ]);

            const comConsumo: Abastecimento[] = abastecimentos
              .filter((a) => a.consumoKmL !== undefined)
              .slice(0, 5);

            const consumoMedio =
              comConsumo.length > 0
                ? comConsumo.reduce((s, a) => s + a.consumoKmL!, 0) / comConsumo.length
                : undefined;

            const ultimoConsumo = comConsumo.length > 0 ? comConsumo[0].consumoKmL : undefined;

            const vencida = ultima ? manutencaoVencida(ultima, v.kmAtual ?? ultima.kmAtual) : false;

            return {
              veiculo: v,
              ultimaManutencao: ultima ?? undefined,
              vencida,
              consumoMedio,
              ultimoConsumo,
              totalAbastecimentos: abastecimentos.length,
            };
          })
        );

        setInfos(resultados);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
        <PageHeader titulo="Frota & Manutenção" voltar="/" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#ee4d2d" />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      <PageHeader titulo="Frota & Manutenção" voltar="/" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 16 }}>
        {infos.length === 0 && (
          <View style={{ alignItems: "center", paddingVertical: 48 }}>
            <Wrench size={44} color="#d1d5db" />
            <Text style={{ fontWeight: "500", color: "#9ca3af", marginTop: 12 }}>Nenhum veículo ativo</Text>
            <Text style={{ fontSize: 13, color: "#d1d5db" }}>Cadastre veículos em Cadastros</Text>
          </View>
        )}

        {infos.map(({ veiculo, ultimaManutencao, vencida, consumoMedio, ultimoConsumo, totalAbastecimentos }) => (
          <View
            key={veiculo.id}
            style={{ backgroundColor: "#ffffff", borderRadius: 16, overflow: "hidden", borderLeftWidth: 4, borderLeftColor: vencida ? "#ef4444" : "#e5e7eb" }}
          >
            {/* Cabeçalho */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
              <View style={{ backgroundColor: vencida ? "#fee2e2" : "#dbeafe", borderRadius: 999, padding: 8 }}>
                <Wrench size={18} color={vencida ? "#ef4444" : "#2563eb"} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontWeight: "700", color: "#1f2937", fontSize: 15 }}>{veiculo.placa}</Text>
                  {vencida && (
                    <View style={{ backgroundColor: "#ef4444", borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2, flexDirection: "row", alignItems: "center", gap: 2 }}>
                      <AlertTriangle size={9} color="#ffffff" />
                      <Text style={{ fontSize: 10, fontWeight: "700", color: "#ffffff" }}>VENCIDA</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 13, color: "#4b5563" }}>{veiculo.modelo}</Text>
              </View>
            </View>

            {/* Stats */}
            <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
              {[
                { label: "KM Atual", valor: veiculo.kmAtual !== undefined ? veiculo.kmAtual.toLocaleString("pt-BR") : "—", sub: undefined, destaque: false },
                {
                  label: "Consumo médio",
                  valor: consumoMedio !== undefined ? `${consumoMedio.toFixed(1).replace(".", ",")} km/L` : "—",
                  sub: totalAbastecimentos === 0
                    ? "sem abastecimentos"
                    : consumoMedio !== undefined && ultimoConsumo !== undefined && ultimoConsumo !== consumoMedio
                    ? `último: ${ultimoConsumo.toFixed(1).replace(".", ",")} km/L`
                    : totalAbastecimentos === 1
                    ? "1 abastecimento"
                    : `${Math.min(totalAbastecimentos, 5)} registros`,
                  destaque: false,
                },
                { label: "Últ. Troca", valor: ultimaManutencao ? `${ultimaManutencao.kmAtual.toLocaleString("pt-BR")} km` : "—", sub: undefined, destaque: vencida },
              ].map((stat) => (
                <View key={stat.label} style={{ flex: 1, backgroundColor: stat.destaque ? "#fef2f2" : "#f9fafb", borderRadius: 12, padding: 8, alignItems: "center" }}>
                  <Text style={{ fontSize: 11, color: stat.destaque ? "#ef4444" : "#9ca3af" }}>{stat.label}</Text>
                  <Text style={{ fontWeight: "700", color: stat.destaque ? "#b91c1c" : "#1f2937", fontSize: 13 }}>{stat.valor}</Text>
                  {stat.sub !== undefined && (
                    <Text style={{ fontSize: 10, color: "#9ca3af", marginTop: 1 }}>{stat.sub}</Text>
                  )}
                </View>
              ))}
            </View>

            {/* Botões */}
            <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 16 }}>
              <TouchableOpacity
                onPress={() => router.push(`/manutencao/${veiculo.id}/abastecimentos` as any)}
                style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#eff6ff", paddingVertical: 10, borderRadius: 12 }}
              >
                <Fuel size={15} color="#1d4ed8" />
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#1d4ed8" }}>Abastecimentos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push(`/manutencao/${veiculo.id}/manutencoes` as any)}
                style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#fff7ed", paddingVertical: 10, borderRadius: 12 }}
              >
                <Wrench size={15} color="#c2410c" />
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#c2410c" }}>Manutenções</Text>
                <ArrowRight size={13} color="#c2410c" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
