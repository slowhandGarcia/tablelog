import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { useThemeColors } from "@/store/useThemeStore";

interface PhotoGalleryProps {
  images: string[];
  onPressPhoto: (index: number) => void;
  onLongPressPhoto: (index: number) => void;
  onAddPhoto: () => void;
}

export function PhotoGallery({
  images,
  onPressPhoto,
  onLongPressPhoto,
  onAddPhoto,
}: PhotoGalleryProps) {
  const colors = useThemeColors();

  return (
    <View>
      <Text className="text-sm font-semibold mb-2" style={{ color: colors.muted }}>
        Photos
      </Text>
      <FlatList
        data={images}
        keyExtractor={(uri, index) => `${uri}-${index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12 }}
        renderItem={({ item: uri, index }) => (
          <TouchableOpacity
            onPress={() => onPressPhoto(index)}
            onLongPress={() => onLongPressPhoto(index)}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri }}
              style={{
                width: 80,
                height: 80,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
              }}
              contentFit="cover"
            />
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <TouchableOpacity
            onPress={onAddPhoto}
            className="w-20 h-20 rounded-xl border border-dashed items-center justify-center"
            style={{ borderColor: colors.border, backgroundColor: colors.surface }}
          >
            <Ionicons name="camera" size={22} color="#2563eb" />
            <Text className="text-blue-600 text-xs mt-1">Add</Text>
          </TouchableOpacity>
        }
      />
    </View>
  );
}
