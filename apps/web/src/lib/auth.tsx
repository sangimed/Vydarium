import { createContext, useContext, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api";

type AuthContextValue = {
  user: { id: string; email: string; role: string } | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const me = useQuery({
    queryKey: ["me"],
    queryFn: apiClient.me,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => apiClient.login(email, password),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: apiClient.logout,
    onSuccess: () => {
      queryClient.clear();
    },
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      user: me.data?.data.user ?? null,
      isLoading: me.isLoading,
      login: async (email, password) => {
        await loginMutation.mutateAsync({ email, password });
      },
      logout: async () => {
        await logoutMutation.mutateAsync();
      },
    }),
    [loginMutation, logoutMutation, me.data?.data.user, me.isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}
