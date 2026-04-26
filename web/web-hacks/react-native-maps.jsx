import React from "react";
import { Text, View } from "react-native";

export const PROVIDER_DEFAULT = "default";
export const PROVIDER_GOOGLE = "google";

const MapView = ({ style, initialRegion, children, ...props }) => {
  return (
    <View
      {...props}
      style={[
        {
          position: "relative",
          overflow: "hidden",
          borderRadius: 8,
          backgroundColor: "#dbe6f1",
        },
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          borderWidth: 1,
          borderColor: "#c3cfdb",
        }}
      />
      {children}
      {initialRegion && (
        <Text
          style={{
            position: "absolute",
            left: 8,
            bottom: 8,
            fontSize: 10,
            color: "#2f3b4a",
            backgroundColor: "rgba(255,255,255,0.75)",
            paddingHorizontal: 6,
            paddingVertical: 3,
            borderRadius: 4,
          }}
        >
          {`${initialRegion.latitude?.toFixed?.(5) ?? initialRegion.latitude}, ${initialRegion.longitude?.toFixed?.(5) ?? initialRegion.longitude}`}
        </Text>
      )}
    </View>
  );
};

export const Marker = ({ children }) => {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        marginLeft: -7,
        marginTop: -14,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: "#fff",
        backgroundColor: "#d43d3d",
      }}
    >
      {children}
    </View>
  );
};

MapView.Animated = MapView;
Marker.Animated = Marker;

export default MapView;
