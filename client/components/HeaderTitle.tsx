import React from "react";
import { View, StyleSheet, Image } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";

interface HeaderTitleProps {
  title: string;
}

export function HeaderTitle({ title }: HeaderTitleProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.icon}
          resizeMode="cover"
        />
      </View>
      <ThemedText style={[styles.title, { color: theme.primary }]}>{title}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
    marginRight: Spacing.sm,
  },
  icon: {
    width: 32,
    height: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
});
