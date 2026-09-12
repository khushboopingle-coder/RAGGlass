import React, { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { PipelineBar } from '../components/PipelineBar';
import { ProjectSidebar } from '../components/ProjectSidebar';
import { NewProjectModal } from '../components/NewProjectModal';
import { DocumentInput } from '../components/DocumentInput';
import { ProcessStatusPanel } from '../components/ProcessStatusPanel';
import { ChunkViewer } from '../components/ChunkViewer';
import { EmbeddingsMetadata } from '../components/EmbeddingsMetadata';
import { QuerySection } from '../components/QuerySection';
import { RetrievalResults } from '../components/RetrievalResults';
import { AIAnswerCard } from '../components/AIAnswerCard';
import { SourcesCard } from '../components/SourcesCard';

export const WorkspacePage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="h-screen max-h-screen bg-slate-100 flex flex-col font-sans overflow-hidden">
      {/* Top Navbar */}
      <Navbar />

      {/* Top RAG Process Bar */}
      <PipelineBar />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Sidebar */}
        <ProjectSidebar onOpenNewProjectModal={() => setIsModalOpen(true)} />

        {/* Main Content Workspace */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Center & Left 2 Columns */}
            <div className="lg:col-span-2 space-y-6">
              {/* Document Input (Upload or Paste Text) */}
              <DocumentInput />

              {/* Document Chunks Inspector */}
              <ChunkViewer />

              {/* Embeddings & Metadata Table Panel */}
              <EmbeddingsMetadata />

              {/* Ask Question & Query Controls */}
              <QuerySection />

              {/* Retrieved Context Chunks */}
              <RetrievalResults />

              {/* AI Answer Card */}
              <AIAnswerCard />

              {/* Sources Card */}
              <SourcesCard />
            </div>

            {/* Right Column: Process Status Panel */}
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <ProcessStatusPanel />
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* New Project Modal */}
      <NewProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
