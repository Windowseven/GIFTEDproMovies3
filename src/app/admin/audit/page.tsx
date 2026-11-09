'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Filter,
  Download,
  Calendar,
  RefreshCw,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Layers,
  Copy,
  Check,
} from 'lucide-react';
import { auditApi, type QueryAuditEventsParams } from '@/lib/api/auditApi';
import type { AuditEventItem } from '@/lib/api/types';

/**
 * Sanitizes a CSV cell against spreadsheet formula injection (CSV Injection).
 * Prepends a single quote if the value starts with =, +, -, @, tab, or carriage return.
 */
function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  let str = typeof value === 'object' ? JSON.stringify(value) : String(value);

  // Check if string starts with dangerous characters (even after leading whitespace)
  const trimmed = str.trimStart();
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    str = `'${str}`;
  }

  // Escape internal double quotes and wrap in quotes
  return `"${str.replace(/"/g, '""')}"`;
}

function exportAuditEventsToCsv(events: AuditEventItem[]) {
  const headers = [
    'ID',
    'Timestamp',
    'Action',
    'Actor ID',
    'Resource Type',
    'Resource ID',
    'IP Address',
    'User Agent',
    'Metadata',
  ];

  const rows = events.map((e) => [
    sanitizeCsvCell(e.id),
    sanitizeCsvCell(e.createdAt),
    sanitizeCsvCell(e.action),
    sanitizeCsvCell(e.actorId),
    sanitizeCsvCell(e.resourceType),
    sanitizeCsvCell(e.resourceId),
    sanitizeCsvCell(e.ipAddress),
    sanitizeCsvCell(e.userAgent),
    sanitizeCsvCell(e.metadata),
  ]);

  const csvContent = [headers.map(sanitizeCsvCell).join(','), ...rows.map((r) => r.join(','))].join(
    '\r\n',
  );

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getActionBadge(action: string) {
  if (action.includes('failed') || action.includes('blocked') || action.includes('error')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <AlertTriangle className="w-3 h-3" />
        {action}
      </span>
    );
  }
  if (action.includes('success') || action.includes('verified') || action.includes('completed')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3" />
        {action}
      </span>
    );
  }
  if (action.startsWith('auth.')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-[#D6A84F]/10 text-[#D6A84F] border border-[#D6A84F]/20">
        <ShieldAlert className="w-3 h-3" />
        {action}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
      <Info className="w-3 h-3" />
      {action}
    </span>
  );
}

export default function AdminAuditPage() {
  const [events, setEvents] = useState<AuditEventItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [actionFilter, setActionFilter] = useState<string>('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('');
  const [actorIdFilter, setActorIdFilter] = useState<string>('');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(50);

  // Details Modal state
  const [selectedEvent, setSelectedEvent] = useState<AuditEventItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);

  const fetchEvents = useCallback(
    async (cursor?: string) => {
      try {
        setIsLoading(true);
        setError(null);
        const params: QueryAuditEventsParams = {
          limit: pageSize,
          cursor: cursor || undefined,
          action: actionFilter.trim() || undefined,
          resourceType: resourceTypeFilter.trim() || undefined,
          actorId: actorIdFilter.trim() || undefined,
          startDate: startDateFilter ? new Date(startDateFilter).toISOString() : undefined,
          endDate: endDateFilter ? new Date(endDateFilter).toISOString() : undefined,
        };

        const response = await auditApi.getAuditEvents(params);
        setEvents(response.items || []);
        setNextCursor(response.nextCursor);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to query audit trail';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [pageSize, actionFilter, resourceTypeFilter, actorIdFilter, startDateFilter, endDateFilter],
  );

  useEffect(() => {
    // Initial load and filter change: reset pagination
    setCursorHistory([]);
    fetchEvents();
  }, [fetchEvents]);

  const handleNextPage = () => {
    if (nextCursor) {
      setCursorHistory((prev) => [...prev, nextCursor]);
      fetchEvents(nextCursor);
    }
  };

  const handlePrevPage = () => {
    if (cursorHistory.length > 0) {
      const newHistory = [...cursorHistory];
      newHistory.pop(); // Remove current
      const prevCursor = newHistory[newHistory.length - 1]; // Previous cursor or undefined for page 1
      setCursorHistory(newHistory);
      fetchEvents(prevCursor);
    }
  };

  const handleResetFilters = () => {
    setActionFilter('');
    setResourceTypeFilter('');
    setActorIdFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
  };

  const handleOpenModal = (event: AuditEventItem, e: React.MouseEvent) => {
    lastActiveElementRef.current = e.currentTarget as HTMLElement;
    setSelectedEvent(event);
  };

  const handleCloseModal = () => {
    setSelectedEvent(null);
    lastActiveElementRef.current?.focus();
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Focus trap and escape key for modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!selectedEvent) return;
      if (e.key === 'Escape') {
        handleCloseModal();
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    if (selectedEvent) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [selectedEvent]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Audit Trail &amp; Observability
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#181A21] text-[#D6A84F] border border-[#D6A84F]/30 uppercase">
              Append-Only Ledger
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Immutable, tamper-evident security and operational activity logs correlated with request IDs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchEvents()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-xs font-semibold text-neutral-300 hover:text-white hover:border-neutral-500 transition-colors focus:ring-2 focus:ring-[#D6A84F] focus:outline-none disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => exportAuditEventsToCsv(events)}
            disabled={events.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#D6A84F] text-[#08090C] hover:bg-[#e4be6c] text-xs font-bold transition-all shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-[#D6A84F] focus:outline-none disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#111318] border border-[#262932] space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-neutral-300">
          <span className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#D6A84F]" />
            Search &amp; Filter Logs
          </span>
          {(actionFilter || resourceTypeFilter || actorIdFilter || startDateFilter || endDateFilter) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[#D6A84F] hover:underline text-xs"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Action Filter */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1">Action</label>
            <input
              type="text"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="e.g. auth.login.failed"
              className="w-full px-3 py-1.5 rounded-xl bg-[#181A21] border border-[#262932] text-xs text-white placeholder-neutral-500 focus:ring-2 focus:ring-[#D6A84F] focus:outline-none"
            />
          </div>

          {/* Resource Type */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1">Resource Type</label>
            <input
              type="text"
              value={resourceTypeFilter}
              onChange={(e) => setResourceTypeFilter(e.target.value)}
              placeholder="e.g. user, session"
              className="w-full px-3 py-1.5 rounded-xl bg-[#181A21] border border-[#262932] text-xs text-white placeholder-neutral-500 focus:ring-2 focus:ring-[#D6A84F] focus:outline-none"
            />
          </div>

          {/* Actor ID */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1">Actor ID (UUID)</label>
            <input
              type="text"
              value={actorIdFilter}
              onChange={(e) => setActorIdFilter(e.target.value)}
              placeholder="UUID v4"
              className="w-full px-3 py-1.5 rounded-xl bg-[#181A21] border border-[#262932] text-xs text-white placeholder-neutral-500 font-mono focus:ring-2 focus:ring-[#D6A84F] focus:outline-none"
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1">From Date</label>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-[#181A21] border border-[#262932] text-xs text-white focus:ring-2 focus:ring-[#D6A84F] focus:outline-none"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1">To Date</label>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-[#181A21] border border-[#262932] text-xs text-white focus:ring-2 focus:ring-[#D6A84F] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchEvents()}
            className="text-xs font-bold underline hover:text-rose-300 ml-4"
          >
            Retry
          </button>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="rounded-2xl bg-[#111318] border border-[#262932] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#181A21]/90 border-b border-[#262932] text-neutral-400 font-medium uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Target Resource</th>
                <th className="px-4 py-3">Client Info</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262932]">
              {isLoading && events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-neutral-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-[#D6A84F]" />
                      <span>Loading immutable audit records...</span>
                    </div>
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-neutral-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShieldAlert className="w-8 h-8 text-neutral-600" />
                      <p className="font-semibold text-neutral-300">No audit events found</p>
                      <p className="text-[11px] text-neutral-500">
                        Try broadening your search or date filter.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr
                    key={event.id}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    {/* Timestamp */}
                    <td className="px-4 py-3 whitespace-nowrap text-neutral-300 font-mono text-[11px]">
                      <span title={event.createdAt}>
                        {new Date(event.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getActionBadge(event.action)}
                    </td>

                    {/* Actor */}
                    <td className="px-4 py-3 whitespace-nowrap text-neutral-400 font-mono text-[11px]">
                      {event.actorId ? (
                        <span
                          title={event.actorId}
                          className="hover:text-white cursor-pointer"
                          onClick={() => handleCopy(event.actorId!, `actor-${event.id}`)}
                        >
                          {event.actorId.slice(0, 8)}...
                          {copiedId === `actor-${event.id}` ? (
                            <Check className="w-3 h-3 inline ml-1 text-emerald-400" />
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-neutral-600">system/anonymous</span>
                      )}
                    </td>

                    {/* Target Resource */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-white font-medium">{event.resourceType}</span>
                      {event.resourceId && (
                        <span className="text-neutral-500 font-mono text-[10px] block truncate max-w-[120px]">
                          {event.resourceId}
                        </span>
                      )}
                    </td>

                    {/* Client Info */}
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-[10px] text-neutral-400">
                      <div>{event.ipAddress || 'unknown ip'}</div>
                      <div className="truncate max-w-[150px] text-neutral-600">
                        {event.userAgent || 'no agent'}
                      </div>
                    </td>

                    {/* Details Action */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => handleOpenModal(event, e)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors focus:ring-2 focus:ring-[#D6A84F] focus:outline-none"
                        aria-label={`Inspect event ${event.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Keyset Pagination Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#262932] bg-[#181A21]/50 text-xs text-neutral-400">
          <div>
            Showing <span className="font-semibold text-white">{events.length}</span> events
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={cursorHistory.length === 0 || isLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#111318] border border-[#262932] text-neutral-300 hover:text-white disabled:opacity-40 transition-colors focus:ring-2 focus:ring-[#D6A84F] focus:outline-none"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <button
              type="button"
              onClick={handleNextPage}
              disabled={!nextCursor || isLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#111318] border border-[#262932] text-neutral-300 hover:text-white disabled:opacity-40 transition-colors focus:ring-2 focus:ring-[#D6A84F] focus:outline-none"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Accessible Details Modal with Focus Trap */}
      {selectedEvent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-detail-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div
            ref={modalRef}
            className="w-full max-w-2xl rounded-2xl bg-[#121318] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#161820]">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-[#D6A84F]" />
                <h2 id="audit-detail-title" className="text-base font-bold text-white">
                  Audit Event Details
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors focus:ring-2 focus:ring-[#D6A84F] focus:outline-none"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-neutral-500 text-[11px] block">Event ID</span>
                  <div className="flex items-center gap-2 mt-0.5 font-mono text-white select-all">
                    <span>{selectedEvent.id}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedEvent.id, 'event-id')}
                      className="text-neutral-400 hover:text-white"
                      title="Copy Event ID"
                    >
                      {copiedId === 'event-id' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-neutral-500 text-[11px] block">Recorded At</span>
                  <span className="font-mono text-white block mt-0.5">
                    {new Date(selectedEvent.createdAt).toISOString()}
                  </span>
                </div>

                <div>
                  <span className="text-neutral-500 text-[11px] block">Action</span>
                  <div className="mt-1">{getActionBadge(selectedEvent.action)}</div>
                </div>

                <div>
                  <span className="text-neutral-500 text-[11px] block">Actor ID</span>
                  <span className="font-mono text-white block mt-0.5">
                    {selectedEvent.actorId || 'system/anonymous'}
                  </span>
                </div>

                <div>
                  <span className="text-neutral-500 text-[11px] block">Target Resource</span>
                  <span className="font-mono text-white block mt-0.5">
                    {selectedEvent.resourceType} {selectedEvent.resourceId ? `(${selectedEvent.resourceId})` : ''}
                  </span>
                </div>

                <div>
                  <span className="text-neutral-500 text-[11px] block">Client IP &amp; Request ID</span>
                  <span className="font-mono text-white block mt-0.5">
                    {selectedEvent.ipAddress || 'unknown IP'}
                    {selectedEvent.metadata && typeof selectedEvent.metadata === 'object' && 'requestId' in selectedEvent.metadata && (
                      <span className="text-[#D6A84F] block text-[10px]">
                        req: {String((selectedEvent.metadata as Record<string, unknown>).requestId)}
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* User Agent */}
              <div>
                <span className="text-neutral-500 text-[11px] block">User Agent</span>
                <p className="mt-1 p-2 rounded-xl bg-[#181A21] border border-[#262932] font-mono text-[11px] text-neutral-300 break-all">
                  {selectedEvent.userAgent || 'No user agent provided'}
                </p>
              </div>

              {/* Redacted Metadata Payload */}
              <div>
                <span className="text-neutral-500 text-[11px] block mb-1">
                  Metadata (Sanitized &amp; Redacted)
                </span>
                <pre className="p-3 rounded-xl bg-[#181A21] border border-[#262932] font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-56">
                  {JSON.stringify(selectedEvent.metadata ?? {}, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-white/10 bg-[#161820] flex justify-end">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors focus:ring-2 focus:ring-[#D6A84F] focus:outline-none"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
