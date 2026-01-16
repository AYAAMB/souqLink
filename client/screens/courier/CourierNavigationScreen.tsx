import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View, Pressable, Alert, Platform, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useTheme } from "@/hooks/useTheme";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { BorderRadius, Spacing } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

const STATUS_ACTIONS: Record<string, { next: string; label: string; icon: string }> = {
  received: { next: "shopping", label: "Commencer les courses", icon: "shopping-bag" },
  shopping: { next: "in_delivery", label: "Départ livraison", icon: "truck" },
  in_delivery: { next: "delivered", label: "Livré", icon: "check-circle" },
};

export default function CourierNavigationScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const queryClient = useQueryClient();
  const mapRef = useRef<MapView>(null);
  
  const { orderId } = route.params as { orderId: string };
  
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationWatching, setLocationWatching] = useState(false);

  const { data: tracking, isLoading, error, refetch } = useQuery<TrackingData>({
    queryKey: [`/api/orders/${orderId}/tracking`],
    refetchInterval: 10000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const response = await apiRequest("PATCH", `/api/orders/${orderId}`, { status: newStatus });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}/tracking`] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/courier"] });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    onError: () => {
      Alert.alert("Erreur", "Impossible de mettre à jour le statut");
    },
  });

  const updateLocationMutation = useMutation({
    mutationFn: async ({ lat, lng }: { lat: number; lng: number }) => {
      const response = await fetch(new URL(`/api/orders/${orderId}/courier-location`, getApiUrl()).href, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });
      return response.json();
    },
  });

  useEffect(() => {
    const startLocationTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission requise", "Activez la géolocalisation pour le suivi en temps réel");
          return;
        }

        setLocationWatching(true);
        
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (location) => {
            const { latitude, longitude } = location.coords;
            setMyLocation({ lat: latitude, lng: longitude });
            
            if (tracking?.status === "in_delivery" || tracking?.status === "shopping") {
              updateLocationMutation.mutate({ lat: latitude, lng: longitude });
            }
          }
        );

        return () => {
          subscription.remove();
          setLocationWatching(false);
        };
      } catch (error) {
        console.warn("Location tracking error:", error);
      }
    };

    startLocationTracking();
  }, [tracking?.status]);

  useEffect(() => {
    if (tracking && mapRef.current) {
      const points = [
        { latitude: tracking.pickup.lat, longitude: tracking.pickup.lng },
        { latitude: tracking.dropoff.lat, longitude: tracking.dropoff.lng },
      ];
      
      if (myLocation) {
        points.push({ latitude: myLocation.lat, longitude: myLocation.lng });
      }

      mapRef.current.fitToCoordinates(points, {
        edgePadding: { top: 100, right: 50, bottom: 250, left: 50 },
        animated: true,
      });
    }
  }, [tracking, myLocation]);

  const handleStatusUpdate = () => {
    if (!tracking) return;
    
    const action = STATUS_ACTIONS[tracking.status];
    if (!action) return;

    Alert.alert(
      "Confirmer",
      `Voulez-vous passer au statut "${action.label}" ?`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Confirmer", onPress: () => updateStatusMutation.mutate(action.next) },
      ]
    );
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <LoadingSpinner message="Chargement..." />
      </View>
    );
  }

  if (error || !tracking) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot, justifyContent: "center", alignItems: "center" }]}>
        <Feather name="alert-circle" size={48} color={theme.error} />
        <ThemedText type="body" style={{ marginTop: Spacing.md }}>
          Impossible de charger la commande
        </ThemedText>
        <Button title="Réessayer" onPress={() => refetch()} style={{ marginTop: Spacing.lg }} />
      </View>
    );
  }

  const destination = tracking.status === "shopping" ? tracking.pickup : tracking.dropoff;
  const distanceToDestination = myLocation
    ? calculateDistance(myLocation.lat, myLocation.lng, destination.lat, destination.lng)
    : null;

  const currentAction = STATUS_ACTIONS[tracking.status];
  const isDelivered = tracking.status === "delivered";

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
        showsUserLocation={false}
      >
        <Marker
          coordinate={{ latitude: tracking.pickup.lat, longitude: tracking.pickup.lng }}
          title="Point de collecte"
          description={tracking.pickup.address}
        >
          <View style={[styles.markerContainer, { backgroundColor: theme.primary }]}>
            <ThemedText style={styles.markerText}>A</ThemedText>
          </View>
        </Marker>

        <Marker
          coordinate={{ latitude: tracking.dropoff.lat, longitude: tracking.dropoff.lng }}
          title="Point de livraison"
          description={tracking.dropoff.address}
        >
          <View style={[styles.markerContainer, { backgroundColor: theme.accent }]}>
            <ThemedText style={styles.markerText}>B</ThemedText>
          </View>
        </Marker>

        {myLocation ? (
          <Marker coordinate={{ latitude: myLocation.lat, longitude: myLocation.lng }}>
            <View style={[styles.myLocationMarker, { backgroundColor: theme.success }]}>
              <Feather name="navigation" size={16} color="#FFFFFF" />
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

        {myLocation ? (
          <Polyline
            coordinates={[
              { latitude: myLocation.lat, longitude: myLocation.lng },
              { latitude: destination.lat, longitude: destination.lng },
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

      <View style={[styles.bottomPanel, { backgroundColor: theme.backgroundRoot, paddingBottom: insets.bottom + Spacing.md }]}>
        <View style={styles.etaCard}>
          <View style={styles.etaInfo}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {tracking.status === "shopping" ? "Vers le point de collecte" : "Vers la livraison"}
            </ThemedText>
            <ThemedText type="h3">
              {distanceToDestination !== null
                ? distanceToDestination < 1
                  ? `${Math.round(distanceToDestination * 1000)} m`
                  : `${distanceToDestination.toFixed(1)} km`
                : "--"}
            </ThemedText>
          </View>
          <View style={[styles.locationStatus, { backgroundColor: locationWatching ? theme.success + "20" : theme.warning + "20" }]}>
            <Feather
              name={locationWatching ? "navigation" : "navigation-off"}
              size={16}
              color={locationWatching ? theme.success : theme.warning}
            />
            <ThemedText type="small" style={{ color: locationWatching ? theme.success : theme.warning, marginLeft: Spacing.xs }}>
              {locationWatching ? "GPS actif" : "GPS inactif"}
            </ThemedText>
          </View>
        </View>

        <ThemedView style={styles.destinationCard}>
          <View style={[styles.destinationIcon, { backgroundColor: tracking.status === "shopping" ? theme.primary + "20" : theme.accent + "20" }]}>
            <Feather
              name={tracking.status === "shopping" ? "shopping-bag" : "home"}
              size={20}
              color={tracking.status === "shopping" ? theme.primary : theme.accent}
            />
          </View>
          <View style={styles.destinationInfo}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {tracking.status === "shopping" ? "Point de collecte (A)" : "Livraison (B)"}
            </ThemedText>
            <ThemedText type="body" numberOfLines={2} style={{ fontWeight: "600" }}>
              {destination.address}
            </ThemedText>
          </View>
        </ThemedView>

        {isDelivered ? (
          <View style={[styles.completedBadge, { backgroundColor: theme.success + "20" }]}>
            <Feather name="check-circle" size={24} color={theme.success} />
            <ThemedText type="body" style={{ color: theme.success, fontWeight: "600", marginLeft: Spacing.sm }}>
              Livraison terminée
            </ThemedText>
          </View>
        ) : currentAction ? (
          <View style={styles.actionButtons}>
            <Pressable
              onPress={handleStatusUpdate}
              style={[styles.mainActionButton, { backgroundColor: theme.primary }]}
              disabled={updateStatusMutation.isPending}
            >
              <Feather name={currentAction.icon as any} size={20} color="#FFFFFF" />
              <ThemedText style={styles.actionButtonText}>
                {updateStatusMutation.isPending ? "..." : currentAction.label}
              </ThemedText>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
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
  markerText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  myLocationMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  bottomPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  etaCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  etaInfo: {},
  locationStatus: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  destinationCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  destinationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  destinationInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  actionButtons: {
    gap: Spacing.sm,
  },
  mainActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
});
