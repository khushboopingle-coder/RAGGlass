import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { Plus, Folder, Trash2, FileText, ChevronRight, Layers } from 'lucide-react';

export const ProjectSidebar = ({ onOpenNewProjectModal }) => {
  const { projects, activeProject, selectProject, deleteProject, loadingProjects } = useProject();
  const [deleteId, setDeleteId] = useState(null);

  const handleDelete = async (e, projectId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this project and all its document vectors?')) {
      try {
        await deleteProject(projectId);
      } catch (err) {
        alert('Failed to delete project: ' + err.message);
      }
    }
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col h-full self-stretch min-h-0 flex-shrink-0">
      {/* Sidebar Header & New Project Button */}
      <div className="p-4 border-b border-slate-800">
        <button
          onClick={onOpenNewProjectModal}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2.5 rounded-lg flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Projects Title */}
      <div className="px-4 py-2 text-[11px] font-bold text-slate-500 tracking-wider uppercase">
        My Projects
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {loadingProjects ? (
          <div className="p-4 text-xs text-slate-500 text-center">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="p-4 text-xs text-slate-500 text-center italic">
            No projects created yet. Click "+ New Project" to get started.
          </div>
        ) : (
          projects.map((proj) => {
            const isActive = activeProject && activeProject.id === proj.id;
            return (
              <div
                key={proj.id}
                onClick={() => selectProject(proj)}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all text-sm ${
                  isActive
                    ? 'bg-indigo-950/80 border border-indigo-500/40 text-white font-medium shadow-sm'
                    : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-2.5 overflow-hidden">
                  <Folder
                    className={`w-4 h-4 flex-shrink-0 ${
                      isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'
                    }`}
                  />
                  <div className="truncate">
                    <p className="truncate text-xs font-semibold">{proj.name}</p>
                    {proj.description && (
                      <p className="truncate text-[10px] text-slate-500">{proj.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      isActive ? 'bg-indigo-900/60 text-indigo-300' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {proj.document_count} doc
                  </span>

                  <button
                    onClick={(e) => handleDelete(e, proj.id)}
                    title="Delete project"
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-950/60 hover:text-rose-400 text-slate-500 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-500 text-center">
        RAGGlass v1.0 • ChromaDB + SentenceTransformers
      </div>
    </aside>
  );
};
