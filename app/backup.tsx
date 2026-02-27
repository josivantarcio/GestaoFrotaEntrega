import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { Download, Upload, CheckSquare, Square, Database, AlertTriangle } from "lucide-react-native";
import PageHeader from "@/components/PageHeader";
import Btn from "@/components/Btn";
import { gerarBackup, restaurarBackup, restaurarConfig, BackupData, TabelaBackup, dataHojeISO } from "@/lib/db";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TABELAS: { key: TabelaBackup; label: string; descricao: string }[] = [
  { key: "cidades", label: "Cidades", descricao: "Cidades e distâncias cadastradas" },
  { key: "entregadores", label: "Entregadores", descricao: "Cadastro de entregadores" },
  { key: "veiculos", label: "Veículos", descricao: "Frota de veículos" },
  { key: "rotasModelo", label: "Rotas Modelo", descricao: "Modelos de rota pré-configurados" },
  { key: "rotas", label: "Rotas", descricao: "Histórico completo de rotas" },
  { key: "abastecimentos", label: "Abastecimentos", descricao: "Registros de combustível" },
  { key: "manutencoes", label: "Manutenções", descricao: "Histórico de manutenções" },
];

export default function BackupPage() {
  const insets = useSafeAreaInsets();
  const [selecionadas, setSelecionadas] = useState<Set<TabelaBackup>>(
    new Set(TABELAS.map((t) => t.key))
  );
  const [incluirConfig, setIncluirConfig] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<{ tabela: TabelaBackup; inseridos: number }[] | null>(null);
  const [configRestaurada, setConfigRestaurada] = useState(false);

  function toggleTabela(key: TabelaBackup) {
    setSelecionadas((prev) => {
      const novo = new Set(prev);
      if (novo.has(key)) novo.delete(key);
      else novo.add(key);
      return novo;
    });
  }

  function toggleTodas() {
    if (selecionadas.size === TABELAS.length) {
      setSelecionadas(new Set());
    } else {
      setSelecionadas(new Set(TABELAS.map((t) => t.key)));
    }
  }

  async function exportar() {
    if (selecionadas.size === 0 && !incluirConfig) {
      Alert.alert("Atenção", "Selecione ao menos uma tabela ou inclua as configurações para exportar.");
      return;
    }
    setExportando(true);
    setResultado(null);
    try {
      const backup = await gerarBackup(Array.from(selecionadas), incluirConfig);
      const json = JSON.stringify(backup, null, 2);
      const hoje = dataHojeISO().replace(/-/g, "");
      const nome = `routelog_backup_${hoje}.json`;
      const caminho = FileSystem.cacheDirectory + nome;
      await FileSystem.writeAsStringAsync(caminho, json, { encoding: FileSystem.EncodingType.UTF8 });

      const disponivel = await Sharing.isAvailableAsync();
      if (disponivel) {
        await Sharing.shareAsync(caminho, {
          mimeType: "application/json",
          dialogTitle: "Salvar backup RouteLog",
          UTI: "public.json",
        });
      } else {
        Alert.alert("Compartilhamento indisponível", "Não foi possível abrir o compartilhamento neste dispositivo.");
      }
    } catch (e: any) {
      Alert.alert("Erro ao exportar", e?.message ?? "Erro desconhecido");
    } finally {
      setExportando(false);
    }
  }

  async function importar() {
    setImportando(true);
    setResultado(null);
    try {
      const resultado = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });

      if (resultado.canceled) {
        setImportando(false);
        return;
      }

      const uri = resultado.assets[0].uri;
      const conteudo = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });

      let backup: BackupData;
      try {
        backup = JSON.parse(conteudo);
      } catch {
        Alert.alert("Arquivo inválido", "O arquivo selecionado não é um backup RouteLog válido.");
        setImportando(false);
        return;
      }

      if (!backup.versao || !backup.tabelas) {
        Alert.alert("Arquivo inválido", "Formato de backup não reconhecido.");
        setImportando(false);
        return;
      }

      const tabelasNoBackup = Object.keys(backup.tabelas) as TabelaBackup[];
      const temConfig = !!backup.config?.serverUrl;

      if (tabelasNoBackup.length === 0 && !temConfig) {
        Alert.alert("Backup vazio", "O arquivo não contém dados para importar.");
        setImportando(false);
        return;
      }

      // Confirmar antes de importar
      const tabelasLabel = tabelasNoBackup
        .map((t) => TABELAS.find((x) => x.key === t)?.label ?? t)
        .join(", ");

      const descricao = [
        tabelasLabel ? `Dados de: ${tabelasLabel}` : "",
        temConfig ? "Configurações do servidor (URL e API Key)" : "",
      ].filter(Boolean).join("\n");

      Alert.alert(
        "Confirmar importação",
        `${descricao}\n\nRegistros de banco existentes não serão sobrescritos.`,
        [
          { text: "Cancelar", style: "cancel", onPress: () => setImportando(false) },
          {
            text: "Importar",
            onPress: async () => {
              try {
                const res = tabelasNoBackup.length > 0
                  ? await restaurarBackup(backup, tabelasNoBackup)
                  : [];
                const configOk = temConfig ? await restaurarConfig(backup) : false;
                setResultado(res);
                setConfigRestaurada(configOk);
              } catch (e: any) {
                Alert.alert("Erro ao importar", e?.message ?? "Erro desconhecido");
              } finally {
                setImportando(false);
              }
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Erro ao abrir arquivo");
      setImportando(false);
    }
  }

  const todasSelecionadas = selecionadas.size === TABELAS.length;
  const totalExportar = selecionadas.size + (incluirConfig ? 1 : 0);

  return (
    <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      <PageHeader titulo="Backup & Importação" voltar="/cadastros" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 16 }}>

        {/* Info */}
        <View style={{ backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#bfdbfe", borderRadius: 16, padding: 16, flexDirection: "row", gap: 12 }}>
          <Database size={20} color="#2563eb" style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "700", color: "#1d4ed8", fontSize: 14 }}>Como funciona</Text>
            <Text style={{ fontSize: 13, color: "#1e40af", marginTop: 4, lineHeight: 20 }}>
              Selecione as tabelas e exporte um arquivo JSON. Para restaurar, abra um arquivo de backup e os dados serão adicionados sem apagar os existentes.
            </Text>
          </View>
        </View>

        {/* Seleção de tabelas */}
        <View style={{ backgroundColor: "#ffffff", borderRadius: 16, overflow: "hidden" }}>
          <TouchableOpacity
            onPress={toggleTodas}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}
          >
            <Text style={{ fontWeight: "700", color: "#374151", fontSize: 14 }}>Tabelas</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontSize: 12, color: "#9ca3af" }}>{todasSelecionadas ? "Desmarcar todas" : "Marcar todas"}</Text>
              {todasSelecionadas
                ? <CheckSquare size={18} color="#ee4d2d" />
                : <Square size={18} color="#9ca3af" />}
            </View>
          </TouchableOpacity>

          {TABELAS.map((tabela, idx) => (
            <TouchableOpacity
              key={tabela.key}
              onPress={() => toggleTabela(tabela.key)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: "#f3f4f6",
              }}
            >
              {selecionadas.has(tabela.key)
                ? <CheckSquare size={20} color="#ee4d2d" />
                : <Square size={20} color="#d1d5db" />}
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "600", color: "#111827", fontSize: 14 }}>{tabela.label}</Text>
                <Text style={{ fontSize: 12, color: "#9ca3af" }}>{tabela.descricao}</Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* Configurações do servidor */}
          <TouchableOpacity
            onPress={() => setIncluirConfig((v) => !v)}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}
          >
            {incluirConfig
              ? <CheckSquare size={20} color="#16a34a" />
              : <Square size={20} color="#d1d5db" />}
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600", color: "#111827", fontSize: 14 }}>Configurações do Servidor</Text>
              <Text style={{ fontSize: 12, color: "#9ca3af" }}>URL e API Key da retaguarda</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Exportar */}
        <View style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Download size={18} color="#15803d" />
            <Text style={{ fontWeight: "700", color: "#374151", fontSize: 14 }}>Exportar backup</Text>
          </View>
          <Text style={{ fontSize: 13, color: "#6b7280" }}>
            Gera um arquivo JSON com os dados selecionados. Salve em nuvem (Google Drive, WhatsApp, e-mail) para segurança.
          </Text>
          <Btn
            variante="primario"
            fullWidth
            onPress={exportar}
            disabled={exportando || totalExportar === 0}
            loading={exportando}
          >
            <Download size={16} color="#ffffff" />
            <Text style={{ color: "#ffffff", fontWeight: "700" }}>
              {exportando ? "Gerando backup..." : `Exportar (${totalExportar} item${totalExportar !== 1 ? "s" : ""})`}
            </Text>
          </Btn>
        </View>

        {/* Importar */}
        <View style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Upload size={18} color="#1d4ed8" />
            <Text style={{ fontWeight: "700", color: "#374151", fontSize: 14 }}>Importar backup</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8, backgroundColor: "#fffbeb", borderRadius: 12, padding: 12 }}>
            <AlertTriangle size={14} color="#d97706" style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: 12, color: "#92400e", lineHeight: 18 }}>
              Registros com o mesmo ID não serão duplicados. Apenas dados novos serão adicionados.
            </Text>
          </View>
          <Btn
            variante="secundario"
            fullWidth
            onPress={importar}
            disabled={importando}
            loading={importando}
          >
            <Upload size={16} color="#374151" />
            <Text style={{ fontWeight: "700", color: "#374151" }}>
              {importando ? "Importando..." : "Selecionar arquivo de backup"}
            </Text>
          </Btn>
        </View>

        {/* Resultado da importação */}
        {(resultado || configRestaurada) && (
          <View style={{ backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", borderRadius: 16, padding: 16, gap: 8 }}>
            <Text style={{ fontWeight: "700", color: "#15803d", fontSize: 14, marginBottom: 4 }}>Importação concluída</Text>
            {resultado?.map((r) => {
              const label = TABELAS.find((t) => t.key === r.tabela)?.label ?? r.tabela;
              return (
                <View key={r.tabela} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 13, color: "#166534" }}>{label}</Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: r.inseridos > 0 ? "#15803d" : "#9ca3af" }}>
                    {r.inseridos > 0 ? `+${r.inseridos} adicionado${r.inseridos !== 1 ? "s" : ""}` : "nenhum novo"}
                  </Text>
                </View>
              );
            })}
            {configRestaurada && (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 13, color: "#166534" }}>Configurações do Servidor</Text>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#15803d" }}>restauradas</Text>
              </View>
            )}
          </View>
        )}

      </ScrollView>
    </View>
  );
}
