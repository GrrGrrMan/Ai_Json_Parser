// src/App.tsx
import React, { useEffect, useState } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { Dropzone } from "./components/Dropzone";
import { DocumentTable } from "./components/DocumentTable";
import { TurnList } from "./components/Inspector/TurnList";
import { PreviewPane } from "./components/PreviewPane";
import { PasteModal } from "./components/PasteModal";
import { ToastContainer } from "./components/ToastContainer";
import { useWorkspaceStore } from "./store/useWorkspaceStore";
import { SlidersHorizontal, Files, Eye } from "lucide-react";

export const App: React.FC = () => {
  const { initStore, documents, activeTab, setActiveTab } = useWorkspaceStore();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    initStore();
  }, [initStore]);

  return (
    <div className="min-h-screen bg-app-bg text-zinc-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Header onOpenSettings={() => setMobileDrawerOpen(true)} />

      {/* Responsive Main Container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 sm:p-5 flex flex-col lg:flex-row gap-5 pb-20 lg:pb-5">
        
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-80 shrink-0">
          <Sidebar />
        </div>

        {/* Mobile Slide-Over Drawer */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
              onClick={() => setMobileDrawerOpen(false)} 
            />
            <div className="relative ml-auto w-full max-w-xs bg-app-panel h-full shadow-2xl p-4 overflow-y-auto z-10 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-app-border mb-3">
                <span className="text-sm font-semibold">Export Settings</span>
                <button 
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-2 text-zinc-400 hover:text-zinc-100 rounded-md"
                >
                  ✕
                </button>
              </div>
              <Sidebar onActionComplete={() => setMobileDrawerOpen(false)} />
            </div>
          </div>
        )}

        {/* Workspace Canvas */}
        <section className="flex-1 flex flex-col gap-4 min-w-0">
          <Dropzone />

          <DocumentTable />

          {documents.length > 0 && (
            <div className="flex-1 min-h-[350px] lg:min-h-[500px]">
              {activeTab === "editor" ? <TurnList /> : <PreviewPane />}
            </div>
          )}
        </section>
      </main>

      {/* Mobile Sticky Bottom Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 bg-zinc-950/90 border-t border-app-border backdrop-blur-lg flex lg:hidden z-30 px-3 py-2 justify-around">
        <button
          onClick={() => setActiveTab("editor")}
          className={`flex flex-col items-center gap-1 min-w-[64px] min-h-[44px] justify-center text-[11px] ${
            activeTab === "editor" ? "text-indigo-400 font-medium" : "text-zinc-400"
          }`}
        >
          <Files size={18} />
          <span>Editor</span>
        </button>
        <button
          onClick={() => setActiveTab("preview")}
          className={`flex flex-col items-center gap-1 min-w-[64px] min-h-[44px] justify-center text-[11px] ${
            activeTab === "preview" ? "text-indigo-400 font-medium" : "text-zinc-400"
          }`}
        >
          <Eye size={18} />
          <span>Preview</span>
        </button>
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="flex flex-col items-center gap-1 min-w-[64px] min-h-[44px] justify-center text-[11px] text-zinc-400"
        >
          <SlidersHorizontal size={18} />
          <span>Config</span>
        </button>
      </nav>

      <PasteModal />
      <ToastContainer />
    </div>
  );
};