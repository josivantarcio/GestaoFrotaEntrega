import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { MessageCircle, Plus, Trash2, Share2, Fuel } from "lucide-react-native";
import PageHeader from "@/components/PageHeader";
import Btn from "@/components/Btn";
import Input from "@/components/Input";
import SelectModal from "@/components/SelectModal";
import {
  buscarVeiculo,
  listarAbastecimentosPorVeiculo,
  salvarAbastecimento,
  deletarAbastecimento,
  dataHojeISO,
  Veiculo,
  Abastecimento,
  TipoCombustivel,
  TIPOS_COMBUSTIVEL,
} from "@/lib/db";
import { mensagemAbastecimento, mensagemRelatorioAbastecimentos, abrirWhatsApp } from "@/lib/whatsapp";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const FORM_VAZIO = {
  data: dataHojeISO(),
  kmAtual: "",
  litros: "",
  valorTotal: "",
  tipoCombustivel: "gasolina" as TipoCombustivel,
  posto: "",
  observacao: "",
};

const combustivelOptions = Object.entries(TIPOS_COMBUSTIVEL).map(([k, v]) => ({ value: k, label: v }));

export default function AbastecimentosPage() {
  const { veiculoId } = useLocalSearchParams<{ veiculoId: string }>();
  const vidNum = Number(veiculoId);
  const insets = useSafeAreaInsets();

  const [veiculo, setVeiculo] = useState<Veiculo | null>(null);
  const [lista, setLista] = useState<Abastecimento[]>([]);
  const [form, setForm] = useState(FORM_VAZIO);
  const [mostraForm, setMostraForm] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [ultimoCalculado, setUltimoCalculado] = useState<Abastecimento | null>(null);
  const [loading, setLoading] = useState(true);

  async function carregar() {
    const [v, abs] = await Promise.all([buscarVeiculo(vidNum), listarAbastecimentosPorVeiculo(vidNum)]);
    setVeiculo(v ?? null);
    setLista(abs);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, [vidNum]);

  function abrirNovo() {
    setForm({ ...FORM_VAZIO, data: dataHojeISO() });
    setErros({});
    setUltimoCalculado(null);
    setMostraForm(true);
  }

  async function salvar() {
    const novosErros: Record<string, string> = {};
    if (!form.kmAtual || isNaN(Number(form.kmAtual))) novosErros.kmAtual = "Informe o KM atual";
    if (!form.litros || isNaN(Number(form.litros))) novosErros.litros = "Informe os litros";
    if (!form.valorTotal || isNaN(Number(form.valorTotal))) novosErros.valorTotal = "Informe o valor";
    if (!form.data) novosErros.data = "Informe a data";

    if (lista.length > 0) {
      const maiorKm = lista[0].kmAtual;
      if (Number(form.kmAtual) <= maiorKm) {
        novosErros.kmAtual = `KM deve ser maior que o último (${maiorKm})`;
      }
    }

    if (Object.keys(novosErros).length) { setErros(novosErros); return; }

    setSalvando(true);
    try {
      const novoId = await salvarAbastecimento({
        veiculoId: vidNum,
        veiculoPlaca: veiculo?.placa ?? "",
        data: form.data,
        kmAtual: Number(form.kmAtual),
        litros: Number(form.litros),
        valorTotal: Number(form.valorTotal),
        tipoCombustivel: form.tipoCombustivel,
        posto: form.posto || undefined,
        observacao: form.observacao || undefined,
        criadoEm: new Date().toISOString(),
      });

      await carregar();
      setMostraForm(false);

      const novaLista = await listarAbastecimentosPorVeiculo(vidNum);
      const salvo = novaLista.find((a) => a.id === novoId);
      if (salvo?.consumoKmL !== undefined) {
        setUltimoCalculado(salvo);
      }
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id: number) {
    Alert.alert("Confirmar", "Excluir este abastecimento?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          await deletarAbastecimento(id);
          carregar();
        },
      },
    ]);
  }

  function compartilharTodos() {
    if (!veiculo) return;
    const hoje = dataHojeISO();
    const tresAnos = `${Number(hoje.split("-")[0]) - 3}-${hoje.split("-")[1]}-${hoje.split("-")[2]}`;
    const msg = mensagemRelatorioAbastecimentos(veiculo, tresAnos, hoje, lista);
    abrirWhatsApp(msg);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
        <PageHeader titulo="Abastecimentos" voltar="/manutencao" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#ee4d2d" />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      <PageHeader
        titulo={`Abastecimentos — ${veiculo?.placa ?? "..."}`}
        voltar="/manutencao"
        acao={
          <TouchableOpacity onPress={abrirNovo} style={{ padding: 4 }}>
            <Plus size={24} color="#ffffff" />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 16 }}>
        {/* Feedback consumo calculado */}
        {ultimoCalculado?.consumoKmL !== undefined && (
          <View style={{ backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", borderRadius: 16, padding: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#15803d" }}>Consumo calculado!</Text>
            <Text style={{ fontSize: 14, color: "#16a34a" }}>
              ⚡ {ultimoCalculado.consumoKmL.toFixed(2).replace(".", ",")} km/L
              {ultimoCalculado.custoKm !== undefined
                ? ` · R$ ${ultimoCalculado.custoKm.toFixed(3).replace(".", ",")}/km`
                : ""}
            </Text>
            <TouchableOpacity onPress={() => setUltimoCalculado(null)} style={{ marginTop: 4 }}>
              <Text style={{ fontSize: 12, color: "#16a34a", fontWeight: "600" }}>Fechar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Formulário */}
        {mostraForm && (
          <View style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 16, gap: 12 }}>
            <Text style={{ fontWeight: "600", color: "#374151" }}>Novo Abastecimento</Text>
            <Input label="Data *" value={form.data} onChangeText={(v) => setForm({ ...form, data: v })} placeholder="AAAA-MM-DD" erro={erros.data} />
            <Input
              label={lista.length > 0 ? `KM atual * (último: ${lista[0].kmAtual})` : "KM atual *"}
              keyboardType="numeric"
              value={form.kmAtual}
              onChangeText={(v) => setForm({ ...form, kmAtual: v })}
              placeholder="Ex: 45000"
              erro={erros.kmAtual}
            />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Input label="Litros *" keyboardType="decimal-pad" value={form.litros} onChangeText={(v) => setForm({ ...form, litros: v })} placeholder="Ex: 40,00" erro={erros.litros} />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="Valor total (R$) *" keyboardType="decimal-pad" value={form.valorTotal} onChangeText={(v) => setForm({ ...form, valorTotal: v })} placeholder="Ex: 280,00" erro={erros.valorTotal} />
              </View>
            </View>
            <SelectModal
              label="Combustível *"
              value={form.tipoCombustivel}
              options={combustivelOptions}
              onChange={(v) => setForm({ ...form, tipoCombustivel: v as TipoCombustivel })}
              placeholder="Selecione o combustível"
            />
            <Input label="Posto (opcional)" value={form.posto} onChangeText={(v) => setForm({ ...form, posto: v })} placeholder="Nome do posto" />
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
            <Fuel size={44} color="#d1d5db" />
            <Text style={{ fontWeight: "500", color: "#9ca3af", marginTop: 12 }}>Nenhum abastecimento registrado</Text>
            <Text style={{ fontSize: 13, color: "#d1d5db" }}>Toque no + para adicionar</Text>
          </View>
        )}

        {/* Compartilhar */}
        {lista.length > 0 && (
          <TouchableOpacity
            onPress={compartilharTodos}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#f0fdf4", paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "#bbf7d0" }}
          >
            <Share2 size={15} color="#15803d" />
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#15803d" }}>Compartilhar histórico no WhatsApp</Text>
          </TouchableOpacity>
        )}

        {/* Lista */}
        {lista.map((a) => (
          <View key={a.id} style={{ backgroundColor: "#ffffff", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
              <View style={{ backgroundColor: "#dbeafe", borderRadius: 999, padding: 8, flexShrink: 0 }}>
                <Fuel size={16} color="#2563eb" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontWeight: "700", color: "#1f2937", fontSize: 13 }}>
                    {a.data.split("-").reverse().join("/")} · KM {a.kmAtual.toLocaleString("pt-BR")}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <TouchableOpacity
                      onPress={() => veiculo && abrirWhatsApp(mensagemAbastecimento(a, veiculo))}
                      style={{ padding: 6 }}
                    >
                      <MessageCircle size={15} color="#16a34a" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => excluir(a.id!)} style={{ padding: 6 }}>
                      <Trash2 size={15} color="#f87171" />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={{ fontSize: 13, color: "#4b5563" }}>
                  {TIPOS_COMBUSTIVEL[a.tipoCombustivel]} · {a.litros.toFixed(2).replace(".", ",")} L · R$ {a.valorTotal.toFixed(2).replace(".", ",")}
                </Text>
                {a.posto ? <Text style={{ fontSize: 12, color: "#9ca3af" }}>{a.posto}</Text> : null}
                {a.consumoKmL !== undefined && (
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
                    <View style={{ backgroundColor: "#dcfce7", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#15803d" }}>
                        ⚡ {a.consumoKmL.toFixed(2).replace(".", ",")} km/L
                      </Text>
                    </View>
                    {a.custoKm !== undefined && (
                      <View style={{ backgroundColor: "#dbeafe", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: "#1d4ed8" }}>
                          R$ {a.custoKm.toFixed(3).replace(".", ",")}/km
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
