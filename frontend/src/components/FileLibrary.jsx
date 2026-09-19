import React, { useState, useEffect, useRef } from 'react';
import { fileService } from '../services/fileService';
import { FileText, Plus, Search, Trash2, Eye, X, CheckCircle2, XCircle, Loader2, UploadCloud, AlertCircle } from 'lucide-react';

export default function FileLibrary({ isOpen, onClose }) {
  const [pdfs, setPdfs] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, stat] = await Promise.all([
        fileService.listPDFs().catch(() => ({ documents: [] })),
        fileService.getStatus().catch(() => null),
      ]);
      setPdfs(list.documents || list.pdfs || []);
      setStatus(stat);
    } catch (e) {
      console.error('Error loading PDFs:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setUploadError('Supported files: PDF only (.pdf)');
      return;
    }

    setUploadError(null);
    setUploading(true);
    setUploadProgress(0);

    try {
      await fileService.uploadPDF(file, (progress) => {
        setUploadProgress(progress);
      });
      await loadData();
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadError(err.response?.data?.error || err.message || 'Failed to upload PDF');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = async (id, name) => {
    if (!confirm(`Remove "${name || id}" from PDF knowledge base?`)) return;
    try {
      await fileService.removePDF(id);
      await loadData();
    } catch (e) {
      alert(e.message || 'Failed to remove document');
    }
  };

  const handleUse = async (id) => {
    try {
      await fileService.usePDF(id);
      await loadData();
    } catch (e) {
      alert(e.message || 'Failed to set active document');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await fileService.searchPDF(searchQuery);
      setSearchResults(res);
    } catch (e) {
      console.error('Search error:', e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full animate-fade-in bg-surface-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <FileText className="w-4 h-4 text-brand-400" /> PDF Knowledge Base
        </h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".pdf,application/pdf"
        className="hidden"
      />

      {/* Status Bar */}
      {status && (
        <div className="px-4 py-2 border-b border-slate-800/60 bg-surface-850/40 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {status.enabled ? (
                <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400 font-medium">RAG Active</span></>
              ) : (
                <><XCircle className="w-3.5 h-3.5 text-slate-500" /><span className="text-slate-500 font-medium">RAG Inactive</span></>
              )}
              <span className="text-slate-500">·</span>
              <span className="text-slate-400 truncate max-w-[150px]">{status.activeDocumentName || 'All PDFs'}</span>
            </div>
            <span className="text-slate-500 text-[11px]">{pdfs.length} doc{pdfs.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {/* Upload button & dropzone */}
      <div className="p-3 border-b border-slate-800/60">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-brand-600/20 hover:bg-brand-600/30 border border-brand-500/30 text-brand-300 text-xs font-medium transition-all"
        >
          {uploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Uploading & Indexing ({uploadProgress}%)...</span>
            </>
          ) : (
            <>
              <UploadCloud className="w-4 h-4" />
              <span>Upload PDF Document</span>
            </>
          )}
        </button>

        {uploadError && (
          <div className="mt-2 p-2 rounded-lg bg-red-950/50 border border-red-900/40 text-xs text-red-300 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      {/* Search Input */}
      <div className="px-3 py-2 border-b border-slate-800/60">
        <div className="flex gap-1.5">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search indexed PDFs..."
            className="flex-1 px-3 py-1.5 rounded-lg bg-surface-850 border border-slate-700/40 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500/50"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium transition-colors"
            title="Search"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* PDF List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : pdfs.length === 0 ? (
          <div className="text-center py-8 px-4">
            <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-medium">No PDFs indexed yet</p>
            <p className="text-[11px] text-slate-600 mt-1">Upload a PDF to ask questions about its content.</p>
          </div>
        ) : (
          pdfs.map((pdf, i) => {
            const isCurrentlyActive = pdf.isActive;
            const docId = pdf.id || pdf.name;
            const docName = pdf.originalFilename || pdf.name || docId;

            return (
              <div
                key={i}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                  isCurrentlyActive
                    ? 'bg-brand-950/30 border-brand-500/40 text-slate-200 shadow-sm'
                    : 'bg-surface-850/50 border-slate-800/80 hover:bg-slate-800/60 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                  <FileText className={`w-4 h-4 flex-shrink-0 ${isCurrentlyActive ? 'text-brand-400' : 'text-slate-400'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate" title={docName}>{docName}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                      {pdf.pageCount && <span>{pdf.pageCount} pages</span>}
                      {pdf.chunkCount && <span>· {pdf.chunkCount} chunks</span>}
                      {isCurrentlyActive && <span className="text-emerald-400 font-medium">· Active</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleUse(docId)}
                    className={`p-1.5 rounded-lg text-xs transition-colors ${
                      isCurrentlyActive
                        ? 'bg-brand-600/30 text-brand-300'
                        : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                    title={isCurrentlyActive ? 'Currently active' : 'Set as active PDF'}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleRemove(docId, docName)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-red-950/40 hover:text-red-400 transition-colors"
                    title="Remove from knowledge base"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Search Results Display */}
        {searchResults && (
          <div className="mt-3 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Search Results</p>
              <button
                onClick={() => setSearchResults(null)}
                className="text-[10px] text-slate-500 hover:text-slate-300"
              >
                Clear
              </button>
            </div>
            {(!searchResults || searchResults.length === 0) ? (
              <p className="text-xs text-slate-500 italic">No matching content found.</p>
            ) : (
              (Array.isArray(searchResults) ? searchResults : searchResults.results || []).map((r, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-surface-850/80 border border-slate-800 mb-1.5 text-xs text-slate-300 space-y-1">
                  <p className="line-clamp-3 text-[11px] text-slate-400">{r.text}</p>
                  <div className="flex items-center justify-between text-[10px] text-brand-400 font-mono">
                    <span>{r.documentName || 'Document'}</span>
                    <span>Page {r.pageNumber || r.page}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
