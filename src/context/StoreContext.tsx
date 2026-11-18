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
  storeName?: string;
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
          // If a custom store name is saved in localStorage, preserve it!
          const customStoreName = localStorage.getItem("medical_store_name");
          if (customStoreName && customStoreName.trim()) {
            data.storeName = customStoreName.trim();
          }
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
          // If user session cookie contains active storeName, synchronize it!
          if (userData.user.storeName && userData.user.storeName.trim()) {
            const userStoreName = userData.user.storeName.trim();
            try {
              localStorage.setItem("medical_store_name", userStoreName);
            } catch {}
            setStoreInfo((prev) =>
              prev ? { ...prev, storeName: userStoreName } : { ...DEFAULT_STORE_INFO, storeName: userStoreName }
            );
          }
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
      const cachedStoreName = localStorage.getItem("medical_store_name");
      if (cachedStore) {
        const parsed = JSON.parse(cachedStore);
        if (cachedStoreName && cachedStoreName.trim()) {
          parsed.storeName = cachedStoreName.trim();
        }
        setStoreInfo(parsed);
      } else if (cachedStoreName && cachedStoreName.trim()) {
        setStoreInfo({ ...DEFAULT_STORE_INFO, storeName: cachedStoreName.trim() });
      }

      const cachedUser = localStorage.getItem("medical_user_info");
      if (cachedUser) setUserInfo(JSON.parse(cachedUser));
    } catch {}

    fetchStoreAndUser();

    // Listen for custom store-updated event from any component
    const handleStoreUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<StoreInfo>;
      if (customEvent.detail) {
        const updated = customEvent.detail;
        if (updated.storeName) {
          try {
            localStorage.setItem("medical_store_name", updated.storeName);
          } catch {}
        }
        setStoreInfo(updated);
        try {
          localStorage.setItem("medical_store_info", JSON.stringify(updated));
        } catch {}
      } else {
        fetchStoreAndUser();
      }
    };

    window.addEventListener("store-updated", handleStoreUpdated);
    return () => window.removeEventListener("store-updated", handleStoreUpdated);
  }, [fetchStoreAndUser]);

  const updateStoreInfo = (info: StoreInfo) => {
    if (info.storeName) {
      try {
        localStorage.setItem("medical_store_name", info.storeName);
      } catch {}
    }
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
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
