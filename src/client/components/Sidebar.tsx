import {
  Activity,
  BarChart3,
  Bot,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Code,
  Container,
  Database,
  DollarSign,
  FileText,
  LayoutDashboard,
  Network,
  Plug,
  Rocket,
  ScrollText,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { type ReactNode, useState } from "react";

type NavItem = {
  label: string;
  icon: ReactNode;
  path: string;
  badge?: string;
  section?: string;
};

const navItems: NavItem[] = [
  { label: "Dashboard", icon: <LayoutDashboard size={20} />, path: "/" },
  { label: "EC2 Instances", icon: <Server size={20} />, path: "/ec2" },
  { label: "ECS Clusters", icon: <Container size={20} />, path: "/ecs" },
  { label: "S3 Buckets", icon: <Database size={20} />, path: "/s3" },
  { label: "CloudWatch", icon: <Activity size={20} />, path: "/cloudwatch" },
  { label: "Log Explorer", icon: <ScrollText size={20} />, path: "/logs" },
  { label: "IAM", icon: <Shield size={20} />, path: "/iam" },
  { label: "VPC & Network", icon: <Network size={20} />, path: "/vpc" },
  { label: "Lambda", icon: <FileText size={20} />, path: "/lambda" },
  { label: "Cost Explorer", icon: <DollarSign size={20} />, path: "/costs" },
  { label: "WAF Rules", icon: <ShieldCheck size={20} />, path: "/waf" },
  { label: "Jenkins CI/CD", icon: <Workflow size={20} />, path: "/jenkins" },
  { label: "Deployments", icon: <Rocket size={20} />, path: "/deployments" },
  {
    label: "Report Builder",
    icon: <BarChart3 size={20} />,
    path: "/reports",
    section: "Analytics",
  },
  { label: "Query Explorer", icon: <Code size={20} />, path: "/query" },
  { label: "Scheduled Reports", icon: <Calendar size={20} />, path: "/scheduled-reports" },
  {
    label: "Data Sources",
    icon: <Database size={20} />,
    path: "/data-sources",
    section: "Configuration",
  },
  { label: "AI Assistant", icon: <Bot size={20} />, path: "/ai" },
  { label: "Connectors", icon: <Plug size={20} />, path: "/connectors" },
  { label: "Settings", icon: <Settings size={20} />, path: "/settings" },
];

type SidebarProps = {
  currentPath: string;
  onNavigate: (path: string) => void;
  mobileOpen: boolean;
};

export function Sidebar({ currentPath, onNavigate, mobileOpen }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`bg-sidebar fixed inset-y-0 left-0 z-30 flex h-screen w-64 flex-col text-white transition-all duration-300 md:relative md:z-auto md:translate-x-0 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      } ${collapsed ? "md:w-16" : "md:w-64"}`}
    >
      <div className="flex items-center gap-3 border-b border-white/10 p-4">
        <Cloud className="text-aws-orange shrink-0" size={28} />
        {!collapsed && <span className="text-lg font-bold tracking-tight">AWS Admin</span>}
      </div>

      <nav aria-label="Main navigation" className="flex-1 space-y-1 overflow-y-auto p-2">
        {navItems.map((item) => {
          const isActive = currentPath === item.path;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => onNavigate(item.path)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                isActive
                  ? "bg-sidebar-active text-aws-orange font-medium"
                  : "hover:bg-sidebar-hover text-gray-300 hover:text-white"
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.badge && (
                <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!collapsed}
        className="hover:bg-sidebar-hover hidden items-center justify-center border-t border-white/10 p-4 text-gray-400 transition-colors md:flex"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
