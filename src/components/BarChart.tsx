import React from "react";
import { View, Text, ScrollView } from "react-native";
import Svg, { Rect, Text as SvgText } from "react-native-svg";

interface BarChartData {
  label: string;
  value: number;
  secondaryValue?: number;
}

interface Props {
  data: BarChartData[];
  title: string;
  color?: string;
  secondaryColor?: string;
  unit?: string;
}

export default function BarChart({
  data,
  title,
  color = "#ee4d2d",
  secondaryColor = "#93c5fd",
  unit = "",
}: Props) {
  const maxVal = Math.max(...data.map((d) => Math.max(d.value, d.secondaryValue ?? 0)), 1);
  const chartH = 80;
  const barW = 24;
  const gap = 8;
  const hasSecondary = data.some((d) => d.secondaryValue !== undefined);
  const colW = hasSecondary ? barW * 2 + 4 : barW;
  const totalW = Math.max(data.length * (colW + gap), 280);

  return (
    <View
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: "600",
          color: "#6b7280",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: 12,
        }}
      >
        {title}
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Svg width={totalW} height={chartH + 24}>
          {data.map((d, i) => {
            const x = i * (colW + gap);
            const h1 = Math.max(2, (d.value / maxVal) * chartH);
            const h2 = hasSecondary
              ? Math.max(2, ((d.secondaryValue ?? 0) / maxVal) * chartH)
              : 0;

            return (
              <React.Fragment key={i}>
                <Rect
                  x={x}
                  y={chartH - h1}
                  width={barW}
                  height={h1}
                  rx={4}
                  fill={color}
                  opacity={d.value === 0 ? 0.2 : 0.85}
                />
                {hasSecondary && (
                  <Rect
                    x={x + barW + 4}
                    y={chartH - h2}
                    width={barW}
                    height={h2}
                    rx={4}
                    fill={secondaryColor}
                    opacity={(d.secondaryValue ?? 0) === 0 ? 0.2 : 0.85}
                  />
                )}
                {d.value > 0 && (
                  <SvgText
                    x={x + barW / 2}
                    y={chartH - h1 - 3}
                    textAnchor="middle"
                    fontSize={9}
                    fill="#6b7280"
                    fontWeight="600"
                  >
                    {d.value}{unit}
                  </SvgText>
                )}
                <SvgText
                  x={x + (hasSecondary ? barW + 2 : barW / 2)}
                  y={chartH + 14}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#9ca3af"
                >
                  {d.label}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </ScrollView>

      {hasSecondary && (
        <View style={{ flexDirection: "row", gap: 16, marginTop: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} />
            <Text style={{ fontSize: 12, color: "#6b7280" }}>Volumes</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: secondaryColor }} />
            <Text style={{ fontSize: 12, color: "#6b7280" }}>KM</Text>
          </View>
        </View>
      )}
    </View>
  );
}
