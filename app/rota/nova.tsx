import React, { useEffect, useState, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Plus, Trash2, MapPin, MessageCircle, RotateCcw, BookOpen } from "lucide-react-native";
import PageHeader from "@/components/PageHeader";
import Btn from "@/components/Btn";
import Input from "@/components/Input";
import SelectModal from "@/components/SelectModal";
import { listarVeiculos, listarCidades, listarEntregadores, listarRotasModelo, salvarRota, horaAtual, dataHojeISO, Veiculo, Cidade, Entregador, ItemRota, Rota, RotaModelo } from "@/lib/db";
import { mensagemSaidaRota, abrirWhatsApp } from "@/lib/whatsapp";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ItemFormulario { cidadeId: string; entregadorId: string; volumesSaida: string; }
const ITEM_VAZIO: ItemFormulario = { cidadeId: "", entregadorId: "", volumesSaida: "" };
const RASCUNHO_KEY = "nova-rota-rascunho";

export default function NovaRotaPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [entregadores, setEntregadores] = useState<Entregador[]>([]);
  const [modelos, setModelos] = useState<RotaModelo[]>([]);
  const [veiculoId, setVeiculoId] = useState("");
  const [motorista, setMotorista] = useState("");
  const [kmSaida, setKmSaida] = useState("");
  const [horaSaida, setHoraSaida] = useState(horaAtual());
  const [itens, setItens] = useState<ItemFormulario[]>([{ ...ITEM_VAZIO }]);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [temRascunho, setTemRascunho] = useState(false);
  const [mostrarModelos, setMostrarModelos] = useState(false);
  const carregadoRef = useRef(false);

  useEffect(() => {
    async function carregar() {
      const [vs, cs, es, ms] = await Promise.all([listarVeiculos(), listarCidades(), listarEntregadores(), listarRotasModelo()]);
      setVeiculos(vs.filter((v) => v.ativo));
      setCidades(cs);
      setEntregadores(es.filter((e) => e.ativo));
      setModelos(ms);
      const raw = await AsyncStorage.getItem(RASCUNHO_KEY);
      if (raw) {
        try {
          const rascunho = JSON.parse(raw);
          setVeiculoId(rascunho.veiculoId || "");
          setMotorista(rascunho.motorista || "");
          setKmSaida(rascunho.kmSaida || "");
          setHoraSaida(rascunho.horaSaida || horaAtual());
          setItens(rascunho.itens?.length ? rascunho.itens : [{ ...ITEM_VAZIO }]);
          setTemRascunho(true);
        } catch { await AsyncStorage.removeItem(RASCUNHO_KEY); }
      }
      carregadoRef.current = true;
    }
    carregar();
  }, []);

  useEffect(() => {
    if (!carregadoRef.current) return;
    const rascunho = { veiculoId, motorista, kmSaida, horaSaida, itens, savedAt: new Date().toISOString() };
    AsyncStorage.setItem(RASCUNHO_KEY, JSON.stringify(rascunho));
  }, [veiculoId, motorista, kmSaida, horaSaida, itens]);

  async function descartarRascunho() {
    await AsyncStorage.removeItem(RASCUNHO_KEY);
    setTemRascunho(false);
    setVeiculoId(""); setMotorista(""); setKmSaida(""); setHoraSaida(horaAtual());
    setItens([{ ...ITEM_VAZIO }]); setErros({});
  }

  function aplicarModelo(modelo: RotaModelo) {
    setVeiculoId(String(modelo.veiculoId));
    const v = veiculos.find((vv) => vv.id === modelo.veiculoId);
    if (v?.motoristaPadrao) setMotorista(v.motoristaPadrao);
    setItens(modelo.itens.map((it) => ({ cidadeId: String(it.cidadeId), entregadorId: String(it.entregadorId), volumesSaida: "" })));
    setMostrarModelos(false);
  }

  function selecionarVeiculo(id: string) {
    setVeiculoId(id);
    const v = veiculos.find((v) => String(v.id) === id);
    if (v?.motoristaPadrao) setMotorista(v.motoristaPadrao);
  }

  function adicionarItem() { setItens([...itens, { ...ITEM_VAZIO }]); }
  function removerItem(idx: number) { setItens(itens.filter((_, i) => i !== idx)); }
  function atualizarItem(idx: number, campo: keyof ItemFormulario, valor: string) {
    const novo = [...itens]; novo[idx] = { ...novo[idx], [campo]: valor }; setItens(novo);
  }

  function entregadoresDaCidade(cidadeId: string): Entregador[] {
    if (!cidadeId) return entregadores;
    const cid = Number(cidadeId);
    const filtrados = entregadores.filter((e) => e.cidadesIds.includes(cid));
    return filtrados.length > 0 ? filtrados : entregadores;
  }

  function validar(): boolean {
    const novosErros: Record<string, string> = {};
    if (!veiculoId) novosErros.veiculo = "Selecione o veículo";
    if (!motorista.trim()) novosErros.motorista = "Informe o motorista";
    if (!kmSaida || Number(kmSaida) <= 0) novosErros.km = "Informe o KM de saída";
    itens.forEach((item, idx) => {
      if (!item.cidadeId) novosErros[`cidade_${idx}`] = "Selecione a cidade";
      if (!item.entregadorId) novosErros[`entregador_${idx}`] = "Selecione o entregador";
      if (!item.volumesSaida || Number(item.volumesSaida) <= 0) novosErros[`volumes_${idx}`] = "Informe os volumes";
    });
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  async function iniciarRota(enviarWhatsApp: boolean) {
    if (!validar()) return;
    setSalvando(true);
    try {
      const veiculo = veiculos.find((v) => String(v.id) === veiculoId)!;
      const itensRota: ItemRota[] = itens.map((item) => {
        const cidade = cidades.find((c) => String(c.id) === item.cidadeId)!;
        const entregador = entregadores.find((e) => String(e.id) === item.entregadorId)!;
        return { cidadeId: Number(item.cidadeId), cidadeNome: cidade.nome, entregadorId: Number(item.entregadorId), entregadorNome: entregador.nome, volumesSaida: Number(item.volumesSaida), concluido: false, ocorrencias: [] };
      });
      const rota: Rota = { data: dataHojeISO(), veiculoId: Number(veiculoId), veiculoPlaca: veiculo.placa, motorista, kmSaida: Number(kmSaida), horaSaida, status: "em_andamento", itens: itensRota, criadoEm: new Date().toISOString() };
      const id = await salvarRota(rota);
      await AsyncStorage.removeItem(RASCUNHO_KEY);
      if (enviarWhatsApp) await abrirWhatsApp(mensagemSaidaRota({ ...rota, id }));
      router.push(`/rota/${id}` as any);
    } finally { setSalvando(false); }
  }

  const veiculoOptions = veiculos.map((v) => ({ value: String(v.id), label: `${v.placa} — ${v.modelo}` }));
  const cidadeOptions = cidades.map((c) => ({ value: String(c.id), label: `${c.nome} — ${c.uf}` }));

  return (
    <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      <PageHeader titulo="Nova Rota" voltar="/" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 16 }}>
        {/* Rascunho */}
        {temRascunho && (
          <View style={{ backgroundColor: "#fffbeb", borderWidth: 1, borderColor: "#fde68a", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#92400e" }}>Rascunho recuperado</Text>
              <Text style={{ fontSize: 12, color: "#b45309" }}>Suas informações anteriores foram restauradas</Text>
            </View>
            <TouchableOpacity onPress={descartarRascunho} style={{ borderWidth: 1, borderColor: "#fbbf24", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 4 }}>
              <RotateCcw size={12} color="#92400e" />
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#92400e" }}>Descartar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Usar modelo */}
        {modelos.length > 0 && (
          <TouchableOpacity
            onPress={() => setMostrarModelos(!mostrarModelos)}
            style={{ backgroundColor: "#fff5f3", borderWidth: 1, borderColor: "#fecaca", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <BookOpen size={16} color="#ee4d2d" />
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#ee4d2d" }}>Usar rota modelo</Text>
          </TouchableOpacity>
        )}

        {mostrarModelos && (
          <View style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 16, gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 4 }}>Escolha um modelo:</Text>
            {modelos.map((m) => (
              <TouchableOpacity key={m.id} onPress={() => aplicarModelo(m)} style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>{m.nome}</Text>
                <Text style={{ fontSize: 12, color: "#9ca3af" }}>{m.itens.length} parada(s){m.descricao ? ` · ${m.descricao}` : ""}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Veículo */}
        <View style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 16, gap: 12 }}>
          <Text style={{ fontWeight: "600", color: "#374151" }}>Veículo</Text>
          <SelectModal label="Veículo *" value={veiculoId} options={veiculoOptions} onChange={selecionarVeiculo} placeholder="Selecione o veículo" erro={erros.veiculo} />
          <Input label="Motorista *" value={motorista} onChangeText={setMotorista} placeholder="Nome do motorista" erro={erros.motorista} />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Input label="KM saída *" keyboardType="numeric" value={kmSaida} onChangeText={setKmSaida} placeholder="Ex: 45230" erro={erros.km} />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Hora saída" value={horaSaida} onChangeText={setHoraSaida} placeholder="HH:MM" keyboardType="numbers-and-punctuation" />
            </View>
          </View>
        </View>

        {/* Cidades */}
        <View style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 16, gap: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontWeight: "600", color: "#374151" }}>Cidades da Rota</Text>
            <TouchableOpacity onPress={adicionarItem} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Plus size={16} color="#ee4d2d" />
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#ee4d2d" }}>Adicionar</Text>
            </TouchableOpacity>
          </View>

          {itens.map((item, idx) => (
            <View key={idx} style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 12, gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <MapPin size={15} color="#ee4d2d" />
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}>Parada {idx + 1}</Text>
                </View>
                {itens.length > 1 && (
                  <TouchableOpacity onPress={() => removerItem(idx)}><Trash2 size={16} color="#f87171" /></TouchableOpacity>
                )}
              </View>
              <SelectModal label="Cidade *" value={item.cidadeId} options={cidadeOptions} onChange={(v) => atualizarItem(idx, "cidadeId", v)} placeholder="Selecione a cidade" erro={erros[`cidade_${idx}`]} searchable />
              <SelectModal
                label="Entregador *"
                value={item.entregadorId}
                options={entregadoresDaCidade(item.cidadeId).map((e) => ({ value: String(e.id), label: e.nome }))}
                onChange={(v) => atualizarItem(idx, "entregadorId", v)}
                placeholder="Selecione o entregador"
                erro={erros[`entregador_${idx}`]}
              />
              <Input label="Volumes *" keyboardType="numeric" value={item.volumesSaida} onChangeText={(v) => atualizarItem(idx, "volumesSaida", v)} placeholder="Qtd de volumes" erro={erros[`volumes_${idx}`]} />
            </View>
          ))}
        </View>

        {/* Botões */}
        <Btn variante="whatsapp" fullWidth tamanho="lg" onPress={() => iniciarRota(true)} disabled={salvando}>
          <MessageCircle size={20} color="#ffffff" />
          <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 16 }}>Iniciar e Avisar no WhatsApp</Text>
        </Btn>
        <Btn variante="secundario" fullWidth onPress={() => iniciarRota(false)} disabled={salvando}>
          <Text style={{ fontWeight: "600" }}>Iniciar sem avisar</Text>
        </Btn>
      </ScrollView>
    </View>
  );
}
