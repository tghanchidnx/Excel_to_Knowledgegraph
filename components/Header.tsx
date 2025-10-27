import React, { useState, useRef, useEffect } from 'react';
import { AppView } from '../types';
import { GridIcon, Share2Icon, BookOpenIcon, UploadCloudIcon, DownloadIcon, RotateCcwIcon, RedoIcon } from './icons';

interface HeaderProps {
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  isAnalyzed: boolean;
  onDownload: (format: 'excel' | 'json' | 'yaml') => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const Header: React.FC<HeaderProps> = ({ activeView, setActiveView, isAnalyzed, onDownload, onUndo, onRedo, canUndo, canRedo }) => {
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
            setDownloadMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { view: AppView.UPLOAD, label: 'Analyze', icon: <UploadCloudIcon className="w-5 h-5" />, disabled: false },
    { view: AppView.GRID, label: 'Interactive Grid', icon: <GridIcon className="w-5 h-5" />, disabled: !isAnalyzed },
    { view: AppView.GRAPH, label: 'Graph View', icon: <Share2Icon className="w-5 h-5" />, disabled: !isAnalyzed },
    { view: AppView.DOCS, label: 'Documentation', icon: <BookOpenIcon className="w-5 h-5" />, disabled: false },
  ];

  return (
    <header className="bg-secondary/50 backdrop-blur-sm border-b border-secondary p-4 flex justify-between items-center sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="bg-accent p-2 rounded-lg">
          <GridIcon className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-xl font-bold text-text-primary">Excel Knowledge Graph</h1>
      </div>
      <nav className="flex items-center gap-2">
        {navItems.map((item) => (
          <button
            key={item.view}
            onClick={() => setActiveView(item.view)}
            disabled={item.disabled}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === item.view
                ? 'bg-accent text-primary'
                : 'text-text-secondary hover:bg-secondary hover:text-text-primary'
            } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}

        <div className="flex items-center gap-1 border-l border-secondary pl-2 ml-2">
            <button
                onClick={onUndo}
                disabled={!canUndo || !isAnalyzed}
                className="p-2 rounded-md text-sm font-medium transition-colors text-text-secondary hover:bg-secondary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                title="Undo"
                aria-label="Undo"
            >
                <RotateCcwIcon className="w-5 h-5" />
            </button>
            <button
                onClick={onRedo}
                disabled={!canRedo || !isAnalyzed}
                className="p-2 rounded-md text-sm font-medium transition-colors text-text-secondary hover:bg-secondary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                title="Redo"
                aria-label="Redo"
            >
                <RedoIcon className="w-5 h-5" />
            </button>
        </div>

        <div className="relative" ref={downloadMenuRef}>
          <button
            onClick={() => setDownloadMenuOpen(prev => !prev)}
            disabled={!isAnalyzed}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors text-text-secondary hover:bg-secondary hover:text-text-primary ${!isAnalyzed ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-haspopup="true"
            aria-expanded={downloadMenuOpen}
          >
            <DownloadIcon className="w-5 h-5" />
            <span>Download</span>
          </button>
          {downloadMenuOpen && isAnalyzed && (
            <div className="absolute right-0 mt-2 w-48 bg-secondary rounded-md shadow-lg z-50 border border-primary animate-fade-in-up">
              <button onClick={() => { onDownload('excel'); setDownloadMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-primary/50 rounded-t-md">Excel File (.xlsx)</button>
              <button onClick={() => { onDownload('json'); setDownloadMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-primary/50">Graph Data (.json)</button>
              <button onClick={() => { onDownload('yaml'); setDownloadMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-primary/50 rounded-b-md">Graph Data (.yaml)</button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;
