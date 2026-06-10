import React, { useRef, useState } from 'react';
import { Upload, X, FileText, Check } from 'lucide-react';
import { toast } from '../../utils/notify';
import { validateFile, FILE_ACCEPT } from '../../utils/validation';

export const FileUploadZone = ({ onUpload, accept = FILE_ACCEPT, multiple = false }) => {
  const fileInputRef = useRef(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const processFiles = (fileList) => {
    // Only accept PDF/images up to 5MB; show an error for anything else.
    const validFiles = Array.from(fileList).filter(file => {
      const error = validateFile(file);
      if (error) {
        toast.error(`${file.name}: ${error}`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    const formatted = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
      file
    }));

    const nextFiles = multiple ? [...uploadedFiles, ...formatted] : formatted;
    setUploadedFiles(nextFiles);
    
    if (onUpload) {
      onUpload(multiple ? nextFiles.map(f => f.file) : nextFiles[0].file);
    }
  };

  const handleRemoveFile = (id, e) => {
    e.stopPropagation();
    const filtered = uploadedFiles.filter(f => f.id !== id);
    setUploadedFiles(filtered);
    if (onUpload) {
      onUpload(multiple ? filtered.map(f => f.file) : null);
    }
  };

  return (
    <div className="w-full flex flex-col gap-3">
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          isDragOver
            ? 'border-brand-light bg-brand-light/5 dark:border-brand-dark dark:bg-brand-dark/5'
            : 'border-slate-305 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-900/10'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
        />
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="p-3 bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700 rounded-full shadow-sm text-slate-550 dark:text-slate-400">
            <Upload size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-750 dark:text-slate-200">
              Click to upload or drag & drop
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Supports PDF, PNG, JPG (Max 5MB)
            </p>
          </div>
        </div>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="flex flex-col gap-2 border border-slate-150 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-800/40">
          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Uploaded Files
          </p>
          <div className="flex flex-col gap-1.5">
            {uploadedFiles.map(file => (
              <div
                key={file.id}
                className="flex items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-900/60 rounded-md border border-slate-150/50 dark:border-slate-800/50"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText size={16} className="text-brand-light dark:text-brand-dark flex-shrink-0" />
                  <div className="truncate text-left">
                    <p className="text-xs font-medium text-slate-750 dark:text-slate-200 truncate">
                      {file.name}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {file.size}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="p-0.5 bg-emerald-100 dark:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400 rounded-full">
                    <Check size={12} />
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleRemoveFile(file.id, e)}
                    className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-605 dark:hover:text-slate-200 rounded hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
