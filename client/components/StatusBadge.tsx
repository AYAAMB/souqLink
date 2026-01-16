import React from "react";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Spacing, ORDER_STATUSES } from "@/constants/theme";

interface StatusBadgeProps {
  status: keyof typeof ORDER_STATUSES;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const statusInfo = ORDER_STATUSES[status] || ORDER_STATUSES.received;

  return (
    <View style={[styles.badge, { backgroundColor: statusInfo.color + "20" }]}>
      <View style={[styles.dot, { backgroundColor: statusInfo.color }]} />
      <ThemedText type="small" style={[styles.text, { color: statusInfo.color }]}>
        {statusInfo.label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.xs,
  },
  text: {
    fontWeight: "600",
  },
});
