'use client';

import React, { useState, useEffect } from 'react';
import { ServiceCatalogService, ServiceCatalogItem } from '@/domains/catalog/serviceCatalogService';
import { Plus, Trash2, Edit3, Tag, Percent, DollarSign, Package, Wrench } from 'lucide-react';

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

    if (editingItem) {
      ServiceCatalogService.updateMasterService(editingItem.id, {
        nama,
        base_harga: hargaJual,
        hpp: computedHpp,
        hpp_mode: hppMode,
        hpp_percent: pct,
        item_type: itemType,
        bahan_baku: bahanBaku || (itemType === 'SERVICE' ? 'Jasa Operasional' : 'Bahan Baku Standar'),
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
      });
    }

    // Reset Form
    setEditingItem(null);
    setNama('');
    setBaseHarga('');
    setHppPercent(50);
    setHppActual('');
    setBahanBaku('');
    setShowAddForm(false);
    loadCatalog();
  };

  const handleDelete = (id: string) => {
    if (confirm('Hapus item ini dari Master Catalog?')) {
      ServiceCatalogService.deleteMasterService(id);
      loadCatalog();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Master Katalog (Product & Service & BOM)
          </h2>
        </div>
        <button
          onClick={() => {
            if (showAddForm) {
              setShowAddForm(false);
            } else {
              handleOpenAdd();
            }
          }}
          className="px-4 py-2 bg-[#F26522] hover:bg-[#d85416] text-white rounded-xl text-xs font-bold transition-all shadow flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? 'Tutup Form' : 'Tambah Product / Service'}</span>
        </button>
      </div>

      {/* Add / Edit Form */}
      {showAddForm && (
        <form onSubmit={handleSaveService} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {editingItem ? `Form Edit Catalog Item (${editingItem.sku})` : 'Form Tambah Catalog Item'}
          </h3>

          {/* Jenis Item Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Jenis Catalog Item
            </label>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setItemType('PRODUCT')}
                className={`flex-1 py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
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
                className={`flex-1 py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                  itemType === 'SERVICE'
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Wrench className="w-4 h-4" />
                <span>SERVICE (Jasa / Pekerjaan)</span>
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
                placeholder={itemType === 'PRODUCT' ? 'Contoh: Oli Mesin Synthetic 1L' : 'Contoh: Grooming Premium'}
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
                placeholder="Contoh: 100000"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F26522]"
              />
            </div>
          </div>

          {/* Mode HPP for Product */}
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
                    className={`flex-1 py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
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
                    className={`flex-1 py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
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
                      min="0"
                      max="100"
                      value={hppPercent}
                      onChange={(e) => setHppPercent(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="50"
                      className="w-32 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F26522]"
                    />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      Calculated HPP: Rp {baseHarga !== '' ? Math.round((Number(baseHarga) * (Number(hppPercent) || 0)) / 100).toLocaleString('id-ID') : 0}
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Harga Beli / Cost HPP (Rp)
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
                Service Cost / HPP Opsional (Rp)
              </label>
              <input
                type="number"
                min="0"
                value={hppActual}
                onChange={(e) => setHppActual(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Biaya material service jika ada (default Rp 0)"
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
              placeholder={itemType === 'PRODUCT' ? 'Contoh: Kemasan Botol 1L' : 'Contoh: Sabun 50ml, Microfiber 1 pcs'}
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
              className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0F2547] dark:bg-[#F26522] text-white hover:opacity-90 shadow"
            >
              {editingItem ? 'Simpan Perubahan' : 'Simpan Catalog Item'}
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
                <th className="px-5 py-3.5">Mode HPP</th>
                <th className="px-5 py-3.5">Nominal HPP</th>
                <th className="px-5 py-3.5">Est. Gross Profit</th>
                <th className="px-5 py-3.5">BOM Material / Deskripsi</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {catalog.map((item) => {
                const gp = item.base_harga - item.hpp;
                const type = item.item_type || 'SERVICE';
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
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        item.hpp_mode === 'PERCENTAGE'
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                          : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                      }`}>
                        {type === 'SERVICE' ? 'SERVICE REVENUE' : item.hpp_mode === 'PERCENTAGE' ? `Persentase (${item.hpp_percent || 0}%)` : 'Harga Beli'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                      Rp {item.hpp.toLocaleString('id-ID')}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                      Rp {gp.toLocaleString('id-ID')}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {item.bahan_baku || '-'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                          title="Edit Item"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
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

