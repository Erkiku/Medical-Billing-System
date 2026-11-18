"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface StoreInfo {
  storeName: string;
  tagline?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  dlNumber1?: string;
  dlNumber2?: string;
  fssaiNumber?: string;
  terms?: string;
  upiId?: string;
}

export interface UserInfo {
  id?: string;
  name?: string;
  username?: string;
  email?: string;
  role?: string;
}

export const DEFAULT_STORE_INFO: StoreInfo = {
  storeName: "R & A Medical Store",
  tagline: "Retail & Wholesale Chemists • Complete Healthcare",
  address: "123, Main Hospital Road, Civil Lines",
  city: "New Delhi",
  state: "Delhi",
  pincode: "110001",
  phone: "+91 98765 43210",
  email: "contact@ramedical.com",
  gstin: "07AAAAA0000A1Z5",
  dlNumber1: "DL-20B-123456",
  dlNumber2: "DL-21B-654321",
  fssaiNumber: "10012345678901",
  terms: "1. Goods once sold will not be taken back without valid bill.\n2. Medicines must be stored under prescribed temperature.\n3. Keep medicines out of reach of children.",
  upiId: "ramedical@upi",
};

interface StoreContextType {
  storeInfo: StoreInfo | null;
  userInfo: UserInfo | null;
  refreshStore: () => Promise<void>;
  updateStoreInfo: (info: StoreInfo) => void;
}

const StoreContext = createContext<StoreContextType>({
  storeInfo: DEFAULT_STORE_INFO,
  userInfo: null,
  refreshStore: async () => {},
  updateStoreInfo: () => {},
});

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(DEFAULT_STORE_INFO);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  const fetchStoreAndUser = useCallback(async () => {
    try {
      // 1. Fetch store settings
      const settingsRes = await fetch("/api/settings");
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        if (data && data.storeName) {
          setStoreInfo(data);
          try {
            localStorage.setItem("medical_store_info", JSON.stringify(data));
          } catch {}
        }
      }
    } catch {}

    try {
      // 2. Fetch logged in user info
      const userRes = await fetch("/api/auth/me");
      if (userRes.ok) {
        const userData = await userRes.json();
        if (userData && userData.user) {
          setUserInfo(userData.user);
          try {
            localStorage.setItem("medical_user_info", JSON.stringify(userData.user));
          } catch {}
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    // Load cached info first for instant rendering
    try {
      const cachedStore = localStorage.getItem("medical_store_info");
      if (cachedStore) setStoreInfo(JSON.parse(cachedStore));
      const cachedUser = localStorage.getItem("medical_user_info");
      if (cachedUser) setUserInfo(JSON.parse(cachedUser));
    } catch {}

    fetchStoreAndUser();

    // Listen for custom store-updated event from any component
    const handleStoreUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<StoreInfo>;
      if (customEvent.detail) {
        setStoreInfo(customEvent.detail);
        try {
          localStorage.setItem("medical_store_info", JSON.stringify(customEvent.detail));
        } catch {}
      } else {
        fetchStoreAndUser();
      }
    };

    window.addEventListener("store-updated", handleStoreUpdated);
    return () => window.removeEventListener("store-updated", handleStoreUpdated);
  }, [fetchStoreAndUser]);

  const updateStoreInfo = (info: StoreInfo) => {
    setStoreInfo(info);
    try {
      localStorage.setItem("medical_store_info", JSON.stringify(info));
    } catch {}
    window.dispatchEvent(new CustomEvent("store-updated", { detail: info }));
  };

  return (
    <StoreContext.Provider
      value={{
        storeInfo,
        userInfo,
        refreshStore: fetchStoreAndUser,
        updateStoreInfo,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}

