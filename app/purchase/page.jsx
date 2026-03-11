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


  const SHEET_ID = "1_KAokqi4ZxBGj2xA7TOdUMj6H44szaf4CQMI_OINdAo";
  const SHEET_NAME = "RECEIVING-ACCOUNTS";

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
    invoiceType: "",
    invoiceDate: "",
    invoiceNo: "",
    receivedItemImage: "",
    billAttachment: "",
    hydraAmt: "",
    labourAmt: "",
    autoCharge: "",
    expDate: "",
    pkgFwd: "",
    gst: "",
    totalPkgFwd: "",
    paymentTerm: "",

  });

  const columns = [
    { key: "indentNo", label: "Indent Number", width: "150px" },
    { key: "liftNo", label: "Lift No.", width: "120px" },
    { key: "vendorName", label: "Vendor Name", width: "200px" },
    { key: "poNo", label: "PO Number", width: "150px" },
    { key: "nextFollowUpDate", label: "Next Flw-Up Date", width: "180px" },
    { key: "remarks", label: "Remarks", width: "250px" },
    { key: "itemName", label: "Item Name", width: "200px" },
    { key: "liftingQty", label: "Lifting Qty", width: "120px" },
    { key: "transporterName", label: "Transporter Name", width: "180px" },
    { key: "vehicleNo", label: "Vehicle No.", width: "150px" },
    { key: "contactNo", label: "Contact No.", width: "150px" },
    { key: "lrNo", label: "LR No.", width: "150px" },
    { key: "dispatchDate", label: "Dispatch Date", width: "150px" },
    { key: "freightAmount", label: "Freight Amount", width: "150px" },
    { key: "advanceAmount", label: "Advance Amount", width: "150px" },
    { key: "paymentDate", label: "Payment Date", width: "150px" },
    { key: "paymentStatus", label: "Payment Status", width: "150px" },
    { key: "biltyCopy", label: "Bilty Copy", width: "150px" },
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

  useEffect(() => {
    setVisibleColumns(prev => {
      const newState = { ...prev };
      let changed = false;
      columns.forEach(col => {
        if (newState[col.key] === undefined) {
          newState[col.key] = true;
          changed = true;
        }
      });
      return changed ? newState : prev;
    });
  }, [columns]);

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
      const scriptUrl = "https://script.google.com/macros/s/AKfycbxJx1_BgbqaUCUouG3EpUdHePfnBU8W699ztF1w9T9YtvBk1U8df-g305i4O1imRrYSIw/exec";
      const fetchUrl = `${scriptUrl}?sheet=${SHEET_NAME}&action=fetch`;
      const response = await fetch(fetchUrl);
      const result = await response.json();

      if (result.success && result.data) {
        const items = [];

        // result.data is an array of arrays (rows)
        result.data.slice(7).forEach((row, index) => {
          if (row && row.length > 0) {
            // Filter: Column T index 19, Column U index 20
            const colT = row[19];
            const colU = row[20];

            // Store colT and colU for filtering in UI
            items.push({
              id: index + 1,
              indentNo: row[1] ?? "",
              liftNo: row[2] ?? "",
              vendorName: row[3] ?? "",
              poNo: row[4] ?? "",
              nextFollowUpDate: row[5] ?? "",
              remarks: row[6] ?? "",
              itemName: row[7] ?? "",
              liftingQty: row[8] ?? "",
              transporterName: row[9] ?? "",
              vehicleNo: row[10] ?? "",
              contactNo: row[11] ?? "",
              lrNo: row[12] ?? "",
              dispatchDate: row[13] ?? "",
              freightAmount: row[14] ?? "",
              advanceAmount: row[15] ?? "",
              paymentDate: row[16] ?? "",
              paymentStatus: row[17] ?? "",
              biltyCopy: row[18] ?? "",
              colT: row[19] || "",
              colU: row[20] || "",
              isPending: colT && !colU, // For main table
            });
          }
        });

        console.log(`Fetched ${items.length} pending records from ${SHEET_NAME}`);
        setPurchaseData(items);
        setTotalItems(items.length);
        setCurrentPage(1);
      } else {
        throw new Error(result.error || "Failed to fetch data");
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
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      const seconds = date.getSeconds().toString().padStart(2, "0");
      return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
    }
    return value || "-";
  };

  const fetchHistoryData = useCallback(async () => {
    setLoading(true);
    try {
      const scriptUrl = "https://script.google.com/macros/s/AKfycbxJx1_BgbqaUCUouG3EpUdHePfnBU8W699ztF1w9T9YtvBk1U8df-g305i4O1imRrYSIw/exec";

      // Fetch both sheets in parallel
      const [accountsResponse, warehouseResponse] = await Promise.all([
        fetch(`${scriptUrl}?sheet=${SHEET_NAME}&action=fetch`),
        fetch(`${scriptUrl}?sheet=Warehouse&action=fetch`)
      ]);

      const accountsResult = await accountsResponse.json();
      const warehouseResult = await warehouseResponse.json();

      if (accountsResult.success && accountsResult.data) {
        const items = [];

        // Build a lookup map from Warehouse data for faster access
        // We'll use Invoice No (Index 1) or LR No (Index 3) as matching keys if Lift No isn't directly in Warehouse
        const warehouseMap = new Map();
        if (warehouseResult.success && warehouseResult.data) {
          warehouseResult.data.slice(1).forEach(wRow => { // Assuming row 0 is header
            if (wRow && wRow.length > 0) {
              const invoiceNo = String(wRow[1] || "").trim();
              if (invoiceNo) warehouseMap.set(invoiceNo, wRow);
            }
          });
        }

        accountsResult.data.slice(7).forEach((row, index) => {
          if (row && row.length > 0) {
            const colT = row[19];
            const colU = row[20];

            // Show in history if both T and U are not null
            if (colT && colU) {
              const invoiceNo = String(row[24] || "").trim();
              const wData = warehouseMap.get(invoiceNo) || [];

              items.push({
                id: index + 1,
                timestamp: formatTimestamp(row[0]) ?? "",
                vendorName: row[3] ?? "",
                indentNo: row[1] ?? "",
                liftNo: row[2] ?? "",
                poNo: row[4] ?? "",
                serialNo: row[4] ?? "",
                itemCategory: row[7] ?? "",
                quantity: row[33] ?? "",
                unit: row[7] ?? "",
                rate: row[8] ?? "",
                qty: row[25] ?? "",
                qcRequirement: row[9] ?? "", // Originally from Indent
                supplierInvoiceNo: row[10] ?? "",
                supplierInvoiceDate: row[11] ?? "",
                lrNo: row[12] ?? "",
                lrDate: row[13] ?? "",
                lrAmount: wData[4] || row[14] || "", // From Warehouse Col E or Accounts Col O
                checklist: wData[6] || row[15] || "", // From Warehouse Col G
                transportName: wData[7] || row[9] || "", // From Warehouse Col H
                transportationCost: wData[8] || row[18] || "", // From Warehouse Col I
                localConveyanceDispatch: wData[9] || row[19] || "", // From Warehouse Col J
                localConveyanceDestination: wData[10] || row[20] || "", // From Warehouse Col K
                lrDoc: wData[11] || row[21] || "", // From Warehouse Col L
                invoiceType: row[22] ?? "",
                invoiceDate: row[23] ?? "",
                invoiceDoc: wData[12] || row[22] || "", // From Warehouse Col M
                weightSlip: wData[13] || row[23] || "", // From Warehouse Col N
                invoiceNo: invoiceNo,
                receivedQty: row[25] ?? "",
                receivedItemImage: wData[18] || row[26] || "", // From Warehouse Col S
                srn: row[27] ?? "",
                qcRequired: wData[25] || row[28] || "", // From Warehouse Col Z
                billAttachment: wData[19] || row[29] || "", // From Warehouse Col T
                hydraAmt: wData[14] || row[30] || "", // From Warehouse Col O
                labourAmt: wData[15] || row[31] || "", // From Warehouse Col P
                autoCharge: wData[16] || row[32] || "", // From Warehouse Col Q
                remarks: row[33] ?? "",
                expDate: wData[17] || row[34] || "", // From Warehouse Col R
                pkgFwd: wData[20] || row[99] || "", // From Warehouse Col U
                gstPkgFwd: wData[21] || row[100] || "", // From Warehouse Col V
                totalPkgFwd: wData[22] || row[102] || "", // From Warehouse Col W
                paymentTerm: wData[23] || row[103] || "", // From Warehouse Col X

              });
            }
          }
        });
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
        if (typeof formattedRow[field] === "string" && formattedRow[field].startsWith("Date(")) {
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
          "https://script.google.com/macros/s/AKfycbxJx1_BgbqaUCUouG3EpUdHePfnBU8W699ztF1w9T9YtvBk1U8df-g305i4O1imRrYSIw/exec";

        try {
          const params = new URLSearchParams();
          params.append("action", "uploadFile");
          params.append("base64Data", base64Data);
          params.append("fileName", file.name);
          params.append("mimeType", file.type);
          params.append("folderId", "1ZGfbiQHFnVdMyoLv5s8y3gVTIlnQzW2e");

          const response = await fetch(scriptUrl, {
            method: "POST",
            body: params,
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
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
        } catch (fetchError) {
          console.error("Fetch error:", fetchError);
          alert("File upload failed: " + fetchError.message);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Upload error:", error);
      alert("File upload failed!");
    } finally {
      // Set loading to false after upload completes
      setUploadLoading(prev => ({ ...prev, [field]: false }));
    }
  };

  // Handle Edit Save
  const handleEditSave = async (rowId) => {
    try {
      const scriptUrl =
        "https://script.google.com/macros/s/AKfycbxJx1_BgbqaUCUouG3EpUdHePfnBU8W699ztF1w9T9YtvBk1U8df-g305i4O1imRrYSIw/exec";

      // Find the original item to preserve its timestamp
      const originalItem = historyData.find((item) => item.id === rowId);

      const rowData = [
        originalItem.timestamp,
        editFormData.vendorName,
        editFormData.indentNo,
        editFormData.poNo,
        editFormData.serialNo,
        editFormData.itemCategory,
        editFormData.quantity,
        editFormData.unit,
        editFormData.rate,
        editFormData.qty,
        editFormData.qcRequirement,
        editFormData.supplierInvoiceNo,
        editFormData.supplierInvoiceDate,
        editFormData.lrNo,
        editFormData.lrDate,
        editFormData.lrAmount,
        editFormData.checklist,
        editFormData.transportName,
        editFormData.transportationCost,
        editFormData.localConveyanceDispatch,
        editFormData.localConveyanceDestination,
        editFormData.lrDoc,
        editFormData.invoiceDoc,
        editFormData.weightSlip
      ];

      setSaveLoading(true);
      const params = new URLSearchParams();
      params.append("action", "update");
      params.append("sheetName", SHEET_NAME);
      params.append("rowIndex", rowId + 1); // Assuming rowId is 1-indexed from id: index + 1
      params.append("rowData", JSON.stringify(rowData));

      const response = await fetch(scriptUrl, {
        method: "POST",
        body: params,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
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
    // 1. Determine base dataset based on active tab
    let baseData = activeTab === "pending"
      ? purchaseData.filter(item => item.isPending)
      : historyData;

    let filtered = [...baseData];

    // 2. Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((item) => {
        const searchableFields = [
          item.indentNo,
          item.liftNo,
          item.vendorName,
          item.poNo,
          item.remarks,
          item.itemName,
          item.transporterName,
          item.vehicleNo,
          item.contactNo,
          item.lrNo,
        ];

        return searchableFields.some(
          (field) =>
            field &&
            String(field).toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    // 3. Apply status filter - disabled for Pending tab as all are pending
    if (activeTab === "history") {
      if (statusFilter === "completed") {
        filtered = filtered.filter((item) => item.paymentStatus === "Completed");
      } else if (statusFilter === "pending") {
        filtered = filtered.filter((item) => item.paymentStatus !== "Completed");
      }
    }

    // 4. Apply vendor filter
    if (vendorFilter !== "all") {
      filtered = filtered.filter((item) => item.vendorName === vendorFilter);
    }

    return filtered;
  }, [purchaseData, historyData, activeTab, searchTerm, statusFilter, vendorFilter]);

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
      case "deliveryDate": {
        const date = parseGoogleSheetsDate(value);
        if (date) {
          // Format as MM/DD/YYYY HH:mm:ss
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          const year = date.getFullYear();

          const hours = date.getHours().toString().padStart(2, "0");
          const minutes = date.getMinutes().toString().padStart(2, "0");
          const seconds = date.getSeconds().toString().padStart(2, "0");

          return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
        }
        return value || "-";
      }

      case "freightAmount":
      case "advanceAmount":
        return value ? `₹${Number(value).toLocaleString("en-IN")}` : "₹0";

      case "biltyCopy":
        if (
          value &&
          (value.includes("http") || value.includes("drive.google.com"))
        ) {
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
              title="View Bilty"
            >
              <Eye className="h-3 w-3" />
              View Bilty
            </a>
          );
        }
        return value || "-";

      case "paymentDate":
      case "nextFollowUpDate":
      case "supplierInvoiceDate":
      case "lrDate":
      case "invoiceDate":
      case "dispatchDate": {
        const date = parseGoogleSheetsDate(value);
        if (date) {
          const month = date.getMonth() + 1;
          const day = date.getDate();
          const year = date.getFullYear();
          return `${month}/${day}/${year}`;
        }
        return value || "-";
      }

      case "expDate": {
        const date = parseGoogleSheetsDate(value);
        if (date) {
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          const year = date.getFullYear();
          return `${month}/${day}/${year}`;
        }
        return value || "-";
      }

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
        className={`px-3 py-1 border rounded-lg text-sm ${currentPage === page
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
          "https://script.google.com/macros/s/AKfycbxJx1_BgbqaUCUouG3EpUdHePfnBU8W699ztF1w9T9YtvBk1U8df-g305i4O1imRrYSIw/exec";

        try {
          const params = new URLSearchParams();
          params.append("action", "uploadFile");
          params.append("base64Data", base64Data);
          params.append("fileName", file.name);
          params.append("mimeType", file.type);
          params.append("folderId", "1ZGfbiQHFnVdMyoLv5s8y3gVTIlnQzW2e"); // Using found folder ID as default

          const response = await fetch(scriptUrl, {
            method: "POST",
            body: params,
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
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

  // Filter data by vendor
  const handleVendorSelect = (vendor) => {
    setSelectedVendor(vendor);
    // Show only pending items for this vendor in the modal
    const filtered = purchaseData.filter(
      (item) => item.vendorName === vendor && item.isPending
    );
    setVendorFilteredData(filtered);
    setSelectedRows({});
    setFormData({});
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
          "https://script.google.com/macros/s/AKfycbxJx1_BgbqaUCUouG3EpUdHePfnBU8W699ztF1w9T9YtvBk1U8df-g305i4O1imRrYSIw/exec";

        try {
          const params = new URLSearchParams();
          params.append("action", "uploadFile");
          params.append("base64Data", base64Data);
          params.append("fileName", file.name);
          params.append("mimeType", file.type);
          params.append("folderId", "1ZGfbiQHFnVdMyoLv5s8y3gVTIlnQzW2e"); // Using found folder ID as default

          const response = await fetch(scriptUrl, {
            method: "POST",
            body: params,
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
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
        // Shared Identifiers
        liftNo: row.liftNo,

        // Form Data
        timestamp: timestamp,
        vendorName: row.vendorName,
        indentNo: row.indentNo,
        poNo: row.poNo,
        serialNo: row.poNo,
        itemCategory: row.itemName,
        quantity: row.liftingQty,
        unit: "-",
        rate: row.advanceAmount || 0,
        qty: form.qty,
        qcRequirement: form.qcRequirement,

        // Common fields
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
        invoiceType: commonFormData.invoiceType,
        invoiceDate: commonFormData.supplierInvoiceDate, // Consolidated
        invoiceNo: commonFormData.supplierInvoiceNo, // Consolidated
        receivedItemImage: commonFormData.receivedItemImage,
        billAttachment: commonFormData.billAttachment,
        hydraAmt: commonFormData.hydraAmt,
        labourAmt: commonFormData.labourAmt,
        autoCharge: commonFormData.autoCharge,
        expDate: commonFormData.expDate,
        pkgFwd: commonFormData.pkgFwd,
        gst: commonFormData.gst,
        totalPkgFwd: commonFormData.totalPkgFwd,
        paymentTerm: commonFormData.paymentTerm,

      };
    });

    try {
      const scriptUrl = "https://script.google.com/macros/s/AKfycbxJx1_BgbqaUCUouG3EpUdHePfnBU8W699ztF1w9T9YtvBk1U8df-g305i4O1imRrYSIw/exec";

      // 1. Submit to RECEIVING-ACCOUNTS (UPDATE by Lift No)
      for (const data of dataToSubmit) {
        const rowDataAccounts = new Array(105).fill("");
        // Column Index Mapping for Update (U onwards, except match column C)
        // Note: Column C is at index 2 (Lift No)
        const today = new Date();
        const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        rowDataAccounts[15] = data.checklist; // Col P - Checklist
        rowDataAccounts[20] = formattedDate; // Col U - Actual1/Received Qty
        rowDataAccounts[22] = data.invoiceType; // Col W
        rowDataAccounts[23] = data.invoiceDate; // Col X
        rowDataAccounts[24] = data.invoiceNo; // Col Y
        rowDataAccounts[25] = data.qty; // Col Z - Received Qty
        rowDataAccounts[26] = data.receivedItemImage; // Col AA
        rowDataAccounts[27] = ""; // Col AB - SRN (Removed)
        rowDataAccounts[28] = data.qcRequirement; // Col AC
        rowDataAccounts[29] = data.billAttachment; // Col AD
        rowDataAccounts[30] = data.hydraAmt; // Col AE
        rowDataAccounts[31] = data.labourAmt; // Col AF
        rowDataAccounts[32] = data.autoCharge; // Col AG
        // rowDataAccounts[33] = ""; // Col AH - Remarks (Preserving existing)
        rowDataAccounts[34] = data.expDate; // Col AI
        rowDataAccounts[99] = data.pkgFwd; // Col CV
        rowDataAccounts[100] = data.gst; // Col CW
        rowDataAccounts[102] = data.totalPkgFwd; // Col CY
        rowDataAccounts[103] = data.paymentTerm; // Col CZ


        const paramsAccounts = new URLSearchParams();
        paramsAccounts.append("action", "updateByLiftNo");
        paramsAccounts.append("sheetName", SHEET_NAME);
        paramsAccounts.append("liftNo", data.liftNo);
        paramsAccounts.append("rowData", JSON.stringify(rowDataAccounts));

        const responseAccounts = await fetch(scriptUrl, {
          method: "POST",
          mode: "cors",
          body: paramsAccounts,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        });

        if (!responseAccounts.ok) throw new Error("Update to Accounts sheet failed for Lift No: " + data.liftNo);
        const resultAccounts = await responseAccounts.json();
        if (!resultAccounts.success) throw new Error(resultAccounts.error || "Update to Accounts sheet failed for Lift No: " + data.liftNo);
      }

      // 2. Submit to Warehouse (INSERT New Rows)
      const rowsDataWarehouse = dataToSubmit.map((data) => [
        data.timestamp,            // A: Timestamp
        data.invoiceNo,            // B: Invoice No.
        data.invoiceDate,          // C: Invoice Date
        data.lrNo,                 // D: LR No.
        data.lrAmount,             // E: LR Amount
        data.invoiceType,          // F: Invoice Type
        data.checklist,            // G: Checklist
        data.transportName,        // H: Transport Name
        data.transportationCost,   // I: Transportation Cost
        data.localConveyanceDispatch, // J: Local Conveyance (Dispatch)
        data.localConveyanceDestination, // K: Local Conveyance (Destination)
        data.lrDoc,                // L: LR Document
        data.invoiceDoc,           // M: Invoice Document
        data.weightSlip,           // N: Weight Slip
        data.hydraAmt,             // O: Hydra Amt.
        data.labourAmt,            // P: Labour Amt.
        data.autoCharge,           // Q: Auto Charge
        data.expDate,              // R: Exp. Date
        data.receivedItemImage,    // S: Received Item Image
        data.billAttachment,       // T: Bill Attachment
        data.pkgFwd,               // U: Pkg/Fwd
        data.gst,                  // V: GST%
        data.totalPkgFwd,          // W: Total Pkg/Fwd
        data.paymentTerm,          // X: Payment Term
        data.qty,                  // Y: Qty (Input)
        data.qcRequirement,        // Z: QC Requirement
      ]);

      const paramsWarehouse = new URLSearchParams();
      paramsWarehouse.append("action", "batchInsert");
      paramsWarehouse.append("sheetName", "Warehouse");
      paramsWarehouse.append("rowsData", JSON.stringify(rowsDataWarehouse));

      const responseWarehouse = await fetch(scriptUrl, {
        method: "POST",
        mode: "cors",
        body: paramsWarehouse,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      if (!responseWarehouse.ok) throw new Error("Insertion to Warehouse sheet failed");
      const resultWarehouse = await responseWarehouse.json();

      if (resultWarehouse.success) {
        alert("Data submitted successfully to both sheets!");
        setShowSubmitModal(false);
        setSelectedRows({});
        setFormData({});
        setCommonFormData({
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
          invoiceType: "",
          invoiceDate: "",
          invoiceNo: "",
          receivedItemImage: "",
          billAttachment: "",
          hydraAmt: "",
          labourAmt: "",
          autoCharge: "",
          expDate: "",
          pkgFwd: "",
          gst: "",
          totalPkgFwd: "",
          paymentTerm: "",

        });
        fetchPurchaseData();
      } else {
        throw new Error(resultWarehouse.error || "Failed to submit to Warehouse sheet");
      }
    } catch (error) {
      console.error("Submit error:", error);
      alert("Failed to submit data: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const paginatedDataa = paginatedData;

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "";

    // Handle Google Sheets date format like "Date(2025,11,25)"
    if (typeof dateString === "string" && dateString.startsWith("Date(")) {
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
                  className={`px-6 py-3 font-medium ${activeTab === "pending"
                    ? "border-b-2 border-violet-600 text-violet-600"
                    : "text-gray-600 hover:text-gray-900"
                    }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`px-6 py-3 font-medium ${activeTab === "history"
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
                  <div className="overflow-x-auto max-h-[calc(100vh-350px)] overflow-y-auto">
                    <div className="min-w-max">
                      <table className="w-full relative border-collapse">
                        <thead className="bg-gray-50 sticky top-0 z-20">
                          <tr>
                            {columns
                              .filter((col) => visibleColumns[col.key])
                              .map((column) => (
                                <th
                                  key={column.key}
                                  className="bg-gray-50 font-semibold text-gray-900 border-b-2 border-gray-200 px-4 py-3 text-left whitespace-nowrap text-sm sticky top-0"
                                  style={{ width: column.width || "auto" }}
                                >
                                  {column.label}
                                </th>
                              ))}
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedData.map((item) => (
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
                          {paginatedData.length === 0 && (
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
                {paginatedData.length > 0 ? (
                  <div className="space-y-4">
                    {paginatedData.map((item) => (
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
                                Indent: {item.indentNo || "N/A"}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-1 text-xs rounded ${item.paymentStatus === "Completed"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                                }`}
                            >
                              {item.paymentStatus || "Pending"}
                            </span>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-gray-500 text-xs">Lift No:</span>
                              <p className="font-medium text-gray-900">{item.liftNo || "-"}</p>
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs">PO Number:</span>
                              <p className="font-medium text-gray-900">{item.poNo || "-"}</p>
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs">Next Follow-up:</span>
                              <p className="font-medium text-gray-900">{renderCellContent(item, "nextFollowUpDate")}</p>
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs">Lifting Qty:</span>
                              <p className="font-medium text-gray-900">{item.liftingQty || "-"}</p>
                            </div>
                          </div>

                          <div className="border-t pt-3">
                            <span className="text-gray-500 text-xs">Item Name:</span>
                            <p className="font-medium text-gray-900">{item.itemName || "-"}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 border-t pt-3 text-sm">
                            <div>
                              <span className="text-gray-500 text-xs">Transporter:</span>
                              <p className="font-medium text-gray-900">{item.transporterName || "-"}</p>
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs">Vehicle No:</span>
                              <p className="font-medium text-gray-900">{item.vehicleNo || "-"}</p>
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs">Contact No:</span>
                              <p className="font-medium text-gray-900">{item.contactNo || "-"}</p>
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs">LR No:</span>
                              <p className="font-medium text-gray-900">{item.lrNo || "-"}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 border-t pt-3 text-sm">
                            <div>
                              <span className="text-gray-500 text-xs">Dispatch Date:</span>
                              <p className="font-medium text-gray-900">{renderCellContent(item, "dispatchDate")}</p>
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs">Freight Amount:</span>
                              <p className="font-medium text-gray-900 text-violet-600">{renderCellContent(item, "freightAmount")}</p>
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs">Advance Amount:</span>
                              <p className="font-medium text-gray-900 text-blue-600">{renderCellContent(item, "advanceAmount")}</p>
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs">Payment Date:</span>
                              <p className="font-medium text-gray-900">{renderCellContent(item, "paymentDate")}</p>
                            </div>
                          </div>

                          {item.remarks && (
                            <div className="border-t pt-3">
                              <span className="text-gray-500 text-xs">Remarks:</span>
                              <p className="text-sm italic text-gray-600">{item.remarks}</p>
                            </div>
                          )}

                          {/* Bilty Copy */}
                          {item.biltyCopy &&
                            (item.biltyCopy.includes("http") ||
                              item.biltyCopy.includes("drive.google.com")) && (
                              <div className="border-t pt-3">
                                <a
                                  href={item.biltyCopy}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 text-sm rounded-lg w-full justify-center"
                                >
                                  <Eye className="h-4 w-4" />
                                  View Bilty Copy
                                </a>
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
                  <div className="overflow-x-auto max-h-[calc(100vh-350px)] overflow-y-auto">
                    <table className="w-full text-sm relative border-collapse">
                      <thead className="bg-gray-50 sticky top-0 z-20">
                        <tr>
                          <th className="border p-2 min-w-[100px] sticky top-0 bg-gray-50">Action</th>

                          <th className="border p-2 min-w-[200px] sticky top-0 bg-gray-50">
                            Vendor Name
                          </th>
                          <th className="border p-2 min-w-[150px] sticky top-0 bg-gray-50">
                            Indent No.
                          </th>
                          <th className="border p-2 min-w-[150px] sticky top-0 bg-gray-50">PO No</th>
                          {/* <th className="border p-2 min-w-[120px] sticky top-0 bg-gray-50">
                            Serial No
                          </th> */}
                          <th className="border p-2 min-w-[250px] sticky top-0 bg-gray-50">
                            Item Category
                          </th>
                          <th className="border p-2 min-w-[120px] sticky top-0 bg-gray-50">Remark</th>
                          {/* <th className="border p-2 min-w-[100px] sticky top-0 bg-gray-50">Unit</th> */}
                          <th className="border p-2 min-w-[150px] sticky top-0 bg-gray-50">Rate</th>
                          <th className="border p-2 min-w-[120px] sticky top-0 bg-gray-50">QTY</th>
                          <th className="border p-2 min-w-[180px] sticky top-0 bg-gray-50">
                            QC Requirement
                          </th>

                          <th className="border p-2 min-w-[150px] sticky top-0 bg-gray-50">LR No.</th>
                          <th className="border p-2 min-w-[150px] sticky top-0 bg-gray-50">LR Date</th>
                          <th className="border p-2 min-w-[150px] sticky top-0 bg-gray-50">
                            LR Amount
                          </th>
                          <th className="border p-2 min-w-[250px] sticky top-0 bg-gray-50">
                            Checklist
                          </th>
                          <th className="border p-2 min-w-[180px] sticky top-0 bg-gray-50">
                            Transport Name
                          </th>


                          <th className="border p-2 min-w-[150px] sticky top-0 bg-gray-50">LR Doc</th>
                          <th className="border p-2 min-w-[150px] sticky top-0 bg-gray-50">
                            Invoice Type
                          </th>
                          <th className="border p-2 min-w-[150px] sticky top-0 bg-gray-50">
                            Invoice Date
                          </th>


                          <th className="border p-2 min-w-[180px] sticky top-0 bg-gray-50">
                            Invoice No.
                          </th>
                          <th className="border p-2 min-w-[150px] sticky top-0 bg-gray-50">
                            Received Qty
                          </th>
                          <th className="border p-2 min-w-[180px] sticky top-0 bg-gray-50">
                            Received Item Image
                          </th>
                          <th className="border p-2 min-w-[180px] sticky top-0 bg-gray-50">
                            QC Required
                          </th>
                          <th className="border p-2 min-w-[180px] sticky top-0 bg-gray-50">
                            Bill Attachment
                          </th>
                          <th className="border p-2 min-w-[150px] sticky top-0 bg-gray-50">
                            Hydra Amt.
                          </th>
                          <th className="border p-2 min-w-[150px] sticky top-0 bg-gray-50">
                            Labour Amt.
                          </th>
                          <th className="border p-2 min-w-[150px] sticky top-0 bg-gray-50">
                            Auto Charge
                          </th>
                          <th className="border p-2 min-w-[250px] sticky top-0 bg-gray-50">
                            Remarks
                          </th>
                          <th className="border p-2 min-w-[180px] sticky top-0 bg-gray-50">
                            Exp. Date
                          </th>
                          <th className="border p-2 min-w-[150px] sticky top-0 bg-gray-50">
                            Pkg/Fwd
                          </th>
                          <th className="border p-2 min-w-[150px] sticky top-0 bg-gray-50">
                            GST% Total Pkg/Fwd
                          </th>
                          <th className="border p-2 min-w-[150px] sticky top-0 bg-gray-50">
                            Total Pkg/Fwd
                          </th>
                          <th className="border p-2 min-w-[180px] sticky top-0 bg-gray-50">
                            Payment Term
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedData.map((item) => {
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
                              {/* <td className="border p-2">
                                {rowData.serialNo || "-"}
                              </td> */}

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
                              {/* <td className="border p-2">
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
                              </td> */}

                              {/* Rate */}
                              <td className="border p-2">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={rowData.rate}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        rate: e.target.value,
                                      })
                                    }
                                    className="w-full p-1 border rounded"
                                  />
                                ) : rowData.rate ? (
                                  `₹${Number(rowData.rate).toLocaleString(
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




                              <td className="border p-2">{rowData.invoiceType || "-"}</td>
                              <td className="border p-2">{renderCellContent(rowData, "invoiceDate")}</td>
                              {/* New Columns Y-AI */}
                              <td className="border p-2">{rowData.invoiceNo || "-"}</td>
                              <td className="border p-2">{rowData.receivedQty || "-"}</td>
                              <td className="border p-2 text-center text-blue-600">
                                {rowData.receivedItemImage ? (
                                  <a
                                    href={rowData.receivedItemImage}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 justify-center"
                                  >
                                    <Eye className="h-3 w-3" />
                                    View
                                  </a>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td className="border p-2">{rowData.qcRequired || "-"}</td>
                              <td className="border p-2 text-center text-blue-600">
                                {rowData.billAttachment ? (
                                  <a
                                    href={rowData.billAttachment}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 justify-center"
                                  >
                                    <Eye className="h-3 w-3" />
                                    View
                                  </a>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td className="border p-2">{rowData.hydraAmt !== "" && rowData.hydraAmt !== undefined && rowData.hydraAmt !== null ? rowData.hydraAmt : "-"}</td>
                              <td className="border p-2">{rowData.labourAmt !== "" && rowData.labourAmt !== undefined && rowData.labourAmt !== null ? rowData.labourAmt : "-"}</td>
                              <td className="border p-2">{rowData.autoCharge || "-"}</td>
                              <td className="border p-2">{rowData.remarks || "-"}</td>
                              <td className="border p-2">{renderCellContent(rowData, "expDate")}</td>
                              <td className="border p-2">{rowData.pkgFwd || "-"}</td>
                              <td className="border p-2">{rowData.gstPkgFwd || "-"}</td>
                              <td className="border p-2">{rowData.totalPkgFwd || "-"}</td>
                              <td className="border p-2">{rowData.paymentTerm || "-"}</td>
                            </tr>
                          );
                        })}
                        {historyData.length === 0 && (
                          <tr>
                            <td
                              colSpan="39"
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
                          <div className="grid grid-cols-1 gap-3">
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
                                  Item Name:
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
                                  Remark:
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
                              {/* <div>
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
                              </div> */}
                              <div>
                                <span className="text-gray-500 text-xs">
                                  Rate:
                                </span>
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={rowData.rate}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        rate: e.target.value,
                                      })
                                    }
                                    className="w-full p-2 border rounded mt-1 text-sm"
                                  />
                                ) : (
                                  <p className="font-medium">
                                    {rowData.rate
                                      ? `₹${Number(
                                        rowData.rate
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
                            <div className="grid grid-cols-2 gap-3 mt-3">
                              <div>
                                <span className="text-gray-500 text-xs">
                                  Invoice Type:
                                </span>
                                <p className="font-medium">
                                  {rowData.invoiceType || "-"}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-500 text-xs">
                                  Invoice Date:
                                </span>
                                <p className="font-medium">
                                  {renderCellContent(rowData, "invoiceDate")}
                                </p>
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
                                      {renderCellContent(rowData, "lrDate") ||
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

                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-3">
                              <div>
                                <span className="text-gray-500 text-xs">
                                  Hydra Amt:
                                </span>
                                <p className="font-medium">
                                  {rowData.hydraAmt !== "" && rowData.hydraAmt !== undefined && rowData.hydraAmt !== null ? rowData.hydraAmt : "-"}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-500 text-xs">
                                  Labour Amt:
                                </span>
                                <p className="font-medium">
                                  {rowData.labourAmt !== "" && rowData.labourAmt !== undefined && rowData.labourAmt !== null ? rowData.labourAmt : "-"}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-3">
                              <div>
                                <span className="text-gray-500 text-xs">
                                  Auto Charge:
                                </span>
                                <p className="font-medium">
                                  {rowData.autoCharge || "-"}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-500 text-xs">
                                  Exp. Date:
                                </span>
                                <p className="font-medium">
                                  {renderCellContent(rowData, "expDate") || "-"}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-3">
                              <div>
                                <span className="text-gray-500 text-xs">
                                  Pkg/Fwd:
                                </span>
                                <p className="font-medium">
                                  {rowData.pkgFwd || "-"}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-500 text-xs">
                                  GST% Pkg/Fwd:
                                </span>
                                <p className="font-medium">
                                  {rowData.gstPkgFwd || "-"}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-3">
                              <div>
                                <span className="text-gray-500 text-xs">
                                  Total Pkg/Fwd:
                                </span>
                                <p className="font-medium">
                                  {rowData.totalPkgFwd || "-"}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-500 text-xs">
                                  Payment Term:
                                </span>
                                <p className="font-medium text-wrap">
                                  {rowData.paymentTerm || "-"}
                                </p>
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
                                  {rowData.receivedItemImage ? (
                                    <a
                                      href={rowData.receivedItemImage}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-center px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded hover:bg-blue-100"
                                    >
                                      Item Image
                                    </a>
                                  ) : (
                                    <span className="text-center px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
                                      No Image
                                    </span>
                                  )}
                                  {rowData.billAttachment ? (
                                    <a
                                      href={rowData.billAttachment}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-center px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded hover:bg-blue-100"
                                    >
                                      Bill Attach.
                                    </a>
                                  ) : (
                                    <span className="text-center px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
                                      No Bill
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
                  onFocus={() => {
                    setShowVendorDropdown(true);
                    setVendorSearchTerm(""); // Clear search on focus to show all vendors
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  placeholder="Type to search vendor..."
                />

                {showVendorDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {[...new Set(purchaseData.filter(item => item.isPending).map(item => item.vendorName))]
                      .filter((vendor) =>
                        vendor && vendor
                          .toLowerCase()
                          .includes(vendorSearchTerm.toLowerCase())
                      )
                      .sort()
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

                      {/* Invoice Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Invoice Type
                        </label>
                        <select
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                          value={commonFormData.invoiceType}
                          onChange={(e) =>
                            handleCommonFormChange("invoiceType", e.target.value)
                          }
                        >
                          <option value="">Select Type</option>
                          <option value="Regular">Regular</option>
                          <option value="Debit Note">Debit Note</option>
                          <option value="Credit Note">Credit Note</option>
                        </select>
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

                      {/* Hydra Amt. */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Hydra Amt.
                        </label>
                        <input
                          type="number"
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                          value={commonFormData.hydraAmt}
                          onChange={(e) =>
                            handleCommonFormChange("hydraAmt", e.target.value)
                          }
                          placeholder="Enter amount"
                        />
                      </div>

                      {/* Labour Amt. */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Labour Amt.
                        </label>
                        <input
                          type="number"
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                          value={commonFormData.labourAmt}
                          onChange={(e) =>
                            handleCommonFormChange("labourAmt", e.target.value)
                          }
                          placeholder="Enter amount"
                        />
                      </div>

                      {/* Auto Charge */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Auto Charge
                        </label>
                        <input
                          type="number"
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                          value={commonFormData.autoCharge}
                          onChange={(e) =>
                            handleCommonFormChange("autoCharge", e.target.value)
                          }
                          placeholder="Enter amount"
                        />
                      </div>

                      {/* Exp. Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Exp. Date
                        </label>
                        <input
                          type="date"
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                          value={commonFormData.expDate}
                          onChange={(e) =>
                            handleCommonFormChange("expDate", e.target.value)
                          }
                        />
                      </div>

                      {/* Received Item Image */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Received Item Image
                        </label>
                        <input
                          type="file"
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                          onChange={(e) =>
                            handleCommonFileUpload(
                              "receivedItemImage",
                              e.target.files[0]
                            )
                          }
                          accept=".jpg,.jpeg,.png"
                        />
                        {commonFormData.receivedItemImage && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ Image uploaded
                          </p>
                        )}
                      </div>

                      {/* Bill Attachment */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Bill Attachment
                        </label>
                        <input
                          type="file"
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                          onChange={(e) =>
                            handleCommonFileUpload(
                              "billAttachment",
                              e.target.files[0]
                            )
                          }
                          accept=".pdf,.jpg,.jpeg,.png"
                        />
                        {commonFormData.billAttachment && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ Document uploaded
                          </p>
                        )}
                      </div>

                      {/* Pkg/Fwd */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Pkg/Fwd
                        </label>
                        <input
                          type="number"
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                          value={commonFormData.pkgFwd}
                          onChange={(e) =>
                            handleCommonFormChange("pkgFwd", e.target.value)
                          }
                          placeholder="Enter amount"
                        />
                      </div>

                      {/* GST% */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          GST%
                        </label>
                        <input
                          type="number"
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                          value={commonFormData.gst}
                          onChange={(e) =>
                            handleCommonFormChange("gst", e.target.value)
                          }
                          placeholder="Enter GST%"
                        />
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
                            {/* <th className="border p-2 min-w-[120px]">
                              Serial No.
                            </th> */}
                            <th className="border p-2 min-w-[250px]">
                              Item Category
                            </th>
                            <th className="border p-2 min-w-[120px]">
                              Remark
                            </th>
                            {/* <th className="border p-2 min-w-[100px]">Unit</th> */}
                            <th className="border p-2 min-w-[150px]">Rate</th>
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
                                {row.poNo || "-"}
                              </td>
                              <td className="border p-2">{row.poNo}</td>
                              <td className="border p-2">
                                {row.itemName || "-"}
                              </td>
                              <td className="border p-2">
                                {row.liftingQty || "-"}
                              </td>
                              {/* <td className="border p-2">
                                {row.advanceAmount
                                  ? `₹${Number(row.advanceAmount).toLocaleString(
                                    "en-IN"
                                  )}`
                                  : "-"}
                              </td> */}
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
                          className={`border rounded-lg p-4 ${selectedRows[row.id]
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
                                {row.itemName || "N/A"}
                              </h3>
                            </div>
                            <span className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              Indent: {row.indentNo}
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
                                  {row.poNo || "-"}
                                </p>
                              </div>
                            </div>

                            {/* Product Details */}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-gray-500 text-xs">
                                  Rate:
                                </span>
                                <p className="font-medium">
                                  {row.advanceAmount
                                    ? `₹${Number(row.advanceAmount).toLocaleString(
                                      "en-IN"
                                    )}`
                                    : "-"}
                                </p>
                              </div>
                            </div>

                            {/* Quantity */}
                            <div className="border-t pt-3">
                              <span className="text-gray-500 text-xs">
                                Lifting Qty:
                              </span>
                              <p className="font-medium text-lg">
                                {row.liftingQty || "0"}
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
                                  className={`text-sm font-medium ${selectedRows[row.id]
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
