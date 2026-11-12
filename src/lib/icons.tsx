import {
  BarChart3, Blocks, Boxes, Building2, Cable, Cloud, Code2, Cpu, CreditCard, Database, GitBranch, Globe,
  GraduationCap, HardDrive, HeartPulse, Layers, LayoutTemplate, Lightbulb, Lock, type LucideIcon, Monitor,
  Network, Plug, Rocket, Search, Server, Settings2, ShieldCheck, Smartphone, Terminal, Wifi, Workflow, Wrench,
  Droplets, PenTool,
} from "lucide-react";

/** Approved icon library for services and skills. Unknown names fall back to Code2. */
export const ICONS = {
  code: Code2,
  layout: LayoutTemplate,
  globe: Globe,
  layers: Layers,
  server: Server,
  network: Network,
  plug: Plug,
  cable: Cable,
  database: Database,
  cloud: Cloud,
  terminal: Terminal,
  workflow: Workflow,
  blocks: Blocks,
  boxes: Boxes,
  building: Building2,
  chart: BarChart3,
  cpu: Cpu,
  "credit-card": CreditCard,
  "git-branch": GitBranch,
  "graduation-cap": GraduationCap,
  "hard-drive": HardDrive,
  "heart-pulse": HeartPulse,
  lightbulb: Lightbulb,
  lock: Lock,
  monitor: Monitor,
  rocket: Rocket,
  search: Search,
  settings: Settings2,
  shield: ShieldCheck,
  smartphone: Smartphone,
  wifi: Wifi,
  wrench: Wrench,
  droplets: Droplets,
  "pen-tool": PenTool,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

export function Icon({ name, className, size }: { name: string; className?: string; size?: number }) {
  const Cmp = ICONS[name as IconName] ?? Code2;
  return <Cmp className={className} size={size} aria-hidden="true" />;
}
