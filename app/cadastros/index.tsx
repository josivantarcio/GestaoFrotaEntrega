import React from "react";
import { View, ScrollView, TouchableOpacity, Text } from "react-native";
import { useRouter } from "expo-router";
import { MapPin, Users, Truck, BookOpen, ChevronRight } from "lucide-react-native";
import PageHeader from "@/components/PageHeader";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const itens = [
  { href: "/cadastros/cidades", Icon: MapPin, titulo: "Cidades", descricao: "Cadastrar e editar cidades da rota" },
  { href: "/cadastros/entregadores", Icon: Users, titulo: "Entregadores", descricao: "Cadastrar e editar entregadores" },
  { href: "/cadastros/veiculos", Icon: Truck, titulo: "Veículos", descricao: "Cadastrar e editar veículos" },
  { href: "/cadastros/modelos", Icon: BookOpen, titulo: "Rotas Modelo", descricao: "Rotas pré-definidas para agilizar a criação" },
];

export default function CadastrosPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      <PageHeader titulo="Cadastros" voltar="/" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 16 }}>
        {itens.map(({ href, Icon, titulo, descricao }) => (
          <TouchableOpacity
            key={href}
            onPress={() => router.push(href as any)}
            activeOpacity={0.7}
            style={{ backgroundColor: "#ffffff", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", gap: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, elevation: 1 }}
          >
            <View style={{ backgroundColor: "#fff5f3", borderRadius: 20, padding: 12 }}>
              <Icon size={22} color="#ee4d2d" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600", color: "#111827", fontSize: 15 }}>{titulo}</Text>
              <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{descricao}</Text>
            </View>
            <ChevronRight size={18} color="#9ca3af" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
