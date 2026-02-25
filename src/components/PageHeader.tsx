import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  titulo: string;
  voltar?: string;
  acao?: React.ReactNode;
}

export default function PageHeader({ titulo, voltar, acao }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        backgroundColor: "#ee4d2d",
        paddingTop: insets.top + 8,
        paddingBottom: 12,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
      }}
    >
      {voltar && (
        <TouchableOpacity
          onPress={() => router.push(voltar as any)}
          style={{ padding: 4, borderRadius: 20, marginLeft: -4 }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#ffffff" />
        </TouchableOpacity>
      )}
      <Text
        style={{
          flex: 1,
          fontSize: 18,
          fontWeight: "700",
          color: "#ffffff",
        }}
        numberOfLines={1}
      >
        {titulo}
      </Text>
      {acao}
    </View>
  );
}
