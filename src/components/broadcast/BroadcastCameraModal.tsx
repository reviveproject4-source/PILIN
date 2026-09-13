'use client';

import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, X, Send, CheckCircle2 } from 'lucide-react';
import { RetentionDomainService } from '@/domains/retention/retentionDomainService';

interface BroadcastCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCustomerPhone?: string;
  defaultCustomerName?: string;
}

export function BroadcastCameraModal({
  isOpen,
  onClose,
  defaultCustomerPhone = '08123456789',
  defaultCustomerName = 'Pelanggan Setia',
}: BroadcastCameraModalProps) {
  const [messageText, setMessageText] = useState<string>(
    `Halo Kak ${defaultCustomerName}, berikut update foto hasil pengerjaan/layanan dari tim kami. Terima kasih!`
  );
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [broadcastStatus, setBroadcastStatus] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setSelectedImage(event.target.result as string);
          setBroadcastStatus(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendBroadcast = () => {
    if (!messageText.trim()) return;

    const waLink = RetentionDomainService.generateWaMeLink(defaultCustomerPhone, messageText);
    RetentionDomainService.scheduleSapaan({
      customer_name: defaultCustomerName,
      customer_phone: defaultCustomerPhone,
      category: 'SAPAAN',
      message_text: messageText,
    });

    setBroadcastStatus('Pesanan broadcast foto berhasil diproses dan dijadwalkan!');
    
    // Open WA link if available
    setTimeout(() => {
      window.open(waLink, '_blank');
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-5 text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#F26522] bg-[#F26522]/10 px-2.5 py-1 rounded-full">
              Phase 4 — Broadcast Camera
            </span>
            <h3 className="text-lg font-bold mt-1 text-slate-900 dark:text-white">
              Broadcast Text & Image
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Input */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Pesan Broadcast WA:
          </label>
          <textarea
            rows={3}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F26522]"
            placeholder="Tulis pesan broadcast..."
          />
        </div>

        {/* Hidden Camera Input with capture="environment" for Mobile Camera */}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={cameraInputRef}
          onChange={handleImageCapture}
          className="hidden"
          id="broadcast-camera-input"
        />

        {/* Hidden File Picker Fallback */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImageCapture}
          className="hidden"
          id="broadcast-file-input"
        />

        {/* Image Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-[#F26522] hover:bg-[#d85416] text-white font-bold text-xs transition-all shadow"
          >
            <Camera className="w-4 h-4" />
            <span>Take Picture (Kamera)</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Pilih dari Galeri</span>
          </button>
        </div>

        {/* Image Preview */}
        {selectedImage && (
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 p-2 text-center">
            <div className="text-[11px] font-bold text-slate-500 mb-2">Preview Foto Broadcast:</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedImage}
              alt="Broadcast Preview"
              className="max-h-48 mx-auto rounded-xl object-contain shadow-md"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-red-600 text-white p-1 rounded-full hover:bg-red-700 transition-colors shadow"
              title="Hapus Foto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Status Message */}
        {broadcastStatus && (
          <div className="flex items-center space-x-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-xl">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{broadcastStatus}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSendBroadcast}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-[#0F2547] dark:bg-[#F26522] text-white hover:opacity-90 transition-all flex items-center space-x-1.5 shadow"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kirim Broadcast</span>
          </button>
        </div>
      </div>
    </div>
  );
}
