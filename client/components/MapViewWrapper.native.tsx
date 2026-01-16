import React from "react";
import RNMapView, { Marker as RNMarker, Polyline as RNPolyline, PROVIDER_DEFAULT } from "react-native-maps";

interface MapViewWrapperProps {
  children?: React.ReactNode;
  style?: any;
  initialRegion?: any;
  customMapStyle?: any[];
  showsUserLocation?: boolean;
  mapRef?: any;
}

export function MapViewWrapper({ 
  children, 
  style, 
  initialRegion, 
  customMapStyle,
  showsUserLocation,
  mapRef 
}: MapViewWrapperProps) {
  return (
    <RNMapView
      ref={mapRef}
      style={style}
      provider={PROVIDER_DEFAULT}
      initialRegion={initialRegion}
      customMapStyle={customMapStyle}
      showsUserLocation={showsUserLocation}
    >
      {children}
    </RNMapView>
  );
}

export function MapMarker(props: any) {
  return <RNMarker {...props} />;
}

export function MapPolyline(props: any) {
  return <RNPolyline {...props} />;
}
