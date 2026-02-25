import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, Switch } from "react-native";
import { Plus, Pencil, Trash2, Car } from "lucide-react-native";
import PageHeader from "@/components/PageHeader";
import Btn from "@/components/Btn";
import Input from "@/components/Input";
import { listarVeiculos, salvarVeiculo, deletarVeiculo, buscarUltimaManutencao, manutencaoVencida, Veiculo, Manutencao } from "@/lib/db";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const VAZIO = { placa: "", modelo: "", motoristaPadrao: "", ativo: true };

export default function VeiculosPage() {
  const insets = useSafeAreaInsets();
  const [lista, setLista] = useState<Veiculo[]>([]);
  const [alertas, setAlertas] = useState<Record<number, boolean>>({});
  const [form, setForm] = useState({ ...VAZIO });
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [mostraForm, setMostraForm] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});

  async function carregar() {
    const veiculos = await listarVeiculos();
    setLista(veiculos);
    const alertasMap: Record<number, boolean> = {};
    await Promise.all(
      veiculos.map(async (v) => {
        if (!v.id) return;
        const ultima: Manutencao | undefined = await buscarUltimaManutencao(v.id);
        if (ultima) alertasMap[v.id] = manutencaoVencida(ultima, v.kmAtual ?? ultima.kmAtual);
      })
    );
    setAlertas(alertasMap);
  }

  useEffect(() => { carregar(); }, []);

  function abrirNovo() {
    setForm({ ...VAZIO });
    setEditandoId(null);
    setErros({});
    setMostraForm(true);
  }

  function abrirEditar(v: Veiculo) {
    setForm({ placa: v.placa, modelo: v.modelo, motoristaPadrao: v.motoristaPadrao ?? "", ativo: v.ativo });
    setEditandoId(v.id!);
    setErros({});
    setMostraForm(true);
  }

  async function salvar() {
    const novosErros: Record<string, string> = {};
    if (!form.placa.trim()) novosErros.placa = "Informe a placa";
    if (!form.modelo.trim()) novosErros.modelo = "Informe o modelo";
    if (Object.keys(novosErros).length) { setErros(novosErros); return; }
    await salvarVeiculo({ ...form, placa: form.placa.toUpperCase(), ...(editandoId ? { id: editandoId, criadoEm: "" } : {}) } as Veiculo);
    setMostraForm(false);
    carregar();
  }

  async function excluir(id: number) {
    Alert.alert("Confirmar", "Excluir este veículo?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: async () => { await deletarVeiculo(id); carregar(); } },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      <PageHeader
        titulo="Veículos"
        voltar="/cadastros"
        acao={
          <TouchableOpacity onPress={abrirNovo} style={{ padding: 4 }}>
            <Plus size={24} color="#ffffff" />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 16 }}>
        {mostraForm && (
          <View style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 16, gap: 12 }}>
            <Text style={{ fontWeight: "600", color: "#111827", fontSize: 16 }}>{editandoId ? "Editar Veículo" : "Novo Veículo"}</Text>
            <Input label="Placa *" value={form.placa} onChangeText={(v) => setForm({ ...form, placa: v.toUpperCase() })} placeholder="Ex: ABC-1234" autoCapitalize="characters" erro={erros.placa} />
            <Input label="Modelo *" value={form.modelo} onChangeText={(v) => setForm({ ...form, modelo: v })} placeholder="Ex: Fiat Strada" erro={erros.modelo} />
            <Input label="Motorista padrão" value={form.motoristaPadrao} onChangeText={(v) => setForm({ ...form, motoristaPadrao: v })} placeholder="Nome do motorista" />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 14, color: "#374151" }}>Ativo</Text>
              <Switch value={form.ativo} onValueChange={(v) => setForm({ ...form, ativo: v })} trackColor={{ true: "#ee4d2d" }} />
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Btn variante="secundario" fullWidth onPress={() => setMostraForm(false)}>Cancelar</Btn>
              <Btn fullWidth onPress={salvar}>{editandoId ? "Salvar" : "Adicionar"}</Btn>
            </View>
          </View>
        )}

        {lista.length === 0 && !mostraForm && (
          <View style={{ alignItems: "center", paddingVertical: 48 }}>
            <Car size={40} color="#d1d5db" />
            <Text style={{ fontWeight: "500", color: "#9ca3af", marginTop: 12 }}>Nenhum veículo cadastrado</Text>
            <Text style={{ fontSize: 13, color: "#d1d5db" }}>Toque no + para adicionar</Text>
          </View>
        )}

        {lista.map((v) => {
          const temAlerta = v.id ? !!alertas[v.id] : false;
          return (
            <View key={v.id} style={{ backgroundColor: "#ffffff", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ backgroundColor: temAlerta ? "#fee2e2" : v.ativo ? "#dbeafe" : "#f3f4f6", borderRadius: 20, padding: 8 }}>
                <Car size={18} color={temAlerta ? "#ef4444" : v.ativo ? "#2563eb" : "#9ca3af"} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontWeight: "700", color: "#111827", letterSpacing: 0.5 }}>{v.placa}</Text>
                  {temAlerta && (
                    <View style={{ backgroundColor: "#ef4444", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 9, fontWeight: "700", color: "#ffffff" }}>MANUTENÇÃO</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 13, color: "#4b5563" }}>{v.modelo}</Text>
                {v.motoristaPadrao ? <Text style={{ fontSize: 12, color: "#9ca3af" }}>{v.motoristaPadrao}</Text> : null}
                {!v.ativo && <Text style={{ fontSize: 11, color: "#9ca3af", fontStyle: "italic" }}>Inativo</Text>}
                {v.kmAtual !== undefined && <Text style={{ fontSize: 12, color: "#9ca3af" }}>KM atual: {v.kmAtual.toLocaleString("pt-BR")}</Text>}
              </View>
              <TouchableOpacity onPress={() => abrirEditar(v)} style={{ padding: 8 }}><Pencil size={17} color="#9ca3af" /></TouchableOpacity>
              <TouchableOpacity onPress={() => excluir(v.id!)} style={{ padding: 8 }}><Trash2 size={17} color="#f87171" /></TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
