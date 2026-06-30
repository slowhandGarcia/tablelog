import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Zoomable, type ZoomableRef } from "@likashefqet/react-native-image-zoom";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

// react-native-pager-view has no web implementation (it's a native-only
// view), so Metro refuses to bundle anything for the web platform if the
// native file is used there. This sibling file is picked up automatically
// for web builds and swaps the native swipe pager for simple prev/next
// controls over the same Zoomable image, dropping the dismiss-by-drag
// gesture (a touch-only affordance that has no web equivalent anyway).

interface FullScreenImageViewerProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export function FullScreenImageViewer({
  visible,
  images,
  initialIndex = 0,
  onClose,
}: FullScreenImageViewerProps) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const zoomableRef = useRef<ZoomableRef | null>(null);

  useEffect(() => {
    if (visible) setCurrentIndex(initialIndex);
  }, [visible, initialIndex]);

  if (images.length === 0) return null;

  const goTo = (index: number) => {
    zoomableRef.current?.reset();
    setCurrentIndex(Math.max(0, Math.min(images.length - 1, index)));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.94)" }}>
        <Zoomable
          key={currentIndex}
          ref={zoomableRef}
          style={{ flex: 1 }}
          minScale={1}
          maxScale={5}
          doubleTapScale={3}
          isPinchEnabled
          isDoubleTapEnabled
          isSingleTapEnabled
          onSingleTap={onClose}
        >
          <Image
            source={{ uri: images[currentIndex] }}
            style={{ width: "100%", height: "100%" }}
            contentFit="contain"
            transition={150}
          />
        </Zoomable>

        {images.length > 1 && (
          <>
            <Pressable
              onPress={() => goTo(currentIndex - 1)}
              disabled={currentIndex === 0}
              style={{
                position: "absolute",
                top: "50%",
                left: 12,
                opacity: currentIndex === 0 ? 0.3 : 1,
              }}
              className="w-12 h-12 items-center justify-center rounded-full bg-black/60"
            >
              <Ionicons name="chevron-back" size={24} color="#ffffff" />
            </Pressable>
            <Pressable
              onPress={() => goTo(currentIndex + 1)}
              disabled={currentIndex === images.length - 1}
              style={{
                position: "absolute",
                top: "50%",
                right: 12,
                opacity: currentIndex === images.length - 1 ? 0.3 : 1,
              }}
              className="w-12 h-12 items-center justify-center rounded-full bg-black/60"
            >
              <Ionicons name="chevron-forward" size={24} color="#ffffff" />
            </Pressable>

            <Text
              style={{ position: "absolute", top: insets.top + 28, alignSelf: "center" }}
              className="text-white font-medium bg-black/60 px-3 py-1 rounded-full overflow-hidden"
            >
              {currentIndex + 1} / {images.length}
            </Text>
          </>
        )}

        <Pressable
          onPress={onClose}
          hitSlop={12}
          style={{ position: "absolute", top: insets.top + 16, right: 20 }}
          className="w-14 h-14 items-center justify-center rounded-full bg-black/60"
        >
          <Ionicons name="close" size={30} color="#ffffff" />
        </Pressable>
      </View>
    </Modal>
  );
}
