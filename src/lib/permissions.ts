export type AdminRole = "ADMIN" | "EDITOR";

export type Permission =
  | "content:write"
  | "content:publish"
  | "media:write"
  | "settings:write"
  | "navigation:write"
  | "inquiries:read"
  | "inquiries:write";

const ROLE_PERMISSIONS: Record<AdminRole, ReadonlySet<Permission>> = {
  ADMIN: new Set<Permission>([
    "content:write", "content:publish", "media:write", "settings:write",
    "navigation:write", "inquiries:read", "inquiries:write",
  ]),
  // Reserved for future use: editors can write and upload but not publish or change settings.
  EDITOR: new Set<Permission>(["content:write", "media:write"]),
};

export function can(role: string | null | undefined, permission: Permission) {
  const perms = ROLE_PERMISSIONS[(role as AdminRole) ?? "EDITOR"];
  return perms ? perms.has(permission) : false;
}
