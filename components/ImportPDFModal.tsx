'use client';

import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ParsedProject {
  name: string;
  description?: string;
  phases?: string[];
  tasks?: Array<{
    title: string;
    description?: string;
    agent?: string;
  }>;
}

interface ImportPDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (projects: ParsedProject[]) => void;
}

type Step = 'upload' | 'processing' | 'review';

export default function ImportPDFModal({
  isOpen,
  onClose,
  onImportComplete,
}: ImportPDFModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [selectedProjects, setSelectedProjects] = useState<Set<number>>(new Set());
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateFile = (file: File): boolean => {
    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Please select a valid PDF file');
      return false;
    }

    // Validate file size (max 32MB)
    const maxSizeMB = 32;
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size must be less than ${maxSizeMB}MB`);
      return false;
    }

    // Warn if file is large (>10MB)
    if (file.size > 10 * 1024 * 1024) {
      console.warn('Large PDF file selected, parsing may take longer');
    }

    return true;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (validateFile(file)) {
      setSelectedFile(file);
      setError('');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (validateFile(file)) {
      setSelectedFile(file);
      setError('');
    }
  };

  const handleStartProcessing = async () => {
    if (!selectedFile) {
      setError('Please select a PDF file');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setStep('processing');

    try {
      // Convert PDF to base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64String = (event.target?.result as string)?.split(',')[1] || '';

          // Get API key from localStorage
          const apiKey = localStorage.getItem('anthropic_api_key') || '';

          // Call API to parse PDF
          const response = await fetch('/api/parse-pdf', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-anthropic-key': apiKey,
            },
            body: JSON.stringify({
              pdfBase64: base64String,
              fileName: selectedFile.name,
            }),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to parse PDF');
          }

          const data = await response.json();
          setParsedProjects(data.projects || []);
          // Pre-select all projects by default
          setSelectedProjects(new Set(data.projects.map((_: any, i: number) => i)));
          setStep('review');
        } catch (err) {
          setError(
            err instanceof Error ? err.message : 'Failed to parse PDF'
          );
          setStep('upload');
        } finally {
          setIsSubmitting(false);
        }
      };

      reader.readAsDataURL(selectedFile);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to read PDF file'
      );
      setStep('upload');
      setIsSubmitting(false);
    }
  };

  const toggleProjectSelection = (index: number) => {
    const newSelected = new Set(selectedProjects);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedProjects(newSelected);
  };

  const handleImport = () => {
    const projectsToImport = parsedProjects.filter((_, i) =>
      selectedProjects.has(i)
    );

    if (projectsToImport.length === 0) {
      setError('Please select at least one project to import');
      return;
    }

    onImportComplete(projectsToImport);

    // Reset form
    setSelectedFile(null);
    setParsedProjects([]);
    setSelectedProjects(new Set());
    setStep('upload');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Projects from PDF">
      {step === 'upload' && (
        <div className="space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-red-900 text-red-200 text-sm">
              {error}
            </div>
          )}

          <div
            className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-slate-500 transition-colors cursor-pointer"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="text-4xl mb-3">📄</div>
            <p className="text-slate-300 mb-4">
              Drag and drop your PDF or click to select
            </p>

            <input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="pdf-input"
            />
            <label htmlFor="pdf-input" className="cursor-pointer inline-block">
              <Button variant="primary" as="span">
                Choose PDF File
              </Button>
            </label>
          </div>

          {selectedFile && (
            <div className="bg-slate-800 p-4 rounded-md">
              <p className="text-sm text-slate-300">
                <strong>Selected:</strong> {selectedFile.name}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {(selectedFile.size / 1024 / 1024).toFixed(2)}MB
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleStartProcessing}
              disabled={!selectedFile || isSubmitting}
              isLoading={isSubmitting}
            >
              Parse PDF
            </Button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4 animate-pulse">🔄</div>
          <p className="text-slate-300 mb-2">Parsing PDF with Claude...</p>
          <p className="text-sm text-slate-500">
            This may take 10-30 seconds depending on file size
          </p>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-md bg-red-900 text-red-200 text-sm">
              {error}
            </div>
          )}

          <p className="text-sm text-slate-400">
            Found {parsedProjects.length} project(s). Select which ones to import:
          </p>

          <div className="space-y-3">
            {parsedProjects.map((project, index) => (
              <div
                key={index}
                className="border border-slate-700 rounded-md p-3 hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id={`project-${index}`}
                    checked={selectedProjects.has(index)}
                    onChange={() => toggleProjectSelection(index)}
                    className="mt-1 rounded border-slate-600 text-blue-500 focus:ring-blue-500"
                  />
                  <label
                    htmlFor={`project-${index}`}
                    className="flex-1 cursor-pointer"
                  >
                    <p className="font-medium text-slate-200">
                      {project.name}
                    </p>
                    {project.description && (
                      <p className="text-xs text-slate-400 mt-1">
                        {project.description}
                      </p>
                    )}
                    {project.phases && project.phases.length > 0 && (
                      <p className="text-xs text-slate-500 mt-2">
                        Phases: {project.phases.join(', ')}
                      </p>
                    )}
                    {project.tasks && project.tasks.length > 0 && (
                      <p className="text-xs text-slate-500">
                        Tasks: {project.tasks.length}
                      </p>
                    )}
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
            <Button variant="ghost" onClick={() => setStep('upload')}>
              Back
            </Button>
            <Button variant="primary" onClick={handleImport}>
              Import {selectedProjects.size} Project(s)
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
