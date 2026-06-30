import { router } from "expo-router";

import { useAuthStore } from "@/store/useAuthStore";

const DEFAULT_MESSAGE = "Log in to continue";

/** Gate for any action that needs a signed-in user (posting, liking, commenting, etc).
 *  Guests get redirected to Login with a friendly message instead of the action running. */
export function useRequireAuth() {
  const isLoggedIn = useAuthStore((s) => !s.isGuest);

  function requireAuth(action: () => void, message: string = DEFAULT_MESSAGE) {
    if (!isLoggedIn) {
      router.push({ pathname: "/auth/login", params: { message } });
      return false;
    }
    action();
    return true;
  }

  return { isLoggedIn, requireAuth };
}
