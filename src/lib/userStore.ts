export interface RuntimeUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  active: boolean;
  assignedBy: string;
  password?: string;
  passwordHash?: string;
  createdAt: string;
}

export interface RuntimeStoreSettings {
  id: string;
  storeName: string;
  tagline?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  dlNumber1?: string | null;
  dlNumber2?: string | null;
  fssaiNumber?: string | null;
  terms?: string | null;
  upiId?: string | null;
  smsGateway?: string | null;
  smsApiKey?: string | null;
  whatsappToken?: string | null;
  whatsappPhoneId?: string | null;
}

const DEFAULT_STORE: RuntimeStoreSettings = {
  id: "default",
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
  terms:
    "1. Goods once sold will not be taken back without valid bill.\n2. Medicines must be stored under prescribed temperature.\n3. Keep medicines out of reach of children.",
  upiId: "ramedical@upi",
  smsGateway: "MOCK",
};

const DEFAULT_USERS: RuntimeUser[] = [
  {
    id: "dev-user-001",
    name: "Eduvikku Admin",
    username: "eduvikku@007",
    email: "eduvikku@medicalpro.com",
    role: "ADMIN",
    active: true,
    assignedBy: "DEVELOPER",
    password: "admin",
    createdAt: new Date("2026-01-01").toISOString(),
  },
  {
    id: "dev-user-002",
    name: "System Admin",
    username: "admin",
    email: "admin@medicalpro.com",
    role: "ADMIN",
    active: true,
    assignedBy: "DEVELOPER",
    password: "admin",
    createdAt: new Date("2026-01-01").toISOString(),
  },
  {
    id: "dev-user-003",
    name: "Staff Pharmacist",
    username: "pharmacist",
    email: "pharmacist@medicalpro.com",
    role: "PHARMACIST",
    active: true,
    assignedBy: "DEVELOPER",
    password: "admin",
    createdAt: new Date("2026-01-01").toISOString(),
  },
];

const globalStore = globalThis as unknown as {
  _runtimeAssignedUsers?: RuntimeUser[];
  _runtimeStoreSettings?: RuntimeStoreSettings;
};

if (!globalStore._runtimeAssignedUsers) {
  globalStore._runtimeAssignedUsers = [...DEFAULT_USERS];
}

if (!globalStore._runtimeStoreSettings) {
  globalStore._runtimeStoreSettings = { ...DEFAULT_STORE };
}

export function getAssignedUsers(): RuntimeUser[] {
  if (!globalStore._runtimeAssignedUsers) {
    globalStore._runtimeAssignedUsers = [...DEFAULT_USERS];
  }
  return globalStore._runtimeAssignedUsers.map((u) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    email: u.email,
    role: u.role,
    active: u.active,
    assignedBy: u.assignedBy,
    createdAt: u.createdAt,
  }));
}

export function findAssignedUser(identifier: string): RuntimeUser | null {
  if (!globalStore._runtimeAssignedUsers) {
    globalStore._runtimeAssignedUsers = [...DEFAULT_USERS];
  }
  const clean = String(identifier || "").trim().toLowerCase();
  if (!clean) return null;

  return (
    globalStore._runtimeAssignedUsers.find(
      (u) =>
        u.username.toLowerCase() === clean ||
        u.email.toLowerCase() === clean
    ) || null
  );
}

export function addAssignedUser(user: RuntimeUser): RuntimeUser {
  if (!globalStore._runtimeAssignedUsers) {
    globalStore._runtimeAssignedUsers = [...DEFAULT_USERS];
  }

  const index = globalStore._runtimeAssignedUsers.findIndex(
    (u) =>
      u.username.toLowerCase() === user.username.toLowerCase() ||
      (user.email && u.email.toLowerCase() === user.email.toLowerCase())
  );

  if (index >= 0) {
    globalStore._runtimeAssignedUsers[index] = {
      ...globalStore._runtimeAssignedUsers[index],
      ...user,
    };
    return globalStore._runtimeAssignedUsers[index];
  }

  globalStore._runtimeAssignedUsers.push(user);
  return user;
}

export function updateAssignedUser(
  id: string,
  updates: Partial<RuntimeUser>
): RuntimeUser | null {
  if (!globalStore._runtimeAssignedUsers) {
    globalStore._runtimeAssignedUsers = [...DEFAULT_USERS];
  }
  const index = globalStore._runtimeAssignedUsers.findIndex((u) => u.id === id);
  if (index >= 0) {
    globalStore._runtimeAssignedUsers[index] = {
      ...globalStore._runtimeAssignedUsers[index],
      ...updates,
    };
    return globalStore._runtimeAssignedUsers[index];
  }
  return null;
}

export function deleteAssignedUser(id: string): boolean {
  if (!globalStore._runtimeAssignedUsers) {
    globalStore._runtimeAssignedUsers = [...DEFAULT_USERS];
  }
  const initialLen = globalStore._runtimeAssignedUsers.length;
  globalStore._runtimeAssignedUsers = globalStore._runtimeAssignedUsers.filter(
    (u) => u.id !== id && u.username !== "eduvikku@007"
  );
  return globalStore._runtimeAssignedUsers.length < initialLen;
}

export function getStoreSettings(): RuntimeStoreSettings {
  if (!globalStore._runtimeStoreSettings) {
    globalStore._runtimeStoreSettings = { ...DEFAULT_STORE };
  }
  return globalStore._runtimeStoreSettings;
}

export function updateStoreSettings(
  settings: Partial<RuntimeStoreSettings>
): RuntimeStoreSettings {
  if (!globalStore._runtimeStoreSettings) {
    globalStore._runtimeStoreSettings = { ...DEFAULT_STORE };
  }
  globalStore._runtimeStoreSettings = {
    ...globalStore._runtimeStoreSettings,
    ...settings,
  };
  return globalStore._runtimeStoreSettings;
}
