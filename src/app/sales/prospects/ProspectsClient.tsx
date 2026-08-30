'use client';

import React, { useState } from 'react';
import { createProspectAction } from '../actions';
import { Plus, Search, Loader2 } from 'lucide-react';

interface Prospect {
  id: string;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  owner_email: string;
  created_at: string;
}

interface ProspectsClientProps {
  initialProspects: Prospect[];
}

export default function ProspectsClient({ initialProspects }: ProspectsClientProps) {
  const [prospects, setProspects] = useState<Prospect[]>(initialProspects);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleCreateProspect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const res = await createProspectAction({
      name,
      contactName,
      email,
      phone,
      ownerEmail,
    });

    setLoading(false);
    if (!res.success) {
      setErrorMsg(res.message);
      return;
    }

    setSuccessMsg(res.message);
    // Reset Form
    setName('');
    setContactName('');
    setEmail('');
    setPhone('');
    setOwnerEmail('');
    
    // Close modal & reload page (action handles revalidate, but we can reset list/refresh)
    setTimeout(() => {
      setIsOpen(false);
      setSuccessMsg('');
      window.location.reload();
    }, 1500);
  };

  const filteredProspects = prospects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative max-w-md w-full">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </span>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border-0 bg-slate-850 rounded-lg text-white placeholder-slate-400 ring-1 ring-inset ring-slate-700 focus:ring-2 focus:ring-indigo-500 sm:text-sm"
            placeholder="Search prospects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Prospect
        </button>
      </div>

      {/* Prospect Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-800">
        <table className="min-w-full divide-y divide-slate-700 text-left text-sm text-slate-300">
          <thead className="bg-slate-750 text-slate-200 uppercase font-semibold">
            <tr>
              <th className="px-6 py-3">Company Name</th>
              <th className="px-6 py-3">Contact Person</th>
              <th className="px-6 py-3">Email Address</th>
              <th className="px-6 py-3">Phone</th>
              <th className="px-6 py-3">Owner Email</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {filteredProspects.length > 0 ? (
              filteredProspects.map((prospect) => (
                <tr key={prospect.id} className="hover:bg-slate-700/50">
                  <td className="px-6 py-4 font-medium text-white">{prospect.name}</td>
                  <td className="px-6 py-4">{prospect.contact_name}</td>
                  <td className="px-6 py-4">{prospect.email}</td>
                  <td className="px-6 py-4">{prospect.phone}</td>
                  <td className="px-6 py-4">{prospect.owner_email}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  No prospects found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Prospect Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">
                New Prospect Info
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateProspect} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-950/50 border border-red-500/50 rounded-lg text-sm text-red-200">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-green-950/50 border border-green-500/50 rounded-lg text-sm text-green-200">
                  {successMsg}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-750 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:ring-indigo-500"
                    placeholder="e.g. PT Maju Bersama"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Contact Person</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-750 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:ring-indigo-500"
                    placeholder="e.g. Budi Santoso"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    className="w-full bg-slate-750 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:ring-indigo-500"
                    placeholder="e.g. budi@perusahaan.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-750 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:ring-indigo-500"
                    placeholder="e.g. 62812345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Owner Email</label>
                  <input
                    type="email"
                    required
                    className="w-full bg-slate-750 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:ring-indigo-500"
                    placeholder="e.g. owner@perusahaan.com"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm text-slate-300 bg-slate-700 hover:bg-slate-650"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
                >
                  {loading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                  Submit Prospect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
