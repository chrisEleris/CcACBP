import { Suspense, lazy, useState } from "react";
import "./index.css";
import { AiDrawer } from "./components/AiDrawer";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";

const AiAssistantPage = lazy(() =>
  import("./pages/AiAssistantPage").then((m) => ({ default: m.AiAssistantPage })),
);
const CloudWatchPage = lazy(() =>
  import("./pages/CloudWatchPage").then((m) => ({ default: m.CloudWatchPage })),
);
const ConnectorsPage = lazy(() =>
  import("./pages/ConnectorsPage").then((m) => ({ default: m.ConnectorsPage })),
);
const CostPage = lazy(() => import("./pages/CostPage").then((m) => ({ default: m.CostPage })));
const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const DataSourcesPage = lazy(() =>
  import("./pages/DataSourcesPage").then((m) => ({ default: m.DataSourcesPage })),
);
const DeploymentsPage = lazy(() =>
  import("./pages/DeploymentsPage").then((m) => ({ default: m.DeploymentsPage })),
);
const EC2Page = lazy(() => import("./pages/EC2Page").then((m) => ({ default: m.EC2Page })));
const ECSPage = lazy(() => import("./pages/ECSPage").then((m) => ({ default: m.ECSPage })));
const IAMPage = lazy(() => import("./pages/IAMPage").then((m) => ({ default: m.IAMPage })));
const JenkinsPage = lazy(() =>
  import("./pages/JenkinsPage").then((m) => ({ default: m.JenkinsPage })),
);
const LambdaPage = lazy(() =>
  import("./pages/LambdaPage").then((m) => ({ default: m.LambdaPage })),
);
const LogExplorerPage = lazy(() =>
  import("./pages/LogExplorerPage").then((m) => ({ default: m.LogExplorerPage })),
);
const QueryExplorerPage = lazy(() =>
  import("./pages/QueryExplorerPage").then((m) => ({ default: m.QueryExplorerPage })),
);
const ReportBuilderPage = lazy(() =>
  import("./pages/ReportBuilderPage").then((m) => ({ default: m.ReportBuilderPage })),
);
const ReportViewerPage = lazy(() =>
  import("./pages/ReportViewerPage").then((m) => ({ default: m.ReportViewerPage })),
);
const S3Page = lazy(() => import("./pages/S3Page").then((m) => ({ default: m.S3Page })));
const ScheduledReportsPage = lazy(() =>
  import("./pages/ScheduledReportsPage").then((m) => ({ default: m.ScheduledReportsPage })),
);
const SettingsPage = lazy(() =>
  import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);
const VPCPage = lazy(() => import("./pages/VPCPage").then((m) => ({ default: m.VPCPage })));
const WafPage = lazy(() => import("./pages/WafPage").then((m) => ({ default: m.WafPage })));

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
        return <DashboardPage onNavigate={setCurrentPath} />;
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
        return <DashboardPage onNavigate={setCurrentPath} />;
    }
  }

  const pageContext = currentPath === "/" ? "dashboard" : currentPath.slice(1);

  return (
    <div className="flex h-screen bg-gray-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>
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
        <main id="main-content" className="relative flex-1 overflow-y-auto p-4 md:p-6">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              </div>
            }
          >
            {renderPage()}
          </Suspense>
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
