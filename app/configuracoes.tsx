import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Wifi, WifiOff, CheckCircle, XCircle } from "lucide-react-native";
import PageHeader from "@/components/PageHeader";
import Input from "@/components/Input";
import Btn from "@/components/Btn";
import { getServerConfig, saveServerConfig, isConfigured } from "@/lib/serverConfig";

type Status = "idle" | "testando" | "ok" | "erro";

export default function ConfiguracoesPage() {
  const insets = useSafeAreaInsets();
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [erroMsg, setErroMsg] = useState("");
  const [carregando, setCarregando] = useState(true);

  // Carregar config salva
  useEffect(() => {
    getServerConfig().then((c) => {
      setUrl(c.url);
      setApiKey(c.apiKey);
      setCarregando(false);
    });
  }, []);

  const testarConexao = useCallback(async () => {
    const urlTrim = url.trim().replace(/\/$/, "");
    const keyTrim = apiKey.trim();

    if (!urlTrim) {
      Alert.alert("Atenção", "Informe a URL do servidor.");
      return;
    }

    setStatus("testando");
    setErroMsg("");

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const testUrl = `${urlTrim}/api/sync/rotas?data=2000-01-01`;
      const res = await fetch(testUrl, {
        headers: { "x-api-key": keyTrim },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok || res.status === 400) {
        setStatus("ok");
      } else if (res.status === 401) {
        setStatus("erro");
        setErroMsg("API Key incorreta (401). Verifique a chave.");
      } else {
        setStatus("erro");
        setErroMsg(`Servidor retornou HTTP ${res.status}.`);
      }
    } catch (e: any) {
      setStatus("erro");
      if (e?.name === "AbortError") {
        setErroMsg("Timeout (8s) — servidor não respondeu. Verifique se está rodando.");
      } else if (e?.message?.includes("Network request failed")) {
        setErroMsg(`Sem acesso à rede. Confirme que o celular está no Wi-Fi e a URL está correta: ${url.trim()}`);
      } else {
        setErroMsg(`Erro: ${e?.message ?? "desconhecido"}`);
      }
    }
  }, [url, apiKey]);

  const salvar = useCallback(async () => {
    const urlTrim = url.trim().replace(/\/$/, "");
    const keyTrim = apiKey.trim();

    if (!urlTrim) {
      Alert.alert("Atenção", "Informe a URL do servidor.");
      return;
    }
    if (keyTrim.length < 8) {
      Alert.alert("Atenção", "A API Key deve ter pelo menos 8 caracteres.");
      return;
    }

    setSalvando(true);
    await saveServerConfig({ url: urlTrim, apiKey: keyTrim });
    setSalvando(false);
    setStatus("idle");
    Alert.alert("Salvo", "Configurações salvas. O app usará o novo servidor a partir de agora.");
  }, [url, apiKey]);

  if (carregando) {
    return (
      <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
        <PageHeader titulo="Configurações do Servidor" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#ee4d2d" />
        </View>
      </View>
    );
  }

  const configAtual = { url: url.trim(), apiKey: apiKey.trim() };
  const configurado = isConfigured(configAtual);

  return (
    <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      <PageHeader titulo="Configurações do Servidor" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 24 }}
      >

        {/* Card de status */}
        <View style={{
          backgroundColor: configurado ? "#f0fdf4" : "#fff7ed",
          borderWidth: 1,
          borderColor: configurado ? "#bbf7d0" : "#fed7aa",
          borderRadius: 16,
          padding: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}>
          {configurado
            ? <Wifi size={22} color="#16a34a" />
            : <WifiOff size={22} color="#ea580c" />
          }
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "600", color: configurado ? "#15803d" : "#c2410c", fontSize: 14 }}>
              {configurado ? "Servidor configurado" : "Servidor não configurado"}
            </Text>
            <Text style={{ fontSize: 12, color: configurado ? "#166534" : "#9a3412", marginTop: 2 }}>
              {configurado
                ? "Os dados serão sincronizados automaticamente."
                : "Preencha a URL e a API Key abaixo."}
            </Text>
          </View>
        </View>

        {/* Campos */}
        <View style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 16, gap: 16, elevation: 1 }}>
          <Text style={{ fontWeight: "700", fontSize: 15, color: "#111827" }}>Endereço do Servidor</Text>

          <Input
            label="URL do servidor"
            value={url}
            onChangeText={(t) => { setUrl(t); setStatus("idle"); }}
            placeholder="http://192.168.1.100:3000"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          <Input
            label="API Key"
            value={apiKey}
            onChangeText={(t) => { setApiKey(t); setStatus("idle"); }}
            placeholder="chave-secreta-do-servidor"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={false}
          />

          <Text style={{ fontSize: 12, color: "#9ca3af", lineHeight: 18 }}>
            Use o IP local (ex: 192.168.1.100) quando estiver na mesma rede Wi-Fi.{"\n"}
            Use o DuckDNS (ex: routelog.duckdns.org) para acesso via 4G.
          </Text>
        </View>

        {/* Resultado do teste */}
        {status !== "idle" && (
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: status === "ok" ? "#f0fdf4" : status === "erro" ? "#fef2f2" : "#f9fafb",
            borderRadius: 12,
            padding: 12,
            borderWidth: 1,
            borderColor: status === "ok" ? "#bbf7d0" : status === "erro" ? "#fecaca" : "#e5e7eb",
          }}>
            {status === "testando" && <ActivityIndicator size="small" color="#6b7280" />}
            {status === "ok" && <CheckCircle size={18} color="#16a34a" />}
            {status === "erro" && <XCircle size={18} color="#dc2626" />}
            <Text style={{
              flex: 1,
              fontSize: 13,
              color: status === "ok" ? "#15803d" : status === "erro" ? "#dc2626" : "#6b7280",
            }}>
              {status === "testando" && "Testando conexão..."}
              {status === "ok" && "Servidor acessível!"}
              {status === "erro" && erroMsg}
            </Text>
          </View>
        )}

        {/* Botões */}
        <TouchableOpacity
          onPress={testarConexao}
          disabled={status === "testando"}
          activeOpacity={0.75}
          style={{
            borderWidth: 1.5,
            borderColor: "#ee4d2d",
            borderRadius: 12,
            paddingVertical: 11,
            alignItems: "center",
            opacity: status === "testando" ? 0.5 : 1,
          }}
        >
          <Text style={{ color: "#ee4d2d", fontWeight: "600", fontSize: 14 }}>Testar Conexão</Text>
        </TouchableOpacity>

        <Btn onPress={salvar} loading={salvando} tamanho="lg">
          Salvar Configurações
        </Btn>

      </ScrollView>
    </View>
  );
}
