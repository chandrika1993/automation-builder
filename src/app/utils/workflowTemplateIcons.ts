import {
    Mail,
    Link,
    Timer,
    Split,
    ShieldCheck, 
    RefreshCw, LucideIcon,
    Landmark,
    CircleDollarSign,
    Receipt,
  } from "lucide-react";
  
  export const TEMPLATE_ICONS: Record<string, LucideIcon> = {
    Mail,
    Link,
    Timer,
    Split,
    ShieldCheck,
    Landmark,
    Receipt,
    CircleDollarSign,
    RefreshCw,
  };
  
  export function getTemplateIcon(name?: string): LucideIcon | null {
    return name ? (TEMPLATE_ICONS[name] ?? null) : null;
  }