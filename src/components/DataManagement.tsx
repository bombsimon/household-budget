import React, { useRef, useState } from 'react';
import {
  Download,
  Upload,
  Database,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import {
  exportState,
  importState,
  clearState,
} from '../utils/statePersistence';
import type { AppState } from '../types';

interface DataManagementProps {
  onExport: () => AppState;
  onImport: (state: AppState) => void;
}

export function DataManagement({ onExport, onImport }: DataManagementProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleExport = async () => {
    try {
      const state = onExport();
      exportState(state);
      showMessage('success', 'Data exported successfully!');
    } catch (error) {
      showMessage(
        'error',
        error instanceof Error ? error.message : 'Export failed'
      );
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const state = await importState(file);
      onImport(state);
      showMessage('success', 'Data imported successfully!');
    } catch (error) {
      showMessage(
        'error',
        error instanceof Error ? error.message : 'Import failed'
      );
    } finally {
      setIsImporting(false);
      // Clear the input so the same file can be imported again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClearData = () => {
    if (
      window.confirm(
        'Are you sure you want to clear all data? This action cannot be undone.'
      )
    ) {
      try {
        clearState();
        window.location.reload(); // Reload to start fresh
      } catch (error) {
        showMessage('error', 'Failed to clear data');
      }
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Database className="w-5 h-5" />
        Data Management
      </h3>

      <div className="space-y-4">
        {message && (
          <div
            className={`p-3 rounded-md flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Data
          </button>

          <button
            onClick={handleImportClick}
            disabled={isImporting}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            {isImporting ? 'Importing...' : 'Import Data'}
          </button>

          <button
            onClick={handleClearData}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            Clear All Data
          </button>
        </div>

        <div className="text-sm text-gray-600">
          <p className="mb-2">
            <strong>Export:</strong> Download your budget data as a JSON file
            for backup or sharing.
          </p>
          <p className="mb-2">
            <strong>Import:</strong> Load budget data from a previously exported
            JSON file.
          </p>
          <p>
            <strong>Clear:</strong> Remove all data from browser storage and
            start fresh.
          </p>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Your data is automatically saved to your
            browser's local storage as you make changes. Use export/import for
            backup or to transfer data between devices.
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
