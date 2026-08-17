import { useState, useEffect } from "react";

export type UserRole = "admin" | "enterprise" | "creator" | "member" | "guest";

export interface RolePermissions {
  canAccessAdminDashboard: boolean;
  canManageTeam: boolean;
  canCreateCustomAgents: boolean;
  canExportHighRes: boolean;
  canUseUnlimitedAI: boolean;
  canAccessAPIKeys: boolean;
  canManageBilling: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    canAccessAdminDashboard: true,
    canManageTeam: true,
    canCreateCustomAgents: true,
    canExportHighRes: true,
    canUseUnlimitedAI: true,
    canAccessAPIKeys: true,
    canManageBilling: true,
  },
  enterprise: {
    canAccessAdminDashboard: true,
    canManageTeam: true,
    canCreateCustomAgents: true,
    canExportHighRes: true,
    canUseUnlimitedAI: true,
    canAccessAPIKeys: true,
    canManageBilling: true,
  },
  creator: {
    canAccessAdminDashboard: false,
    canManageTeam: false,
    canCreateCustomAgents: true,
    canExportHighRes: true,
    canUseUnlimitedAI: true,
    canAccessAPIKeys: true,
    canManageBilling: false,
  },
  member: {
    canAccessAdminDashboard: false,
    canManageTeam: false,
    canCreateCustomAgents: true,
    canExportHighRes: false,
    canUseUnlimitedAI: false,
    canAccessAPIKeys: false,
    canManageBilling: false,
  },
  guest: {
    canAccessAdminDashboard: false,
    canManageTeam: false,
    canCreateCustomAgents: false,
    canExportHighRes: false,
    canUseUnlimitedAI: false,
    canAccessAPIKeys: false,
    canManageBilling: false,
  },
};

export const ROLE_CONFIG: Record<UserRole, { label: string; badge: string; color: string; desc: string }> = {
  admin: {
    label: "Super Administrator",
    badge: "ADMIN",
    color: "bg-red-500/10 text-red-500 border-red-500/30",
    desc: "Complete root authority over platform, telemetry, AI endpoints, and multi-tenant security.",
  },
  enterprise: {
    label: "Enterprise Team Lead",
    badge: "ENTERPRISE",
    color: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    desc: "High-throughput dedicated model clusters, SLA guarantees, and team member management.",
  },
  creator: {
    label: "Pro Creator",
    badge: "PRO CREATOR",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    desc: "Unlimited multi-model generations across all 12 studios with priority queuing.",
  },
  member: {
    label: "Community Member",
    badge: "MEMBER",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    desc: "Standard tier with access to local-first Ollama models and daily cloud sessions.",
  },
  guest: {
    label: "Guest Visitor",
    badge: "GUEST",
    color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
    desc: "Preview sandbox with demo AI capabilities.",
  },
};

const STORAGE_KEY = "guidesoft_user_role";

export function useUserRole() {
  const [role, setRoleState] = useState<UserRole>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && saved in ROLE_PERMISSIONS) return saved as UserRole;
    } catch {}
    return "admin"; // Default to admin for full workspace access
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, role);
    } catch {}
  }, [role]);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    window.dispatchEvent(new CustomEvent("guidesoft:role-changed", { detail: newRole }));
  };

  useEffect(() => {
    const handleRoleChange = (e: any) => {
      if (e.detail && e.detail in ROLE_PERMISSIONS) {
        setRoleState(e.detail);
      }
    };
    window.addEventListener("guidesoft:role-changed", handleRoleChange);
    return () => window.removeEventListener("guidesoft:role-changed", handleRoleChange);
  }, []);

  const permissions = ROLE_PERMISSIONS[role];
  const config = ROLE_CONFIG[role];

  const hasPermission = (permission: keyof RolePermissions): boolean => {
    return !!permissions[permission];
  };

  return {
    role,
    setRole,
    permissions,
    config,
    hasPermission,
  };
}

export default useUserRole;
