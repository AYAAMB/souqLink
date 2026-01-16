import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import CourierTabNavigator from "@/navigation/CourierTabNavigator";
import CourierNavigationScreen from "@/screens/courier/CourierNavigationScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type CourierStackParamList = {
  CourierTabs: undefined;
  CourierNavigation: { orderId: string };
};

const Stack = createNativeStackNavigator<CourierStackParamList>();

export default function CourierStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="CourierTabs"
        component={CourierTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CourierNavigation"
        component={CourierNavigationScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
