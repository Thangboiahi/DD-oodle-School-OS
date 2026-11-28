export type ShellNavIcon =
  | "overview"
  | "tokens"
  | "states"
  | "public"
  | "people"
  | "academics"
  | "attendance"
  | "imports"
  | "governance"
  | "audit"
  | "files"
  | "platform"
  | "workspace";

export interface ShellNavItem {
  id: string;
  label: string;
  href: string;
  icon: ShellNavIcon;
  badge?: string;
}

export const SHELL_PRIMARY_NAV: readonly ShellNavItem[] = [
  {
    id: "overview",
    label: "Overview",
    href: "/shell-preview#overview",
    icon: "overview",
  },
  {
    id: "tokens",
    label: "Tokens",
    href: "/shell-preview#tokens",
    icon: "tokens",
  },
  {
    id: "states",
    label: "States",
    href: "/shell-preview#states",
    icon: "states",
  },
  {
    id: "landing",
    label: "Public Home",
    href: "/",
    icon: "public",
  },
] as const;

export const SHELL_SECONDARY_NAV: readonly ShellNavItem[] = [
  {
    id: "sign-in",
    label: "Sign In",
    href: "/sign-in",
    icon: "public",
  },
] as const;
