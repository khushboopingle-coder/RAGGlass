import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { Layers, LogOut, Cpu, CheckCircle2, AlertCircle } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const { activeProject } = useProject();

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white px-6 py-3.5 flex items-center justify-between shadow-md">
      {/* Brand & Tagline */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none tracking-tight text-white flex items-center gap-2">
              RAGGlass
            </h1>
            <p className="text-xs text-indigo-300 font-medium tracking-wide">
  The Transparent Mind of RAG
</p>
<p className="text-[10px] text-indigo-400/70 font-medium tracking-wide">
  Open the Black Box of RAG
</p>
          </div>
        </div>

        {/* Active Project Badge */}
        {activeProject && (
          <div className="hidden md:flex items-center space-x-2 bg-slate-800/80 border border-slate-700 px-3 py-1 rounded-full text-xs text-slate-300">
            <span className="text-slate-400">Project:</span>
            <span className="font-semibold text-indigo-400">{activeProject.name}</span>
          </div>
        )}
      </div>

      {/* Right controls: AI Service Status & User / Logout */}
      <div className="flex items-center space-x-4">
        {/* AI Service Status Pill */}
        <div
          title="AI service is ready"
          className="flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium border transition-colors bg-emerald-950/60 text-emerald-300 border-emerald-800/60"
        >
          <Cpu className="w-3.5 h-3.5" />
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            AI Service Ready
          </span>
        </div>

        {/* User Info & Logout */}
        {user && (
          <div className="flex items-center space-x-3 pl-2 border-l border-slate-800">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-200">{user.name}</p>
              <p className="text-[10px] text-slate-400">{user.email}</p>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};