import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";

interface MapViewWrapperProps {
  children?: React.ReactNode;
  style?: any;
  initialRegion?: any;
  customMapStyle?: any[];
  showsUserLocation?: boolean;
  mapRef?: any;
}

export function MapViewWrapper({ style }: MapViewWrapperProps) {
  const { theme } = useTheme();
  
  return (
    <View style={[style, styles.webPlaceholder, { backgroundColor: theme.backgroundSecondary }]}>
      <Feather name="map" size={48} color={theme.textSecondary} />
      <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.md }}>
        La carte est disponible uniquement sur mobile
      </ThemedText>
      <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
        Utilisez Expo Go pour voir le suivi en temps réel
      </ThemedText>
    </View>
  );
}

export function MapMarker(_props: any) {
  return null;
}

export function MapPolyline(_props: any) {
  return null;
}

const styles = StyleSheet.create({
  webPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.lg,
  },
});
