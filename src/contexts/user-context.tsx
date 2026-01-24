"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";

type UserRole = "INSPECTOR" | "REVIEWER" | "ADMIN" | "SUPER_ADMIN";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  company?: string | null;
}

interface UserContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAdmin: boolean;
  isReviewer: boolean;
  refetch: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    if (!isSignedIn) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded) {
      fetchUser();
    }
  }, [isLoaded, isSignedIn]);

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const isReviewer = isAdmin || user?.role === "REVIEWER";

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading: !isLoaded || isLoading,
        isAdmin,
        isReviewer,
        refetch: fetchUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useCurrentUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useCurrentUser must be used within a UserProvider");
  }
  return context;
}
