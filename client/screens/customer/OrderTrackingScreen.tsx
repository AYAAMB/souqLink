import React, { useEffect, useState, useRef } from "react";
import { StyleSheet, View, Pressable, Animated, Dimensions, Platform, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useTheme } from "@/hooks/useTheme";
import { getApiUrl } from "@/lib/query-client";
import { BorderRadius, Spacing } from "@/constants/theme";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const BOTTOM_SHEET_MIN_HEIGHT = 200;
const BOTTOM_SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.6;

interface TrackingData {
  orderId: string;
  status: string;
  pickup: { address: string; lat: number; lng: number };
  dropoff: { address: string; lat: number; lng: number };
  courier: {
    name: string;
    phone: string | null;
    lat: number | null;
    lng: number | null;
    lastUpdate: string | null;
  } | null;
  orderType: string;
  createdAt: string;
}

const STATUS_STEPS = [
  { key: "received", label: "Commande reçue", icon: "check-circle" },
  { key: "shopping", label: "En préparation", icon: "shopping-bag" },
  { key: "in_delivery", label: "En livraison", icon: "truck" },
  { key: "delivered", label: "Livrée", icon: "package" },
];

export default function OrderTrackingScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const mapRef = useRef<MapView>(null);
  
  const { orderId } = route.params as { orderId: string };
  
  const [bottomSheetHeight] = useState(new Animated.Value(BOTTOM_SHEET_MIN_HEIGHT));
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: tracking, isLoading, error, refetch } = useQuery<TrackingData>({
    queryKey: [`/api/orders/${orderId}/tracking`],
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (tracking && mapRef.current) {
      const points = [
        { latitude: tracking.pickup.lat, longitude: tracking.pickup.lng },
        { latitude: tracking.dropoff.lat, longitude: tracking.dropoff.lng },
      ];
      
      if (tracking.courier?.lat && tracking.courier?.lng) {
        points.push({ latitude: tracking.courier.lat, longitude: tracking.courier.lng });
      }

      mapRef.current.fitToCoordinates(points, {
        edgePadding: { top: 100, right: 50, bottom: BOTTOM_SHEET_MIN_HEIGHT + 50, left: 50 },
        animated: true,
      });
    }
  }, [tracking]);

  const toggleBottomSheet = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    Animated.spring(bottomSheetHeight, {
      toValue: isExpanded ? BOTTOM_SHEET_MIN_HEIGHT : BOTTOM_SHEET_MAX_HEIGHT,
      useNativeDriver: false,
      friction: 8,
    }).start();
    
    setIsExpanded(!isExpanded);
  };

  const handleContact = () => {
    if (tracking?.courier?.phone) {
      Linking.openURL(`tel:${tracking.courier.phone}`);
    } else {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    }
  };

  const getStatusIndex = (status: string) => {
    return STATUS_STEPS.findIndex((s) => s.key === status);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <LoadingSpinner message="Chargement du suivi..." />
      </View>
    );
  }

  if (error || !tracking) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot, justifyContent: "center", alignItems: "center" }]}>
        <Feather name="alert-circle" size={48} color={theme.error} />
        <ThemedText type="body" style={{ marginTop: Spacing.md }}>
          Impossible de charger le suivi
        </ThemedText>
        <Button title="Réessayer" onPress={() => refetch()} style={{ marginTop: Spacing.lg }} />
      </View>
    );
  }

  const currentStatusIndex = getStatusIndex(tracking.status);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: (tracking.pickup.lat + tracking.dropoff.lat) / 2,
          longitude: (tracking.pickup.lng + tracking.dropoff.lng) / 2,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        customMapStyle={isDark ? darkMapStyle : []}
      >
        <Marker
          coordinate={{ latitude: tracking.pickup.lat, longitude: tracking.pickup.lng }}
          title="Point de collecte"
          description={tracking.pickup.address}
        >
          <View style={[styles.markerContainer, { backgroundColor: theme.primary }]}>
            <Feather name="shopping-bag" size={16} color="#FFFFFF" />
          </View>
        </Marker>

        <Marker
          coordinate={{ latitude: tracking.dropoff.lat, longitude: tracking.dropoff.lng }}
          title="Point de livraison"
          description={tracking.dropoff.address}
        >
          <View style={[styles.markerContainer, { backgroundColor: theme.accent }]}>
            <Feather name="home" size={16} color="#FFFFFF" />
          </View>
        </Marker>

        {tracking.courier?.lat && tracking.courier?.lng ? (
          <Marker
            coordinate={{ latitude: tracking.courier.lat, longitude: tracking.courier.lng }}
            title={tracking.courier.name}
            description="Votre livreur"
          >
            <View style={[styles.courierMarker, { backgroundColor: theme.success }]}>
              <Feather name="navigation" size={18} color="#FFFFFF" />
            </View>
          </Marker>
        ) : null}

        <Polyline
          coordinates={[
            { latitude: tracking.pickup.lat, longitude: tracking.pickup.lng },
            { latitude: tracking.dropoff.lat, longitude: tracking.dropoff.lng },
          ]}
          strokeColor={theme.primary}
          strokeWidth={3}
          lineDashPattern={[10, 5]}
        />

        {tracking.courier?.lat && tracking.courier?.lng ? (
          <Polyline
            coordinates={[
              { latitude: tracking.courier.lat, longitude: tracking.courier.lng },
              tracking.status === "shopping"
                ? { latitude: tracking.pickup.lat, longitude: tracking.pickup.lng }
                : { latitude: tracking.dropoff.lat, longitude: tracking.dropoff.lng },
            ]}
            strokeColor={theme.success}
            strokeWidth={4}
          />
        ) : null}
      </MapView>

      <Pressable
        style={[styles.backButton, { backgroundColor: theme.backgroundDefault, top: insets.top + Spacing.md }]}
        onPress={() => navigation.goBack()}
      >
        <Feather name="arrow-left" size={20} color={theme.text} />
      </Pressable>

      <Animated.View
        style={[
          styles.bottomSheet,
          {
            backgroundColor: theme.backgroundRoot,
            height: bottomSheetHeight,
            paddingBottom: insets.bottom + Spacing.md,
          },
        ]}
      >
        <Pressable onPress={toggleBottomSheet} style={styles.bottomSheetHandle}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
          <View style={styles.bottomSheetHeader}>
            <View>
              <ThemedText type="h4">Suivi de commande</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {tracking.orderType === "supermarket" ? "Supermarché" : "Souq"}
              </ThemedText>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(tracking.status, theme) + "20" }]}>
              <ThemedText type="small" style={{ color: getStatusColor(tracking.status, theme), fontWeight: "600" }}>
                {STATUS_STEPS[currentStatusIndex]?.label || tracking.status}
              </ThemedText>
            </View>
          </View>
        </Pressable>

        <View style={styles.bottomSheetContent}>
          <View style={styles.timeline}>
            {STATUS_STEPS.map((step, index) => {
              const isCompleted = index <= currentStatusIndex;
              const isCurrent = index === currentStatusIndex;
              
              return (
                <View key={step.key} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View
                      style={[
                        styles.timelineDot,
                        {
                          backgroundColor: isCompleted ? theme.primary : theme.border,
                          borderColor: isCurrent ? theme.primary : "transparent",
                          borderWidth: isCurrent ? 3 : 0,
                        },
                      ]}
                    >
                      {isCompleted ? (
                        <Feather name={step.icon as any} size={12} color="#FFFFFF" />
                      ) : null}
                    </View>
                    {index < STATUS_STEPS.length - 1 ? (
                      <View
                        style={[
                          styles.timelineLine,
                          { backgroundColor: index < currentStatusIndex ? theme.primary : theme.border },
                        ]}
                      />
                    ) : null}
                  </View>
                  <View style={styles.timelineContent}>
                    <ThemedText
                      type="body"
                      style={{
                        fontWeight: isCurrent ? "700" : "400",
                        color: isCompleted ? theme.text : theme.textSecondary,
                      }}
                    >
                      {step.label}
                    </ThemedText>
                  </View>
                </View>
              );
            })}
          </View>

          {tracking.courier ? (
            <ThemedView style={styles.courierCard}>
              <View style={[styles.courierAvatar, { backgroundColor: theme.primary }]}>
                <Feather name="user" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.courierInfo}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  {tracking.courier.name}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Votre livreur
                </ThemedText>
              </View>
              <Pressable
                onPress={handleContact}
                style={[styles.contactButton, { backgroundColor: theme.success }]}
              >
                <Feather name="phone" size={18} color="#FFFFFF" />
              </Pressable>
            </ThemedView>
          ) : null}

          <View style={styles.addressSection}>
            <View style={styles.addressRow}>
              <View style={[styles.addressIcon, { backgroundColor: theme.primary + "20" }]}>
                <Feather name="shopping-bag" size={16} color={theme.primary} />
              </View>
              <View style={styles.addressContent}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Point de collecte
                </ThemedText>
                <ThemedText type="body" numberOfLines={2}>
                  {tracking.pickup.address}
                </ThemedText>
              </View>
            </View>
            
            <View style={[styles.addressDivider, { borderColor: theme.border }]} />
            
            <View style={styles.addressRow}>
              <View style={[styles.addressIcon, { backgroundColor: theme.accent + "20" }]}>
                <Feather name="home" size={16} color={theme.accent} />
              </View>
              <View style={styles.addressContent}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Point de livraison
                </ThemedText>
                <ThemedText type="body" numberOfLines={2}>
                  {tracking.dropoff.address}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function getStatusColor(status: string, theme: any): string {
  switch (status) {
    case "received":
      return theme.primary;
    case "shopping":
      return "#F59E0B";
    case "in_delivery":
      return theme.accent;
    case "delivered":
      return theme.success;
    default:
      return theme.textSecondary;
  }
}

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  backButton: {
    position: "absolute",
    left: Spacing.lg,
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  markerContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  courierMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  bottomSheetHandle: {
    alignItems: "center",
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.md,
  },
  bottomSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: Spacing.md,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  bottomSheetContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  timeline: {
    marginBottom: Spacing.lg,
  },
  timelineItem: {
    flexDirection: "row",
    minHeight: 40,
  },
  timelineLeft: {
    alignItems: "center",
    width: 30,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: Spacing.md,
    justifyContent: "center",
  },
  courierCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  courierAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  courierInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  contactButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  addressSection: {
    marginTop: Spacing.sm,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: Spacing.sm,
  },
  addressIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  addressContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  addressDivider: {
    marginLeft: 16,
    height: 20,
    borderLeftWidth: 2,
    borderStyle: "dashed",
  },
});
