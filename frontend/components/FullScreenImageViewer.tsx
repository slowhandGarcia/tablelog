import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Zoomable, type ZoomableRef } from "@likashefqet/react-native-image-zoom";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import PagerView from "react-native-pager-view";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

interface FullScreenImageViewerProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

const DISMISS_THRESHOLD = 120;
const ZOOMED_IN_EPSILON = 1.01;

interface ZoomablePageProps {
  uri: string;
  translateY: SharedValue<number>;
  dragProgress: SharedValue<number>;
  onDismiss: () => void;
  onZoomChange: (zoomed: boolean) => void;
  zoomableRef: (ref: ZoomableRef | null) => void;
}

function ZoomablePage({
  uri,
  translateY,
  dragProgress,
  onDismiss,
  onZoomChange,
  zoomableRef,
}: ZoomablePageProps) {
  const scale = useSharedValue(1);

  const reportZoom = () => onZoomChange(scale.value > ZOOMED_IN_EPSILON);

  // Only recognize predominantly-vertical drags so horizontal swipes are
  // left for the PagerView to handle as page changes.
  const dismissGesture = Gesture.Pan()
    .maxPointers(1)
    .activeOffsetY([-10, 10])
    .failOffsetX([-15, 15])
    .onTouchesDown((_event, manager) => {
      // Let Zoomable's own pan handle the touch instead while zoomed in.
      if (scale.value > ZOOMED_IN_EPSILON) {
        manager.fail();
      }
    })
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
        dragProgress.value = Math.min(e.translationY / 300, 1);
      }
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_THRESHOLD || e.velocityY > 800) {
        translateY.value = withTiming(800, { duration: 220 });
        dragProgress.value = withTiming(1, { duration: 220 }, () => {
          runOnJS(onDismiss)();
        });
      } else {
        translateY.value = withSpring(0);
        dragProgress.value = withTiming(0);
      }
    });

  return (
    <View collapsable={false} style={{ flex: 1 }}>
      <GestureDetector gesture={dismissGesture}>
        <Animated.View style={{ flex: 1 }}>
          <Zoomable
            ref={zoomableRef}
            style={{ flex: 1 }}
            scale={scale}
            minScale={1}
            maxScale={5}
            doubleTapScale={3}
            isPinchEnabled
            isDoubleTapEnabled
            isSingleTapEnabled
            onSingleTap={onDismiss}
            onPinchEnd={reportZoom}
            onDoubleTap={reportZoom}
            onResetAnimationEnd={reportZoom}
          >
            <Image
              source={{ uri }}
              style={{ width: "100%", height: "100%" }}
              contentFit="contain"
              transition={150}
            />
          </Zoomable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export function FullScreenImageViewer({
  visible,
  images,
  initialIndex = 0,
  onClose,
}: FullScreenImageViewerProps) {
  const insets = useSafeAreaInsets();
  const pagerRef = useRef<PagerView>(null);

  const translateY = useSharedValue(0);
  const dragProgress = useSharedValue(0); // 0 = resting, 1 = fully dragged out
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const zoomableRefs = useRef<Record<number, ZoomableRef | null>>({});

  useEffect(() => {
    if (visible) {
      translateY.value = 0;
      dragProgress.value = 0;
      setCurrentIndex(initialIndex);
      setIsZoomed(false);
      pagerRef.current?.setPageWithoutAnimation(initialIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialIndex]);

  const close = () => {
    translateY.value = 0;
    dragProgress.value = 0;
    onClose();
  };

  const handlePageSelected = (newIndex: number) => {
    zoomableRefs.current[currentIndex]?.reset();
    setIsZoomed(false);
    setCurrentIndex(newIndex);
  };

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dragProgress.value, [0, 1], [1, 0.15], Extrapolation.CLAMP),
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dragProgress.value, [0, 1], [1, 0.3], Extrapolation.CLAMP),
    transform: [
      { translateY: translateY.value },
      {
        scale: interpolate(dragProgress.value, [0, 1], [1, 0.85], Extrapolation.CLAMP),
      },
    ],
  }));

  if (images.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View
        style={[{ flex: 1, backgroundColor: "rgba(0,0,0,0.94)" }, backdropStyle]}
      >
        <Animated.View style={[{ flex: 1 }, contentStyle]}>
          <PagerView
            ref={pagerRef}
            style={{ flex: 1 }}
            initialPage={initialIndex}
            scrollEnabled={!isZoomed}
            onPageSelected={(e) => handlePageSelected(e.nativeEvent.position)}
          >
            {images.map((uri, index) => (
              <View key={`${uri}-${index}`} style={{ flex: 1 }}>
                <ZoomablePage
                  uri={uri}
                  translateY={translateY}
                  dragProgress={dragProgress}
                  onDismiss={close}
                  onZoomChange={setIsZoomed}
                  zoomableRef={(ref) => {
                    zoomableRefs.current[index] = ref;
                  }}
                />
              </View>
            ))}
          </PagerView>
        </Animated.View>

        {images.length > 1 && (
          <Text
            style={{ position: "absolute", top: insets.top + 28, alignSelf: "center" }}
            className="text-white font-medium bg-black/60 px-3 py-1 rounded-full overflow-hidden"
          >
            {currentIndex + 1} / {images.length}
          </Text>
        )}

        <Pressable
          onPress={onClose}
          hitSlop={12}
          style={{ position: "absolute", top: insets.top + 16, right: 20 }}
          className="w-14 h-14 items-center justify-center rounded-full bg-black/60"
        >
          <Ionicons name="close" size={30} color="#ffffff" />
        </Pressable>
      </Animated.View>
    </Modal>
  );
}
