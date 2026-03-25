"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Box,
  Plus,
  Loader2,
  History,
  Clock,
  CheckCircle2,
  FileEdit,
  ArrowUpDown,
  MoreHorizontal
} from "lucide-react";
import { format, parse } from "date-fns";
import { MainLayout } from "@/components/layout/main-layout";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function PurchaseLocationUpdatePage() {
  const [purchaseData, setPurchaseData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [activeTab, setActiveTab] = useState("pending");
  const [modalStep, setModalStep] = useState("status");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedItemName, setSelectedItemName] = useState("");
  const [modalEdits, setModalEdits] = useState({}); // { [id]: { receivedLocation, qty } }
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [extraRows, setExtraRows] = useState([]); // Duplicated rows for splitting
  const [stockItems, setStockItems] = useState([]); // From Dropdown Col-E
  const [stockTransferRows, setStockTransferRows] = useState([
    { id: Date.now(), fromLoc: "", item: "", qty: "", toLoc: "", itemTo: "", qtyTo: "" }
  ]);

  const SHEET_ID = "1_KAokqi4ZxBGj2xA7TOdUMj6H44szaf4CQMI_OINdAo";
  // Unified URL used for both READ and WRITE operations
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyCik-SO0JHWnTfyeltKDx3i7LI0Ppt3lBw59tQy1ymiiQb8ai3D9FA540Pw65Jzq58Lg/exec";

  const columns = useMemo(() => {
    const base = [
      { key: "indentNo", label: "Indent Number", width: "150px" },
      { key: "liftNo", label: "Lift No.", width: "120px" },
      { key: "vendorName", label: "Vendor Name", width: "200px" },
      { key: "itemName", label: "Item Name", width: "180px" },
      { key: "qty", label: "Qty", width: "100px" },
      { key: "planned", label: "Planned", width: "150px" },
    ];
    if (activeTab === "history") {
      return [...base, { key: "actual", label: "Actual", width: "120px" }];
    }
    return base;
  }, [activeTab]);

  const parseGoogleSheetsDate = (value) => {
    if (!value) return null;
    try {
      if (typeof value === "string" && value.startsWith("Date(")) {
        const match = value.match(/Date\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/);
        if (match) {
          const [_, year, month, day, hours, minutes, seconds] = match;
          return new Date(parseInt(year), parseInt(month), parseInt(day), parseInt(hours), parseInt(minutes), parseInt(seconds));
        }
      }
      return new Date(value);
    } catch (err) {
      return null;
    }
  };

  const formatDate = (value) => {
    const date = parseGoogleSheetsDate(value);
    if (date && !isNaN(date.getTime())) {
      return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    }
    return value || "-";
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const formatTableDate = (dateStr) => {
      if (!dateStr) return "-";
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return format(d, "dd-MM-yyyy");
      } catch (e) {
        return dateStr;
      }
    };
    try {
      // Fetch from both sheets using the unified script
      const [partialQCRes, receivingAccRes, locationItemsRes] = await Promise.all([
        fetch(`${SCRIPT_URL}?sheet=Partial QC&action=fetch`),
        fetch(`${SCRIPT_URL}?sheet=RECEIVING-ACCOUNTS&action=fetch`),
        fetch(`${SCRIPT_URL}?sheet=LOCATION-ITEMS&action=fetch`)
      ]);

      const partialQCResult = await partialQCRes.json();
      const receivingAccResult = await receivingAccRes.json();
      const locationItemsResult = await locationItemsRes.json();

      let combinedData = [];
      const receivingAccMap = new Map();

      // 1. Process RECEIVING-ACCOUNTS first to build the lookup map
      if (receivingAccResult.success && receivingAccResult.data) {
        receivingAccResult.data.slice(7).forEach((row, index) => {
          const rowIndex = index + 8;
          const planned = row[111]; // DH (0-indexed col 111)
          const actual = row[112];  // DI (0-indexed col 112)
          
          const hasPlanned = planned !== undefined && planned !== null && String(planned).trim() !== "" && String(planned).trim() !== "-";
          const hasActual = actual !== undefined && actual !== null && String(actual).trim() !== "" && String(actual).trim() !== "-" && String(actual).trim().toLowerCase() !== "n/a";

          const liftNo = String(row[2] || "").trim();
          const record = {
            id: `acc-${rowIndex}`,
            indentNo: row[1] ?? "",
            liftNo: liftNo,
            vendorName: row[3] ?? "",
            itemName: row[7] ?? "",
            qty: row[25] ?? "",
            planned: formatDate(planned),
            actual: formatDate(actual),
            source: "RECEIVING-ACCOUNTS",
            rowIndex: rowIndex,
            isPending: hasPlanned && !hasActual,
            isHistory: false, // History now comes from LOCATION-ITEMS
          };

          if (liftNo) {
            receivingAccMap.set(liftNo, record);
          }
          combinedData.push(record);
        });
      }

      // 2. Process Partial QC and lookup missing Vendor/Item from the map
      if (partialQCResult.success && partialQCResult.data) {
        partialQCResult.data.slice(7).forEach((row, index) => {
          const rowIndex = index + 8;
          const planned = row[29]; // AD (0-indexed col 29)
          const actual = row[30]; // AE (0-indexed col 30)
          
          const hasPlanned = planned !== undefined && planned !== null && String(planned).trim() !== "" && String(planned).trim() !== "-";
          const hasActual = actual !== undefined && actual !== null && String(actual).trim() !== "" && String(actual).trim() !== "-" && String(actual).trim().toLowerCase() !== "n/a";

          const liftNo = String(row[2] || "").trim();
          const lookup = liftNo ? receivingAccMap.get(liftNo) : null;

          combinedData.push({
            id: `qc-${rowIndex}`,
            indentNo: row[1] ?? (lookup?.indentNo || ""),
            liftNo: liftNo,
            vendorName: lookup?.vendorName || "", // Fetch from RECEIVING-ACCOUNTS
            itemName: lookup?.itemName || "",     // Fetch from RECEIVING-ACCOUNTS
            qty: row[10] ?? "",                   // Partial QC col-K (index 10)
            planned: formatDate(planned),
            actual: formatDate(actual),
            source: "Partial QC",
            rowIndex: rowIndex,
            isPending: hasPlanned && !hasActual,
            isHistory: false, // History now comes from LOCATION-ITEMS
          });
        });
      }

      // 3. Process LOCATION-ITEMS for the History tab (row 3 onwards)
      if (locationItemsResult.success && locationItemsResult.data) {
        locationItemsResult.data.slice(2).forEach((row, index) => {
          const liftNo = String(row[3] || "").trim();
          const lookup = liftNo ? receivingAccMap.get(liftNo) : null;
          
          combinedData.push({
            id: `loc-${index}`,
            indentNo: row[2] || "",
            liftNo: liftNo,
            vendorName: lookup?.vendorName || "",
            itemName: row[5] || "",
            qty: row[6] || "",
            planned: formatTableDate(row[0]), // Timestamp of processing (DD-MM-YYYY)
            actual: formatTableDate(row[0]),  // Timestamp from col-A (DD-MM-YYYY)
            source: "LOCATION-ITEMS",
            rowIndex: index + 3,
            isPending: false,
            isHistory: true,
            recLocation: row[4] || "", // Keep for potential UI use
          });
        });
      }

      setPurchaseData(combinedData);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to fetch data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const [locations, setLocations] = useState([]);
  const fetchLocations = useCallback(async () => {
    try {
      const response = await fetch(`${SCRIPT_URL}?sheet=Dropdown&action=fetch`);
      const result = await response.json();
      if (result.success && result.data) {
        // column O is index 14
        const locs = result.data.slice(1).map(row => row[14]).filter(Boolean);
        setLocations([...new Set(locs)].sort());

        // Column E is index 4 for Stock Items
        const sItems = result.data.slice(1).map(row => row[4]).filter(Boolean);
        setStockItems([...new Set(sItems)].sort());
      }
    } catch (err) {
      console.error("Error fetching locations:", err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchLocations();
  }, [fetchData, fetchLocations]);

  const filteredData = useMemo(() => {
    let data = purchaseData.filter(item => 
      activeTab === "pending" ? item.isPending : item.isHistory
    );

    if (searchTerm) {
      data = data.filter(item => 
        Object.values(item).some(val => 
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    return data;
  }, [purchaseData, activeTab, searchTerm]);

  const [itemSearchTerm, setItemSearchTerm] = useState("");
  // Unique item names for search
  const uniqueItemNames = useMemo(() => {
    const names = purchaseData
      .filter(item => item.isPending)
      .map(item => item.itemName)
      .filter(Boolean);
    const sorted = [...new Set(names)].sort();
    
    if (itemSearchTerm) {
      return sorted.filter(name => 
        name.toLowerCase().includes(itemSearchTerm.toLowerCase())
      );
    }
    return sorted;
  }, [purchaseData, itemSearchTerm]);

  // Group items by name for easier lookup
  const uniqueItemsGrouped = useMemo(() => {
    const grouped = {};
    purchaseData.forEach(item => {
      if (item.isPending) {
        if (!grouped[item.itemName]) grouped[item.itemName] = [];
        grouped[item.itemName].push(item);
      }
    });
    return grouped;
  }, [purchaseData]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const [selectedRows, setSelectedRows] = useState({});
  const toggleRow = (id, checked) => {
    setSelectedRows(prev => ({
      ...prev,
      [id]: checked
    }));
  };

  const handleEditChange = (id, field, value) => {
    setModalEdits(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };
 
   const resetModal = () => {
     setShowSearchModal(false);
     setModalStep("status");
     setSelectedItemName("");
     setItemSearchTerm("");
     setSelectedRows({});
     setSelectedStatus("");
     setModalEdits({});
     setExtraRows([]);
     setStockTransferRows([{ id: Date.now(), fromLoc: "", item: "", qty: "", toLoc: "", itemTo: "", qtyTo: "" }]);
   };

  const handleAddRow = () => {
    if (!selectedItemName) return;
    const baseItems = uniqueItemsGrouped[selectedItemName] || [];
    if (baseItems.length === 0) return;
    
    // Use the first record as a template for metadata
    const template = baseItems[0];
    const newId = `${template.id}_split_${Date.now()}`;
    const newRow = {
      ...template,
      id: newId,
      isSplit: true,
      originalId: template.id
    };
    
    setExtraRows(prev => [...prev, newRow]);
    // Automatically select the new row
    setSelectedRows(prev => ({ ...prev, [newId]: true }));
  };

  const handleAddStockRow = () => {
    setStockTransferRows(prev => [
      ...prev,
      { id: Date.now(), fromLoc: "", item: "", qty: "", toLoc: "", itemTo: "", qtyTo: "" }
    ]);
  };

  const handleStockEdit = (id, field, value) => {
    setStockTransferRows(prev => prev.map(row => {
      if (row.id === id) {
        const updated = { ...row, [field]: value };
        // Auto-fill itemTo if item is changed
        if (field === "item") {
          updated.itemTo = value;
        }
        return updated;
      }
      return row;
    }));
  };

  const itemRecords = useMemo(() => {
    if (!selectedItemName) return [];
    const originals = uniqueItemsGrouped[selectedItemName] || [];
    const splits = extraRows.filter(r => r.itemName === selectedItemName);
    return [...originals, ...splits];
  }, [selectedItemName, uniqueItemsGrouped, extraRows]);

  const handleSubmitUpdate = async () => {
    const selectedIds = Object.keys(selectedRows).filter(id => selectedRows[id]);
    if (selectedIds.length === 0) {
      alert("Please select at least one record.");
      return;
    }
    
    // Basic validation for "Received" status
    if (selectedStatus === "Received") {
      const invalid = selectedIds.some(id => !modalEdits[id]?.receivedLocation || !modalEdits[id]?.qty);
      if (invalid) {
        alert("Please fill all required fields (Location and Quantity) for all selected items.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const results = [];
      const recordsToProcess = itemRecords.filter(r => selectedRows[r.id]);

      for (const record of recordsToProcess) {
        try {
          const timestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss");
          const edits = modalEdits[record.id] || {};
          
          // 1. Submit to LOCATION-ITEMS
          const submissionData = new URLSearchParams({
            action: "insert",
            sheetName: "LOCATION-ITEMS",
            rowData: JSON.stringify([
              timestamp,
              selectedStatus,
              record.indentNo,
              record.liftNo,
              edits.receivedLocation || "",
              record.itemName,
              edits.qty || ""
            ])
          });

          const subRes = await fetch(SCRIPT_URL, {
            method: "POST",
            body: submissionData,
          });
          const subResult = await subRes.json();
          if (!subResult.success) throw new Error(`Submission failed for ${record.liftNo}: ${subResult.error}`);

          // 2. Update source sheet
          const sourceUpdateData = [];
          // AE (30) for Partial QC, DI (112) for RECEIVING-ACCOUNTS
          sourceUpdateData[record.source === "Partial QC" ? 30 : 112] = timestamp;
          
          // AF (31) for Partial QC, DJ (113) for RECEIVING-ACCOUNTS
          // The user requested to NOT write to RECEIVING-ACCOUNTS col-DJ (113)
          if (record.source === "Partial QC") {
            sourceUpdateData[31] = "In-Stock"; 
          }

          const updateData = new URLSearchParams({
            action: "update",
            sheetName: record.source,
            rowIndex: record.rowIndex,
            rowData: JSON.stringify(sourceUpdateData)
          });

          const updateRes = await fetch(SCRIPT_URL, {
            method: "POST",
            body: updateData,
          });
          const updateResult = await updateRes.json();
          if (!updateResult.success) throw new Error(`Update failed for ${record.liftNo}: ${updateResult.error}`);
          
          results.push({ success: true });
        } catch (err) {
          results.push({ success: false, error: err.toString() });
        }
      }

      const allSuccessful = results.every(res => res.success);

      if (allSuccessful) {
        alert("Processed successfully and updated source records!");
        resetModal();
        fetchData();
      } else {
        const errors = results.filter(res => !res.success).map(res => res.error || "Unknown error").join(", ");
        alert("Failed to complete processing: " + errors);
      }
    } catch (err) {
      console.error("Error submitting update:", err);
      alert("An error occurred during submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitStockTransfer = async () => {
    // Basic validation
    const invalid = stockTransferRows.some(row => !row.fromLoc || !row.toLoc || !row.item || !row.qty);
    if (invalid) {
      alert("Please fill all fields for all rows.");
      return;
    }

    setIsSubmitting(true);
    try {
      const timestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss");
      const results = [];

      for (const row of stockTransferRows) {
        try {
          // 1. Submit to LOCATION-ITEMS
          const submissionData = new URLSearchParams({
            action: "insert",
            sheetName: "LOCATION-ITEMS",
            rowData: JSON.stringify([
              timestamp,              // A: Timestamp
              "Stock Transfer",       // B: Status (changed to space for consistency)
              "",                     // C: Indent Number
              "",                     // D: Lift No
              row.toLoc,              // E: Received Location (Destination)
              row.itemTo || row.item, // F: Received Item Name (Destination)
              row.qtyTo || row.qty,   // G: Received Qty (Destination)
              row.fromLoc,            // H: From Location (Source)
              row.item,               // I: From Item Name (Source)
              row.qty                 // J: From Qty (Source)
            ])
          });

          const subRes = await fetch(SCRIPT_URL, {
            method: "POST",
            body: submissionData,
          });
          const subResult = await subRes.json();
          if (!subResult.success) throw new Error(`Submission failed: ${subResult.error}`);
          results.push({ success: true });
        } catch (err) {
          results.push({ success: false, error: err.toString() });
        }
      }

      const allSuccessful = results.every(res => res.success);
      if (allSuccessful) {
        alert("Stock transfer processed successfully!");
        resetModal();
        fetchData();
      } else {
        alert("Some transfers failed. Please check the logs.");
      }
    } catch (err) {
      console.error("Error processing stock transfer:", err);
      alert("Failed to process stock transfer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-64px)] gap-4 overflow-hidden p-4">
        {/* Header Section */}
        <div className="flex-none flex flex-col gap-4 bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Purchase Location Update</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button size="sm" onClick={() => { setShowSearchModal(true); setModalStep("status"); }}>
                Form
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              className={`px-4 py-2 text-sm font-medium transition-all ${activeTab === "pending" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
              onClick={() => { setActiveTab("pending"); setCurrentPage(1); }}
            >
              Pending
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium transition-all ${activeTab === "history" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
              onClick={() => { setActiveTab("history"); setCurrentPage(1); }}
            >
              History
            </button>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-9 bg-gray-50/50 border-gray-200 focus:bg-white transition-all shadow-inner"
                placeholder="Search by Indent, Vendor, Item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Table Container - Flex-1 makes it fill the rest of the height */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex-1 overflow-auto relative">
            <table className="w-full text-sm text-left border-separate border-spacing-0">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50/95 backdrop-blur-md">
                  {columns.map(col => (
                    <th 
                      key={col.key} 
                      className="px-4 py-3 text-slate-600 uppercase text-[11px] font-bold border-b border-gray-100 shadow-[inset_0_-1px_0_rgba(0,0,0,0.05)]" 
                      style={{ minWidth: col.width }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                        <span className="text-sm font-medium">Loading data...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-500">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                      {columns.map(col => (
                        <td key={col.key} className="px-4 py-3 whitespace-nowrap text-gray-700">
                          {item[col.key] || "-"}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>

      {/* Multi-step Form Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  {modalStep === "status" && "Choose Processing Status"}
                  {modalStep === "search" && "Search & Select Item"}
                  {modalStep === "selection" && `Select Records for: ${selectedItemName}`}
                  {modalStep === "form" && "Fill Received Details"}
                </h2>
                <p className="text-xs text-gray-500">
                  {modalStep === "status" && "Select how these items are being processed"}
                  {modalStep === "search" && "Type the item name to find matching records"}
                  {modalStep === "selection" && "Choose one or more records to process"}
                  {modalStep === "form" && "Update location and quantity for each record"}
                </p>
              </div>
              {modalStep === "selection" || modalStep === "stockTransfer" ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={modalStep === "selection" ? handleAddRow : handleAddStockRow}
                  className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 font-medium"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={resetModal}>Close</Button>
              )}
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto min-h-[300px]">
              {modalStep === "status" && (
                <div className="p-8 flex flex-col items-center justify-center gap-6">
                  <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                    <div 
                      className={`p-6 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center gap-3 ${selectedStatus === "Received" ? "border-blue-500 bg-blue-50 shadow-md" : "border-gray-100 hover:border-blue-200 hover:bg-blue-50/30"}`}
                      onClick={() => {
                        setSelectedStatus("Received");
                        setModalStep("search");
                      }}
                    >
                      <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                        <Box className="h-6 w-6" />
                      </div>
                      <span className="font-semibold text-gray-700">Received</span>
                    </div>
                    <div 
                      className={`p-6 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center gap-3 ${selectedStatus === "Stock Transfer" ? "border-purple-500 bg-purple-50 shadow-md" : "border-gray-100 hover:border-purple-200 hover:bg-purple-50/30"}`}
                      onClick={() => {
                        setSelectedStatus("Stock Transfer");
                        setModalStep("stockTransfer");
                      }}
                    >
                      <div className="bg-purple-100 p-3 rounded-full text-purple-600">
                        <RefreshCw className="h-6 w-6" />
                      </div>
                      <span className="font-semibold text-gray-700">Stock Transfer</span>
                    </div>
                  </div>
                </div>
              )}
              {modalStep === "search" && (
                <div className="p-4 flex flex-col gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      className="pl-9"
                      placeholder="Type item name to search..."
                      value={itemSearchTerm}
                      onChange={(e) => setItemSearchTerm(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1">
                    {uniqueItemNames.length === 0 ? (
                      <p className="text-center py-10 text-gray-500">No items found.</p>
                    ) : (
                      uniqueItemNames.map(name => (
                        <div 
                          key={name} 
                          className="p-3 rounded-lg border border-gray-100 hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition-colors font-medium text-gray-700"
                          onClick={() => {
                            const records = uniqueItemsGrouped[name] || [];
                            setSelectedItemName(name);
                            setModalStep("selection");
                            setSelectedRows({}); 
                            
                            const initialEdits = {};
                            records.forEach(record => {
                              initialEdits[record.id] = {
                                receivedLocation: "",
                                qty: record.qty || ""
                              };
                            });
                            setModalEdits(initialEdits);
                          }}
                        >
                          {name}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {modalStep === "stockTransfer" && (
                <div className="p-4 flex flex-col h-full bg-slate-50/30">
                  <div className="flex-1 overflow-auto rounded-lg border border-gray-200 bg-white min-h-[400px]">
                    <table className="w-full border-collapse text-sm">
                      <thead className="sticky top-0 z-10 bg-slate-50 border-b border-gray-200">
                        <tr>
                          <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">From Location</th>
                          <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Item (Source)</th>
                          <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Qty</th>
                          <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">To Location</th>
                          <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Item (Dest)</th>
                           <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Qty</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {stockTransferRows.map((row) => (
                          <tr key={row.id}>
                            <td className="p-2 w-[16%]">
                              <select 
                                className="w-full h-9 text-xs border border-gray-200 rounded px-1 outline-none focus:border-blue-400"
                                value={row.fromLoc}
                                onChange={(e) => handleStockEdit(row.id, "fromLoc", e.target.value)}
                              >
                                <option value="">Select</option>
                                {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                              </select>
                            </td>
                            <td className="p-2 w-[22%]">
                              <input 
                                list={`stockItems-${row.id}`}
                                className="w-full h-9 text-xs border border-gray-200 rounded px-2 outline-none focus:border-blue-400"
                                placeholder="Type item..."
                                value={row.item}
                                onChange={(e) => handleStockEdit(row.id, "item", e.target.value)}
                              />
                              <datalist id={`stockItems-${row.id}`}>
                                {stockItems.map(it => <option key={it} value={it} />)}
                              </datalist>
                            </td>
                            <td className="p-2 w-[10%]">
                              <input 
                                type="number"
                                className="w-full h-9 text-xs border border-gray-200 rounded px-2 outline-none focus:border-blue-400 text-center"
                                value={row.qty}
                                onChange={(e) => handleStockEdit(row.id, "qty", e.target.value)}
                              />
                            </td>
                            <td className="p-2 w-[16%]">
                              <select 
                                className="w-full h-9 text-xs border border-gray-200 rounded px-1 outline-none focus:border-blue-400"
                                value={row.toLoc}
                                onChange={(e) => handleStockEdit(row.id, "toLoc", e.target.value)}
                              >
                                <option value="">Select</option>
                                {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                              </select>
                            </td>
                            <td className="p-2 w-[22%]">
                              <input 
                                className="w-full h-9 text-xs border border-gray-200 rounded px-2 outline-none focus:border-blue-400"
                                value={row.itemTo}
                                onChange={(e) => handleStockEdit(row.id, "itemTo", e.target.value)}
                              />
                            </td>
                            <td className="p-2 w-[10%]">
                              <input 
                                type="number"
                                className="w-full h-9 text-xs border border-gray-200 rounded px-2 outline-none focus:border-blue-400 text-center"
                                value={row.qtyTo || row.qty}
                                onChange={(e) => handleStockEdit(row.id, "qtyTo", e.target.value)}
                              />
                            </td>
                            <td className="p-2 text-center">
                              {stockTransferRows.length > 1 && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => setStockTransferRows(prev => prev.filter(r => r.id !== row.id))}
                                >
                                  <Plus className="h-4 w-4 rotate-45" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {modalStep === "selection" && (
                <div className="p-4">
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-gray-50 text-gray-700 uppercase font-semibold border-b">
                        <tr>
                          <th className="px-3 py-3 w-10 text-center">
                            <Checkbox 
                              checked={
                                itemRecords.length > 0 && 
                                itemRecords.every(item => selectedRows[item.id])
                              } 
                              onCheckedChange={(checked) => {
                                const nextSelected = {};
                                itemRecords.forEach(item => {
                                  nextSelected[item.id] = checked;
                                });
                                setSelectedRows(nextSelected);
                              }}
                            />
                          </th>
                          <th className="px-3 py-3 w-[15%]">Indent No</th>
                          <th className="px-3 py-3 w-[15%]">Lift No</th>
                          <th className="px-3 py-3 w-[30%]">Vendor</th>
                          <th className="px-3 py-3 w-[25%]">Rec. Location</th>
                          <th className="px-3 py-3 w-[15%]">Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {itemRecords.map((item) => (
                          <tr key={item.id} className={`${selectedRows[item.id] ? "bg-blue-50/50" : ""} hover:bg-gray-50/50 transition-colors`}>
                            <td className="px-3 py-3 text-center">
                              <Checkbox 
                                checked={!!selectedRows[item.id]} 
                                onCheckedChange={(checked) => toggleRow(item.id, checked)}
                              />
                            </td>
                            <td className="px-3 py-3 font-medium text-gray-900">{item.indentNo}</td>
                            <td className="px-3 py-3 text-gray-700">{item.liftNo}</td>
                            <td className="px-3 py-3">
                              <span className="font-medium text-gray-800">{item.vendorName || "-"}</span>
                            </td>
                            <td className="px-3 py-3">
                              <select 
                                className={`w-full border rounded px-2 py-1.5 text-xs outline-none shadow-sm transition-all ${selectedRows[item.id] ? "border-blue-300 bg-white focus:ring-2 focus:ring-blue-100" : "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"}`}
                                disabled={!selectedRows[item.id]}
                                value={modalEdits[item.id]?.receivedLocation || ""}
                                onChange={(e) => handleEditChange(item.id, "receivedLocation", e.target.value)}
                              >
                                <option value="">Select</option>
                                {locations.map(loc => (
                                  <option key={loc} value={loc}>{loc}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-3">
                              <Input 
                                type="number"
                                className={`h-9 px-2 text-xs shadow-sm transition-all ${selectedRows[item.id] ? "border-blue-300 bg-white focus:ring-2 focus:ring-blue-100" : "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"}`}
                                disabled={!selectedRows[item.id]}
                                value={modalEdits[item.id]?.qty || ""}
                                onChange={(e) => handleEditChange(item.id, "qty", e.target.value)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    if (modalStep === "search" || modalStep === "stockTransfer") setModalStep("status");
                    else if (modalStep === "selection") setModalStep("search");
                  }}
                  disabled={modalStep === "status"}
                >
                  Back
                </Button>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={resetModal}>Cancel</Button>
                  {(modalStep === "selection" || modalStep === "stockTransfer") && (
                    <Button size="sm" onClick={modalStep === "selection" ? handleSubmitUpdate : handleSubmitStockTransfer} disabled={isSubmitting}>
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing...
                        </div>
                      ) : "Submit Selection"}
                    </Button>
                  )}
                </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
