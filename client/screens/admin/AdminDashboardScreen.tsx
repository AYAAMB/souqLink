import React from "react";
import { StyleSheet, View, ScrollView, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, ORDER_STATUSES } from "@/constants/theme";

interface DashboardStats {
  totalOrders: number;
  supermarketOrders: number;
  souqOrders: number;
  ordersByStatus: Record<string, number>;
}

export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();

  const { data: stats, isLoading, refetch, isRefetching } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/stats"],
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingTop: headerHeight }]}>
        <LoadingSpinner message="Loading dashboard..." />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />
      }
    >
      <ThemedText type="h3" style={styles.title}>
        Dashboard
      </ThemedText>

      <View style={[styles.mainCard, { backgroundColor: theme.primary }]}>
        <Feather name="shopping-bag" size={32} color="#FFFFFF" />
        <View style={styles.mainCardContent}>
          <ThemedText type="h1" style={{ color: "#FFFFFF" }}>
            {stats?.totalOrders || 0}
          </ThemedText>
          <ThemedText type="body" style={{ color: "rgba(255,255,255,0.8)" }}>
            Total Orders
          </ThemedText>
        </View>
      </View>

      <View style={styles.cardRow}>
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <View style={[styles.cardIcon, { backgroundColor: theme.primary + "20" }]}>
            <Feather name="shopping-cart" size={20} color={theme.primary} />
          </View>
          <ThemedText type="h3">{stats?.supermarketOrders || 0}</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Supermarket
          </ThemedText>
        </View>
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <View style={[styles.cardIcon, { backgroundColor: theme.accent + "20" }]}>
            <Feather name="shopping-bag" size={20} color={theme.accent} />
          </View>
          <ThemedText type="h3">{stats?.souqOrders || 0}</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Souq
          </ThemedText>
        </View>
      </View>

      <ThemedText type="h4" style={styles.sectionTitle}>
        Orders by Status
      </ThemedText>

      <View style={[styles.statusCard, { backgroundColor: theme.backgroundDefault }]}>
        {Object.entries(ORDER_STATUSES).map(([key, value]) => (
          <View key={key} style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <View style={[styles.statusDot, { backgroundColor: value.color }]} />
              <ThemedText type="body">{value.label}</ThemedText>
            </View>
            <ThemedText type="h4">{stats?.ordersByStatus?.[key] || 0}</ThemedText>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    marginBottom: Spacing.xl,
  },
  mainCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  mainCardContent: {
    marginLeft: Spacing.lg,
  },
  cardRow: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  card: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  statusCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.md,
  },
});
