import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { StatusBadge } from "@/components/StatusBadge";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, ORDER_STATUSES } from "@/constants/theme";

interface OrderCardProps {
  id: string;
  orderType: string;
  status: keyof typeof ORDER_STATUSES;
  customerName: string;
  deliveryAddress: string;
  createdAt: string;
  finalTotal?: string | null;
  onPress?: () => void;
  showTrackButton?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function OrderCard({
  id,
  orderType,
  status,
  customerName,
  deliveryAddress,
  createdAt,
  finalTotal,
  onPress,
  showTrackButton = false,
}: OrderCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card,
        { backgroundColor: theme.backgroundDefault },
        animatedStyle,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.typeIcon, { backgroundColor: orderType === "souq" ? theme.accent + "20" : theme.primary + "20" }]}>
            <Feather
              name={orderType === "souq" ? "shopping-bag" : "shopping-cart"}
              size={16}
              color={orderType === "souq" ? theme.accent : theme.primary}
            />
          </View>
          <View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              #{id.slice(0, 8).toUpperCase()}
            </ThemedText>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {orderType === "souq" ? "Souq Order" : "Supermarket Order"}
            </ThemedText>
          </View>
        </View>
        <StatusBadge status={status} />
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Feather name="user" size={14} color={theme.textSecondary} />
          <ThemedText type="small" style={[styles.detailText, { color: theme.textSecondary }]}>
            {customerName}
          </ThemedText>
        </View>
        <View style={styles.detailRow}>
          <Feather name="map-pin" size={14} color={theme.textSecondary} />
          <ThemedText type="small" numberOfLines={1} style={[styles.detailText, { color: theme.textSecondary }]}>
            {deliveryAddress}
          </ThemedText>
        </View>
        <View style={styles.detailRow}>
          <Feather name="clock" size={14} color={theme.textSecondary} />
          <ThemedText type="small" style={[styles.detailText, { color: theme.textSecondary }]}>
            {formatDate(createdAt)}
          </ThemedText>
        </View>
      </View>

      {finalTotal ? (
        <View style={[styles.totalContainer, { backgroundColor: theme.backgroundSecondary }]}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Total
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.primary, fontWeight: "700" }}>
            {parseFloat(finalTotal).toFixed(2)} MAD
          </ThemedText>
        </View>
      ) : null}

      {showTrackButton ? (
        <Pressable
          onPress={onPress}
          style={[styles.trackButton, { backgroundColor: theme.primary }]}
        >
          <Feather name="map-pin" size={16} color="#FFFFFF" />
          <ThemedText style={styles.trackButtonText}>Suivre la commande</ThemedText>
        </Pressable>
      ) : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  details: {
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailText: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  trackButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  trackButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
});
