import React from "react";
import { View, Text, TextInput, TextInputProps, ViewStyle } from "react-native";

interface Props extends Omit<TextInputProps, "style"> {
  label?: string;
  erro?: string;
  style?: ViewStyle;
}

export default function Input({ label, erro, style, ...props }: Props) {
  return (
    <View style={[{ gap: 4 }, style]}>
      {label && (
        <Text style={{ fontSize: 14, fontWeight: "500", color: "#374151" }}>
          {label}
        </Text>
      )}
      <TextInput
        {...props}
        style={{
          width: "100%",
          borderWidth: 1,
          borderColor: erro ? "#f87171" : "#d1d5db",
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 14,
          color: "#111827",
          backgroundColor: "#ffffff",
        }}
        placeholderTextColor="#9ca3af"
      />
      {erro ? (
        <Text style={{ fontSize: 12, color: "#ef4444" }}>{erro}</Text>
      ) : null}
    </View>
  );
}
