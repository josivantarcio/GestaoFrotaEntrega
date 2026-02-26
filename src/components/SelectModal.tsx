import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
} from "react-native";
import { ChevronDown, Search } from "lucide-react-native";

interface Option {
  value: string;
  label: string;
}

interface Props {
  label?: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  erro?: string;
  searchable?: boolean;
}

export default function SelectModal({
  label,
  value,
  options,
  onChange,
  placeholder = "Selecionar...",
  erro,
  searchable = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedLabel = options.find((o) => o.value === value)?.label;

  const filtered = searchable
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <View style={{ gap: 4 }}>
      {label && (
        <Text style={{ fontSize: 14, fontWeight: "500", color: "#374151" }}>
          {label}
        </Text>
      )}
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1,
          borderColor: erro ? "#f87171" : "#d1d5db",
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: "#ffffff",
        }}
      >
        <Text
          style={{
            flex: 1,
            fontSize: 14,
            color: selectedLabel ? "#111827" : "#9ca3af",
          }}
        >
          {selectedLabel ?? placeholder}
        </Text>
        <ChevronDown size={18} color="#9ca3af" />
      </TouchableOpacity>
      {erro ? (
        <Text style={{ fontSize: 12, color: "#ef4444" }}>{erro}</Text>
      ) : null}

      <Modal visible={open} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 24,
              maxHeight: "75%",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: "#f3f4f6",
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827" }}>
                {label ?? "Selecionar"}
              </Text>
              <TouchableOpacity onPress={() => { setOpen(false); setSearch(""); }}>
                <Text style={{ fontSize: 16, color: "#6b7280" }}>✕</Text>
              </TouchableOpacity>
            </View>

            {searchable && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginHorizontal: 16,
                  marginVertical: 8,
                  borderWidth: 1,
                  borderColor: "#d1d5db",
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  gap: 8,
                }}
              >
                <Search size={16} color="#9ca3af" />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Buscar..."
                  placeholderTextColor="#9ca3af"
                  style={{ flex: 1, paddingVertical: 8, fontSize: 14 }}
                />
              </View>
            )}

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                    setSearch("");
                  }}
                  activeOpacity={0.7}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: "#f9fafb",
                    backgroundColor:
                      item.value === value ? "#fff5f3" : "#ffffff",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      color: item.value === value ? "#ee4d2d" : "#111827",
                      fontWeight: item.value === value ? "600" : "400",
                    }}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
