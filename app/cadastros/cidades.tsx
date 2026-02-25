import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react-native";
import PageHeader from "@/components/PageHeader";
import Btn from "@/components/Btn";
import Input from "@/components/Input";
import SelectModal from "@/components/SelectModal";
import { listarCidades, salvarCidade, deletarCidade, Cidade } from "@/lib/db";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const VAZIO = { nome: "", uf: "SP", distanciaKm: undefined as number | undefined };

export default function CidadesPage() {
  const insets = useSafeAreaInsets();
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [form, setForm] = useState({ ...VAZIO });
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [mostraForm, setMostraForm] = useState(false);
  const [erro, setErro] = useState("");

  async function carregar() {
    setCidades(await listarCidades());
  }

  useEffect(() => { carregar(); }, []);

  function abrirNovo() {
    setForm({ ...VAZIO });
    setEditandoId(null);
    setErro("");
    setMostraForm(true);
  }

  function abrirEditar(c: Cidade) {
    setForm({ nome: c.nome, uf: c.uf, distanciaKm: c.distanciaKm });
    setEditandoId(c.id!);
    setErro("");
    setMostraForm(true);
  }

  async function salvar() {
    if (!form.nome.trim()) { setErro("Informe o nome da cidade"); return; }
    await salvarCidade({
      ...form,
      ...(editandoId ? { id: editandoId, criadoEm: "" } : {}),
    } as Cidade);
    setMostraForm(false);
    carregar();
  }

  async function excluir(id: number) {
    Alert.alert("Confirmar", "Excluir esta cidade?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: async () => { await deletarCidade(id); carregar(); } },
    ]);
  }

  const ufOptions = UFS.map((u) => ({ value: u, label: u }));

  return (
    <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      <PageHeader
        titulo="Cidades"
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
              {editandoId ? "Editar Cidade" : "Nova Cidade"}
            </Text>
            <Input
              label="Nome da cidade *"
              value={form.nome}
              onChangeText={(v) => setForm({ ...form, nome: v })}
              placeholder="Ex: São Paulo"
              erro={erro}
            />
            <SelectModal
              label="UF *"
              value={form.uf}
              options={ufOptions}
              onChange={(v) => setForm({ ...form, uf: v })}
            />
            <Input
              label="Distância estimada (km)"
              keyboardType="numeric"
              value={form.distanciaKm?.toString() ?? ""}
              onChangeText={(v) => setForm({ ...form, distanciaKm: v ? Number(v) : undefined })}
              placeholder="Ex: 150"
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Btn variante="secundario" fullWidth onPress={() => setMostraForm(false)}>Cancelar</Btn>
              <Btn fullWidth onPress={salvar}>{editandoId ? "Salvar" : "Adicionar"}</Btn>
            </View>
          </View>
        )}

        {cidades.length === 0 && !mostraForm && (
          <View style={{ alignItems: "center", paddingVertical: 48 }}>
            <MapPin size={40} color="#d1d5db" />
            <Text style={{ fontWeight: "500", color: "#9ca3af", marginTop: 12 }}>Nenhuma cidade cadastrada</Text>
            <Text style={{ fontSize: 13, color: "#d1d5db" }}>Toque no + para adicionar</Text>
          </View>
        )}

        {cidades.map((c) => (
          <View key={c.id} style={{ backgroundColor: "#ffffff", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ backgroundColor: "rgba(238,77,45,0.1)", borderRadius: 20, padding: 8 }}>
              <MapPin size={18} color="#ee4d2d" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600", color: "#111827" }}>{c.nome}</Text>
              <Text style={{ fontSize: 12, color: "#9ca3af" }}>{c.uf}{c.distanciaKm ? ` · ${c.distanciaKm} km` : ""}</Text>
            </View>
            <TouchableOpacity onPress={() => abrirEditar(c)} style={{ padding: 8 }}>
              <Pencil size={17} color="#9ca3af" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => excluir(c.id!)} style={{ padding: 8 }}>
              <Trash2 size={17} color="#f87171" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
