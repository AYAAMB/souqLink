import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";

import ShopScreen from "@/screens/customer/ShopScreen";
import CartScreen from "@/screens/customer/CartScreen";
import SouqScreen from "@/screens/customer/SouqScreen";
import OrdersScreen from "@/screens/customer/OrdersScreen";
import ProfileScreen from "@/screens/customer/ProfileScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useCart } from "@/context/CartContext";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { BorderRadius, Spacing } from "@/constants/theme";

export type CustomerTabParamList = {
  ShopTab: undefined;
  CartTab: undefined;
  SouqTab: undefined;
  OrdersTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<CustomerTabParamList>();

function CartIcon({ color, size }: { color: string; size: number }) {
  const { totalItems } = useCart();
  const { theme } = useTheme();

  return (
    <View>
      <Feather name="shopping-cart" size={size} color={color} />
      {totalItems > 0 ? (
        <View style={[styles.badge, { backgroundColor: theme.accent }]}>
          <ThemedText type="small" style={styles.badgeText}>
            {totalItems > 9 ? "9+" : totalItems}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

export default function CustomerTabNavigator() {
  const { theme, isDark } = useTheme();
  const screenOptions = useScreenOptions();

  return (
    <Tab.Navigator
      initialRouteName="ShopTab"
      screenOptions={{
        tabBarActiveTintColor: theme.tabIconSelected,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            android: theme.backgroundRoot,
          }),
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        ...screenOptions,
      }}
    >
      <Tab.Screen
        name="ShopTab"
        component={ShopScreen}
        options={{
          title: "Shop",
          headerTitle: () => <HeaderTitle title="SouqLink" />,
          tabBarIcon: ({ color, size }) => (
            <Feather name="shopping-bag" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CartTab"
        component={CartScreen}
        options={{
          title: "Cart",
          headerTitle: "Cart",
          tabBarIcon: ({ color, size }) => <CartIcon color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="SouqTab"
        component={SouqScreen}
        options={{
          title: "Souq",
          headerTitle: "Souq Order",
          tabBarIcon: ({ color, size }) => (
            <Feather name="sun" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrdersScreen}
        options={{
          title: "Orders",
          headerTitle: "My Orders",
          tabBarIcon: ({ color, size }) => (
            <Feather name="package" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: "Profile",
          headerTitle: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
});
