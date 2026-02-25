import React from "react";
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle } from "react-native";

interface Props {
  onPress?: () => void;
  variante?: "primario" | "secundario" | "perigo" | "whatsapp" | "ghost";
  tamanho?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
}

const bg: Record<string, string> = {
  primario: "#ee4d2d",
  secundario: "#f3f4f6",
  perigo: "#dc2626",
  whatsapp: "#25d366",
  ghost: "transparent",
};

const textColor: Record<string, string> = {
  primario: "#ffffff",
  secundario: "#1f2937",
  perigo: "#ffffff",
  whatsapp: "#ffffff",
  ghost: "#4b5563",
};

const paddingV: Record<string, number> = { sm: 6, md: 10, lg: 14 };
const paddingH: Record<string, number> = { sm: 12, md: 16, lg: 20 };
const fontSize: Record<string, number> = { sm: 13, md: 14, lg: 16 };

export default function Btn({
  onPress,
  variante = "primario",
  tamanho = "md",
  fullWidth = false,
  disabled = false,
  loading = false,
  children,
  style,
}: Props) {
  const containerStyle: ViewStyle = {
    backgroundColor: disabled ? "#d1d5db" : bg[variante],
    paddingVertical: paddingV[tamanho],
    paddingHorizontal: paddingH[tamanho],
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...(fullWidth ? { flex: 1 } : {}),
    opacity: disabled ? 0.6 : 1,
    ...style,
  };

  const textStyle: TextStyle = {
    color: disabled ? "#9ca3af" : textColor[variante],
    fontSize: fontSize[tamanho],
    fontWeight: "600",
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={containerStyle}
    >
      {loading && <ActivityIndicator size="small" color={textColor[variante]} />}
      {typeof children === "string" ? (
        <Text style={textStyle}>{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}
