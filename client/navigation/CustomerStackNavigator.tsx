import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import CustomerTabNavigator from "@/navigation/CustomerTabNavigator";
import OrderTrackingScreen from "@/screens/customer/OrderTrackingScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type CustomerStackParamList = {
  CustomerTabs: undefined;
  OrderTracking: { orderId: string };
};

const Stack = createNativeStackNavigator<CustomerStackParamList>();

export default function CustomerStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="CustomerTabs"
        component={CustomerTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="OrderTracking"
        component={OrderTrackingScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
