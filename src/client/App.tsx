import { useState } from "react";
import "./index.css";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { CloudWatchPage } from "./pages/CloudWatchPage";
import { ConnectorsPage } from "./pages/ConnectorsPage";
import { CostPage } from "./pages/CostPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EC2Page } from "./pages/EC2Page";
import { ECSPage } from "./pages/ECSPage";
import { IAMPage } from "./pages/IAMPage";
import { JenkinsPage } from "./pages/JenkinsPage";
import { LambdaPage } from "./pages/LambdaPage";
import { LogExplorerPage } from "./pages/LogExplorerPage";
import { S3Page } from "./pages/S3Page";
import { SettingsPage } from "./pages/SettingsPage";
import { VPCPage } from "./pages/VPCPage";
import { WafPage } from "./pages/WafPage";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/ec2": "EC2 Instances",
  "/ecs": "ECS Clusters",
  "/s3": "S3 Buckets",
  "/cloudwatch": "CloudWatch",
  "/iam": "IAM Management",
  "/vpc": "VPC & Networking",
  "/lambda": "Lambda Functions",
  "/costs": "Cost Explorer",
  "/logs": "Log Explorer",
  "/waf": "WAF Rules",
  "/jenkins": "Jenkins CI/CD",
  "/connectors": "Connectors",
  "/settings": "Settings",
};

function App() {
  const [currentPath, setCurrentPath] = useState("/");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function renderPage() {
    switch (currentPath) {
      case "/":
        return <DashboardPage />;
      case "/ec2":
        return <EC2Page />;
      case "/ecs":
        return <ECSPage />;
      case "/s3":
        return <S3Page />;
      case "/cloudwatch":
        return <CloudWatchPage />;
      case "/iam":
        return <IAMPage />;
      case "/vpc":
        return <VPCPage />;
      case "/lambda":
        return <LambdaPage />;
      case "/costs":
        return <CostPage />;
      case "/logs":
        return <LogExplorerPage />;
      case "/waf":
        return <WafPage />;
      case "/jenkins":
        return <JenkinsPage />;
      case "/connectors":
        return <ConnectorsPage />;
      case "/settings":
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  }

  return (
    <div className="flex h-screen bg-gray-900">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <Sidebar
        currentPath={currentPath}
        onNavigate={(path) => {
          setCurrentPath(path);
          setSidebarOpen(false);
        }}
        mobileOpen={sidebarOpen}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          title={pageTitles[currentPath] ?? "Dashboard"}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{renderPage()}</main>
      </div>
    </div>
  );
}

export default App;
