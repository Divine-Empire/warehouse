"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  RefreshCw,
  Search,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
} from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";

import { Settings } from "lucide-react";

// Add these new imports (if not already present)
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function PurchasePage() {
  const [purchaseData, setPurchaseData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(500);
  const [totalItems, setTotalItems] = useState(0);

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [vendorFilteredData, setVendorFilteredData] = useState([]);
  const [selectedRows, setSelectedRows] = useState({}); // {rowId: true/false}
  const [formData, setFormData] = useState({}); // {rowId: {supplierInvoiceNo: "", ...}}
  const [submitting, setSubmitting] = useState(false);

  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [vendorSearchTerm, setVendorSearchTerm] = useState("");

  const [statusFilter, setStatusFilter] = useState("all"); // "all", "completed", "pending"
  const [vendorFilter, setVendorFilter] = useState("all"); // "all" or vendor name

  const [activeTab, setActiveTab] = useState("pending");
  const [historyData, setHistoryData] = useState([]);
  const [editingRowId, setEditingRowId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);

  const [uploadLoading, setUploadLoading] = useState({
  lrDoc: false,
  invoiceDoc: false,
  weightSlip: false
});


  const SHEET_ID = "1NfkP1dX2TMlicvI5jqU7u47iW0VoBges576NqTd2b-A";
  const SHEET_NAME = "PO DATA";

  const [commonFormData, setCommonFormData] = useState({
    supplierInvoiceNo: "",
    supplierInvoiceDate: "",
    lrNo: "",
    lrDate: "",
    lrAmount: "",
    checklist: "",
    transportName: "",
    transportationCost: "",
    localConveyanceDispatch: "",
    localConveyanceDestination: "",
    lrDoc: "",
    invoiceDoc: "",
    weightSlip: "",
  });

  const columns = [
    { key: "timestamp", label: "Timestamp", width: "180px" },
    { key: "referenceNo", label: "Reference No.", width: "150px" },
    { key: "voucherNo", label: "Voucher No.", width: "150px" },
    { key: "vendorName", label: "VENDOR NAME", width: "200px" },
    { key: "gstUin", label: "GST/UIN", width: "180px" },
    { key: "stateName", label: "STATE NAME", width: "150px" },
    { key: "personName", label: "PERSON Name", width: "180px" },
    { key: "contactNo", label: "CONTACT NO.", width: "150px" },
    { key: "email", label: "EMAIL", width: "200px" },
    { key: "shipToName", label: "SHIP TO NAME", width: "200px" },
    { key: "shipToAddress", label: "ADDRESS", width: "250px" },
    { key: "shipToGstUin", label: "GST/UIN", width: "180px" },
    { key: "shipToStateName", label: "STATE NAME", width: "150px" },
    { key: "shipToPersonName", label: "PERSON NAME", width: "180px" },
    { key: "shipToContactNo", label: "CONTACT NUMBER", width: "150px" },
    { key: "shipToEmail", label: "EMAIL", width: "200px" },
    { key: "paymentMode", label: "Mode/Terms of Payment", width: "200px" },
    { key: "paymentDays", label: "Payment Days", width: "150px" },
    { key: "otherReferences", label: "Other References", width: "180px" },
    { key: "dispatchedThrough", label: "Dispatched through", width: "180px" },
    {
      key: "packagingForwarding",
      label: "packaging and forwarding",
      width: "200px",
    },
    { key: "freight", label: "Freight", width: "150px" },
    { key: "termsOfDelivery", label: "Terms of Delivery", width: "180px" },
    { key: "basicAmount", label: "BASIC AMOUNT", width: "150px" },
    { key: "roundOff1", label: "ROUND OFF", width: "150px" },
    { key: "roundOff2", label: "ROUND OFF", width: "150px" },
    { key: "poCopy", label: "PO COPY", width: "150px" },
    { key: "indentNo", label: "INDENT NO.", width: "150px" },
    {
      key: "descriptionOfGoods",
      label: "Description of Goods",
      width: "250px",
    },
    { key: "hsnSac", label: "HSN/SAC", width: "150px" },
    { key: "gstRate", label: "GST RATE", width: "120px" },
    { key: "deliveryDate", label: "Dly. Date", width: "150px" },
    { key: "quantity", label: "QTY", width: "120px" },
    { key: "unit", label: "UNIT", width: "120px" },
    { key: "rate", label: "RATE", width: "150px" },
    { key: "amount", label: "Amount(Rs.)", width: "150px" },
    { key: "paymentDaysDetail", label: "PAYMENT DAYS", width: "150px" },
    { key: "totalReceiving", label: "TOTAL RECEVING", width: "150px" },
    { key: "pendingQty", label: "Pending Qty", width: "150px" },
  ];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".relative")) {
        setShowVendorDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [visibleColumns, setVisibleColumns] = useState(
    columns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  );

  const toggleColumn = (columnKey) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };

  const showAllColumns = () => {
    setVisibleColumns(
      columns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
    );
  };

  const hideAllColumns = () => {
    setVisibleColumns(
      columns.reduce((acc, col) => ({ ...acc, [col.key]: false }), {})
    );
  };

  // Add this helper function before your component or inside it
  // Update the parseGoogleSheetsDate function
  const parseGoogleSheetsDate = (value) => {
    if (!value) return null;

    try {
      // Check if it's a Google Sheets date string like "Date(2025,0,2,17,34,15)"
      if (typeof value === "string" && value.startsWith("Date(")) {
        // Extract the numbers from the string
        const match = value.match(
          /Date\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/
        );

        if (match) {
          const [_, year, month, day, hours, minutes, seconds] = match;

          // Note: Google Sheets months are 0-indexed (0=January), so we need to add 1
          const date = new Date(
            parseInt(year),
            parseInt(month), // Already 0-indexed in JS
            parseInt(day),
            parseInt(hours),
            parseInt(minutes),
            parseInt(seconds)
          );

          return date;
        }
      }

      // Handle numeric Google Sheets date serial numbers
      if (typeof value === "number") {
        // Google Sheets date serial number (days since 1899-12-30)
        const date = new Date(Date.UTC(1899, 11, 30));
        date.setDate(date.getDate() + Math.floor(value));

        // Handle time portion if present (decimal part)
        const timeFraction = value - Math.floor(value);
        if (timeFraction > 0) {
          const millisecondsInDay = 24 * 60 * 60 * 1000;
          date.setTime(date.getTime() + timeFraction * millisecondsInDay);
        }

        return date;
      }

      // Handle regular date strings or Date objects
      return new Date(value);
    } catch (err) {
      console.error("Error parsing date:", err, "Value:", value);
      return null;
    }
  };

  const fetchPurchaseData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;
      const response = await fetch(sheetUrl);
      const text = await response.text();

      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}") + 1;
      const jsonData = text.substring(jsonStart, jsonEnd);

      const data = JSON.parse(jsonData);

      if (data && data.table && data.table.rows) {
        const items = [];

        data.table.rows.slice(1).forEach((row, index) => {
          if (row.c) {
            const item = {
              id: index + 1,
              timestamp: row.c[0]?.v ?? "",
              referenceNo: row.c[1]?.v ?? "",
              voucherNo: row.c[2]?.v ?? "",
              vendorName: row.c[3]?.v ?? "",
              gstUin: row.c[4]?.v ?? "",
              stateName: row.c[5]?.v ?? "",
              personName: row.c[6]?.v ?? "",
              contactNo: row.c[7]?.v ?? "",
              email: row.c[8]?.v ?? "",
              shipToName: row.c[9]?.v ?? "",
              shipToAddress: row.c[10]?.v ?? "",
              shipToGstUin: row.c[11]?.v ?? "",
              shipToStateName: row.c[12]?.v ?? "",
              shipToPersonName: row.c[13]?.v ?? "",
              shipToContactNo: row.c[14]?.v ?? "",
              shipToEmail: row.c[15]?.v ?? "",
              paymentMode: row.c[16]?.v ?? "",
              paymentDays: row.c[17]?.v ?? "",
              otherReferences: row.c[18]?.v ?? "",
              dispatchedThrough: row.c[19]?.v ?? "",
              packagingForwarding: row.c[20]?.v ?? "",
              freight: row.c[21]?.v ?? "",
              termsOfDelivery: row.c[22]?.v ?? "",
              basicAmount: row.c[23]?.v ?? "",
              roundOff1: row.c[24]?.v ?? "",
              roundOff2: row.c[25]?.v ?? "",
              poCopy: row.c[26]?.v ?? "",
              indentNo: row.c[28]?.v ?? "",
              descriptionOfGoods: row.c[29]?.v ?? "",
              hsnSac: row.c[30]?.v ?? "",
              gstRate: row.c[31]?.v ?? "",
              deliveryDate: row.c[32]?.v ?? "",
              quantity: row.c[33]?.v ?? "",
              unit: row.c[34]?.v ?? "",
              rate: row.c[35]?.v ?? "",
              amount: row.c[36]?.v ?? "",
              paymentDaysDetail: row.c[37]?.v ?? "",

              totalReceiving: row.c[39]?.v ?? "",
              pendingQty: row.c[40]?.v ?? "",
            };
            items.push(item);
          }
        });

        console.log(`Fetched ${items.length} records from sheet`);
        setPurchaseData(items);
        setTotalItems(items.length);
        setCurrentPage(1); // Reset to first page on new data
      }
    } catch (err) {
      console.error("Error fetching purchase data:", err);
      setError(err.message);
      setPurchaseData([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const formatTimestamp = (value) => {
    const date = parseGoogleSheetsDate(value);
    if (date) {
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      const seconds = date.getSeconds().toString().padStart(2, "0");
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    }
    return value || "-";
  };

  const fetchHistoryData = useCallback(async () => {
    setLoading(true);
    try {
      const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=warehouse_data`;
      const response = await fetch(sheetUrl);
      const text = await response.text();
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}") + 1;
      const jsonData = text.substring(jsonStart, jsonEnd);
      const data = JSON.parse(jsonData);

      if (data && data.table && data.table.rows) {
        const items = data.table.rows.map((row, index) => ({
          id: index + 1,
          timestamp: formatTimestamp(row.c[0]?.v) ?? "",
          vendorName: row.c[1]?.v ?? "",
          indentNo: row.c[2]?.v ?? "",
          poNo: row.c[3]?.v ?? "",
          serialNo: row.c[4]?.v ?? "",
          itemCategory: row.c[5]?.v ?? "",
          quantity: row.c[6]?.v ?? "",
          unit: row.c[7]?.v ?? "",
          price: row.c[8]?.v ?? "",
          qty: row.c[9]?.v ?? "",
          qcRequirement: row.c[10]?.v ?? "",
          supplierInvoiceNo: row.c[11]?.v ?? "",
          supplierInvoiceDate: row.c[12]?.v ?? "",
          lrNo: row.c[13]?.v ?? "",
          lrDate: row.c[14]?.v ?? "",
          lrAmount: row.c[15]?.v ?? "",
          checklist: row.c[16]?.v ?? "",
          transportName: row.c[17]?.v ?? "",
          transportationCost: row.c[18]?.v ?? "",
          localConveyanceDispatch: row.c[19]?.v ?? "",
          localConveyanceDestination: row.c[20]?.v ?? "",
          lrDoc: row.c[21]?.v ?? "",
          invoiceDoc: row.c[22]?.v ?? "",
          weightSlip: row.c[23]?.v ?? "",
        }));
        setHistoryData(items);
      }
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistoryData();
    } else {
      fetchPurchaseData();
    }
  }, [activeTab, fetchHistoryData, fetchPurchaseData]);

  // Handle Edit Click
  const handleEditClick = (row) => {
    setEditingRowId(row.id);

    // Create a copy of the row data, converting Google Sheets dates to proper format
    const formattedRow = { ...row };

    // Format date fields for editing
    const dateFields = ["supplierInvoiceDate", "lrDate"];
    dateFields.forEach((field) => {
      if (formattedRow[field]) {
        // Convert Google Sheets date to YYYY-MM-DD format for input[type="date"]
        if (formattedRow[field].startsWith("Date(")) {
          const match = formattedRow[field].match(/Date\((\d+),(\d+),(\d+)/);
          if (match) {
            const [_, year, month, day] = match;
            // Note: Input type="date" needs YYYY-MM-DD format
            // Months are 0-indexed in Google Sheets
            const formattedMonth = String(parseInt(month) + 1).padStart(2, "0");
            const formattedDay = String(parseInt(day)).padStart(2, "0");
            formattedRow[field] = `${year}-${formattedMonth}-${formattedDay}`;
          }
        } else {
          // Try to format existing date string
          const date = new Date(formattedRow[field]);
          if (!isNaN(date.getTime())) {
            formattedRow[field] = date.toISOString().split("T")[0];
          }
        }
      }
    });

    setEditFormData(formattedRow);
  };

  // Handle Edit Cancel
  const handleEditCancel = () => {
    setEditingRowId(null);
    setEditFormData({});
  };

  // Handle Edit File Upload
  const handleEditFileUpload = async (rowId, field, file) => {
    if (!file) return;

     setUploadLoading(prev => ({ ...prev, [field]: true }));

    try {
      const reader = new FileReader();
      reader.onload = async function (e) {
        const base64Data = e.target.result.split(",")[1];
        const requestData = {
          data: base64Data,
          mimeType: file.type,
          fileName: file.name,
        };

        let functionName = "";
        switch (field) {
          case "lrDoc":
            functionName = "handleFileUpload1";
            break;
          case "invoiceDoc":
            functionName = "handleFileUpload2";
            break;
          case "weightSlip":
            functionName = "handleFileUpload3";
            break;
        }

        const scriptUrl =
          "https://script.google.com/macros/s/AKfycbxIgim6Yed7RV_Vhv5Xne58B16VmXckW-IsBFjQ1Qmh3v6cf_nw-j3DQG-nVk2U7hA1/exec";

        const response = await fetch(scriptUrl, {
          method: "POST",
          body: JSON.stringify({
            function: functionName,
            data: requestData,
          }),
        });

        const result = await response.json();

        if (result.success && result.fileUrl) {
          // Make sure the field name matches exactly what's expected
          setEditFormData((prev) => ({
            ...prev,
            [field]: result.fileUrl, // This should be "weightSlip" for weight slip
          }));

          // Show success message
          alert(`${field} uploaded successfully!`);
        } else {
          throw new Error(result.error || "Upload failed");
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Upload error:", error);
      alert("File upload failed!");
    }finally {
    // Set loading to false after upload completes
    setUploadLoading(prev => ({ ...prev, [field]: false }));
  }
  };

  // Handle Edit Save
  const handleEditSave = async (rowId) => {
    try {
      const scriptUrl =
        "https://script.google.com/macros/s/AKfycbxIgim6Yed7RV_Vhv5Xne58B16VmXckW-IsBFjQ1Qmh3v6cf_nw-j3DQG-nVk2U7hA1/exec";

      // Find the original item to preserve its timestamp
      const originalItem = historyData.find((item) => item.id === rowId);

      // Prepare data with original timestamp and updated fields
      const updateData = {
        rowId: rowId,
        ...editFormData,
      };
      setSaveLoading(true);
      const response = await fetch(scriptUrl, {
        method: "POST",
        body: JSON.stringify({
          function: "updateWarehouseData",
          data: updateData,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert("Record updated successfully!");
        setEditingRowId(null);
        setEditFormData({});
        fetchHistoryData(); // Refresh data
      } else {
        throw new Error(result.error || "Update failed");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save changes: " + error.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    let filtered = purchaseData;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((item) => {
        const searchableFields = [
          item.referenceNo,
          item.voucherNo,
          item.vendorName,
          item.gstUin,
          item.personName,
          item.email,
          item.shipToName,
          item.indentNo,
          item.descriptionOfGoods,
          item.hsnSac,
          item.poCopy,
        ];

        return searchableFields.some(
          (field) =>
            field &&
            String(field).toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    // Apply status filter
    if (statusFilter === "completed") {
      filtered = filtered.filter((item) => Number(item.pendingQty) === 0);
    } else if (statusFilter === "pending") {
      filtered = filtered.filter((item) => Number(item.pendingQty) > 0);
    }

    // Apply vendor filter
    if (vendorFilter !== "all") {
      filtered = filtered.filter((item) => item.vendorName === vendorFilter);
    }

    return filtered;
  }, [purchaseData, searchTerm, statusFilter, vendorFilter]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredData.length / itemsPerPage);
  }, [filteredData.length, itemsPerPage]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, itemsPerPage]);

  const renderCellContent = (item, columnKey) => {
    const value = item[columnKey];

    switch (columnKey) {
      case "timestamp":
      case "deliveryDate":
        const date = parseGoogleSheetsDate(value);
        if (date) {
          // Format as dd/mm/yyyy hh:mm:ss
          const day = date.getDate().toString().padStart(2, "0");
          const month = (date.getMonth() + 1).toString().padStart(2, "0"); // +1 because months are 0-indexed
          const year = date.getFullYear();

          const hours = date.getHours().toString().padStart(2, "0");
          const minutes = date.getMinutes().toString().padStart(2, "0");
          const seconds = date.getSeconds().toString().padStart(2, "0");

          return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
        }
        return value || "-";

      case "basicAmount":
      case "roundOff1":
      case "roundOff2":
      case "rate":
      case "amount":
        return value ? `₹${Number(value).toLocaleString("en-IN")}` : "₹0";

      case "email":
      case "shipToEmail":
        return value ? (
          <a
            href={`mailto:${value}`}
            className="text-blue-600 hover:underline truncate block max-w-[180px]"
          >
            {value}
          </a>
        ) : (
          "-"
        );

      case "contactNo":
      case "shipToContactNo":
        return value ? (
          <a href={`tel:${value}`} className="text-blue-600 hover:underline">
            {value}
          </a>
        ) : (
          "-"
        );

      case "poCopy":
        // Check if it's a valid URL
        if (
          value &&
          (value.includes("http") || value.includes("drive.google.com"))
        ) {
          // Extract file ID from Google Drive URL if present
          let fileUrl = value;
          if (value.includes("drive.google.com/file/d/")) {
            const match = value.match(/\/d\/([^\/]+)/);
            if (match) {
              fileUrl = `https://drive.google.com/file/d/${match[1]}/view`;
            }
          }

          return (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors"
              title="View File"
            >
              <Eye className="h-3 w-3" />
              View File
            </a>
          );
        }
        return value || "-";

      case "pendingQty":
        return value > 0 ? (
          <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs rounded font-medium">
            {value}
          </span>
        ) : (
          <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
            Completed
          </span>
        );

      case "gstRate":
        return value ? (
          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
            {value}
          </span>
        ) : (
          "-"
        );

      default:
        return value || "-";
    }
  };

  const exportToCSV = () => {
    const headers = columns.map((col) => col.label);
    const csvRows = [
      headers.join(","),
      ...filteredData.map((row) =>
        columns
          .map((col) => {
            const value = row[col.key];
            const escaped = ("" + value).replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(",")
      ),
    ];

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `purchase-data-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let startPage = Math.max(currentPage - 2, 1);
      let endPage = Math.min(currentPage + 2, totalPages);

      if (currentPage <= 3) {
        endPage = maxVisiblePages;
      } else if (currentPage >= totalPages - 2) {
        startPage = totalPages - maxVisiblePages + 1;
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }

    return pages.map((page) => (
      <button
        key={page}
        onClick={() => handlePageChange(page)}
        className={`px-3 py-1 border rounded-lg text-sm ${
          currentPage === page
            ? "bg-violet-600 text-white border-violet-600"
            : "hover:bg-gray-100"
        }`}
      >
        {page}
      </button>
    ));
  };

  const handleCommonFormChange = (field, value) => {
    setCommonFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCommonFileUpload = async (field, file) => {
    if (!file) return;

    try {
      const reader = new FileReader();

      reader.onload = async function (e) {
        const base64Data = e.target.result.split(",")[1];

        const requestData = {
          data: base64Data,
          mimeType: file.type,
          fileName: file.name,
        };

        let functionName = "";
        switch (field) {
          case "lrDoc":
            functionName = "handleFileUpload1";
            break;
          case "invoiceDoc":
            functionName = "handleFileUpload2";
            break;
          case "weightSlip":
            functionName = "handleFileUpload3";
            break;
        }

        const scriptUrl =
          "https://script.google.com/macros/s/AKfycbxIgim6Yed7RV_Vhv5Xne58B16VmXckW-IsBFjQ1Qmh3v6cf_nw-j3DQG-nVk2U7hA1/exec";

        try {
          const response = await fetch(scriptUrl, {
            method: "POST",
            body: JSON.stringify({
              function: functionName,
              data: requestData,
            }),
          });

          const result = await response.json();

          if (result.success && result.fileUrl) {
            // Store in commonFormData instead of formData
            setCommonFormData((prev) => ({
              ...prev,
              [field]: result.fileUrl,
            }));
          } else {
            throw new Error(result.error || "Upload failed");
          }
        } catch (fetchError) {
          console.error("Fetch error:", fetchError);
          alert("File upload failed: " + fetchError.message);
        }
      };

      reader.onerror = function () {
        alert("Failed to read file!");
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Upload error:", error);
      alert("File upload failed!");
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-violet-600" />
            <span className="ml-2 text-gray-700">
              Loading purchase data... ({purchaseData.length} records loaded)
            </span>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-md mx-auto text-center mt-20">
            <h1 className="text-2xl font-bold text-red-600 mb-2">
              Error Loading Data
            </h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchPurchaseData}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 flex items-center justify-center mx-auto"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Get unique vendors
  const getUniqueVendors = () => {
    const vendors = [...new Set(purchaseData.map((item) => item.vendorName))];
    return vendors.filter((v) => v).sort();
  };

  // Filter data by vendor with pending qty > 0
  const handleVendorSelect = (vendor) => {
    setSelectedVendor(vendor);
    const filtered = purchaseData.filter(
      (item) => item.vendorName === vendor && Number(item.pendingQty) > 0
    );
    setVendorFilteredData(filtered);
    setSelectedRows({});
    setFormData({});
    // Common form data ko reset mat karo - optional
    // setCommonFormData({...}); // Agar chahte ho ki form reset ho
  };

  // Handle checkbox selection
  const handleRowSelect = (rowId) => {
    setSelectedRows((prev) => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  };

  // Handle form input changes
  const handleFormChange = (rowId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [rowId]: {
        ...(prev[rowId] || {}),
        [field]: value,
      },
    }));
  };

  // Handle file upload
  const handleFileUpload = async (rowId, field, file) => {
    if (!file) return;

    try {
      const reader = new FileReader();

      reader.onload = async function (e) {
        const base64Data = e.target.result.split(",")[1];

        const requestData = {
          data: base64Data,
          mimeType: file.type,
          fileName: file.name,
        };

        // Determine which function to call
        let functionName = "";
        switch (field) {
          case "lrDoc":
            functionName = "handleFileUpload1";
            break;
          case "invoiceDoc":
            functionName = "handleFileUpload2";
            break;
          case "weightSlip":
            functionName = "handleFileUpload3";
            break;
        }

        const scriptUrl =
          "https://script.google.com/macros/s/AKfycbxIgim6Yed7RV_Vhv5Xne58B16VmXckW-IsBFjQ1Qmh3v6cf_nw-j3DQG-nVk2U7hA1/exec";

        try {
          const response = await fetch(scriptUrl, {
            method: "POST",
            body: JSON.stringify({
              function: functionName,
              data: requestData,
            }),
          });

          const result = await response.json();

          if (result.success && result.fileUrl) {
            // Store Google Drive URL in form data
            handleFormChange(rowId, field, result.fileUrl);
          } else {
            throw new Error(result.error || "Upload failed");
          }
        } catch (fetchError) {
          console.error("Fetch error:", fetchError);
          alert("File upload failed: " + fetchError.message);
        }
      };

      reader.onerror = function () {
        alert("Failed to read file!");
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Upload error:", error);
      alert("File upload failed!");
    }
  };

  const handleSubmit = async () => {
    const selectedIds = Object.keys(selectedRows).filter(
      (id) => selectedRows[id]
    );

    // Validation for common fields
    if (
      !commonFormData.supplierInvoiceNo ||
      !commonFormData.supplierInvoiceDate
    ) {
      alert("Please fill Supplier Invoice No and Date!");
      return;
    }

    if (!commonFormData.checklist) {
      alert("Please fill Checklist!");
      return;
    }

    if (
      !commonFormData.transportName ||
      !commonFormData.transportationCost ||
      !commonFormData.localConveyanceDispatch ||
      !commonFormData.localConveyanceDestination
    ) {
      alert("Please fill all Transport and Local Conveyance details!");
      return;
    }

    // Validation for row-specific fields
    const invalidRows = selectedIds.filter((id) => {
      const form = formData[id] || {};
      return !form.qty || !form.qcRequirement;
    });

    if (invalidRows.length > 0) {
      alert("Please fill Quantity and QC Requirement for all selected rows!");
      return;
    }

    setSubmitting(true);

    const timestamp = new Date()
      .toISOString()
      .replace("T", " ")
      .substring(0, 19);

    const dataToSubmit = selectedIds.map((id) => {
      const row = vendorFilteredData.find((item) => item.id == id);
      const form = formData[id] || {};

      return {
        timestamp: timestamp,
        vendorName: row.vendorName,
        indentNo: row.indentNo,
        poNo: row.referenceNo, // or voucherNo - jo PO No. ho
        serialNo: row.id, // or koi specific serial number field
        itemCategory: row.descriptionOfGoods,
        unit: row.unit,
        price: row.rate,

        // Row-specific fields
        qty: form.qty,
        qcRequirement: form.qcRequirement,

        // Common fields (same for all rows)
        supplierInvoiceNo: commonFormData.supplierInvoiceNo,
        supplierInvoiceDate: commonFormData.supplierInvoiceDate,
        lrNo: commonFormData.lrNo,
        lrDate: commonFormData.lrDate,
        lrAmount: commonFormData.lrAmount,
        checklist: commonFormData.checklist,
        transportName: commonFormData.transportName,
        transportationCost: commonFormData.transportationCost,
        localConveyanceDispatch: commonFormData.localConveyanceDispatch,
        localConveyanceDestination: commonFormData.localConveyanceDestination,
        lrDoc: commonFormData.lrDoc,
        invoiceDoc: commonFormData.invoiceDoc,
        weightSlip: commonFormData.weightSlip,
      };
    });

    try {
      // Google Sheets append
      const scriptUrl =
        "https://script.google.com/macros/s/AKfycbxIgim6Yed7RV_Vhv5Xne58B16VmXckW-IsBFjQ1Qmh3v6cf_nw-j3DQG-nVk2U7hA1/exec";

      const response = await fetch(scriptUrl, {
        method: "POST",
        body: JSON.stringify({
          function: "appendToWarehouseData",
          data: dataToSubmit,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`Successfully submitted ${selectedIds.length} records!`);
        setShowSubmitModal(false);
        setSelectedVendor("");
        setVendorFilteredData([]);
        setSelectedRows({});
        setFormData({});
        fetchPurchaseData(); // Refresh main data
      } else {
        throw new Error(result.error || "Unknown error");
      }
    } catch (error) {
      console.error("Submit error:", error);
      alert("Failed to submit data: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const paginatedDataa = paginatedData.filter((item) => item.pendingQty > 0);

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "";

    // Handle Google Sheets date format like "Date(2025,11,25)"
    if (dateString.startsWith("Date(")) {
      const match = dateString.match(/Date\((\d+),(\d+),(\d+)/);
      if (match) {
        const [_, year, month, day] = match;
        // Months are 0-indexed in Google Sheets, so add 1
        const formattedMonth = String(parseInt(month) + 1).padStart(2, "0");
        const formattedDay = String(parseInt(day)).padStart(2, "0");
        return `${formattedDay}/${formattedMonth}/${year}`;
      }
    }

    // Try to parse as regular date
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }

    return dateString; // Return original if can't parse
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 sm:p-6">
        <div className="space-y-6">
          <div className="flex justify-between items-center flex-wrap">
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                Purchase Management
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Track and manage all purchase orders and transactions
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitModal(true)}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 flex items-center"
              >
                Form
              </button>

              <button
                onClick={fetchPurchaseData}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by Reference No, Vendor, Description, GST, etc..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Reset to first page on search
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div className="flex gap-3">
              {/* Vendor Filter */}
              <select
                value={vendorFilter}
                onChange={(e) => {
                  setVendorFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white w-[250px]"
              >
                <option value="all">All Vendors</option>
                {getUniqueVendors().map((vendor) => (
                  <option key={vendor} value={vendor}>
                    {vendor}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow mb-6">
            <div className="border-b">
              <div className="flex justify-around sm:justify-normal">
                <button
                  onClick={() => setActiveTab("pending")}
                  className={`px-6 py-3 font-medium ${
                    activeTab === "pending"
                      ? "border-b-2 border-violet-600 text-violet-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`px-6 py-3 font-medium ${
                    activeTab === "history"
                      ? "border-b-2 border-violet-600 text-violet-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  History
                </button>
              </div>
            </div>
          </div>

          {activeTab === "pending" && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold">Purchase Orders</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Detailed view of all purchase transactions
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="hidden  px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 sm:flex items-center">
                          <Settings className="h-4 w-4 mr-2" />
                          Column Visibility
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto">
                        <DropdownMenuLabel>Show/Hide Columns</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <div className="flex gap-2 p-2">
                          <button
                            onClick={showAllColumns}
                            className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
                          >
                            Show All
                          </button>
                          <button
                            onClick={hideAllColumns}
                            className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
                          >
                            Hide All
                          </button>
                        </div>
                        <DropdownMenuSeparator />
                        <div className="p-2 space-y-2">
                          {columns.map((column) => (
                            <div
                              key={column.key}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`purchase-${column.key}`}
                                checked={visibleColumns[column.key]}
                                onCheckedChange={() => toggleColumn(column.key)}
                              />
                              <Label
                                htmlFor={`purchase-${column.key}`}
                                className="text-sm"
                              >
                                {column.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>

              <div className="hidden sm:block p-6">
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <div className="min-w-max">
                      <table className="w-full">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            {columns
                              .filter((col) => visibleColumns[col.key])
                              .map((column) => (
                                <th
                                  key={column.key}
                                  className="bg-gray-50 font-semibold text-gray-900 border-b-2 border-gray-200 px-4 py-3 text-left whitespace-nowrap text-sm"
                                  style={{ width: column.width || "auto" }}
                                >
                                  {column.label}
                                </th>
                              ))}
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedDataa.map((item) => (
                            <tr
                              key={item.id}
                              className="hover:bg-gray-50 border-b even:bg-gray-50/50"
                            >
                              {columns
                                .filter((col) => visibleColumns[col.key])
                                .map((column) => (
                                  <td
                                    key={column.key}
                                    className="px-4 py-3 align-top whitespace-nowrap text-sm border-r"
                                    style={{ width: column.width || "auto" }}
                                  >
                                    {renderCellContent(item, column.key)}
                                  </td>
                                ))}
                            </tr>
                          ))}
                          {paginatedDataa.length === 0 && (
                            <tr>
                              <td
                                colSpan={columns.length}
                                className="text-center text-gray-500 py-16"
                              >
                                {searchTerm
                                  ? "No purchase records match your search criteria"
                                  : "No purchase records found"}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="block sm:hidden">
                {paginatedDataa.length > 0 ? (
                  <div className="space-y-4">
                    {paginatedDataa.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white border rounded-lg shadow-sm overflow-hidden"
                      >
                        {/* Card Header */}
                        <div className="bg-violet-50 px-4 py-3 border-b">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {item.vendorName || "N/A"}
                              </h3>
                              <p className="text-xs text-gray-600 mt-1">
                                Ref: {item.referenceNo || "N/A"}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-1 text-xs rounded ${
                                item.pendingQty > 0
                                  ? "bg-red-100 text-red-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {item.pendingQty > 0
                                ? `Pending: ${item.pendingQty}`
                                : "Completed"}
                            </span>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-4 space-y-3">
                          {/* Voucher Info */}
                          <div className="gap-1 text-sm flex flex-col">
                            <div>
                              <p className="font-medium">
                                <span className="text-gray-500 text-xs">
                                  Voucher No:
                                </span>{" "}
                                {item.voucherNo || "-"}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium text-xs">
                                <span className="text-gray-500 text-xs">
                                  GST/UIN:
                                </span>{" "}
                                {item.gstUin || "-"}
                              </p>
                            </div>
                          </div>

                          {/* Contact Info */}
                          <div className="border-t pt-3">
                            <span className="text-gray-500 text-xs">
                              Contact:
                            </span>
                            <div className="mt-1 space-y-1">
                              <p className="text-sm">
                                {item.personName || "-"}
                              </p>
                              {item.contactNo && (
                                <a
                                  href={`tel:${item.contactNo}`}
                                  className="text-blue-600 text-sm"
                                >
                                  {item.contactNo}
                                </a>
                              )}
                              {item.email && (
                                <a
                                  href={`mailto:${item.email}`}
                                  className="text-blue-600 text-xs block truncate"
                                >
                                  {item.email}
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Product Details */}
                          <div className="border-t pt-3">
                            <span className="text-gray-500 text-xs">
                              Description:
                            </span>
                            <p className="text-sm mt-1">
                              {item.descriptionOfGoods || "-"}
                            </p>
                            <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                              <div>
                                <span className="text-gray-500 text-xs">
                                  Qty:
                                </span>
                                <p className="font-medium">
                                  {item.quantity || "-"}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-500 text-xs">
                                  Unit:
                                </span>
                                <p className="font-medium">
                                  {item.unit || "-"}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-500 text-xs">
                                  Rate:
                                </span>
                                <p className="font-medium">
                                  {item.rate
                                    ? `₹${Number(item.rate).toLocaleString(
                                        "en-IN"
                                      )}`
                                    : "-"}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Amount */}
                          <div className="border-t pt-3 flex justify-between items-center">
                            <span className="text-gray-500 text-xs">
                              Total Amount:
                            </span>
                            <span className="text-lg font-bold text-violet-600">
                              {item.amount
                                ? `₹${Number(item.amount).toLocaleString(
                                    "en-IN"
                                  )}`
                                : "₹0"}
                            </span>
                          </div>

                          {/* PO Copy */}
                          {item.poCopy &&
                            (item.poCopy.includes("http") ||
                              item.poCopy.includes("drive.google.com")) && (
                              <div className="border-t pt-3">
                                <a
                                  href={item.poCopy}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 text-sm rounded-lg w-full justify-center"
                                >
                                  <Eye className="h-4 w-4" />
                                  View PO Copy
                                </a>
                              </div>
                            )}

                          {/* Delivery Date */}
                          {item.deliveryDate && (
                            <div className="text-xs text-gray-500 text-center pt-2 border-t">
                              Delivery:{" "}
                              {renderCellContent(item, "deliveryDate")}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-16">
                    {searchTerm
                      ? "No purchase records match your search criteria"
                      : "No purchase records found"}
                  </div>
                )}
              </div>

              {filteredData.length > 0 && (
                <div className="px-6 py-4 border-t bg-gray-50">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-gray-600">
                      Showing{" "}
                      <span className="font-medium">
                        {Math.min(
                          (currentPage - 1) * itemsPerPage + 1,
                          filteredData.length
                        )}
                      </span>{" "}
                      to{" "}
                      <span className="font-medium">
                        {Math.min(
                          currentPage * itemsPerPage,
                          filteredData.length
                        )}
                      </span>{" "}
                      of{" "}
                      <span className="font-medium">{filteredData.length}</span>{" "}
                      records
                      <span className="ml-2">
                        (Page {currentPage} of {totalPages})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1}
                        className="p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                        title="First Page"
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                        title="Previous Page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>

                      <div className="flex gap-1 mx-2">
                        {renderPageNumbers()}
                      </div>

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                        title="Next Page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handlePageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        className="p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                        title="Last Page"
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Total Amount:</span> ₹
                      {filteredData
                        .reduce(
                          (sum, item) => sum + (Number(item.amount) || 0),
                          0
                        )
                        .toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold">Warehouse History</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      View and edit warehouse data records
                    </p>
                  </div>
                  <button
                    onClick={fetchHistoryData}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 flex items-center"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </button>
                </div>
              </div>

              {/* Desktop View */}
              <div className="hidden sm:block p-6">
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="border p-2 min-w-[100px]">Action</th>
                          <th className="border p-2 min-w-[180px]">
                            Time Stamp
                          </th>
                          <th className="border p-2 min-w-[200px]">
                            Vendor Name
                          </th>
                          <th className="border p-2 min-w-[150px]">
                            Indent No.
                          </th>
                          <th className="border p-2 min-w-[150px]">PO No</th>
                          <th className="border p-2 min-w-[120px]">
                            Serial No
                          </th>
                          <th className="border p-2 min-w-[250px]">
                            Item Category
                          </th>
                          <th className="border p-2 min-w-[120px]">Quantity</th>
                          <th className="border p-2 min-w-[100px]">Unit</th>
                          <th className="border p-2 min-w-[150px]">Price</th>
                          <th className="border p-2 min-w-[120px]">QTY</th>
                          <th className="border p-2 min-w-[180px]">
                            QC Requirement
                          </th>
                          <th className="border p-2 min-w-[180px]">
                            Supplier Invoice No.
                          </th>
                          <th className="border p-2 min-w-[180px]">
                            Supplier Invoice Date
                          </th>
                          <th className="border p-2 min-w-[150px]">LR No.</th>
                          <th className="border p-2 min-w-[150px]">LR Date</th>
                          <th className="border p-2 min-w-[150px]">
                            LR Amount
                          </th>
                          <th className="border p-2 min-w-[250px]">
                            Checklist
                          </th>
                          <th className="border p-2 min-w-[180px]">
                            Transport Name
                          </th>
                          <th className="border p-2 min-w-[180px]">
                            Transportation Cost
                          </th>
                          <th className="border p-2 min-w-[200px]">
                            Local Conveyance (Dispatch)
                          </th>
                          <th className="border p-2 min-w-[200px]">
                            Local Conveyance at Destination
                          </th>
                          <th className="border p-2 min-w-[150px]">LR Doc</th>
                          <th className="border p-2 min-w-[150px]">
                            Invoice Doc
                          </th>
                          <th className="border p-2 min-w-[150px]">
                            Weight Slip
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyData.map((item) => {
                          const isEditing = editingRowId === item.id;
                          const rowData = isEditing ? editFormData : item;

                          return (
                            <tr
                              key={item.id}
                              className="hover:bg-gray-50 border-b"
                            >
                              {/* Action Column */}
                              <td className="border p-2 text-center">
                                {isEditing ? (
                                  <div className="flex gap-2 justify-center">
                                    <button
                                      onClick={() => handleEditSave(item.id)}
                                      disabled={uploadLoading.lrDoc || uploadLoading.invoiceDoc || uploadLoading.weightSlip || saveLoading}

                                      className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    >
                                      {saveLoading ? "Saving..." : "Save"}
                                    </button>
                                    <button
                                      onClick={handleEditCancel}
                                      className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleEditClick(item)}
                                    className="px-3 py-1 bg-violet-600 text-white text-xs rounded hover:bg-violet-700"
                                  >
                                    Edit
                                  </button>
                                )}
                              </td>

                              {/* Timestamp */}
                              <td className="border p-2">
                                {rowData.timestamp || "-"}
                              </td>

                              {/* Vendor Name */}
                              <td className="border p-2">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={rowData.vendorName}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        vendorName: e.target.value,
                                      })
                                    }
                                    className="w-full p-1 border rounded"
                                  />
                                ) : (
                                  rowData.vendorName || "-"
                                )}
                              </td>

                              {/* Indent No */}
                              <td className="border p-2">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={rowData.indentNo}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        indentNo: e.target.value,
                                      })
                                    }
                                    className="w-full p-1 border rounded"
                                  />
                                ) : (
                                  rowData.indentNo || "-"
                                )}
                              </td>

                              {/* PO No */}
                              <td className="border p-2">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={rowData.poNo}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        poNo: e.target.value,
                                      })
                                    }
                                    className="w-full p-1 border rounded"
                                  />
                                ) : (
                                  rowData.poNo || "-"
                                )}
                              </td>

                              {/* Serial No */}
                              <td className="border p-2">
                                {rowData.serialNo || "-"}
                              </td>

                              {/* Item Category */}
                              <td className="border p-2">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={rowData.itemCategory}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        itemCategory: e.target.value,
                                      })
                                    }
                                    className="w-full p-1 border rounded"
                                  />
                                ) : (
                                  rowData.itemCategory || "-"
                                )}
                              </td>

                              {/* Quantity */}
                              <td className="border p-2">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={rowData.quantity}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        quantity: e.target.value,
                                      })
                                    }
                                    className="w-full p-1 border rounded"
                                  />
                                ) : (
                                  rowData.quantity || "-"
                                )}
                              </td>

                              {/* Unit */}
                              <td className="border p-2">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={rowData.unit}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        unit: e.target.value,
                                      })
                                    }
                                    className="w-full p-1 border rounded"
                                  />
                                ) : (
                                  rowData.unit || "-"
                                )}
                              </td>

                              {/* Price */}
                              <td className="border p-2">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={rowData.price}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        price: e.target.value,
                                      })
                                    }
                                    className="w-full p-1 border rounded"
                                  />
                                ) : rowData.price ? (
                                  `₹${Number(rowData.price).toLocaleString(
                                    "en-IN"
                                  )}`
                                ) : (
                                  "-"
                                )}
                              </td>

                              {/* QTY */}
                              <td className="border p-2">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={rowData.qty}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        qty: e.target.value,
                                      })
                                    }
                                    className="w-full p-1 border rounded"
                                  />
                                ) : (
                                  rowData.qty || "-"
                                )}
                              </td>

                              {/* QC Requirement */}
                              <td className="border p-2">
                                {isEditing ? (
                                  <select
                                    value={rowData.qcRequirement}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        qcRequirement: e.target.value,
                                      })
                                    }
                                    className="w-full p-1 border rounded"
                                  >
                                    <option value="">Select</option>
                                    <option value="Yes">Yes</option>
                                    <option value="No">No</option>
                                  </select>
                                ) : (
                                  rowData.qcRequirement || "-"
                                )}
                              </td>

                              {/* Supplier Invoice No */}
                              <td className="border p-2">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={rowData.supplierInvoiceNo}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        supplierInvoiceNo: e.target.value,
                                      })
                                    }
                                    className="w-full p-1 border rounded"
                                  />
                                ) : (
                                  rowData.supplierInvoiceNo || "-"
                                )}
                              </td>

                              {/* Supplier Invoice Date */}
                              <td className="border p-2">
                                {isEditing ? (
                                  <input
                                    type="date"
                                    value={rowData.supplierInvoiceDate}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        supplierInvoiceDate: e.target.value,
                                      })
                                    }
                                    className="w-full p-1 border rounded"
                                  />
                                ) : (
                                  formatDateForDisplay(
                                    rowData.supplierInvoiceDate
                                  ) || "-"
                                )}
                              </td>

                              {/* LR No */}
                              <td className="border p-2">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={rowData.lrNo}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        lrNo: e.target.value,
                                      })
                                    }
                                    className="w-full p-1 border rounded"
                                  />
                                ) : (
                                  rowData.lrNo || "-"
                                )}
                              </td>

                              {/* LR Date */}
                              <td className="border p-2">
                                {isEditing ? (
                                  <input
                                    type="date"
                                    value={rowData.lrDate}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        lrDate: e.target.value,
                                      })
                                    }
                                    className="w-full p-1 border rounded"
                                  />
                                ) : (
                                  formatDateForDisplay(rowData.lrDate) || "-"
                                )}
                              </td>

                              {/* LR Amount */}
                              <td className="border p-2">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={rowData.lrAmount}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        lrAmount: e.target.value,
                                      })
                                    }
                                    className="w-full p-1 border rounded"
                                  />
                                ) : (
                                  rowData.lrAmount || "-"
                                )}
                              </td>

                              {/* Checklist */}
                              <td className="border p-2">
                                {isEditing ? (
                                  <textarea
                                    value={rowData.checklist}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        checklist: e.target.value,
                                      })
                                    }
                                    className="w-full p-1 border rounded"
                                    rows="2"
                                  />
                                ) : (
                                  <div
                                    className="max-w-[250px] truncate"
                                    title={rowData.checklist}
                                  >
                                    {rowData.checklist || "-"}
                                  </div>
                                )}
                              </td>

                              {/* Transport Name */}
                              <td className="border p-2">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={rowData.transportName}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        transportName: e.target.value,
                                      })
                                    }
                                    className="w-full p-1 border rounded"
                                  />
                                ) : (
                                  rowData.transportName || "-"
                                )}
                              </td>

                              {/* Transportation Cost */}
                              <td className="border p-2">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={rowData.transportationCost}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        transportationCost: e.target.value,
                                      })
                                    }
                                    className="w-full p-1 border rounded"
                                  />
                                ) : (
                                  rowData.transportationCost || "-"
                                )}
                              </td>

                              {/* Local Conveyance Dispatch */}
                              <td className="border p-2">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={rowData.localConveyanceDispatch}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        localConveyanceDispatch: e.target.value,
                                      })
                                    }
                                    className="w-full p-1 border rounded"
                                  />
                                ) : (
                                  rowData.localConveyanceDispatch || "-"
                                )}
                              </td>

                              {/* Local Conveyance Destination */}
                              <td className="border p-2">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={rowData.localConveyanceDestination}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        localConveyanceDestination:
                                          e.target.value,
                                      })
                                    }
                                    className="w-full p-1 border rounded"
                                  />
                                ) : (
                                  rowData.localConveyanceDestination || "-"
                                )}
                              </td>

                              {/* LR Doc */}
                              <td className="border p-2">
                                {isEditing ? (
                                  <div>
                                    <input
                                      type="file"
                                      onChange={(e) =>
                                        handleEditFileUpload(
                                          item.id,
                                          "lrDoc",
                                          e.target.files[0]
                                        )
                                      }
                                      className="w-full text-xs"
                                      accept=".pdf,.jpg,.jpeg,.png"
                                    />
                                    {rowData.lrDoc && (
                                      <a
                                        href={rowData.lrDoc}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600"
                                      >
                                        Current File
                                      </a>
                                    )}
                                  </div>
                                ) : rowData.lrDoc ? (
                                  <a
                                    href={rowData.lrDoc}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline flex items-center gap-1"
                                  >
                                    <Eye className="h-3 w-3" />
                                    View
                                  </a>
                                ) : (
                                  "-"
                                )}
                              </td>

                              {/* Invoice Doc */}
                              <td className="border p-2">
                                {isEditing ? (
                                  <div>
                                    <input
                                      type="file"
                                      onChange={(e) =>
                                        handleEditFileUpload(
                                          item.id,
                                          "invoiceDoc",
                                          e.target.files[0]
                                        )
                                      }
                                      className="w-full text-xs"
                                      accept=".pdf,.jpg,.jpeg,.png"
                                    />
                                    {rowData.invoiceDoc && (
                                      <a
                                        href={rowData.invoiceDoc}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600"
                                      >
                                        Current File
                                      </a>
                                    )}
                                  </div>
                                ) : rowData.invoiceDoc ? (
                                  <a
                                    href={rowData.invoiceDoc}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline flex items-center gap-1"
                                  >
                                    <Eye className="h-3 w-3" />
                                    View
                                  </a>
                                ) : (
                                  "-"
                                )}
                              </td>

                              {/* Weight Slip */}
                              <td className="border p-2">
                                {isEditing ? (
                                  <div>
                                    <input
                                      type="file"
                                      onChange={(e) =>
                                        handleEditFileUpload(
                                          item.id,
                                          "weightSlip",
                                          e.target.files[0]
                                        )
                                      }
                                      className="w-full text-xs"
                                      accept=".pdf,.jpg,.jpeg,.png"
                                    />
                                    {
                                      uploadLoading.weightSlip && <p className="text-xs text-gray-500">Uploading...</p>
                                    }
                                    {rowData.weightSlip && (
                                      <a
                                        href={rowData.weightSlip}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600"
                                      >
                                        Current File
                                      </a>
                                    )}
                                  </div>
                                ) : rowData.weightSlip ? (
                                  <a
                                    href={rowData.weightSlip}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline flex items-center gap-1"
                                  >
                                    <Eye className="h-3 w-3" />
                                    View
                                  </a>
                                ) : (
                                  "-"
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {historyData.length === 0 && (
                          <tr>
                            <td
                              colSpan="25"
                              className="text-center text-gray-500 py-16"
                            >
                              No history records found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Mobile View */}
              <div className="block sm:hidden p-4">
                <div className="space-y-4">
                  {historyData.map((item) => {
                    const isEditing = editingRowId === item.id;
                    const rowData = isEditing ? editFormData : item;

                    return (
                      <div
                        key={item.id}
                        className="bg-white border rounded-lg shadow-sm overflow-hidden"
                      >
                        {/* Card Header */}
                        <div className="bg-violet-50 px-4 py-3 border-b flex justify-between items-center">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {rowData.vendorName || "N/A"}
                            </h3>
                            <p className="text-xs text-gray-600 mt-1">
                              PO: {rowData.poNo || "N/A"} | Serial:{" "}
                              {rowData.serialNo || "N/A"}
                            </p>
                          </div>
                          {isEditing ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditSave(item.id)}
                                disabled={uploadLoading.lrDoc || uploadLoading.invoiceDoc || uploadLoading.weightSlip || saveLoading}
                                className="px-3 py-1 bg-green-600 text-white text-xs rounded disabled:bg-gray-400"
                              >
                                {saveLoading ? "Saving..." : "Save"}
                              </button>
                              <button
                                onClick={handleEditCancel}
                                className="px-3 py-1 bg-gray-600 text-white text-xs rounded"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEditClick(item)}
                              className="px-3 py-1 bg-violet-600 text-white text-xs rounded"
                            >
                              Edit
                            </button>
                          )}
                        </div>

                        {/* Card Body - All Fields */}
                        <div className="p-4 space-y-4 text-sm">
                          {/* Basic Information */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-gray-500 text-xs">
                                Timestamp:
                              </span>
                              <p className="font-medium">{rowData.timestamp}</p>
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs">
                                Indent No:
                              </span>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={rowData.indentNo}
                                  onChange={(e) =>
                                    setEditFormData({
                                      ...editFormData,
                                      indentNo: e.target.value,
                                    })
                                  }
                                  className="w-full p-2 border rounded mt-1 text-sm"
                                />
                              ) : (
                                <p className="font-medium">
                                  {rowData.indentNo || "-"}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Product Details */}
                          <div className="border-t pt-3">
                            <span className="text-gray-500 text-xs font-medium mb-2 block">
                              Product Details
                            </span>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <span className="text-gray-500 text-xs">
                                  Item Category:
                                </span>
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={rowData.itemCategory}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        itemCategory: e.target.value,
                                      })
                                    }
                                    className="w-full p-2 border rounded mt-1 text-sm"
                                  />
                                ) : (
                                  <p className="font-medium text-wrap">
                                    {rowData.itemCategory || "-"}
                                  </p>
                                )}
                              </div>
                              <div>
                                <span className="text-gray-500 text-xs">
                                  Quantity:
                                </span>
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={rowData.quantity}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        quantity: e.target.value,
                                      })
                                    }
                                    className="w-full p-2 border rounded mt-1 text-sm"
                                  />
                                ) : (
                                  <p className="font-medium">
                                    {rowData.quantity || "-"}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-3">
                              <div>
                                <span className="text-gray-500 text-xs">
                                  Unit:
                                </span>
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={rowData.unit}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        unit: e.target.value,
                                      })
                                    }
                                    className="w-full p-2 border rounded mt-1 text-sm"
                                  />
                                ) : (
                                  <p className="font-medium">
                                    {rowData.unit || "-"}
                                  </p>
                                )}
                              </div>
                              <div>
                                <span className="text-gray-500 text-xs">
                                  Price:
                                </span>
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={rowData.price}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        price: e.target.value,
                                      })
                                    }
                                    className="w-full p-2 border rounded mt-1 text-sm"
                                  />
                                ) : (
                                  <p className="font-medium">
                                    {rowData.price
                                      ? `₹${Number(
                                          rowData.price
                                        ).toLocaleString("en-IN")}`
                                      : "-"}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-3">
                              <div>
                                <span className="text-gray-500 text-xs">
                                  QTY (Input):
                                </span>
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={rowData.qty}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        qty: e.target.value,
                                      })
                                    }
                                    className="w-full p-2 border rounded mt-1 text-sm"
                                  />
                                ) : (
                                  <p className="font-medium">
                                    {rowData.qty || "-"}
                                  </p>
                                )}
                              </div>
                              <div>
                                <span className="text-gray-500 text-xs">
                                  QC Requirement:
                                </span>
                                {isEditing ? (
                                  <select
                                    value={rowData.qcRequirement}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        qcRequirement: e.target.value,
                                      })
                                    }
                                    className="w-full p-2 border rounded mt-1 text-sm"
                                  >
                                    <option value="">Select</option>
                                    <option value="Yes">Yes</option>
                                    <option value="No">No</option>
                                  </select>
                                ) : (
                                  <p className="font-medium">
                                    {rowData.qcRequirement || "-"}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Invoice Information */}
                          <div className="border-t pt-3">
                            <span className="text-gray-500 text-xs font-medium mb-2 block">
                              Invoice Details
                            </span>
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <span className="text-gray-500 text-xs">
                                    Supplier Invoice No:
                                  </span>
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={rowData.supplierInvoiceNo}
                                      onChange={(e) =>
                                        setEditFormData({
                                          ...editFormData,
                                          supplierInvoiceNo: e.target.value,
                                        })
                                      }
                                      className="w-full p-2 border rounded mt-1 text-sm"
                                    />
                                  ) : (
                                    <p className="font-medium">
                                      {rowData.supplierInvoiceNo || "-"}
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <span className="text-gray-500 text-xs">
                                    Supplier Invoice Date:
                                  </span>
                                  {isEditing ? (
                                    <input
                                      type="date"
                                      value={rowData.supplierInvoiceDate}
                                      onChange={(e) =>
                                        setEditFormData({
                                          ...editFormData,
                                          supplierInvoiceDate: e.target.value,
                                        })
                                      }
                                      className="w-full p-2 border rounded mt-1 text-sm"
                                    />
                                  ) : (
                                    <p className="font-medium">
                                      {formatDateForDisplay(
                                        rowData.supplierInvoiceDate
                                      ) || "-"}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <span className="text-gray-500 text-xs">
                                    LR No:
                                  </span>
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={rowData.lrNo}
                                      onChange={(e) =>
                                        setEditFormData({
                                          ...editFormData,
                                          lrNo: e.target.value,
                                        })
                                      }
                                      className="w-full p-2 border rounded mt-1 text-sm"
                                    />
                                  ) : (
                                    <p className="font-medium">
                                      {rowData.lrNo || "-"}
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <span className="text-gray-500 text-xs">
                                    LR Date:
                                  </span>
                                  {isEditing ? (
                                    <input
                                      type="date"
                                      value={rowData.lrDate}
                                      onChange={(e) =>
                                        setEditFormData({
                                          ...editFormData,
                                          lrDate: e.target.value,
                                        })
                                      }
                                      className="w-full p-2 border rounded mt-1 text-sm"
                                    />
                                  ) : (
                                    <p className="font-medium">
                                      {formatDateForDisplay(rowData.lrDate) ||
                                        "-"}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <span className="text-gray-500 text-xs">
                                    LR Amount:
                                  </span>
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      value={rowData.lrAmount}
                                      onChange={(e) =>
                                        setEditFormData({
                                          ...editFormData,
                                          lrAmount: e.target.value,
                                        })
                                      }
                                      className="w-full p-2 border rounded mt-1 text-sm"
                                    />
                                  ) : (
                                    <p className="font-medium">
                                      {rowData.lrAmount || "-"}
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <span className="text-gray-500 text-xs">
                                    Transport Name:
                                  </span>
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={rowData.transportName}
                                      onChange={(e) =>
                                        setEditFormData({
                                          ...editFormData,
                                          transportName: e.target.value,
                                        })
                                      }
                                      className="w-full p-2 border rounded mt-1 text-sm"
                                    />
                                  ) : (
                                    <p className="font-medium">
                                      {rowData.transportName || "-"}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Cost Details */}
                          <div className="border-t pt-3">
                            <span className="text-gray-500 text-xs font-medium mb-2 block">
                              Cost Details
                            </span>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <span className="text-gray-500 text-xs">
                                  Transportation Cost:
                                </span>
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={rowData.transportationCost}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        transportationCost: e.target.value,
                                      })
                                    }
                                    className="w-full p-2 border rounded mt-1 text-sm"
                                  />
                                ) : (
                                  <p className="font-medium">
                                    {rowData.transportationCost
                                      ? `₹${rowData.transportationCost}`
                                      : "-"}
                                  </p>
                                )}
                              </div>
                              <div>
                                <span className="text-gray-500 text-xs">
                                  Local Conveyance (Dispatch):
                                </span>
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={rowData.localConveyanceDispatch}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        localConveyanceDispatch: e.target.value,
                                      })
                                    }
                                    className="w-full p-2 border rounded mt-1 text-sm"
                                  />
                                ) : (
                                  <p className="font-medium">
                                    {rowData.localConveyanceDispatch
                                      ? `₹${rowData.localConveyanceDispatch}`
                                      : "-"}
                                  </p>
                                )}
                              </div>
                              <div>
                                <span className="text-gray-500 text-xs">
                                  Local Conveyance (Destination):
                                </span>
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={rowData.localConveyanceDestination}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        localConveyanceDestination:
                                          e.target.value,
                                      })
                                    }
                                    className="w-full p-2 border rounded mt-1 text-sm"
                                  />
                                ) : (
                                  <p className="font-medium">
                                    {rowData.localConveyanceDestination
                                      ? `₹${rowData.localConveyanceDestination}`
                                      : "-"}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Checklist */}
                          <div className="border-t pt-3">
                            <span className="text-gray-500 text-xs font-medium mb-2 block">
                              Checklist
                            </span>
                            {isEditing ? (
                              <textarea
                                value={rowData.checklist}
                                onChange={(e) =>
                                  setEditFormData({
                                    ...editFormData,
                                    checklist: e.target.value,
                                  })
                                }
                                className="w-full p-2 border rounded text-sm"
                                rows="3"
                                placeholder="Enter checklist items"
                              />
                            ) : (
                              <div className="max-h-32 overflow-y-auto">
                                <p className="font-medium whitespace-pre-line text-xs">
                                  {rowData.checklist ||
                                    "No checklist available"}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Documents Section */}
                          <div className="border-t pt-3">
                            <span className="text-gray-500 text-xs font-medium mb-2 block">
                              Documents
                            </span>
                            <div className="space-y-2">
                              {isEditing ? (
                                <>
                                  <div>
                                    <span className="text-gray-500 text-xs block mb-1">
                                      LR Document:
                                    </span>
                                    <input
                                      type="file"
                                      onChange={(e) =>
                                        handleEditFileUpload(
                                          item.id,
                                          "lrDoc",
                                          e.target.files[0]
                                        )
                                      }
                                      className="w-full text-xs p-1 border rounded"
                                      accept=".pdf,.jpg,.jpeg,.png"
                                    />
                                    {rowData.lrDoc && (
                                      <a
                                        href={rowData.lrDoc}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 mt-1 block"
                                      >
                                        ✓ Current File
                                      </a>
                                    )}
                                  </div>
                                  <div>
                                    <span className="text-gray-500 text-xs block mb-1">
                                      Invoice Document:
                                    </span>
                                    <input
                                      type="file"
                                      onChange={(e) =>
                                        handleEditFileUpload(
                                          item.id,
                                          "invoiceDoc",
                                          e.target.files[0]
                                        )
                                      }
                                      className="w-full text-xs p-1 border rounded"
                                      accept=".pdf,.jpg,.jpeg,.png"
                                    />
                                    {rowData.invoiceDoc && (
                                      <a
                                        href={rowData.invoiceDoc}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 mt-1 block"
                                      >
                                        ✓ Current File
                                      </a>
                                    )}
                                  </div>
                                  <div>
                                    <span className="text-gray-500 text-xs block mb-1">
                                      Weight Slip:
                                    </span>
                                    <input
                                      type="file"
                                      onChange={(e) =>
                                        handleEditFileUpload(
                                          item.id,
                                          "weightSlip",
                                          e.target.files[0]
                                        )
                                      }
                                      className="w-full text-xs p-1 border rounded"
                                      accept=".pdf,.jpg,.jpeg,.png"
                                    />
                                    {rowData.weightSlip && (
                                      <a
                                        href={rowData.weightSlip}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 mt-1 block"
                                      >
                                        ✓ Current File
                                      </a>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <div className="grid grid-cols-3 gap-2">
                                  {rowData.lrDoc ? (
                                    <a
                                      href={rowData.lrDoc}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-center px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded hover:bg-blue-100"
                                    >
                                      LR Doc
                                    </a>
                                  ) : (
                                    <span className="text-center px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
                                      No LR Doc
                                    </span>
                                  )}
                                  {rowData.invoiceDoc ? (
                                    <a
                                      href={rowData.invoiceDoc}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-center px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded hover:bg-blue-100"
                                    >
                                      Invoice
                                    </a>
                                  ) : (
                                    <span className="text-center px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
                                      No Invoice
                                    </span>
                                  )}
                                  {rowData.weightSlip ? (
                                    <a
                                      href={rowData.weightSlip}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-center px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded hover:bg-blue-100"
                                    >
                                      Weight Slip
                                    </a>
                                  ) : (
                                    <span className="text-center px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
                                      No Weight Slip
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showSubmitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header - Fixed */}
            <div className="p-4 sm:p-6 border-b flex justify-between items-center bg-white">
              <h2 className="text-lg sm:text-2xl font-bold">
                Submit Purchase Data
              </h2>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Vendor Selection - Fixed */}
            <div className="p-4 sm:p-6 border-b bg-white">
              <label className="block text-sm font-medium mb-2">
                Select Vendor
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={vendorSearchTerm}
                  onChange={(e) => setVendorSearchTerm(e.target.value)}
                  onFocus={() => setShowVendorDropdown(true)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  placeholder="Type to search vendor..."
                />

                {showVendorDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {getUniqueVendors()
                      .filter((vendor) =>
                        vendor
                          .toLowerCase()
                          .includes(vendorSearchTerm.toLowerCase())
                      )
                      .map((vendor) => (
                        <div
                          key={vendor}
                          onClick={() => {
                            setSelectedVendor(vendor);
                            setVendorSearchTerm(vendor);
                            handleVendorSelect(vendor);
                            setShowVendorDropdown(false);
                          }}
                          className="p-2 hover:bg-violet-50 cursor-pointer border-b last:border-b-0"
                        >
                          {vendor}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto">
              {vendorFilteredData.length > 0 && (
                <>
                  {/* Common Form Fields Section */}
                  <div className="p-4 sm:p-6 border-b bg-gray-50">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900">
                      Common Information (for all selected rows)
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Supplier Invoice No */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Supplier Invoice No.{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                          value={commonFormData.supplierInvoiceNo}
                          onChange={(e) =>
                            handleCommonFormChange(
                              "supplierInvoiceNo",
                              e.target.value
                            )
                          }
                          placeholder="Enter invoice number"
                        />
                      </div>

                      {/* Supplier Invoice Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Supplier Invoice Date{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                          value={commonFormData.supplierInvoiceDate}
                          onChange={(e) =>
                            handleCommonFormChange(
                              "supplierInvoiceDate",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      {/* LR No */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          LR No.
                        </label>
                        <input
                          type="text"
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                          value={commonFormData.lrNo}
                          onChange={(e) =>
                            handleCommonFormChange("lrNo", e.target.value)
                          }
                          placeholder="Enter LR number"
                        />
                      </div>

                      {/* LR Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          LR Date
                        </label>
                        <input
                          type="date"
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                          value={commonFormData.lrDate}
                          onChange={(e) =>
                            handleCommonFormChange("lrDate", e.target.value)
                          }
                        />
                      </div>

                      {/* LR Amount */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          LR Amount
                        </label>
                        <input
                          type="number"
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                          value={commonFormData.lrAmount}
                          onChange={(e) =>
                            handleCommonFormChange("lrAmount", e.target.value)
                          }
                          placeholder="Enter amount"
                        />
                      </div>
                      {/* Checklist */}

                      <div className="md:col-span-2 lg:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Checklist
                          <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 border border-gray-300 rounded-lg bg-gray-50">
                          {[
                            {
                              id: "checklist-1",
                              value: "informed",
                              label:
                                "If so, have you informed the purchasing and accounts department?",
                            },
                            {
                              id: "checklist-2",
                              value: "repairable",
                              label:
                                "If any problem is found during inspection, can the machine be repaired at our premises or does it have to be sent back to the seller?",
                            },
                            {
                              id: "checklist-3",
                              value: "defects",
                              label:
                                "When inspecting the machine, do you notice any defects as per its external visibility?",
                            },
                            {
                              id: "checklist-4",
                              value: "quality",
                              label:
                                "While checking the quality of the product, did you find any defects in it?",
                            },
                            {
                              id: "checklist-5",
                              value: "quantity",
                              label:
                                "Is the quantity in the bill and the material received quantity are same?",
                            },
                            {
                              id: "checklist-6",
                              value: "standard",
                              label:
                                "Do all the materials we procure match the standard quality as per our requirements?",
                            },
                          ].map((item) => {
                            // Safely check if item.value exists in checklist
                            const checklistArray = commonFormData.checklist
                              ? commonFormData.checklist
                                  .split(",")
                                  .filter(Boolean)
                              : [];
                            const isChecked = checklistArray.includes(
                              item.value
                            );

                            return (
                              <div
                                key={item.id}
                                className="flex items-start gap-2 hover:bg-gray-100 p-2 rounded"
                              >
                                <input
                                  type="checkbox"
                                  id={item.id}
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const currentValues = checklistArray;
                                    let newValues;

                                    if (e.target.checked) {
                                      newValues = [
                                        ...currentValues,
                                        item.value,
                                      ];
                                    } else {
                                      newValues = currentValues.filter(
                                        (v) => v !== item.value
                                      );
                                    }

                                    handleCommonFormChange(
                                      "checklist",
                                      newValues.join(",")
                                    );
                                  }}
                                  className="mt-1 w-4 h-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500 cursor-pointer"
                                />
                                <label
                                  htmlFor={item.id}
                                  className="text-sm text-gray-700 cursor-pointer select-none flex-1"
                                >
                                  {item.label}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                        {commonFormData.checklist && (
                          <p className="text-xs text-gray-500 mt-2">
                            Selected:{" "}
                            {
                              commonFormData.checklist
                                .split(",")
                                .filter(Boolean).length
                            }{" "}
                            items
                          </p>
                        )}
                      </div>

                      {/* Transport Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Transport Name
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                          value={commonFormData.transportName}
                          onChange={(e) =>
                            handleCommonFormChange(
                              "transportName",
                              e.target.value
                            )
                          }
                          placeholder="Enter transport name"
                        />
                      </div>

                      {/* Transportation Cost */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Transportation Cost{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                          value={commonFormData.transportationCost}
                          onChange={(e) =>
                            handleCommonFormChange(
                              "transportationCost",
                              e.target.value
                            )
                          }
                          placeholder="Enter cost"
                        />
                      </div>

                      {/* Local Conveyance (Dispatch) */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Local Conveyance (Dispatch)
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                          value={commonFormData.localConveyanceDispatch}
                          onChange={(e) =>
                            handleCommonFormChange(
                              "localConveyanceDispatch",
                              e.target.value
                            )
                          }
                          placeholder="Enter amount"
                        />
                      </div>

                      {/* Local Conveyance (Destination) */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Local Conveyance (Destination)
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                          value={commonFormData.localConveyanceDestination}
                          onChange={(e) =>
                            handleCommonFormChange(
                              "localConveyanceDestination",
                              e.target.value
                            )
                          }
                          placeholder="Enter amount"
                        />
                      </div>

                      {/* LR Doc */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          LR Document
                        </label>
                        <input
                          type="file"
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                          onChange={(e) =>
                            handleCommonFileUpload("lrDoc", e.target.files[0])
                          }
                          accept=".pdf,.jpg,.jpeg,.png"
                        />
                        {commonFormData.lrDoc && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ File uploaded
                          </p>
                        )}
                      </div>

                      {/* Invoice Doc */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Invoice Document
                        </label>
                        <input
                          type="file"
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                          onChange={(e) =>
                            handleCommonFileUpload(
                              "invoiceDoc",
                              e.target.files[0]
                            )
                          }
                          accept=".pdf,.jpg,.jpeg,.png"
                        />
                        {commonFormData.invoiceDoc && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ File uploaded
                          </p>
                        )}
                      </div>

                      {/* Weight Slip */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Weight Slip
                        </label>
                        <input
                          type="file"
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                          onChange={(e) =>
                            handleCommonFileUpload(
                              "weightSlip",
                              e.target.files[0]
                            )
                          }
                          accept=".pdf,.jpg,.jpeg,.png"
                        />
                        {commonFormData.weightSlip && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ File uploaded
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden sm:block p-6">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="border p-2 min-w-[80px]">Select</th>
                            <th className="border p-2 min-w-[150px]">
                              Indent No.
                            </th>
                            <th className="border p-2 min-w-[150px]">
                              Qty (Input){" "}
                              <span className="text-red-500">*</span>
                            </th>
                            <th className="border p-2 min-w-[180px]">
                              QC Requirement{" "}
                              <span className="text-red-500">*</span>
                            </th>
                            <th className="border p-2 min-w-[150px]">PO No.</th>
                            <th className="border p-2 min-w-[120px]">
                              Serial No.
                            </th>
                            <th className="border p-2 min-w-[250px]">
                              Item Category
                            </th>
                            <th className="border p-2 min-w-[120px]">
                              Quantity
                            </th>
                            <th className="border p-2 min-w-[100px]">Unit</th>
                            <th className="border p-2 min-w-[150px]">Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vendorFilteredData.map((row) => (
                            <tr
                              key={row.id}
                              className={
                                selectedRows[row.id] ? "bg-blue-50" : ""
                              }
                            >
                              <td className="border p-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedRows[row.id] || false}
                                  onChange={() => handleRowSelect(row.id)}
                                  className="w-4 h-4"
                                />
                              </td>
                              <td className="border p-2">
                                {row.indentNo || "-"}
                              </td>
                              <td className="border p-2">
                                <input
                                  type="number"
                                  className="w-full p-1 border rounded"
                                  value={formData[row.id]?.qty || ""}
                                  onChange={(e) =>
                                    handleFormChange(
                                      row.id,
                                      "qty",
                                      e.target.value
                                    )
                                  }
                                  disabled={!selectedRows[row.id]}
                                  placeholder="Enter qty"
                                />
                              </td>
                              <td className="border p-2">
                                <select
                                  className="w-full p-1 border rounded"
                                  value={formData[row.id]?.qcRequirement || ""}
                                  onChange={(e) =>
                                    handleFormChange(
                                      row.id,
                                      "qcRequirement",
                                      e.target.value
                                    )
                                  }
                                  disabled={!selectedRows[row.id]}
                                >
                                  <option value="">Select</option>
                                  <option value="Yes">Yes</option>
                                  <option value="No">No</option>
                                </select>
                              </td>
                              <td className="border p-2">
                                {row.referenceNo || "-"}
                              </td>
                              <td className="border p-2">{row.id}</td>
                              <td className="border p-2">
                                {row.descriptionOfGoods || "-"}
                              </td>
                              <td className="border p-2">
                                {row.quantity || "-"}
                              </td>
                              <td className="border p-2">{row.unit || "-"}</td>
                              <td className="border p-2">
                                {row.rate
                                  ? `₹${Number(row.rate).toLocaleString(
                                      "en-IN"
                                    )}`
                                  : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile Card View */}
                  <div className="block sm:hidden p-4">
                    <div className="space-y-4">
                      {vendorFilteredData.map((row) => (
                        <div
                          key={row.id}
                          className={`border rounded-lg p-4 ${
                            selectedRows[row.id]
                              ? "bg-blue-50 border-blue-300"
                              : "bg-white"
                          }`}
                        >
                          {/* Card Header */}
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <input
                                  type="checkbox"
                                  checked={selectedRows[row.id] || false}
                                  onChange={() => handleRowSelect(row.id)}
                                  className="w-4 h-4 text-violet-600"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                  Select Row
                                </span>
                              </div>
                              <h3 className="text-sm font-semibold text-gray-900">
                                {row.descriptionOfGoods || "N/A"}
                              </h3>
                            </div>
                            <span className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              ID: {row.id}
                            </span>
                          </div>

                          {/* Card Body */}
                          <div className="space-y-3">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-gray-500 text-xs">
                                  Indent No:
                                </span>
                                <p className="font-medium">
                                  {row.indentNo || "-"}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-500 text-xs">
                                  PO No:
                                </span>
                                <p className="font-medium">
                                  {row.referenceNo || "-"}
                                </p>
                              </div>
                            </div>

                            {/* Product Details */}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-gray-500 text-xs">
                                  Unit:
                                </span>
                                <p className="font-medium">{row.unit || "-"}</p>
                              </div>
                              <div>
                                <span className="text-gray-500 text-xs">
                                  Price:
                                </span>
                                <p className="font-medium">
                                  {row.rate
                                    ? `₹${Number(row.rate).toLocaleString(
                                        "en-IN"
                                      )}`
                                    : "-"}
                                </p>
                              </div>
                            </div>

                            {/* Quantity */}
                            <div className="border-t pt-3">
                              <span className="text-gray-500 text-xs">
                                PO Quantity:
                              </span>
                              <p className="font-medium text-lg">
                                {row.quantity || "0"}
                              </p>
                            </div>

                            {/* Input Fields */}
                            <div className="space-y-3 border-t pt-3">
                              {/* Qty Input */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Qty (Input){" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="number"
                                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                                  value={formData[row.id]?.qty || ""}
                                  onChange={(e) =>
                                    handleFormChange(
                                      row.id,
                                      "qty",
                                      e.target.value
                                    )
                                  }
                                  disabled={!selectedRows[row.id]}
                                  placeholder="Enter quantity"
                                />
                              </div>

                              {/* QC Requirement */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  QC Requirement{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <select
                                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                                  value={formData[row.id]?.qcRequirement || ""}
                                  onChange={(e) =>
                                    handleFormChange(
                                      row.id,
                                      "qcRequirement",
                                      e.target.value
                                    )
                                  }
                                  disabled={!selectedRows[row.id]}
                                >
                                  <option value="">
                                    Select QC Requirement
                                  </option>
                                  <option value="Yes">Yes</option>
                                  <option value="No">No</option>
                                </select>
                              </div>
                            </div>

                            {/* Status Badge */}
                            <div className="border-t pt-3 flex justify-between items-center">
                              <div>
                                <span className="text-gray-500 text-xs">
                                  Status:
                                </span>
                                <p
                                  className={`text-sm font-medium ${
                                    selectedRows[row.id]
                                      ? "text-blue-600"
                                      : "text-gray-600"
                                  }`}
                                >
                                  {selectedRows[row.id]
                                    ? "Selected"
                                    : "Not Selected"}
                                </p>
                              </div>
                              {selectedRows[row.id] && (
                                <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded">
                                  ✓ Ready to Submit
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {vendorFilteredData.length === 0 && (
                        <div className="text-center py-8">
                          <p className="text-gray-500">
                            No items found for this vendor
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Submit Button - Fixed at Bottom */}
            {vendorFilteredData.length > 0 && (
              <div className="p-4 sm:p-6 border-t bg-white flex justify-end gap-3">
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                  disabled={
                    Object.values(selectedRows).filter(Boolean).length === 0 ||
                    loading
                  }
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit (
                      {Object.values(selectedRows).filter(Boolean).length}{" "}
                      selected)
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </MainLayout>
  );
}
