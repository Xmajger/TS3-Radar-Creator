import { useEffect, useRef } from 'react';
import { AlertTriangle, Info, X, Check } from 'lucide-react';

export type ModalConfig =
  | { type: 'alert';   message: string; onClose: () => void }
  | { type: 'confirm'; message: string; onConfirm: () => void; onCancel: () => void };

interface Props {
  config: ModalConfig | null;
}

export default function AppModal({ config }: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (config) confirmRef.current?.focus();
  }, [config]);

  if (!config) return null;

  const isConfirm = config.type === 'confirm';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={isConfirm ? config.onCancel : config.onClose}
      />
      <div className="relative bg-[#23242A] border border-[#3A3B3F] rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 animate-fade-in">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            isConfirm ? 'bg-[#E57373]/15 text-[#E57373]' : 'bg-[#1A73E8]/15 text-[#4DA3FF]'
          }`}>
            {isConfirm ? <AlertTriangle size={18} /> : <Info size={18} />}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-[#E3E3E3] text-sm leading-relaxed">{config.message}</p>
          </div>
          <button
            onClick={isConfirm ? config.onCancel : config.onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#7E8081] hover:bg-[#3A3B3F] hover:text-[#E3E3E3] transition-colors flex-shrink-0 -mt-1 -mr-1"
          >
            <X size={14} />
          </button>
        </div>

        <div className={`mt-5 flex gap-2 justify-end`}>
          {isConfirm && (
            <button
              onClick={config.onCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-[#2A2B2F] text-[#B0B3B8] hover:bg-[#3A3B3F] hover:text-[#E3E3E3] transition-colors border border-[#3A3B3F]"
            >
              Abbrechen
            </button>
          )}
          <button
            ref={confirmRef}
            onClick={isConfirm ? config.onConfirm : config.onClose}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
              isConfirm
                ? 'bg-[#E57373] text-white hover:bg-[#EF5350]'
                : 'bg-[#1A73E8] text-white hover:bg-[#1557B0]'
            }`}
          >
            {isConfirm ? <><AlertTriangle size={12} /> Zurücksetzen</> : <><Check size={12} /> OK</>}
          </button>
        </div>
      </div>
    </div>
  );
}
