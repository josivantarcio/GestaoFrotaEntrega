import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { MessageCircle, Plus, Trash2, Share2, Wrench, AlertTriangle } from "lucide-react-native";
import PageHeader from "@/components/PageHeader";
import Btn from "@/components/Btn";
import Input from "@/components/Input";
import {
  buscarVeiculo,
  listarManutencoesPorVeiculo,
  salvarManutencao,
  deletarManutencao,
  manutencaoVencida,
  dataHojeISO,
  Veiculo,
  Manutencao,
  ItemSubstituido,
  ITENS_SUBSTITUIDOS_LABELS,
} from "@/lib/db";
import { mensagemManutencao, mensagemRelatorioManutencoes, abrirWhatsApp } from "@/lib/whatsapp";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TODOS_ITENS = Object.entries(ITENS_SUBSTITUIDOS_LABELS) as [ItemSubstituido, string][];

const FORM_VAZIO = {
  data: dataHojeISO(),
  kmAtual: "",
  tipoOleo: "",
  itensSubstituidos: [] as ItemSubstituido[],
  proximaTrocaKm: "",
  proximaTrocaData: "",
  observacao: "",
};

export default function ManutencoesPage() {
  const { veiculoId } = useLocalSearchParams<{ veiculoId: string }>();
  const vidNum = Number(veiculoId);
  const insets = useSafeAreaInsets();

  const [veiculo, setVeiculo] = useState<Veiculo | null>(null);
  const [lista, setLista] = useState<Manutencao[]>([]);
  const [form, setForm] = useState(FORM_VAZIO);
  const [mostraForm, setMostraForm] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [loading, setLoading] = useState(true);

  async function carregar() {
    const [v, mans] = await Promise.all([buscarVeiculo(vidNum), listarManutencoesPorVeiculo(vidNum)]);
    setVeiculo(v ?? null);
    setLista(mans);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, [vidNum]);

  function abrirNovo() {
    setForm({ ...FORM_VAZIO, data: dataHojeISO() });
    setErros({});
    setMostraForm(true);
  }

  function toggleItem(item: ItemSubstituido) {
    setForm((f) => ({
      ...f,
      itensSubstituidos: f.itensSubstituidos.includes(item)
        ? f.itensSubstituidos.filter((i) => i !== item)
        : [...f.itensSubstituidos, item],
    }));
  }

  async function salvar() {
    const novosErros: Record<string, string> = {};
    if (!form.kmAtual || isNaN(Number(form.kmAtual))) novosErros.kmAtual = "Informe o KM atual";
    if (!form.tipoOleo.trim()) novosErros.tipoOleo = "Informe o tipo de óleo";
    if (form.itensSubstituidos.length === 0) novosErros.itens = "Selecione ao menos um item";
    if (!form.data) novosErros.data = "Informe a data";

    if (Object.keys(novosErros).length) { setErros(novosErros); return; }

    setSalvando(true);
    try {
      await salvarManutencao({
        veiculoId: vidNum,
        veiculoPlaca: veiculo?.placa ?? "",
        data: form.data,
        kmAtual: Number(form.kmAtual),
        tipoOleo: form.tipoOleo,
        itensSubstituidos: form.itensSubstituidos,
        proximaTrocaKm: form.proximaTrocaKm ? Number(form.proximaTrocaKm) : undefined,
        proximaTrocaData: form.proximaTrocaData || undefined,
        observacao: form.observacao || undefined,
        criadoEm: new Date().toISOString(),
      });
      setMostraForm(false);
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id: number) {
    Alert.alert("Confirmar", "Excluir esta manutenção?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          await deletarManutencao(id);
          carregar();
        },
      },
    ]);
  }

  function compartilharHistorico() {
    if (!veiculo) return;
    const msg = mensagemRelatorioManutencoes(veiculo, lista);
    abrirWhatsApp(msg);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
        <PageHeader titulo="Manutenções" voltar="/manutencao" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#ee4d2d" />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      <PageHeader
        titulo={`Manutenções — ${veiculo?.placa ?? "..."}`}
        voltar="/manutencao"
        acao={
          <TouchableOpacity onPress={abrirNovo} style={{ padding: 4 }}>
            <Plus size={24} color="#ffffff" />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 16 }}>
        {/* Formulário */}
        {mostraForm && (
          <View style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 16, gap: 12 }}>
            <Text style={{ fontWeight: "600", color: "#374151" }}>Nova Manutenção</Text>
            <Input label="Data *" value={form.data} onChangeText={(v) => setForm({ ...form, data: v })} placeholder="AAAA-MM-DD" erro={erros.data} />
            <Input
              label={lista.length > 0 ? `KM atual * (último: ${lista[0].kmAtual})` : "KM atual *"}
              keyboardType="numeric"
              value={form.kmAtual}
              onChangeText={(v) => setForm({ ...form, kmAtual: v })}
              placeholder="Ex: 45000"
              erro={erros.kmAtual}
            />
            <Input
              label="Tipo de óleo *"
              value={form.tipoOleo}
              onChangeText={(v) => setForm({ ...form, tipoOleo: v })}
              placeholder="Ex: Shell 5W30"
              erro={erros.tipoOleo}
            />

            {/* Itens substituídos */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: "500", color: "#374151" }}>Itens substituídos *</Text>
              {erros.itens ? <Text style={{ fontSize: 12, color: "#ef4444" }}>{erros.itens}</Text> : null}
              <View style={{ gap: 4 }}>
                {TODOS_ITENS.map(([key, label]) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() => toggleItem(key)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 }}
                  >
                    <View style={{
                      width: 18, height: 18, borderRadius: 4, borderWidth: 2,
                      borderColor: form.itensSubstituidos.includes(key) ? "#ee4d2d" : "#d1d5db",
                      backgroundColor: form.itensSubstituidos.includes(key) ? "#ee4d2d" : "#ffffff",
                      alignItems: "center", justifyContent: "center",
                    }}>
                      {form.itensSubstituidos.includes(key) && (
                        <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "700" }}>✓</Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 13, color: "#374151" }}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Próxima troca */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Input label="Próx. troca (KM)" keyboardType="numeric" value={form.proximaTrocaKm} onChangeText={(v) => setForm({ ...form, proximaTrocaKm: v })} placeholder="Ex: 50000" />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="Próx. troca (data)" value={form.proximaTrocaData} onChangeText={(v) => setForm({ ...form, proximaTrocaData: v })} placeholder="AAAA-MM-DD" />
              </View>
            </View>

            <Input label="Observação (opcional)" value={form.observacao} onChangeText={(v) => setForm({ ...form, observacao: v })} placeholder="Observações..." />

            <View style={{ flexDirection: "row", gap: 8 }}>
              <Btn variante="secundario" fullWidth onPress={() => setMostraForm(false)}>
                <Text style={{ fontWeight: "600" }}>Cancelar</Text>
              </Btn>
              <Btn fullWidth onPress={salvar} disabled={salvando}>
                <Text style={{ color: "#ffffff", fontWeight: "600" }}>{salvando ? "Salvando..." : "Adicionar"}</Text>
              </Btn>
            </View>
          </View>
        )}

        {/* Lista vazia */}
        {lista.length === 0 && !mostraForm && (
          <View style={{ alignItems: "center", paddingVertical: 48 }}>
            <Wrench size={44} color="#d1d5db" />
            <Text style={{ fontWeight: "500", color: "#9ca3af", marginTop: 12 }}>Nenhuma manutenção registrada</Text>
            <Text style={{ fontSize: 13, color: "#d1d5db" }}>Toque no + para adicionar</Text>
          </View>
        )}

        {/* Compartilhar */}
        {lista.length > 0 && (
          <TouchableOpacity
            onPress={compartilharHistorico}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#f0fdf4", paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "#bbf7d0" }}
          >
            <Share2 size={15} color="#15803d" />
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#15803d" }}>Compartilhar histórico no WhatsApp</Text>
          </TouchableOpacity>
        )}

        {/* Lista */}
        {lista.map((m) => {
          const vencida = manutencaoVencida(m, veiculo?.kmAtual ?? m.kmAtual);
          return (
            <View
              key={m.id}
              style={{ backgroundColor: "#ffffff", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, borderLeftWidth: 4, borderLeftColor: vencida ? "#ef4444" : "#e5e7eb" }}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                <View style={{ backgroundColor: vencida ? "#fee2e2" : "#fff7ed", borderRadius: 999, padding: 8, flexShrink: 0 }}>
                  <Wrench size={16} color={vencida ? "#ef4444" : "#c2410c"} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                      <Text style={{ fontWeight: "700", color: "#1f2937", fontSize: 13 }}>
                        {m.data.split("-").reverse().join("/")} · KM {m.kmAtual.toLocaleString("pt-BR")}
                      </Text>
                      {vencida && (
                        <View style={{ backgroundColor: "#ef4444", borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2, flexDirection: "row", alignItems: "center", gap: 2 }}>
                          <AlertTriangle size={8} color="#ffffff" />
                          <Text style={{ fontSize: 10, fontWeight: "700", color: "#ffffff" }}>VENCIDA</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <TouchableOpacity
                        onPress={() => veiculo && abrirWhatsApp(mensagemManutencao(m, veiculo))}
                        style={{ padding: 6 }}
                      >
                        <MessageCircle size={15} color="#16a34a" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => excluir(m.id!)} style={{ padding: 6 }}>
                        <Trash2 size={15} color="#f87171" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={{ fontSize: 13, color: "#4b5563" }}>🛢️ {m.tipoOleo}</Text>
                  <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    {m.itensSubstituidos.map((i) => ITENS_SUBSTITUIDOS_LABELS[i]).join(", ")}
                  </Text>
                  {(m.proximaTrocaKm || m.proximaTrocaData) && (
                    <Text style={{ fontSize: 12, color: "#d97706", marginTop: 4, fontWeight: "500" }}>
                      ⏰ Próx. troca:
                      {m.proximaTrocaKm ? ` KM ${m.proximaTrocaKm.toLocaleString("pt-BR")}` : ""}
                      {m.proximaTrocaData ? ` · ${m.proximaTrocaData.split("-").reverse().join("/")}` : ""}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
