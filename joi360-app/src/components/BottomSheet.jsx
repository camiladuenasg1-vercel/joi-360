import React from "react";

/**
 * Reutilizable BottomSheet — siempre centrado, máx 430px,
 * cubre el nav bar (z-[300]), cierra al tocar el overlay.
 */
export default function BottomSheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col justify-end items-center"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className="w-full bg-white shadow-2xl overflow-hidden"
        style={{ maxWidth: "430px", borderRadius: "28px 28px 0 0" }}
        onClick={e => e.stopPropagation()}>

        {/* Handle pill */}
        <div className="flex justify-center pt-3 pb-0">
          <div className="w-10 h-1 rounded-full bg-[#CDD1E4]" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex justify-between items-center px-6 py-4">
            <h3 className="text-xl font-black text-[#1C1C1E]">{title}</h3>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[#EEF2FD] flex items-center justify-center tap-active">
              <span className="material-symbols-outlined text-[#404255] text-xl">close</span>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="px-6 pb-10">
          {children}
        </div>
      </div>
    </div>
  );
}
