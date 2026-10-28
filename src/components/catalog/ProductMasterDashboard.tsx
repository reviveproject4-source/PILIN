'use client';

import React, { useState, useEffect } from 'react';
import { ServiceCatalogService, ServiceCatalogItem } from '@/domains/catalog/serviceCatalogService';
import { Plus, Trash2, Edit3, Tag, Percent, DollarSign, Package, Wrench, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

export function ProductMasterDashboard() {
  const [catalog, setCatalog] = useState<ServiceCatalogItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceCatalogItem | null>(null);

  // Form State
  const [nama, setNama] = useState('');
  const [baseHarga, setBaseHarga] = useState<number | ''>('');
  const [itemType, setItemType] = useState<'PRODUCT' | 'SERVICE'>('PRODUCT');
  const [hppMode, setHppMode] = useState<'PERCENTAGE' | 'ACTUAL_COST'>('PERCENTAGE');
  const [hppPercent, setHppPercent] = useState<number | ''>(50);
  const [hppActual, setHppActual] = useState<number | ''>('');
  const [bahanBaku, setBahanBaku] = useState('');
  
  // Customizable CRM cycle duration & stock alerts
  const [reminderDays, setReminderDays] = useState<number | ''>(30);
  const [stockQty, setStockQty] = useState<number | ''>(10);
  const [stockAlertThreshold, setStockAlertThreshold] = useState<number | ''>(5);

  const loadCatalog = () => {
    const items = ServiceCatalogService.getMasterCatalog();
    setCatalog(items);
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setNama('');
    setBaseHarga('');
    setItemType('PRODUCT');
    setHppMode('PERCENTAGE');
    setHppPercent(50);
    setHppActual('');
    setBahanBaku('');
    setReminderDays(30);
    setStockQty(10);
    setStockAlertThreshold(5);
    setShowAddForm(true);
  };

  const handleOpenEdit = (item: ServiceCatalogItem) => {
    setEditingItem(item);
    setNama(item.nama);
    setBaseHarga(item.base_harga);
    setItemType(item.item_type || 'PRODUCT');
    setHppMode(item.hpp_mode || 'PERCENTAGE');
    setHppPercent(item.hpp_percent ?? 50);
    setHppActual(item.hpp || '');
    setBahanBaku(item.bahan_baku || '');
    setReminderDays(item.reminder_days ?? 30);
    setStockQty(item.stock_qty ?? 0);
    setStockAlertThreshold(item.stock_alert_threshold ?? 5);
    setShowAddForm(true);
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama || baseHarga === '' || Number(baseHarga) <= 0) return;

    const hargaJual = Number(baseHarga);
    let computedHpp = 0;
    let pct = 0;

    if (itemType === 'PRODUCT') {
      if (hppMode === 'PERCENTAGE') {
        pct = Number(hppPercent) || 0;
        computedHpp = Math.round((hargaJual * pct) / 100);
      } else {
        computedHpp = Number(hppActual) || 0;
      }
    } else {
      computedHpp = Number(hppActual) || 0;
    }

    const finalReminderDays = Number(reminderDays) || 30;
    const finalStockQty = itemType === 'PRODUCT' ? (Number(stockQty) || 0) : 0;
    const finalStockThreshold = itemType === 'PRODUCT' ? (Number(stockAlertThreshold) || 5) : 0;

    if (editingItem) {
      ServiceCatalogService.updateMasterService(editingItem.id, {
        nama,
        base_harga: hargaJual,
        hpp: computedHpp,
        hpp_mode: hppMode,
        hpp_percent: pct,
        item_type: itemType,
        bahan_baku: bahanBaku || (itemType === 'SERVICE' ? 'Jasa Operasional' : 'Bahan Baku Standar'),
        reminder_days: finalReminderDays,
        stock_qty: finalStockQty,
        stock_alert_threshold: finalStockThreshold,
      });
    } else {
      ServiceCatalogService.addMasterService({
        nama,
        base_harga: hargaJual,
        hpp: computedHpp,
        hpp_mode: hppMode,
        hpp_percent: pct,
        item_type: itemType,
        bahan_baku: bahanBaku || (itemType === 'SERVICE' ? 'Jasa Operasional' : 'Bahan Baku Standar'),
        reminder_days: finalReminderDays,
        stock_qty: finalStockQty,
        stock_alert_threshold: finalStockThreshold,
      });
    }

    // Reset Form
    setEditingItem(null);
    setNama('');
    setBaseHarga('');
    setHppPercent(50);
    setHppActual('');
    setBahanBaku('');
    setReminderDays(30);
    setStockQty(10);
    setStockAlertThreshold(5);
    setShowAddForm(false);
    loadCatalog();
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus catalog item ini?')) {
      ServiceCatalogService.deleteMasterService(id);
      loadCatalog();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#0F2547] dark:text-white tracking-tight flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#F26522]" />
            <span>Master Katalog Layanan & Produk Retail</span>
          </h1>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-[#F26522] hover:bg-[#d95416] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Item Baru</span>
        </button>
      </div>

      {/* Add / Edit Form Modal Card */}
      {showAddForm && (
        <form
          onSubmit={handleSaveService}
          className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              {editingItem ? 'Edit Katalog Item' : 'Tambah Katalog Item Baru'}
            </h2>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setEditingItem(null);
              }}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold cursor-pointer"
            >
              ✕ Batal
            </button>
          </div>

          {/* Type Selector: PRODUCT vs SERVICE */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Pilih Tipe Item
            </label>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setItemType('PRODUCT')}
                className={`flex-1 py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  itemType === 'PRODUCT'
                    ? 'border-[#F26522] bg-[#F26522]/10 text-[#F26522]'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>PRODUCT (Barang / Retail)</span>
              </button>

              <button
                type="button"
                onClick={() => setItemType('SERVICE')}
                className={`flex-1 py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  itemType === 'SERVICE'
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Wrench className="w-4 h-4" />
                <span>SERVICE (Jasa / Pengerjaan)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Nama Item
              </label>
              <input
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder={itemType === 'PRODUCT' ? 'Contoh: Sabun Pembersih Sepatu 250ml' : 'Contoh: Cuci & Treatment Tas Kulit'}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F26522]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Harga Jual (Rp)
              </label>
              <input
                type="number"
                required
                min="1"
                value={baseHarga}
                onChange={(e) => setBaseHarga(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Contoh: 75000"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F26522]"
              />
            </div>
          </div>

          {/* CRM DURASI PENGINGAT (TIDAK TERKUNCI / BISA DIEDIT OWNER) */}
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#F26522]" />
                <span>
                  {itemType === 'SERVICE'
                    ? 'Siklus Pengingat Perawatan Berkala Konsumen (Hari)'
                    : 'Siklus Pengingat Refill / Belanja Kembali Konsumen (Hari)'}
                </span>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-slate-500 font-bold">Pilihan Cepat:</span>
              {[30, 45, 60, 90].map((days) => (
                <button
                  type="button"
                  key={days}
                  onClick={() => setReminderDays(days)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    reminderDays === days
                      ? 'bg-[#F26522] text-white border-[#F26522] shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#F26522]'
                  }`}
                >
                  {days} Hari
                </button>
              ))}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-[11px] text-slate-500 font-bold">Atau Ketik Kustom:</span>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={reminderDays}
                  onChange={(e) => setReminderDays(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Hari..."
                  className="w-20 px-2 py-1.5 text-xs text-center font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F26522]"
                />
                <span className="text-xs text-slate-500 font-bold">Hari</span>
              </div>
            </div>
          </div>

          {/* RETAIL ONLY: STOK & PERINGATAN REORDER OWNER */}
          {itemType === 'PRODUCT' && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl space-y-4">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs">
                <AlertTriangle className="w-4 h-4" />
                <span>Pengaturan Stok & Pengingat Reorder ke Vendor (Khusus Retail)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Jumlah Stok Tersedia Saat Ini (Pcs)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stockQty}
                    onChange={(e) => setStockQty(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Contoh: 15"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F26522]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Batas Minimum Stok untuk Peringatan Owner (Pcs)
                  </label>
                  <div className="flex items-center gap-2">
                    {[2, 5, 10].map((t) => (
                      <button
                        type="button"
                        key={t}
                        onClick={() => setStockAlertThreshold(t)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          stockAlertThreshold === t
                            ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {t} Pcs
                      </button>
                    ))}
                    <input
                      type="number"
                      min="1"
                      value={stockAlertThreshold}
                      onChange={(e) => setStockAlertThreshold(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Batas..."
                      className="w-20 px-2 py-1.5 text-xs text-center font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F26522] ml-auto"
                    />
                    <span className="text-xs text-slate-500 font-bold">Pcs</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mode HPP */}
          {itemType === 'PRODUCT' ? (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Metode Penentuan HPP Product
                </label>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setHppMode('PERCENTAGE')}
                    className={`flex-1 py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                      hppMode === 'PERCENTAGE'
                        ? 'border-[#F26522] bg-[#F26522]/10 text-[#F26522]'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Percent className="w-4 h-4" />
                    <span>Mode Persentase (%)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHppMode('ACTUAL_COST')}
                    className={`flex-1 py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                      hppMode === 'ACTUAL_COST'
                        ? 'border-[#F26522] bg-[#F26522]/10 text-[#F26522]'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Mode Harga Beli (Rp)</span>
                  </button>
                </div>
              </div>

              {hppMode === 'PERCENTAGE' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Persentase HPP dari Harga Jual (%)
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      required
                      min="1"
                      max="100"
                      value={hppPercent}
                      onChange={(e) => setHppPercent(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Contoh: 50"
                      className="w-32 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F26522]"
                    />
                    <span className="text-xs text-slate-500 font-bold">
                      Est. HPP: Rp {Math.round((Number(baseHarga || 0) * Number(hppPercent || 0)) / 100).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Nominal Harga Beli Satuan (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={hppActual}
                    onChange={(e) => setHppActual(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Contoh: 35000"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F26522]"
                  />
                </div>
              )}
            </>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Estimasi Biaya Operasional / Modal Jasa (Rp)
              </label>
              <input
                type="number"
                required
                min="0"
                value={hppActual}
                onChange={(e) => setHppActual(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Contoh: 25000"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F26522]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              BOM Material & Deskripsi Komponen
            </label>
            <input
              type="text"
              value={bahanBaku}
              onChange={(e) => setBahanBaku(e.target.value)}
              placeholder="Rincian bahan baku / material..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F26522]"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setEditingItem(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0F2547] dark:bg-[#F26522] text-white hover:opacity-90 shadow cursor-pointer"
            >
              {editingItem ? 'Simpan Perubahan' : 'Simpan Katalog Item'}
            </button>
          </div>
        </form>
      )}

      {/* Catalog Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Jenis</th>
                <th className="px-5 py-3.5">SKU & Item</th>
                <th className="px-5 py-3.5">Harga Jual</th>
                <th className="px-5 py-3.5">Siklus Pengingat CRM</th>
                <th className="px-5 py-3.5">Stok & Peringatan</th>
                <th className="px-5 py-3.5">Nominal HPP</th>
                <th className="px-5 py-3.5">Est. Gross Profit</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {catalog.map((item) => {
                const gp = item.base_harga - item.hpp;
                const type = item.item_type || 'SERVICE';
                const isLowStock = type === 'PRODUCT' && item.stock_alert_threshold && (item.stock_qty ?? 0) <= item.stock_alert_threshold;

                return (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        type === 'PRODUCT'
                          ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                          : 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300'
                      }`}>
                        {type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900 dark:text-white">{item.nama}</div>
                      <div className="text-[11px] font-mono text-slate-500">{item.sku}</div>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                      Rp {item.base_harga.toLocaleString('id-ID')}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                        type === 'SERVICE'
                          ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                          : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      }`}>
                        <Clock className="w-3 h-3" />
                        <span>
                          {type === 'SERVICE'
                            ? `Perawatan H+${item.reminder_days || 30}`
                            : `Refill H+${item.reminder_days || 30}`}
                        </span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {type === 'PRODUCT' ? (
                        <div className="space-y-0.5">
                          <div className={`font-bold text-xs flex items-center gap-1.5 ${
                            isLowStock ? 'text-rose-600 dark:text-rose-400 font-black' : 'text-slate-900 dark:text-white'
                          }`}>
                            <span>{item.stock_qty ?? 0} Pcs</span>
                            {isLowStock && (
                              <span className="px-1.5 py-0.2 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded text-[9px] font-extrabold uppercase">
                                Menipis ⚠️
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Min: {item.stock_alert_threshold ?? 5} Pcs
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-mono">- (Jasa)</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                      Rp {item.hpp.toLocaleString('id-ID')}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                      Rp {gp.toLocaleString('id-ID')}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                          title="Edit Item"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          title="Hapus Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
