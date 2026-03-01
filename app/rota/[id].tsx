import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CheckCircle2, MessageCircle, Plus, ChevronDown, ChevronUp, Package, AlertTriangle, Truck, Flag, Clock } from "lucide-react-native";
import PageHeader from "@/components/PageHeader";
import Btn from "@/components/Btn";
import Input from "@/components/Input";
import SelectModal from "@/components/SelectModal";
import { buscarRota, salvarRota, listarAbastecimentosPorVeiculo, buscarUltimaManutencao, manutencaoVencida, horaAtual, Rota, ItemRota, Ocorrencia, TipoOcorrencia, TIPOS_OCORRENCIA, Manutencao } from "@/lib/db";
import { mensagemCidadeConcluida, mensagemEncerramentoRota, abrirWhatsApp } from "@/lib/whatsapp";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ModalOcorrencia { idxCidade: number; tipo: TipoOcorrencia; descricao: string; quantidade: string; }
interface ModalConcluirCidade { idx: number; hora: string; enviarWhatsApp: boolean; }
const MODAL_VAZIO: ModalOcorrencia = { idxCidade: 0, tipo: "recusa_cliente", descricao: "", quantidade: "1" };

export default function RotaPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [rota, setRota] = useState<Rota | null>(null);
  const [abertos, setAbertos] = useState<Set<number>>(new Set([0]));
  const [modalOco, setModalOco] = useState<ModalOcorrencia | null>(null);
  const [modalConcluir, setModalConcluir] = useState<ModalConcluirCidade | null>(null);
  const [kmChegada, setKmChegada] = useState("");
  const [horaChegada, setHoraChegada] = useState(horaAtual());
  const [mostraFinalizacao, setMostraFinalizacao] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [consumoMedio, setConsumoMedio] = useState<number | undefined>(undefined);
  const [alertaManutencao, setAlertaManutencao] = useState(false);
  const [erroKm, setErroKm] = useState("");
  const [ultimaManutencao, setUltimaManutencao] = useState<Manutencao | null>(null);

  async function carregar() {
    const r = await buscarRota(Number(id));
    if (r) {
      setRota(r);
      const [abs, ultimaMan] = await Promise.all([listarAbastecimentosPorVeiculo(r.veiculoId), buscarUltimaManutencao(r.veiculoId)]);
      const comConsumo = abs.filter((a) => a.consumoKmL !== undefined).slice(0, 5);
      if (comConsumo.length > 0) {
        setConsumoMedio(comConsumo.reduce((s, a) => s + a.consumoKmL!, 0) / comConsumo.length);
      }
      if (ultimaMan) {
        setUltimaManutencao(ultimaMan);
        setAlertaManutencao(manutencaoVencida(ultimaMan, r.kmSaida));
      }
    }
  }

  useEffect(() => { carregar(); }, [id]);

  function toggleAberto(idx: number) {
    setAbertos((prev) => { const novo = new Set(prev); if (novo.has(idx)) novo.delete(idx); else novo.add(idx); return novo; });
  }

  async function confirmarConclusaoCidade() {
    if (!rota || !modalConcluir) return;
    const { idx, hora, enviarWhatsApp } = modalConcluir;
    setSalvando(true);
    try {
      const novosItens = [...rota.itens];
      novosItens[idx] = { ...novosItens[idx], concluido: true, horaConclusao: hora };
      const rotaAtualizada = { ...rota, itens: novosItens };
      await salvarRota(rotaAtualizada);
      setRota(rotaAtualizada);
      if (enviarWhatsApp) await abrirWhatsApp(mensagemCidadeConcluida(rotaAtualizada, novosItens[idx]));
      setModalConcluir(null);
    } finally { setSalvando(false); }
  }

  async function atualizarVolumes(idx: number, campo: "volumesEntregues" | "volumesDevolvidos", valor: string) {
    if (!rota) return;
    const novosItens = [...rota.itens];
    novosItens[idx] = { ...novosItens[idx], [campo]: valor === "" ? undefined : Number(valor) };
    const rotaAtualizada = { ...rota, itens: novosItens };
    setRota(rotaAtualizada);
    await salvarRota(rotaAtualizada);
  }

  async function adicionarOcorrencia() {
    if (!rota || !modalOco) return;
    const novosItens = [...rota.itens];
    const oco: Ocorrencia = { id: Date.now().toString(), tipo: modalOco.tipo, descricao: modalOco.descricao || undefined, quantidade: Number(modalOco.quantidade) || 1, registradoEm: new Date().toISOString() };
    novosItens[modalOco.idxCidade] = { ...novosItens[modalOco.idxCidade], ocorrencias: [...(novosItens[modalOco.idxCidade].ocorrencias ?? []), oco] };
    const rotaAtualizada = { ...rota, itens: novosItens };
    await salvarRota(rotaAtualizada);
    setRota(rotaAtualizada);
    setModalOco(null);
  }

  async function removerOcorrencia(idxCidade: number, ocoId: string) {
    if (!rota) return;
    const novosItens = [...rota.itens];
    novosItens[idxCidade] = { ...novosItens[idxCidade], ocorrencias: novosItens[idxCidade].ocorrencias.filter((o) => o.id !== ocoId) };
    const rotaAtualizada = { ...rota, itens: novosItens };
    await salvarRota(rotaAtualizada);
    setRota(rotaAtualizada);
  }

  async function finalizarRota(enviar: boolean) {
    if (!rota) return;
    if (!kmChegada || isNaN(Number(kmChegada)) || Number(kmChegada) <= rota.kmSaida) {
      setErroKm(!kmChegada ? "Informe o KM de chegada" : `KM deve ser maior que o de saída (${rota.kmSaida})`);
      return;
    }
    setErroKm("");
    setSalvando(true);
    try {
      const rotaFinalizada: Rota = { ...rota, status: "concluida", horaChegada, kmChegada: Number(kmChegada) };
      await salvarRota(rotaFinalizada);
      if (enviar) await abrirWhatsApp(mensagemEncerramentoRota(rotaFinalizada, consumoMedio, alertaManutencao));
      router.push("/historico" as any);
    } finally { setSalvando(false); }
  }

  if (!rota) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#ee4d2d" />
      </View>
    );
  }

  const todasConcluidas = rota.itens.every((i) => i.concluido);
  const totalVolumes = rota.itens.reduce((s, i) => s + i.volumesSaida, 0);
  const totalConcluidas = rota.itens.filter((i) => i.concluido).length;
  const totalDevolucoes = rota.itens.reduce((s, i) => s + (i.volumesDevolvidos ?? 0), 0);
  const tiposOcorrenciaOptions = Object.entries(TIPOS_OCORRENCIA).map(([k, v]) => ({ value: k, label: v }));

  return (
    <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      <PageHeader titulo={`Rota — ${rota.veiculoPlaca}`} voltar="/" />

      {/* Resumo */}
      <View style={{ backgroundColor: "#ee4d2d", paddingHorizontal: 16, paddingVertical: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <Truck size={18} color="#ffffff" />
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#ffffff" }}>{rota.motorista}</Text>
          <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>· Saiu às {rota.horaSaida}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 16 }}>
          <Text style={{ fontSize: 13, color: "#ffffff" }}>📦 {totalVolumes} volumes</Text>
          <Text style={{ fontSize: 13, color: "#ffffff" }}>✅ {totalConcluidas}/{rota.itens.length} cidades</Text>
          {totalDevolucoes > 0 && <Text style={{ fontSize: 13, color: "#ffffff" }}>↩️ {totalDevolucoes} dev.</Text>}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 16 }}>
        {rota.itens.map((item: ItemRota, idx: number) => (
          <View key={idx} style={{ backgroundColor: "#ffffff", borderRadius: 16, overflow: "hidden", borderLeftWidth: 4, borderLeftColor: item.concluido ? "#22c55e" : "#e5e7eb" }}>
            <TouchableOpacity onPress={() => toggleAberto(idx)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
              <View style={{ backgroundColor: item.concluido ? "#dcfce7" : "#f3f4f6", borderRadius: 16, padding: 6 }}>
                <CheckCircle2 size={18} color={item.concluido ? "#16a34a" : "#9ca3af"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "600", color: "#111827" }}>{item.cidadeNome}</Text>
                <Text style={{ fontSize: 12, color: "#9ca3af" }}>
                  {item.entregadorNome} · {item.volumesSaida} vol.{item.concluido && item.horaConclusao ? ` · ✅ ${item.horaConclusao}` : ""}
                </Text>
              </View>
              {abertos.has(idx) ? <ChevronUp size={18} color="#9ca3af" /> : <ChevronDown size={18} color="#9ca3af" />}
            </TouchableOpacity>

            {abertos.has(idx) && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12, borderTopWidth: 1, borderTopColor: "#f3f4f6" }}>
                <View style={{ flexDirection: "row", gap: 8, paddingTop: 12 }}>
                  {(["volumesEntregues", "volumesDevolvidos"] as const).map((campo) => (
                    <View key={campo} style={{ flex: 1, gap: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: "500", color: "#9ca3af" }}>{campo === "volumesEntregues" ? "Entregues" : "Devolvidos"}</Text>
                      <TextInput
                        keyboardType="numeric"
                        value={item[campo]?.toString() ?? ""}
                        onChangeText={(v) => atualizarVolumes(idx, campo, v)}
                        editable={!item.concluido}
                        placeholder={campo === "volumesEntregues" ? String(item.volumesSaida) : "0"}
                        placeholderTextColor="#d1d5db"
                        style={{ borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: item.concluido ? "#f9fafb" : "#ffffff", color: item.concluido ? "#9ca3af" : "#111827" }}
                      />
                    </View>
                  ))}
                </View>

                {/* Ocorrências */}
                <View>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <AlertTriangle size={14} color="#f59e0b" />
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#4b5563" }}>Ocorrências ({item.ocorrencias?.length ?? 0})</Text>
                    </View>
                    {!item.concluido && (
                      <TouchableOpacity onPress={() => setModalOco({ ...MODAL_VAZIO, idxCidade: idx })} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Plus size={13} color="#f59e0b" />
                        <Text style={{ fontSize: 12, fontWeight: "600", color: "#f59e0b" }}>Registrar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {(item.ocorrencias ?? []).length === 0 ? (
                    <Text style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic" }}>Nenhuma ocorrência</Text>
                  ) : (
                    <View style={{ gap: 4 }}>
                      {item.ocorrencias.map((oco) => (
                        <View key={oco.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fffbeb", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
                          <Package size={13} color="#f59e0b" />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, fontWeight: "600", color: "#92400e" }}>{TIPOS_OCORRENCIA[oco.tipo]} ({oco.quantidade}x)</Text>
                            {oco.descricao ? <Text style={{ fontSize: 12, color: "#b45309" }} numberOfLines={1}>{oco.descricao}</Text> : null}
                          </View>
                          {!item.concluido && (
                            <TouchableOpacity onPress={() => removerOcorrencia(idx, oco.id)}>
                              <Text style={{ color: "#f59e0b", fontSize: 16 }}>✕</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {!item.concluido && (
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Btn variante="whatsapp" fullWidth onPress={() => setModalConcluir({ idx, hora: horaAtual(), enviarWhatsApp: true })} disabled={salvando}>
                      <MessageCircle size={16} color="#ffffff" />
                      <Text style={{ color: "#ffffff", fontWeight: "600", fontSize: 13 }}>Concluir + WhatsApp</Text>
                    </Btn>
                    <Btn variante="secundario" onPress={() => setModalConcluir({ idx, hora: horaAtual(), enviarWhatsApp: false })} disabled={salvando}>
                      <Text style={{ fontWeight: "600", fontSize: 16 }}>✓</Text>
                    </Btn>
                  </View>
                )}
              </View>
            )}
          </View>
        ))}

        {/* Finalizar */}
        {todasConcluidas && rota.status === "em_andamento" && (
          <View style={{ backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", borderRadius: 16, padding: 16, gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Flag size={20} color="#16a34a" />
              <Text style={{ fontWeight: "700", color: "#15803d", fontSize: 15 }}>Todas as cidades concluídas!</Text>
            </View>
            {alertaManutencao && (
              <View style={{ backgroundColor: "#fef3c7", borderWidth: 1, borderColor: "#fcd34d", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 14 }}>🔧</Text>
                <Text style={{ flex: 1, fontSize: 13, fontWeight: "600", color: "#92400e" }}>Troca de óleo vencida! Verifique a manutenção.</Text>
              </View>
            )}
            {mostraFinalizacao ? (
              <>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="KM chegada *"
                      keyboardType="numeric"
                      value={kmChegada}
                      onChangeText={(v) => {
                        setKmChegada(v);
                        setErroKm("");
                        if (ultimaManutencao && v) setAlertaManutencao(manutencaoVencida(ultimaManutencao, Number(v)));
                      }}
                      placeholder={`Saída: ${rota.kmSaida}`}
                      erro={erroKm}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontSize: 14, fontWeight: "500", color: "#374151" }}>Hora chegada</Text>
                    <TextInput
                      value={horaChegada}
                      onChangeText={setHoraChegada}
                      placeholder="HH:MM"
                      keyboardType="numbers-and-punctuation"
                      style={{ borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: "#ffffff" }}
                    />
                    <Text style={{ fontSize: 11, color: "#9ca3af" }}>Edite se necessário</Text>
                  </View>
                </View>
                <Btn variante="whatsapp" fullWidth tamanho="lg" onPress={() => finalizarRota(true)} disabled={salvando}>
                  <MessageCircle size={18} color="#ffffff" />
                  <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 15 }}>Encerrar e Enviar no WhatsApp</Text>
                </Btn>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Btn variante="secundario" fullWidth onPress={() => setMostraFinalizacao(false)}>Cancelar</Btn>
                  <Btn fullWidth onPress={() => finalizarRota(false)} disabled={salvando}>Encerrar sem avisar</Btn>
                </View>
              </>
            ) : (
              <Btn fullWidth tamanho="lg" onPress={() => setMostraFinalizacao(true)}>Encerrar rota</Btn>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal Concluir */}
      <Modal visible={!!modalConcluir} transparent animationType="fade">
        <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", paddingHorizontal: 24 }} activeOpacity={1} onPress={() => setModalConcluir(null)}>
          <View style={{ backgroundColor: "#ffffff", borderRadius: 24 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
              <Text style={{ fontWeight: "700", color: "#111827", fontSize: 16 }}>Confirmar Conclusão</Text>
              <TouchableOpacity onPress={() => setModalConcluir(null)} style={{ width: 32, height: 32, backgroundColor: "#f3f4f6", borderRadius: 16, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#6b7280", fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 20, paddingVertical: 16, gap: 16 }}>
              {modalConcluir && rota && (
                <Text style={{ fontSize: 14, color: "#6b7280" }}>
                  Cidade: <Text style={{ fontWeight: "700", color: "#111827" }}>{rota.itens[modalConcluir.idx].cidadeNome}</Text>
                </Text>
              )}
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: "500", color: "#374151" }}>Hora de conclusão</Text>
                <TextInput
                  value={modalConcluir?.hora ?? ""}
                  onChangeText={(v) => modalConcluir && setModalConcluir({ ...modalConcluir, hora: v })}
                  keyboardType="numbers-and-punctuation"
                  placeholder="HH:MM"
                  style={{ borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 }}
                />
                <Text style={{ fontSize: 11, color: "#9ca3af" }}>Ajuste se o horário real foi diferente</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingBottom: 20 }}>
              <Btn variante="secundario" fullWidth onPress={() => setModalConcluir(null)}>Cancelar</Btn>
              <Btn fullWidth variante={modalConcluir?.enviarWhatsApp ? "whatsapp" : "primario"} onPress={confirmarConclusaoCidade} disabled={salvando}>
                {modalConcluir?.enviarWhatsApp ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <MessageCircle size={15} color="#ffffff" />
                    <Text style={{ color: "#ffffff", fontWeight: "600" }}>Concluir + WA</Text>
                  </View>
                ) : (
                  <Text style={{ color: "#ffffff", fontWeight: "600" }}>Confirmar</Text>
                )}
              </Btn>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Ocorrência */}
      <Modal visible={!!modalOco} transparent animationType="fade">
        <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", paddingHorizontal: 24 }} activeOpacity={1} onPress={() => setModalOco(null)}>
          <View style={{ backgroundColor: "#ffffff", borderRadius: 24, maxHeight: "85%" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
              <Text style={{ fontWeight: "700", color: "#111827", fontSize: 16 }}>Nova Ocorrência</Text>
              <TouchableOpacity onPress={() => setModalOco(null)} style={{ width: 32, height: 32, backgroundColor: "#f3f4f6", borderRadius: 16, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#6b7280", fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, gap: 16 }}>
              {modalOco && rota && (
                <Text style={{ fontSize: 14, color: "#6b7280" }}>
                  Cidade: <Text style={{ fontWeight: "700", color: "#111827" }}>{rota.itens[modalOco.idxCidade].cidadeNome}</Text>
                </Text>
              )}
              <SelectModal
                label="Tipo *"
                value={modalOco?.tipo ?? "recusa_cliente"}
                options={tiposOcorrenciaOptions}
                onChange={(v) => modalOco && setModalOco({ ...modalOco, tipo: v as TipoOcorrencia })}
              />
              <Input label="Quantidade *" keyboardType="numeric" value={modalOco?.quantidade ?? "1"} onChangeText={(v) => modalOco && setModalOco({ ...modalOco, quantidade: v })} />
              <Input label="Observação (opcional)" value={modalOco?.descricao ?? ""} onChangeText={(v) => modalOco && setModalOco({ ...modalOco, descricao: v })} placeholder="Detalhes da ocorrência..." />
            </ScrollView>
            <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#f3f4f6" }}>
              <Btn variante="secundario" fullWidth onPress={() => setModalOco(null)}>Cancelar</Btn>
              <Btn fullWidth onPress={adicionarOcorrencia}>Registrar</Btn>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
