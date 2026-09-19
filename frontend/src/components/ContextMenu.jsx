import React, { useState, useEffect, useRef } from 'react';
import { MoreHorizontal, Pencil, Trash2, Copy, Archive, X } from 'lucide-react';

export default function ContextMenu({ sessionId, position, onClose, onRename, onDelete, onDuplicate, onArchive }) {
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const items = [
    { label: 'Rename', icon: Pencil, action: () => onRename?.(sessionId), color: 'text-slate-300' },
    { label: 'Duplicate', icon: Copy, action: () => onDuplicate?.(sessionId), color: 'text-slate-300' },
    { label: 'Archive', icon: Archive, action: () => onArchive?.(sessionId), color: 'text-slate-300' },
    { label: 'Delete', icon: Trash2, action: () => onDelete?.(sessionId), color: 'text-red-400' },
  ];

  return (
    <div
      ref={ref}
      className="fixed z-[60] w-44 bg-surface-800 border border-slate-700/60 rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-fade-in"
      style={{ top: position.y, left: position.x }}
    >
      <div className="p-1">
        {items.map(({ label, icon: Icon, action, color }) => (
          <button
            key={label}
            onClick={() => { action(); onClose(); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs hover:bg-slate-800 transition-all ${color}`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>
    </div>
  );
}
