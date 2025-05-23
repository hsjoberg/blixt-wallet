import { Text } from "native-base";
import React, { useRef, useState } from "react";
import { NativeScrollEvent, ScrollView, ViewStyle } from "react-native";

interface ILndLogBoxProps {
  text: string;
  style?: ViewStyle;
  scrollLock?: boolean;
}
export default function LogBox(props: ILndLogBoxProps) {
  const logScrollView = useRef<ScrollView>(null);
  const [scrollViewAtTheEnd, setScrollViewAtTheEnd] = useState(true);

  const isCloseToBottom = ({
    layoutMeasurement,
    contentOffset,
    contentSize,
  }: NativeScrollEvent) => {
    if (!props.scrollLock) {
      return true;
    }
    const paddingToBottom = 170;
    return layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
  };

  return (
    <ScrollView
      style={props.style}
      ref={logScrollView}
      contentContainerStyle={{ padding: 8 }}
      onContentSizeChange={() => {
        if (scrollViewAtTheEnd) {
          logScrollView.current?.scrollToEnd();
        }
      }}
      onScroll={({ nativeEvent }) => {
        setScrollViewAtTheEnd(isCloseToBottom(nativeEvent));
      }}
      scrollEventThrottle={450}
      removeClippedSubviews={true}
    >
      <Text selectable={true} style={{ fontSize: 10 }}>
        {props.text}
      </Text>
    </ScrollView>
  );
}
