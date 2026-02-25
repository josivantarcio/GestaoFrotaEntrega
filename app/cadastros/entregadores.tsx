import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, Switch } from "react-native";
import { Plus, Pencil, Trash2, User } from "lucide-react-native";
import PageHeader from "@/components/PageHeader";
import Btn from "@/components/Btn";
import Input from "@/components/Input";
import { listarEntregadores, salvarEntregador, deletarEntregador, listarCidades, Entregador, Cidade } from "@/lib/db";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const VAZIO = { nome: "", telefone: "", cidadesIds: [] as number[], ativo: true };

export default function EntregadoresPage() {
  const insets = useSafeAreaInsets();
  const [lista, setLista] = useState<Entregador[]>([]);
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [form, setForm] = useState({ ...VAZIO });
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [mostraForm, setMostraForm] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});

  async function carregar() {
    const [ents, cids] = await Promise.all([listarEntregadores(), listarCidades()]);
    setLista(ents);
    setCidades(cids);
  }

  useEffect(() => { carregar(); }, []);

  function abrirNovo() {
    setForm({ ...VAZIO });
    setEditandoId(null);
    setErros({});
    setMostraForm(true);
  }

  function abrirEditar(e: Entregador) {
    setForm({ nome: e.nome, telefone: e.telefone, cidadesIds: e.cidadesIds, ativo: e.ativo });
    setEditandoId(e.id!);
    setErros({});
    setMostraForm(true);
  }

  async function salvar() {
    const novosErros: Record<string, string> = {};
    if (!form.nome.trim()) novosErros.nome = "Informe o nome";
    if (Object.keys(novosErros).length) { setErros(novosErros); return; }
    await salvarEntregador({ ...form, ...(editandoId ? { id: editandoId, criadoEm: "" } : {}) } as Entregador);
    setMostraForm(false);
    carregar();
  }

  async function excluir(id: number) {
    Alert.alert("Confirmar", "Excluir este entregador?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: async () => { await deletarEntregador(id); carregar(); } },
    ]);
  }

  function toggleCidade(cidadeId: number) {
    setForm((f) => ({
      ...f,
      cidadesIds: f.cidadesIds.includes(cidadeId)
        ? f.cidadesIds.filter((id) => id !== cidadeId)
        : [...f.cidadesIds, cidadeId],
    }));
  }

  function nomeCidade(id: number) {
    return cidades.find((c) => c.id === id)?.nome ?? "?";
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      <PageHeader
        titulo="Entregadores"
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
            <Text style={{ fontWeight: "600", color: "#111827", fontSize: 16 }}>
              {editandoId ? "Editar Entregador" : "Novo Entregador"}
            </Text>
            <Input label="Nome *" value={form.nome} onChangeText={(v) => setForm({ ...form, nome: v })} placeholder="Nome completo" erro={erros.nome} />
            <Input label="WhatsApp (com DDD)" value={form.telefone} onChangeText={(v) => setForm({ ...form, telefone: v })} placeholder="Ex: 11999998888" keyboardType="phone-pad" />

            <View>
              <Text style={{ fontSize: 14, fontWeight: "500", color: "#374151", marginBottom: 8 }}>Cidades que atende</Text>
              {cidades.length === 0 ? (
                <Text style={{ fontSize: 12, color: "#9ca3af" }}>Cadastre cidades primeiro</Text>
              ) : (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {cidades.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => toggleCidade(c.id!)}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
                        backgroundColor: form.cidadesIds.includes(c.id!) ? "#ee4d2d" : "#f3f4f6",
                        borderColor: form.cidadesIds.includes(c.id!) ? "#ee4d2d" : "#e5e7eb",
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "600", color: form.cidadesIds.includes(c.id!) ? "#ffffff" : "#4b5563" }}>
                        {c.nome}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

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
            <User size={40} color="#d1d5db" />
            <Text style={{ fontWeight: "500", color: "#9ca3af", marginTop: 12 }}>Nenhum entregador cadastrado</Text>
            <Text style={{ fontSize: 13, color: "#d1d5db" }}>Toque no + para adicionar</Text>
          </View>
        )}

        {lista.map((e) => (
          <View key={e.id} style={{ backgroundColor: "#ffffff", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            <View style={{ backgroundColor: e.ativo ? "#dcfce7" : "#f3f4f6", borderRadius: 20, padding: 8, marginTop: 2 }}>
              <User size={18} color={e.ativo ? "#16a34a" : "#9ca3af"} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600", color: "#111827" }}>{e.nome}</Text>
              {e.telefone ? <Text style={{ fontSize: 12, color: "#9ca3af" }}>{e.telefone}</Text> : null}
              {e.cidadesIds.length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                  {e.cidadesIds.map((cid) => (
                    <View key={cid} style={{ backgroundColor: "#f3f4f6", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 11, color: "#4b5563" }}>{nomeCidade(cid)}</Text>
                    </View>
                  ))}
                </View>
              )}
              {!e.ativo && <Text style={{ fontSize: 11, color: "#9ca3af", fontStyle: "italic" }}>Inativo</Text>}
            </View>
            <TouchableOpacity onPress={() => abrirEditar(e)} style={{ padding: 8 }}><Pencil size={17} color="#9ca3af" /></TouchableOpacity>
            <TouchableOpacity onPress={() => excluir(e.id!)} style={{ padding: 8 }}><Trash2 size={17} color="#f87171" /></TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
