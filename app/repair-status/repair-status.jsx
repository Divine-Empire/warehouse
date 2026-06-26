"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  Wrench,
  Loader2,
  FileText
} from 'lucide-react';
import TableWrapper from '../../components/TableWrapper';
import ModalWrapper from '../../components/ModalWrapper';
import formatDate from '../../utils/formatDate';
import { toast } from 'sonner';

const sheet_url = process.env.NEXT_PUBLIC_SERVICE_SHEET_URL;
const Sheet_Id = process.env.NEXT_PUBLIC_SERVICE_SHEET_ID || "1teE4IIdCw7qnQvm_W7xAPgmGgpU13dtYw6y5ui01HHc";

const formatDateTime = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

export default function RepairStatus() {
  const [activeTab, setActiveTab] = useState('pending');
  const [tickets, setTickets] = useState([]);
  const [engineerList, setEngineerList] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);

  const loadTickets = async () => {
    setFetchLoading(true);
    try {
      const response = await fetch(`${sheet_url}?sheet=Ticket_Enquiry`);
      const json = await response.json();

      if (json.success && Array.isArray(json.data)) {
        // Headers are in row-6, data starts at row-7 (index 6)
        const allTickets = json.data.slice(6)
          .map((row, index) => ({
            id: index + 1, // ID to calculate row index as id + 6
            timeStemp: String(row[0] || "").trim(),
            ticketId: String(row[1] || "").trim(),
            clientName: String(row[17] || "").trim(),
            phoneNumber: String(row[18] || "").trim(),
            companyName: String(row[16] || "").trim(),
            machineName: String(row[22] || "").trim(),   // col-W
            mentionIssue: String(row[24] || "").trim(),  // col-Y
            category: String(row[23] || "").trim(),
            serviceLocation: String(row[25] || "").trim(),
            planned: String(row[141] || "").trim(), // col-EL
            actual: String(row[142] || "").trim(),  // col-EM
            repairStatus: String(row[143] || "").trim(), // col-EN
            engineerName: String(row[144] || "").trim(), // col-EO
            remarks: String(row[145] || "").trim(),      // col-EP
          }));
        setTickets(allTickets);
      }
    } catch (error) {
      console.error("Error loading Ticket_Enquiry data:", error);
      toast.error("Failed to load live data");
    } finally {
      setFetchLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const response = await fetch(`${sheet_url}?sheet=DROPDOWN`);
      const result = await response.json();
      if (result.success && Array.isArray(result.data) && result.data.length > 0) {
        // Extract values from column CQ (index 94), skipping header row (index 0)
        const engineers = result.data.slice(1)
          .map(row => row[94])
          .filter(val => val !== null && val !== undefined && String(val).trim() !== "")
          .map(val => String(val).trim());
        setEngineerList([...new Set(engineers)]);
      }
    } catch (error) {
      console.error("Error fetching DROPDOWN sheet:", error);
    }
  };

  useEffect(() => {
    loadTickets();
    fetchDropdownData();
    const handleRefresh = () => loadTickets();
    window.addEventListener('refresh_sales', handleRefresh);
    return () => window.removeEventListener('refresh_sales', handleRefresh);
  }, []);

  const pendingTickets = useMemo(() => {
    return tickets.filter(t => t.planned !== "" && t.actual === "");
  }, [tickets]);

  const historyTickets = useMemo(() => {
    return tickets.filter(t => t.planned !== "" && t.actual !== "");
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const activeList = activeTab === 'pending' ? pendingTickets : historyTickets;
    const searchLower = searchTerm.toLowerCase().trim();
    if (!searchLower) return activeList;

    return activeList.filter(t => 
      t.ticketId.toLowerCase().includes(searchLower) ||
      t.clientName.toLowerCase().includes(searchLower) ||
      t.companyName.toLowerCase().includes(searchLower) ||
      t.remarks.toLowerCase().includes(searchLower)
    );
  }, [activeTab, pendingTickets, historyTickets, searchTerm]);

  return (
    <div className="space-y-5 flex-1 flex flex-col min-h-0 overflow-hidden pr-1">
      {/* Header and Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
        {/* Tab Selector */}
        <div className="flex border border-slate-250 bg-slate-50/50 p-1 rounded-xl gap-1">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'pending'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            Pending ({pendingTickets.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            History ({historyTickets.length})
          </button>
        </div>

        {/* Search and Refresh */}
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID, Client, Company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50/50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all"
            />
          </div>
          <button
            onClick={loadTickets}
            disabled={fetchLoading}
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${fetchLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="flex-1 min-h-0 flex flex-col justify-between gap-4">
        <TableWrapper
          headers={
            activeTab === 'pending'
              ? [
                  'Action',
                  'Ticket ID',
                  'Date',
                  'Client Name',
                  'Company Name',
                  'Machine Name',
                  'Mention Issue',
                  'Service Location',
                  'Remarks'
                ]
              : [
                  'Ticket ID',
                  'Date',
                  'Client Name',
                  'Company Name',
                  'Machine Name',
                  'Mention Issue',
                  'Service Location',
                  'Repair Status',
                  'Engineer Name',
                  'Remarks'
                ]
          }
          data={filteredTickets}
          emptyMessage={
            fetchLoading ? (
              <div className="flex items-center justify-center flex-col py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                <p className="mt-2 text-xs text-slate-500 font-medium">Loading records...</p>
              </div>
            ) : "No entries found."
          }
          renderRow={(ticket) => {
            if (activeTab === 'pending') {
              return (
                <tr key={ticket.id} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => setSelectedTicket(ticket)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <Wrench size={13} />
                      Process
                    </button>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className="text-xs font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                      {ticket.ticketId}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-600">
                    {formatDate(ticket.timeStemp)}
                  </td>
                  <td className="px-5 py-3.5 text-xs font-bold text-slate-800">
                    {ticket.clientName}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-600">
                    {ticket.companyName}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-600">
                    {ticket.machineName || "-"}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-600">
                    {ticket.mentionIssue || "-"}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-600">
                    {ticket.serviceLocation}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-500 max-w-[180px] truncate" title={ticket.remarks}>
                    {ticket.remarks || "-"}
                  </td>
                </tr>
              );
            } else {
              return (
                <tr key={ticket.id} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className="text-xs font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                      {ticket.ticketId}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-600">
                    {formatDate(ticket.timeStemp)}
                  </td>
                  <td className="px-5 py-3.5 text-xs font-bold text-slate-800">
                    {ticket.clientName}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-600">
                    {ticket.companyName}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-600">
                    {ticket.machineName || "-"}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-600">
                    {ticket.mentionIssue || "-"}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-600">
                    {ticket.serviceLocation}
                  </td>
                  <td className="px-5 py-3.5 text-xs">
                    <span className={`px-2.5 py-0.5 rounded-full font-semibold border text-[11px] ${
                      ticket.repairStatus === "Yes"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : "bg-rose-50 text-rose-700 border-rose-100"
                    }`}>
                      {ticket.repairStatus}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs font-medium text-slate-700">
                    {ticket.engineerName || "-"}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-500 max-w-[180px] truncate" title={ticket.remarks}>
                    {ticket.remarks || "-"}
                  </td>
                </tr>
              );
            }
          }}
        />
      </div>

      {/* Process Dialog Modal */}
      {selectedTicket && (
        <ProcessModal
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          ticket={selectedTicket}
          onSave={loadTickets}
          engineerList={engineerList}
        />
      )}
    </div>
  );
}

function ProcessModal({ isOpen, onClose, ticket, onSave, engineerList }) {
  const [repairStatus, setRepairStatus] = useState('');
  const [engineerName, setEngineerName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const inputCls = "block w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all";
  const labelCls = "text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block";

  const isFormValid = useMemo(() => {
    if (!repairStatus) return false;
    if (repairStatus === "Yes" && !engineerName) return false;
    return true;
  }, [repairStatus, engineerName]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const columnData = {
      EM: formatDateTime(new Date()), // Actual Date/Time
      EN: repairStatus,               // Yes / No
      EO: repairStatus === "Yes" ? engineerName : "", // Engineer Name
      EP: remarks || "",              // Remarks
    };

    try {
      const params = {
        sheetName: "Ticket_Enquiry",
        action: "update",
        rowIndex: (ticket.id + 6).toString(),
        columnData: JSON.stringify(columnData),
      };
      if (Sheet_Id) {
        params.sheetId = Sheet_Id;
      }

      const response = await fetch(sheet_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(params).toString(),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to update Google Sheet");
      }

      toast.success("Repair status updated successfully!");
      await onSave();
      window.dispatchEvent(new Event('refresh_sales'));
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to save repair status details");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title={`Process Repair: ${ticket.ticketId}`} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Ticket Info Summary */}
        <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 block uppercase">Client Name</span>
            <span className="font-bold text-slate-700 block truncate">{ticket.clientName}</span>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 block uppercase">Company Name</span>
            <span className="font-bold text-slate-700 block truncate">{ticket.companyName || "N/A"}</span>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 block uppercase">Planned Date</span>
            <span className="font-medium text-slate-600 block">{formatDate(ticket.planned)}</span>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 block uppercase">Logged Date</span>
            <span className="font-medium text-slate-600 block">{formatDate(ticket.timeStemp)}</span>
          </div>
        </div>

        {/* Repair Status selection */}
        <div>
          <label className={labelCls}>Repair Status *</label>
          <select
            value={repairStatus}
            onChange={(e) => {
              setRepairStatus(e.target.value);
              if (e.target.value !== "Yes") {
                setEngineerName('');
              }
            }}
            required
            className={inputCls}
          >
            <option value="">Select Option</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>

        {/* Dynamic Engineer Selection (When status is Yes) */}
        {repairStatus === "Yes" && (
          <div>
            <label className={labelCls}>Engineer Name *</label>
            <select
              value={engineerName}
              onChange={(e) => setEngineerName(e.target.value)}
              required
              className={inputCls}
            >
              <option value="">Select Engineer</option>
              {engineerList.map((name, idx) => (
                <option key={idx} value={name}>{name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Remarks textarea */}
        <div>
          <label className={labelCls}>Remarks</label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Enter remarks..."
            rows={3}
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !isFormValid}
            className="px-6 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : 'Submit Report'}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}