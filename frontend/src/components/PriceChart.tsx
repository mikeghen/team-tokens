import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Svg, { Polyline, Line, Text as SvgText, Circle } from "react-native-svg";
import { colors, spacing, fontSize, borderRadius } from "../theme";

interface DataPoint {
  label: string;
  value: number;
}

interface Props {
  data: DataPoint[];
  title?: string;
  yLabel?: string;
  height?: number;
  color?: string;
}

export function PriceChart({
  data,
  title,
  yLabel = "",
  height = 200,
  color = colors.accent,
}: Props) {
  const width = Dimensions.get("window").width - spacing.lg * 2 - spacing.lg * 2;
  const chartPadding = { top: 20, right: 10, bottom: 30, left: 50 };

  if (data.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <Text style={styles.empty}>No data available</Text>
      </View>
    );
  }

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const chartW = width - chartPadding.left - chartPadding.right;
  const chartH = height - chartPadding.top - chartPadding.bottom;

  const points = data.map((d, i) => {
    const x = chartPadding.left + (i / Math.max(data.length - 1, 1)) * chartW;
    const y = chartPadding.top + chartH - ((d.value - minVal) / range) * chartH;
    return { x, y };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Y-axis ticks
  const yTicks = 4;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
    minVal + (range * i) / yTicks
  );

  // X-axis labels (show first, middle, last)
  const xLabelIndices =
    data.length <= 3
      ? data.map((_, i) => i)
      : [0, Math.floor(data.length / 2), data.length - 1];

  return (
    <View style={styles.container}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <Svg width={width} height={height}>
        {/* Y-axis lines and labels */}
        {yTickValues.map((v, i) => {
          const y =
            chartPadding.top + chartH - ((v - minVal) / range) * chartH;
          return (
            <React.Fragment key={`y-${i}`}>
              <Line
                x1={chartPadding.left}
                y1={y}
                x2={width - chartPadding.right}
                y2={y}
                stroke={colors.border}
                strokeWidth={0.5}
              />
              <SvgText
                x={chartPadding.left - 6}
                y={y + 4}
                fill={colors.textSecondary}
                fontSize={10}
                textAnchor="end"
              >
                {v.toFixed(2)}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* X-axis labels */}
        {xLabelIndices.map((idx) => (
          <SvgText
            key={`x-${idx}`}
            x={points[idx].x}
            y={height - 6}
            fill={colors.textSecondary}
            fontSize={9}
            textAnchor="middle"
          >
            {data[idx].label}
          </SvgText>
        ))}

        {/* Line */}
        <Polyline
          points={polylinePoints}
          fill="none"
          stroke={color}
          strokeWidth={2}
        />

        {/* Dots */}
        {points.length <= 30 &&
          points.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />
          ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  empty: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
});
