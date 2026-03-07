import { useState } from "react";
import "./index.css";
import { AiDrawer } from "./components/AiDrawer";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { AiAssistantPage } from "./pages/AiAssistantPage";
import { CloudWatchPage } from "./pages/CloudWatchPage";
import { ConnectorsPage } from "./pages/ConnectorsPage";
import { CostPage } from "./pages/CostPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DataSourcesPage } from "./pages/DataSourcesPage";
import { DeploymentsPage } from "./pages/DeploymentsPage";
import { EC2Page } from "./pages/EC2Page";
import { ECSPage } from "./pages/ECSPage";
import { IAMPage } from "./pages/IAMPage";
import { JenkinsPage } from "./pages/JenkinsPage";
import { LambdaPage } from "./pages/LambdaPage";
import { LogExplorerPage } from "./pages/LogExplorerPage";
import { QueryExplorerPage } from "./pages/QueryExplorerPage";
import { ReportBuilderPage } from "./pages/ReportBuilderPage";
import { ReportViewerPage } from "./pages/ReportViewerPage";
import { S3Page } from "./pages/S3Page";
import { ScheduledReportsPage } from "./pages/ScheduledReportsPage";
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
  "/deployments": "Deployments",
  "/connectors": "Connectors",
  "/settings": "Settings",
  "/data-sources": "Data Sources",
  "/reports": "Report Builder",
  "/query": "Query Explorer",
  "/ai": "AI Assistant",
  "/scheduled-reports": "Scheduled Reports",
};

function App() {
  const [currentPath, setCurrentPath] = useState("/");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [viewingReportId, setViewingReportId] = useState<string | null>(null);

  function renderPage() {
    if (viewingReportId) {
      return (
        <ReportViewerPage reportId={viewingReportId} onBack={() => setViewingReportId(null)} />
      );
    }

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
      case "/deployments":
        return <DeploymentsPage />;
      case "/connectors":
        return <ConnectorsPage />;
      case "/settings":
        return <SettingsPage />;
      case "/data-sources":
        return <DataSourcesPage />;
      case "/reports":
        return <ReportBuilderPage />;
      case "/query":
        return <QueryExplorerPage />;
      case "/ai":
        return <AiAssistantPage />;
      case "/scheduled-reports":
        return <ScheduledReportsPage />;
      default:
        return <DashboardPage />;
    }
  }

  const pageContext = currentPath === "/" ? "dashboard" : currentPath.slice(1);

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
          setViewingReportId(null);
        }}
        mobileOpen={sidebarOpen}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          title={pageTitles[currentPath] ?? "Dashboard"}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="relative flex-1 overflow-y-auto p-4 md:p-6">
          {renderPage()}
          <AiDrawer
            pageContext={pageContext}
            isOpen={aiDrawerOpen}
            onToggle={() => setAiDrawerOpen(!aiDrawerOpen)}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
