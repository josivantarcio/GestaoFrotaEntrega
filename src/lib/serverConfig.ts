import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_URL = "@routelog:server_url";
const KEY_API_KEY = "@routelog:api_key";

// Valores padrão vindos do .env (usados se o usuário ainda não configurou)
const DEFAULT_URL = (process.env.EXPO_PUBLIC_SERVER_URL ?? "").replace(/\/$/, "");
const DEFAULT_KEY = process.env.EXPO_PUBLIC_API_KEY ?? "";

export interface ServerConfig {
  url: string;
  apiKey: string;
}

/** Lê config do AsyncStorage. Fallback para .env se não configurado. */
export async function getServerConfig(): Promise<ServerConfig> {
  const [url, apiKey] = await Promise.all([
    AsyncStorage.getItem(KEY_URL),
    AsyncStorage.getItem(KEY_API_KEY),
  ]);
  return {
    url: (url ?? DEFAULT_URL).replace(/\/$/, ""),
    apiKey: apiKey ?? DEFAULT_KEY,
  };
}

/** Salva config no AsyncStorage. */
export async function saveServerConfig(config: ServerConfig): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(KEY_URL, config.url.replace(/\/$/, "")),
    AsyncStorage.setItem(KEY_API_KEY, config.apiKey),
  ]);
}

/** Retorna true se URL e key parecem válidas. */
export function isConfigured(config: ServerConfig): boolean {
  return (
    config.url.length > 10 &&
    !config.url.includes("SEU-SERVIDOR") &&
    config.apiKey.length >= 8 &&
    !config.apiKey.includes("TROQUE")
  );
}
