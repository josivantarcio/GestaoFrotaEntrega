import "../global.css";
import { Tabs } from "expo-router";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Home, Plus, Clock, Wrench, Settings } from "lucide-react-native";

function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#ee4d2d",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          backgroundColor: "#ffffff",
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
        },
      }}
    >
        <Tabs.Screen
          name="index"
          options={{
            title: "Início",
            tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="rota/nova"
          options={{
            title: "Rota",
            tabBarIcon: ({ color, size }) => <Plus size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="historico/index"
          options={{
            title: "Histórico",
            tabBarIcon: ({ color, size }) => <Clock size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="manutencao/index"
          options={{
            title: "Frota",
            tabBarIcon: ({ color, size }) => <Wrench size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="cadastros/index"
          options={{
            title: "Cadastros",
            tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
          }}
        />
        {/* Hidden screens */}
        <Tabs.Screen name="rota/[id]" options={{ href: null }} />
        <Tabs.Screen name="historico/[id]" options={{ href: null }} />
        <Tabs.Screen name="cadastros/cidades" options={{ href: null }} />
        <Tabs.Screen name="cadastros/entregadores" options={{ href: null }} />
        <Tabs.Screen name="cadastros/veiculos" options={{ href: null }} />
        <Tabs.Screen name="cadastros/modelos" options={{ href: null }} />
        <Tabs.Screen name="manutencao/[veiculoId]/abastecimentos" options={{ href: null }} />
        <Tabs.Screen name="manutencao/[veiculoId]/manutencoes" options={{ href: null }} />
        <Tabs.Screen name="relatorios" options={{ href: null }} />
        <Tabs.Screen name="backup" options={{ href: null }} />
        <Tabs.Screen name="configuracoes" options={{ href: null }} />
    </Tabs>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <TabsLayout />
    </SafeAreaProvider>
  );
}
