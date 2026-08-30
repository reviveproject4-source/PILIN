'use client';

import React, { useState } from 'react';
import { createDemoAction, updateDemoAction } from '../actions';
import { Plus, Search, Loader2, Calendar } from 'lucide-react';

interface Demo {
  id: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
  demo_result: 'INTERESTED' | 'NOT_INTERESTED' | 'FOLLOW_UP' | null;
  demo_date: string;
  notes: string | null;
  platform_sales_applications: {
    id: string;
    platform_customers: { name: string };
    platform_products: { name: string };
  };
}

interface DemosClientProps {
  initialDemos: Demo[];
  activeApplications: {
    id: string;
    platform_customers: { name: string };
    platform_products: { name: string };
  }[];
}

export default function DemosClient({
  initialDemos,
  activeApplications
}: DemosClientProps) {
  const [demos, setDemos] = useState<Demo[]>(initialDemos);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState<Demo | null>(null);

  // Scheduling State
  const [salesApplicationId, setSalesApplicationId] = useState('');
  const [demoDate, setDemoDate] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // Edit State
  const [editStatus, setEditStatus] = useState<'SCHEDULED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED'>('SCHEDULED');
  const [editResult, setEditResult] = useState<'INTERESTED' | 'NOT_INTERESTED' | 'FOLLOW_UP' | ''>('');
  const [editNotes, setEditNotes] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const handleScheduleDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salesApplicationId || !demoDate) return;

    setScheduleLoading(true);
    const res = await createDemoAction({
      salesApplicationId,
      demoDate,
      notes
    });

    setScheduleLoading(false);
    if (!res.success) {
      alert(res.message);
      return;
    }

    setIsScheduleOpen(false);
    setSalesApplicationId('');
    setDemoDate('');
    setNotes('');
    window.location.reload();
  };

  const handleUpdateDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDemo) return;

    setEditLoading(true);
    const res = await updateDemoAction({
      demoId: selectedDemo.id,
      status: editStatus,
      result: editResult || undefined,
      notes: editNotes
    });

    setEditLoading(false);
    if (!res.success) {
      alert(res.message);
      return;
    }

    setIsEditOpen(false);
    setSelectedDemo(null);
    window.location.reload();
  };

  const filteredDemos = demos.filter(d =>
    d.platform_sales_applications?.platform_customers?.name?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
    d.platform_sales_applications?.platform_products?.name?.toLowerCase()?.includes(searchQuery.toLowerCase())
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
            placeholder="Search scheduled demos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          onClick={() => setIsScheduleOpen(true)}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          Schedule Demo
        </button>
      </div>

      {/* Demos Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-800">
        <table className="min-w-full divide-y divide-slate-700 text-left text-sm text-slate-300">
          <thead className="bg-slate-750 text-slate-200 uppercase font-semibold">
            <tr>
              <th className="px-6 py-3">Customer</th>
              <th className="px-6 py-3">Product</th>
              <th className="px-6 py-3">Demo Date</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Result</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {filteredDemos.length > 0 ? (
              filteredDemos.map((demo) => (
                <tr key={demo.id} className="hover:bg-slate-700/50">
                  <td className="px-6 py-4 font-medium text-white">
                    {demo.platform_sales_applications?.platform_customers?.name}
                  </td>
                  <td className="px-6 py-4">
                    {demo.platform_sales_applications?.platform_products?.name}
                  </td>
                  <td className="px-6 py-4">
                    {new Date(demo.demo_date).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      demo.status === 'COMPLETED' ? 'bg-green-900 text-green-200' :
                      demo.status === 'SCHEDULED' ? 'bg-blue-900 text-blue-200' :
                      demo.status === 'CANCELLED' ? 'bg-slate-700 text-slate-300' :
                      'bg-red-900 text-red-200'
                    }`}>
                      {demo.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {demo.demo_result ? (
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        demo.demo_result === 'INTERESTED' ? 'bg-green-900 text-green-200' :
                        demo.demo_result === 'FOLLOW_UP' ? 'bg-yellow-900 text-yellow-200' :
                        'bg-red-900 text-red-200'
                      }`}>
                        {demo.demo_result}
                      </span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => {
                        setSelectedDemo(demo);
                        setEditStatus(demo.status);
                        setEditResult(demo.demo_result || '');
                        setEditNotes(demo.notes || '');
                        setIsEditOpen(true);
                      }}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      Update
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  No scheduled demos found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Schedule Demo Modal */}
      {isScheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">
                Schedule Demo Meeting
              </h2>
              <button
                onClick={() => setIsScheduleOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleScheduleDemo} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Select Deal / Application</label>
                <select
                  required
                  value={salesApplicationId}
                  onChange={(e) => setSalesApplicationId(e.target.value)}
                  className="w-full bg-slate-750 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:ring-indigo-500"
                >
                  <option value="">-- Choose Deal --</option>
                  {activeApplications.map(app => (
                    <option key={app.id} value={app.id}>
                      {app.platform_customers?.name} - {app.platform_products?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Demo Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={demoDate}
                  onChange={(e) => setDemoDate(e.target.value)}
                  className="w-full bg-slate-750 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Demo Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-750 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:ring-indigo-500"
                  placeholder="Demo specifications or client requirements..."
                  rows={3}
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsScheduleOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm text-slate-300 bg-slate-700 hover:bg-slate-650"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduleLoading}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
                >
                  {scheduleLoading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                  Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit/Update Demo Modal */}
      {isEditOpen && selectedDemo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">
                Log Demo Outcome
              </h2>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleUpdateDemo} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Demo Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full bg-slate-750 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-indigo-500"
                >
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="NO_SHOW">No Show</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Demo Result</label>
                <select
                  value={editResult}
                  onChange={(e) => setEditResult(e.target.value as any)}
                  className="w-full bg-slate-750 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-indigo-500"
                >
                  <option value="">-- No Result/Pending --</option>
                  <option value="INTERESTED">Interested</option>
                  <option value="NOT_INTERESTED">Not Interested</option>
                  <option value="FOLLOW_UP">Requires Follow-up</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Meeting Notes / Feedback</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-slate-750 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:ring-indigo-500"
                  placeholder="Feedback, pricing discussions, next steps..."
                  rows={3}
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm text-slate-300 bg-slate-700 hover:bg-slate-650"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
                >
                  {editLoading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                  Update Outcome
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
