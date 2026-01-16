import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";

import LoginScreen from "@/screens/LoginScreen";
import CustomerStackNavigator from "@/navigation/CustomerStackNavigator";
import CourierStackNavigator from "@/navigation/CourierStackNavigator";
import AdminTabNavigator from "@/navigation/AdminTabNavigator";
import { useAuth } from "@/context/AuthContext";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useTheme } from "@/hooks/useTheme";

export type RootStackParamList = {
  Login: undefined;
  CustomerMain: undefined;
  CourierMain: undefined;
  AdminMain: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const { user, isLoading } = useAuth();
  const screenOptions = useScreenOptions();
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.backgroundRoot }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {!user ? (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      ) : user.role === "admin" ? (
        <Stack.Screen
          name="AdminMain"
          component={AdminTabNavigator}
          options={{ headerShown: false }}
        />
      ) : user.role === "courier" ? (
        <Stack.Screen
          name="CourierMain"
          component={CourierStackNavigator}
          options={{ headerShown: false }}
        />
      ) : (
        <Stack.Screen
          name="CustomerMain"
          component={CustomerStackNavigator}
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
  );
}
