import { ReactNode } from "react";
import { Pressable, Text } from "react-native";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { Ionicons } from "@expo/vector-icons";

interface SwipeableRowProps {
  children: ReactNode;
  onDelete: () => void;
}

export function SwipeableRow({ children, onDelete }: SwipeableRowProps) {
  return (
    <Swipeable
      friction={2}
      rightThreshold={40}
      renderRightActions={() => (
        <Pressable
          onPress={onDelete}
          className="bg-red-600 w-20 items-center justify-center"
        >
          <Ionicons name="trash" size={18} color="#ffffff" />
          <Text className="text-white text-xs font-semibold mt-1">Delete</Text>
        </Pressable>
      )}
    >
      {children}
    </Swipeable>
  );
}
