import {
  Bot,
  FileText,
  Home,
  Lightbulb,
  LineChart,
  Settings
} from "lucide-react";

export const primaryNav = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Bills", href: "/bills", icon: FileText },
  { name: "Predictions", href: "/predictions", icon: LineChart },
  { name: "Recommendations", href: "/recommendations", icon: Lightbulb },
  { name: "Assistant", href: "/assistant", icon: Bot },
  { name: "Settings", href: "/settings", icon: Settings }
];
