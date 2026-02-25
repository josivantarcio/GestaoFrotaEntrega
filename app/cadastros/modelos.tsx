import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Plus, Trash2, MapPin, BookOpen, ChevronDown, ChevronUp } from "lucide-react-native";
import PageHeader from "@/components/PageHeader";
import Btn from "@/components/Btn";
import Input from "@/components/Input";
import SelectModal from "@/components/SelectModal";
import { listarRotasModelo, salvarRotaModelo, deletarRotaModelo, listarVeiculos, listarCidades, listarEntregadores, RotaModelo, ItemRotaModelo, Veiculo, Cidade, Entregador } from "@/lib/db";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ItemForm { cidadeId: string; entregadorId: string; }
const ITEM_VAZIO: ItemForm = { cidadeId: "", entregadorId: "" };
interface FormState { nome: string; descricao: string; veiculoId: string; itens: ItemForm[]; }
const FORM_VAZIO: FormState = { nome: "", descricao: "", veiculoId: "", itens: [{ ...ITEM_VAZIO }] };

export default function ModelosPage() {
  const insets = useSafeAreaInsets();
  const [modelos, setModelos] = useState<RotaModelo[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [entregadores, setEntregadores] = useState<Entregador[]>([]);
  const [abertos, setAbertos] = useState<Set<number>>(new Set());
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    const [ms, vs, cs, es] = await Promise.all([listarRotasModelo(), listarVeiculos(), listarCidades(), listarEntregadores()]);
    setModelos(ms);
    setVeiculos(vs.filter((v) => v.ativo));
    setCidades(cs);
    setEntregadores(es.filter((e) => e.ativo));
  }

  useEffect(() => { carregar(); }, []);

  function toggleAberto(id: number) {
    setAbertos((prev) => { const novo = new Set(prev); if (novo.has(id)) novo.delete(id); else novo.add(id); return novo; });
  }

  function entregadoresDaCidade(cidadeId: string): Entregador[] {
    if (!cidadeId) return entregadores;
    const cid = Number(cidadeId);
    const filtrados = entregadores.filter((e) => e.cidadesIds.includes(cid));
    return filtrados.length > 0 ? filtrados : entregadores;
  }

  function adicionarItem() { setForm((f) => ({ ...f, itens: [...f.itens, { ...ITEM_VAZIO }] })); }
  function removerItem(idx: number) { setForm((f) => ({ ...f, itens: f.itens.filter((_, i) => i !== idx) })); }
  function atualizarItem(idx: number, campo: keyof ItemForm, valor: string) {
    setForm((f) => { const itens = [...f.itens]; itens[idx] = { ...itens[idx], [campo]: valor }; return { ...f, itens }; });
  }

  async function salvar() {
    const novosErros: Record<string, string> = {};
    if (!form.nome.trim()) novosErros.nome = "Informe o nome do modelo";
    if (!form.veiculoId) novosErros.veiculo = "Selecione o veículo";
    form.itens.forEach((it, idx) => {
      if (!it.cidadeId) novosErros[`cidade_${idx}`] = "Selecione a cidade";
      if (!it.entregadorId) novosErros[`entregador_${idx}`] = "Selecione o entregador";
    });
    setErros(novosErros);
    if (Object.keys(novosErros).length) return;
    setSalvando(true);
    try {
      const veiculo = veiculos.find((v) => String(v.id) === form.veiculoId)!;
      const itensModelo: ItemRotaModelo[] = form.itens.map((it) => {
        const cidade = cidades.find((c) => String(c.id) === it.cidadeId)!;
        const entregador = entregadores.find((e) => String(e.id) === it.entregadorId)!;
        return { cidadeId: Number(it.cidadeId), cidadeNome: cidade.nome, entregadorId: Number(it.entregadorId), entregadorNome: entregador.nome };
      });
      await salvarRotaModelo({ nome: form.nome.trim(), descricao: form.descricao.trim() || undefined, veiculoId: Number(form.veiculoId), veiculoPlaca: veiculo.placa, itens: itensModelo, criadoEm: new Date().toISOString() });
      setForm(FORM_VAZIO); setMostrarForm(false); await carregar();
    } finally { setSalvando(false); }
  }

  const veiculoOptions = veiculos.map((v) => ({ value: String(v.id), label: `${v.placa} — ${v.modelo}` }));
  const cidadeOptions = cidades.map((c) => ({ value: String(c.id), label: `${c.nome} — ${c.uf}` }));

  return (
    <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      <PageHeader titulo="Rotas Modelo" voltar="/cadastros" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 16 }}>
        <Btn variante="primario" fullWidth onPress={() => { setMostrarForm(!mostrarForm); setForm(FORM_VAZIO); setErros({}); }}>
          <Plus size={16} color="#ffffff" />
          <Text style={{ color: "#ffffff", fontWeight: "600", fontSize: 14 }}>Novo Modelo</Text>
        </Btn>

        {mostrarForm && (
          <View style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 16, gap: 16 }}>
            <Text style={{ fontWeight: "600", color: "#374151" }}>Novo Modelo de Rota</Text>
            <Input label="Nome do modelo *" value={form.nome} onChangeText={(v) => setForm((f) => ({ ...f, nome: v }))} placeholder="Ex: Rota Norte..." erro={erros.nome} />
            <Input label="Descrição (opcional)" value={form.descricao} onChangeText={(v) => setForm((f) => ({ ...f, descricao: v }))} placeholder="Observações sobre esta rota..." />
            <SelectModal label="Veículo padrão *" value={form.veiculoId} options={veiculoOptions} onChange={(v) => setForm((f) => ({ ...f, veiculoId: v }))} placeholder="Selecione o veículo" erro={erros.veiculo} />

            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}>Paradas</Text>
                <TouchableOpacity onPress={adicionarItem} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Plus size={14} color="#ee4d2d" />
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#ee4d2d" }}>Adicionar</Text>
                </TouchableOpacity>
              </View>

              {form.itens.map((item, idx) => (
                <View key={idx} style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 12, gap: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <MapPin size={14} color="#ee4d2d" />
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#374151" }}>Parada {idx + 1}</Text>
                    </View>
                    {form.itens.length > 1 && (
                      <TouchableOpacity onPress={() => removerItem(idx)}><Trash2 size={14} color="#f87171" /></TouchableOpacity>
                    )}
                  </View>
                  <SelectModal label="Cidade *" value={item.cidadeId} options={cidadeOptions} onChange={(v) => atualizarItem(idx, "cidadeId", v)} placeholder="Selecione a cidade" erro={erros[`cidade_${idx}`]} searchable />
                  <SelectModal
                    label="Entregador padrão *"
                    value={item.entregadorId}
                    options={entregadoresDaCidade(item.cidadeId).map((e) => ({ value: String(e.id), label: e.nome }))}
                    onChange={(v) => atualizarItem(idx, "entregadorId", v)}
                    placeholder="Selecione o entregador"
                    erro={erros[`entregador_${idx}`]}
                  />
                </View>
              ))}
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <Btn variante="secundario" fullWidth onPress={() => setMostrarForm(false)}>Cancelar</Btn>
              <Btn fullWidth onPress={salvar} disabled={salvando}>Salvar Modelo</Btn>
            </View>
          </View>
        )}

        {modelos.length === 0 && !mostrarForm && (
          <View style={{ alignItems: "center", paddingVertical: 48 }}>
            <BookOpen size={44} color="#d1d5db" />
            <Text style={{ fontWeight: "500", color: "#9ca3af", marginTop: 12 }}>Nenhum modelo cadastrado</Text>
            <Text style={{ fontSize: 13, color: "#d1d5db" }}>Crie modelos para agilizar a criação de rotas</Text>
          </View>
        )}

        {modelos.map((m) => (
          <View key={m.id} style={{ backgroundColor: "#ffffff", borderRadius: 16, overflow: "hidden" }}>
            <TouchableOpacity onPress={() => toggleAberto(m.id!)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
              <View style={{ backgroundColor: "#fff5f3", borderRadius: 16, padding: 6 }}>
                <BookOpen size={16} color="#ee4d2d" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "600", color: "#111827" }}>{m.nome}</Text>
                <Text style={{ fontSize: 12, color: "#9ca3af" }}>{m.veiculoPlaca} · {m.itens.length} parada(s){m.descricao ? ` · ${m.descricao}` : ""}</Text>
              </View>
              {abertos.has(m.id!) ? <ChevronUp size={16} color="#9ca3af" /> : <ChevronDown size={16} color="#9ca3af" />}
            </TouchableOpacity>
            {abertos.has(m.id!) && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: "#f3f4f6" }}>
                <View style={{ gap: 6, paddingTop: 12 }}>
                  {m.itens.map((it, idx) => (
                    <View key={idx} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <MapPin size={13} color="#ee4d2d" />
                      <Text style={{ fontSize: 14, color: "#374151" }}>{it.cidadeNome}</Text>
                      <Text style={{ color: "#9ca3af" }}>→</Text>
                      <Text style={{ fontSize: 14, color: "#4b5563" }}>{it.entregadorNome}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  onPress={() => Alert.alert("Confirmar", "Excluir este modelo?", [{ text: "Cancelar", style: "cancel" }, { text: "Excluir", style: "destructive", onPress: () => deletarRotaModelo(m.id!).then(carregar) }])}
                  style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-end", marginTop: 12 }}
                >
                  <Trash2 size={13} color="#ef4444" />
                  <Text style={{ fontSize: 12, color: "#ef4444", fontWeight: "600" }}>Excluir modelo</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
