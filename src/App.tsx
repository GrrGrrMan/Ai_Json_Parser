import React, { useEffect } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { Dropzone } from "./components/Dropzone";
import { DocumentTable } from "./components/DocumentTable";
import { TurnList } from "./components/Inspector/TurnList";
import { PreviewPane } from "./components/PreviewPane";
import { PasteModal } from "./components/PasteModal";
import { useWorkspaceStore } from "./store/useWorkspaceStore";

export const App: React.FC = () => {
  const { initStore, documents, activeTab } = useWorkspaceStore();

  useEffect(() => {
    initStore();
  }, [initStore]);

  return (
    <div className="min-h-screen bg-app-bg text-zinc-100 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-[1500px] w-full mx-auto p-5 flex gap-5 overflow-hidden">
        {/* Left: Configuration Sidebar */}
        <Sidebar />

        {/* Right / Center: Workspace */}
        <section className="flex-1 flex flex-col gap-4 overflow-hidden">
          <Dropzone />

          <DocumentTable />

          {/* Active Workspace Master-Detail Split */}
          {documents.length > 0 && (
            <div className="flex-1 min-h-[460px] overflow-hidden">
              {activeTab === "editor" ? <TurnList /> : <PreviewPane />}
            </div>
          )}
        </section>
      </main>

      <PasteModal />
    </div>
  );
};