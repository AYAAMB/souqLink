import React from "react";
import { StyleSheet, View, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { BorderRadius, Spacing } from "@/constants/theme";

export default function AdminProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: tabBarHeight + Spacing["3xl"],
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <View style={styles.profileHeader}>
        <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
          <ThemedText type="h2" style={{ color: "#FFFFFF" }}>
            {user?.name?.charAt(0).toUpperCase() || "A"}
          </ThemedText>
        </View>
        <ThemedText type="h3" style={styles.name}>
          {user?.name}
        </ThemedText>
        <View style={[styles.roleBadge, { backgroundColor: theme.primary + "20" }]}>
          <Feather name="shield" size={14} color={theme.primary} />
          <ThemedText type="small" style={[styles.roleText, { color: theme.primary }]}>
            Administrator
          </ThemedText>
        </View>
      </View>

      <View style={[styles.infoCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.infoRow}>
          <Feather name="mail" size={20} color={theme.textSecondary} />
          <ThemedText type="body" style={styles.infoText}>
            {user?.email}
          </ThemedText>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <View style={styles.infoRow}>
          <Feather name="phone" size={20} color={theme.textSecondary} />
          <ThemedText type="body" style={styles.infoText}>
            {user?.phone || "Not provided"}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.menuCard, { backgroundColor: theme.backgroundDefault }]}>
        <Pressable style={styles.menuItem}>
          <Feather name="users" size={20} color={theme.text} />
          <ThemedText type="body" style={styles.menuText}>
            Manage Couriers
          </ThemedText>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </Pressable>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <Pressable style={styles.menuItem}>
          <Feather name="settings" size={20} color={theme.text} />
          <ThemedText type="body" style={styles.menuText}>
            App Settings
          </ThemedText>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </Pressable>
      </View>

      <Button onPress={handleLogout} style={[styles.logoutButton, { backgroundColor: theme.error }]}>
        Logout
      </Button>

      <ThemedText type="small" style={[styles.version, { color: theme.textSecondary }]}>
        SouqLink Admin v1.0.0
      </ThemedText>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  name: {
    marginBottom: Spacing.sm,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  roleText: {
    marginLeft: Spacing.xs,
    fontWeight: "600",
  },
  infoCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoText: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  menuCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuText: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  logoutButton: {
    marginBottom: Spacing.lg,
  },
  version: {
    textAlign: "center",
  },
});
