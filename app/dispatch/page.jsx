"use client";

import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useData } from "@/components/data-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Eye, RefreshCw, Search, Settings, Edit, Save, X, FileText, CloudUpload, Trash2, MapPin } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import ProcessDialog from "@/components/process-dialog";
import { LocationUpdateModal } from "./location-update-modal";

// Column definitions for Pending tab (B to BJ) - Defined before component to avoid temporal dead zone
const pendingColumns = [
  { key: "actions", label: "Actions", searchable: false },
  { key: "planned5", label: "Date", searchable: true },
  { key: "companyName", label: "Company Name", searchable: true },
  { key: "contactPersonName", label: "Contact Person Name", searchable: true },
  { key: "contactNumber", label: "Contact Number", searchable: true },
  { key: "invoiceNumber", label: "Invoice Number", searchable: true },
  { key: "invoiceCreatedDate", label: "Invoice Date", searchable: true },
  { key: "invoiceUpload", label: "Invoice Upload", searchable: true },
  { key: "quotationNo", label: "Quotation Number", searchable: true },
  { key: "quotationCopy", label: "Quotation Copy", searchable: true },
  { key: "transportMode", label: "Transport Mode", searchable: true },
];


// Column definitions for History tab - Defined before component to avoid temporal dead zone
const historyColumns = [
  { key: "editActions", label: "Actions", searchable: false },
  { key: "planned5", label: "Date", searchable: true },
  { key: "companyName", label: "Company Name", searchable: true },
  { key: "contactPersonName", label: "Contact Person Name", searchable: true },
  { key: "contactNumber", label: "Contact Number", searchable: true },
  { key: "invoiceNumber", label: "Invoice Number", searchable: true },
  { key: "invoiceCreatedDate", label: "Invoice Date", searchable: true },
  { key: "invoiceUpload", label: "Invoice Upload", searchable: true },
  { key: "quotationNo", label: "Quotation Number", searchable: true },
  { key: "quotationCopy", label: "Quotation Copy", searchable: true },
  { key: "transportMode", label: "Transport Mode", searchable: true },
];

// Memoized column width lookup to avoid recalculating on every render
const columnWidths = {
  actions: "120px",
  editActions: "120px",
  orderNo: "120px",
  quotationNo: "150px",
  companyName: "250px",
  contactPersonName: "180px",
  contactNumber: "140px",
  billingAddress: "200px",
  shippingAddress: "200px",
  isOrderAcceptable: "150px",
  orderAcceptanceChecklist: "250px",
  remarks: "200px",
  warehouseRemarks: "200px",
  availabilityStatus: "150px",
  inventoryRemarks: "200px",
  default: "160px"
};

const getColumnWidth = (columnKey) => columnWidths[columnKey] || columnWidths.default;

export default function WarehousePage() {
  const { orders, updateOrder } = useData();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewOrder, setViewOrder] = useState(null);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);

  const [editingOrder, setEditingOrder] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [editedFiles, setEditedFiles] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLocationUpdateModalOpen, setIsLocationUpdateModalOpen] = useState(false);

  const [companyNameFilter, setCompanyNameFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedColumn, setSelectedColumn] = useState("all");
  const [activeTab, setActiveTab] = useState("pending");

  const [visiblePendingColumns, setVisiblePendingColumns] = useState(
    pendingColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  );
  const [visibleHistoryColumns, setVisibleHistoryColumns] = useState(
    historyColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  );

  // Separate loading states to prevent race conditions
  const [loadingPending, setLoadingPending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const loading = loadingPending || loadingHistory;
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { user: currentUser } = useAuth();

  const APPS_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbyzW8-RldYx917QpAfO4kY-T8_ntg__T0sbr7Yup2ZTVb1FC5H1g6TYuJgAU6wTquVM/exec";
  const SHEET_ID = "1yEsh4yzyvglPXHxo-5PT70VpwVJbxV7wwH8rpU1RFJA";
  const SHEET_NAME = "DISPATCH-DELIVERY";

  // Robust date parser for sorting that handles various formats including GVIZ Date() and DD/MM/YYYY
  const parseFlexibleDate = (dateVal) => {
    if (!dateVal) return 0;
    const s = String(dateVal);

    // 1. Handle Google Sheets GVIZ Date format: "Date(2026,0,31)"
    if (s.startsWith("Date(")) {
      const match = s.match(/Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)/);
      if (match) {
        return new Date(
          parseInt(match[1]),
          parseInt(match[2]),
          parseInt(match[3]),
          parseInt(match[4] || 0),
          parseInt(match[5] || 0),
          parseInt(match[6] || 0)
        ).getTime();
      }
    }

    // 2. Handle DD/MM/YYYY or DD-MM-YYYY
    const parts = s.split(/[/-]/);
    if (parts.length >= 3 && parts[0].length <= 2 && parts[2].length === 4) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const timeMatch = s.match(/\s+(\d+):(\d+):?(\d+)?/);
      if (timeMatch) {
        const d = new Date(year, month, day, parseInt(timeMatch[1]), parseInt(timeMatch[2]), parseInt(timeMatch[3] || 0));
        if (!isNaN(d.getTime())) return d.getTime();
      }
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d.getTime();
    }

    // 3. Default browser parsing
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  };

  const formatDateToMMDDYYYY = (dateVal) => {
    if (!dateVal || dateVal === "" || dateVal === "-") return "-";
    const s = String(dateVal);

    let d;
    if (s.startsWith("Date(")) {
      const match = s.match(/Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)/);
      if (match) {
        d = new Date(
          parseInt(match[1]),
          parseInt(match[2]),
          parseInt(match[3])
        );
      }
    } else {
      const datePart = s.split(" ")[0];
      const parts = datePart.split(/[/-]/);
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          // DD/MM/YYYY
          d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        } else if (parts[0].length === 4) {
          // YYYY/MM/DD
          d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
      }
    }

    if (!d || isNaN(d.getTime())) {
      const attempt = new Date(dateVal);
      if (!isNaN(attempt.getTime())) d = attempt;
      else return s.split(" ")[0];
    }

    const mm = (d.getMonth() + 1).toString().padStart(2, "0");
    const dd = d.getDate().toString().padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  const fetchPendingOrders = async () => {
    setLoadingPending(true);
    setError(null);

    try {
      // Use the authorized Apps Script proxy to bypass CORS/Auth issues
      const fetchUrl = `${APPS_SCRIPT_URL}?sheet=${encodeURIComponent(SHEET_NAME)}&action=fetch`;
      const response = await fetch(fetchUrl);
      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        const ordersMap = new Map();

        // Assuming headers are in rows 1-6, so we start processing from index 6 (7th row)
        result.data.slice(6).forEach((row, index) => {
          if (row && row[105]) { // D-Sr Number at index 105
            const dSrNumber = String(row[105]).trim();
            if (!dSrNumber) return;

            const actualRowIndex = index + 7; // Accounting for slice(6)
            const planned5 = row[62] || null; // Column BK
            const actual6 = row[71] || null;  // Column BT

            // Dispatch Pending logic: planned5 && !actual6
            const hasPlanned5 = !!planned5 && String(planned5).trim() !== "" && String(planned5).trim() !== "-";
            const noActual6 = !actual6 || String(actual6).trim() === "" || String(actual6).trim() === "-" || String(actual6).trim().toLowerCase() === "n/a";

            if (hasPlanned5 && noActual6) {
              const order = {
                rowIndex: actualRowIndex,
                id: dSrNumber,
                dSrNumber: dSrNumber,
                timeStamp: row[0] || "",
                orderNo: row[1] || "",
                quotationNo: row[2] || "",
                companyName: row[3] || "",
                contactPersonName: row[4] || "",
                contactNumber: row[5] || "",
                warehouseLocation: row[103] || "",
                billingAddress: row[6] || "",
                shippingAddress: row[7] || "",
                paymentMode: row[8] || "",
                paymentTerms: row[10] || "",
                qty: row[19] || "",
                transportMode: row[12] || "",
                transportid: row[25] || "",
                freightType: row[11] || "",
                destination: row[13] || "",
                poNumber: row[14] || "",
                offer: row[17] || "",
                amount: Number.parseFloat(row[20]) || 0,
                invoiceNumber: row[65] || "",
                contactPerson: row[4] || "",
                quantity: row[10] || "",
                totalQty: row[19] || "",
                quotationCopy: row[9] || "",
                fullRowData: row,
                conveyedForRegistration: row[18] || "",
                approvedName: row[21] || "",
                calibrationCertRequired: row[22] || "",
                certificateCategory: row[23] || "",
                installationRequired: row[24] || "",
                ewayBillDetails: row[25] || "",
                ewayBillAttachment: row[26] || "",
                srnNumber: row[27] || "",
                srnNumberAttachment: row[28] || "",
                attachment: row[29] || "",
                
                // Item columns indices 30-57
                itemName1: row[30] || "",
                quantity1: row[31] || "",
                itemName2: row[32] || "",
                quantity2: row[33] || "",
                itemName3: row[34] || "",
                quantity3: row[35] || "",
                itemName4: row[36] || "",
                quantity4: row[37] || "",
                itemName5: row[38] || "",
                quantity5: row[39] || "",
                itemName6: row[40] || "",
                quantity6: row[41] || "",
                itemName7: row[42] || "",
                quantity7: row[43] || "",
                itemName8: row[44] || "",
                quantity8: row[45] || "",
                itemName9: row[46] || "",
                quantity9: row[47] || "",
                itemName10: row[48] || "",
                quantity10: row[49] || "",
                itemName11: row[50] || "",
                quantity11: row[51] || "",
                itemName12: row[52] || "",
                quantity12: row[53] || "",
                itemName13: row[54] || "",
                quantity13: row[55] || "",
                itemName14: row[56] || "",
                quantity14: row[57] || "",

                itemQtyJson: row[58] || null,
                remarks: row[60] || "",
                quotationCopy2: row[15] || "",
                acceptanceCopy: row[16] || "",
                vehicleNo: row[26] || "",
                invoiceNumber: row[65] || "",
                invoiceUpload: row[66] || "",
                ewayBillUpload: row[67] || "",
                totalQtyHistory: row[68] || "",
                totalBillAmount: row[69] || "",
                creName: row[106] || "",
                invoiceCreatedDate: row[111] || "",

                planned5: planned5,
                actual5: row[111] || "",
                actual6: actual6,

                beforePhoto: row[73] || "",
                afterPhoto: row[74] || "",
                biltyUpload: row[75] || "",
                transporterName: row[76] || "",
                transporterContact: row[77] || "",
                biltyNumber: row[78] || "",
                totalCharges: row[79] || "",
                warehouseRemarks: row[80] || "",
                
                // Serial Code Components from DI, DJ, DK (Indices 112, 113, 114)
                serialNumbers: row[112] || "",
                serialDates: row[113] || "",
                serialLocations: row[114] || "",
              };
              ordersMap.set(dSrNumber, order);
            }
          }
        });

        const pendingOrders = Array.from(ordersMap.values());

        // Sort pending orders by Column BK date (planned5) - most recent first
        pendingOrders.sort((a, b) => {
          return parseFlexibleDate(b.planned5) - parseFlexibleDate(a.planned5);
        });

        setPendingOrders(pendingOrders);
      } else {
        throw new Error(result.message || "Failed to fetch data from script");
      }
    } catch (err) {
      console.error("Error fetching pending orders:", err);
      setError(err.message);
      setPendingOrders([]);
    } finally {
      setLoadingPending(false);
    }
  };

  const fetchHistoryOrders = async () => {
    setLoadingHistory(true);
    setError(null);

    try {
      // Fetch ONLY Warehouse sheet for history section via proxy to bypass CORS
      const fetchUrl = `${APPS_SCRIPT_URL}?sheet=Warehouse&action=fetch`;
      const whResponse = await fetch(fetchUrl);
      const result = await whResponse.json();

      if (result.success && Array.isArray(result.data)) {
        const ordersMap = new Map();

        result.data.forEach((row, index) => {
          if (row && row[1]) { // Order No. at index 1
            const dSrNumber = row[105] ? String(row[105]).trim() : "";
            const actualRowIndex = index + 1;

            const order = {
              rowIndex: actualRowIndex,
              id: dSrNumber || `WH-${index}`,
              dSrNumber: dSrNumber,
              orderNo: row[1] ? String(row[1]).trim() : "", // Column B (index 1)
              quotationNo: row[2] || "",           // Column C (index 2)

              // NEW MAPPINGS FOR WAREHOUSE SHEET
              companyName: row[133] || "",       // Column ED (index 133)
              contactPersonName: row[4] || "",     // Column E (index 4)
              contactNumber: row[135] || "",     // Column EF (index 135)
              billingAddress: row[136] || "",    // Column EG (index 136)
              shippingAddress: row[137] || "",   // Column EH (index 137)

              // Items (L/M, N/O, P/Q)
              itemName1: row[11] || "",           // Column L
              quantity1: row[12] || "",           // Column M
              itemName2: row[13] || "",           // Column N
              quantity2: row[14] || "",           // Column O
              itemName3: row[15] || "",           // Column P
              quantity3: row[16] || "",           // Column Q

              invoiceNumber: row[138] || "",     // Column EI (index 138)
              invoiceCreatedDate: row[139] || "", // Assuming EJ (index 139) for now
              invoiceUpload: row[140] || "",      // Assuming EK (index 140) for now
              quotationCopy: row[141] || "",      // Assuming EL (index 141) for now
              creName: row[142] || "",           // Column EM (index 142)
              transportMode: row[143] || "",     // Assuming EN (index 143) for now

              // Processed info
              dispatchStatus: row[131] || "okay", // Column EB (index 131)
              notOkReason: row[132] || "",        // Column EC (index 132)

              // Photos and transporter info from Warehouse sheet (first columns)
              beforePhoto: row[3] || "",           // Column D
              afterPhoto: row[4] || "",            // Column E
              biltyUpload: row[5] || "",           // Column F
              transporterName: row[6] || "",      // Column G
              warehouseLocation: row[103] || "", // Column CZ (index 103)
              transporterContact: row[7] || "",   // Column H
              biltyNumber: row[8] || "",          // Column I
              totalCharges: row[9] || "",         // Column J
              warehouseRemarks: row[10] || "",    // Column K

              // Timestamp for sorting
              planned5: row[0] || "",             // Column A (TimeStamp)
              warehouseData: {
                processedAt: row[0] || "",
                processedBy: "Warehouse Team",
              }
            };
            ordersMap.set(order.id, order);
          }
        });

        const historyOrders = Array.from(ordersMap.values());
        // Sort history orders by TimeStamp (processed date) - most recent first
        historyOrders.sort((a, b) => {
          return parseFlexibleDate(b.planned5) - parseFlexibleDate(a.planned5);
        });

        setHistoryOrders(historyOrders);
      }
    } catch (err) {
      console.error("Error fetching history orders:", err);
      setError(err.message);
      setHistoryOrders([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchPendingOrders();
    fetchHistoryOrders();
  }, []);

  // Add this function after the useAuth hook
  const filterOrdersByUserRole = (orders, currentUser) => {
    if (!currentUser) return orders;

    // Super admin sees all data
    if (currentUser.role === "super_admin") {
      return orders;
    }

    // Filter by location
    const userLocations = currentUser.location || ["None"];
    const isAllLocations = userLocations.some(l => l.toLowerCase() === "all");

    // Helper to normalize location strings for robust matching
    const normalizeLoc = (loc) => String(loc || "").toLowerCase().replace(/^by\s*/i, "").replace(/[^a-z0-9]/g, "").trim();

    return orders.filter((order) => {
      // Check warehouse access
      const orderLocNormalized = normalizeLoc(order.warehouseLocation);
      const matchWarehouse = isAllLocations || 
                            userLocations.some(l => normalizeLoc(l) === orderLocNormalized);
      
      return matchWarehouse;
    });
  };

  const getUniqueCompanyNames = () => {
    // Only show companies from the currently filtered table data
    const sourceOrders = activeTab === "pending" ? filteredPendingOrders : filteredHistoryOrders;
    const companies = [...new Set(sourceOrders.map((order) => order.companyName))];
    return companies.filter((company) => company).sort();
  };

  // Update the filteredPendingOrders useMemo to include role-based filtering
  const filteredPendingOrders = useMemo(() => {
    let filtered = pendingOrders;

    // Apply user role-based filtering
    filtered = filterOrdersByUserRole(filtered, currentUser);

    // Apply company name filter
    if (companyNameFilter !== "all") {
      filtered = filtered.filter(
        (order) => order.companyName === companyNameFilter
      );
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((order) => {
        if (selectedColumn === "all") {
          const searchableFields = pendingColumns
            .filter((col) => col.searchable)
            .map((col) => String(order[col.key] || "").toLowerCase());
          return searchableFields.some((field) =>
            field.includes(searchTerm.toLowerCase())
          );
        } else {
          const fieldValue = String(order[selectedColumn] || "").toLowerCase();
          return fieldValue.includes(searchTerm.toLowerCase());
        }
      });
    }

    return filtered;
  }, [
    pendingOrders,
    searchTerm,
    selectedColumn,
    currentUser,
    companyNameFilter,
    activeTab,
  ]);

  // Update the filteredHistoryOrders useMemo to include role-based filtering
  const filteredHistoryOrders = useMemo(() => {
    let filtered = historyOrders;

    // Apply user role-based filtering
    filtered = filterOrdersByUserRole(filtered, currentUser);

    // Apply company name filter
    if (companyNameFilter !== "all") {
      filtered = filtered.filter(
        (order) => order.companyName === companyNameFilter
      );
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((order) => {
        if (selectedColumn === "all") {
          const searchableFields = historyColumns
            .filter((col) => col.searchable)
            .map((col) => String(order[col.key] || "").toLowerCase());
          return searchableFields.some((field) =>
            field.includes(searchTerm.toLowerCase())
          );
        } else {
          const fieldValue = String(order[selectedColumn] || "").toLowerCase();
          return fieldValue.includes(searchTerm.toLowerCase());
        }
      });
    }

    return filtered;
  }, [
    historyOrders,
    searchTerm,
    selectedColumn,
    currentUser,
    companyNameFilter,
    activeTab,
  ]);

  // Column visibility handlers
  const togglePendingColumn = (columnKey) => {
    setVisiblePendingColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };

  const toggleHistoryColumn = (columnKey) => {
    setVisibleHistoryColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };

  const showAllPendingColumns = () => {
    setVisiblePendingColumns(
      pendingColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
    );
  };

  const hideAllPendingColumns = () => {
    setVisiblePendingColumns(
      pendingColumns.reduce(
        (acc, col) => ({ ...acc, [col.key]: col.key === "actions" }),
        {}
      )
    );
  };

  const showAllHistoryColumns = () => {
    setVisibleHistoryColumns(
      historyColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
    );
  };

  const hideAllHistoryColumns = () => {
    setVisibleHistoryColumns(
      historyColumns.reduce((acc, col) => ({ ...acc, [col.key]: false }), {})
    );
  };

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const processWarehouseOrder = async (dialogData) => {
    try {
      setUploading(true);

      const {
        order,
        beforePhotos,
        afterPhotos,
        biltyUploads,
        transporterName,
        transporterContact,
        biltyNumber,
        totalCharges,
        warehouseRemarks,
        dispatchStatus,
        notOkReason,
        expenseAmount,
        itemQuantities,
        serialNumbers,   // Included from dialog
        serialDates,     // Included from dialog
        serialLocations, // Included from dialog
        fileUrls, // Pre-uploaded file URLs from the dialog
      } = dialogData;

      const formData = new FormData();
      formData.append("sheetName", SHEET_NAME);
      formData.append("action", "updateByDSrNumber");
      formData.append("dSrNumber", order.dSrNumber);

      // Check if we have pre-uploaded file URLs from the dialog
      const hasPreUploadedUrls = fileUrls && (fileUrls.beforePhotoUrl || fileUrls.afterPhotoUrl || fileUrls.biltyUrl);

      if (hasPreUploadedUrls) {
        // Use pre-uploaded URLs directly (files already uploaded by dialog)
        if (fileUrls.beforePhotoUrl) {
          formData.append("beforePhotoUrl", fileUrls.beforePhotoUrl);
        }
        if (fileUrls.afterPhotoUrl) {
          formData.append("afterPhotoUrl", fileUrls.afterPhotoUrl);
        }
        if (fileUrls.biltyUrl) {
          formData.append("biltyUrl", fileUrls.biltyUrl);
        }
      } else {
        // Fallback: Handle file uploads the old way (supporting multiple files)
        const uploadFileArray = async (files, prefix) => {
          if (!files || files.length === 0) return;

          formData.append(`${prefix}Count`, files.length.toString());

          for (let i = 0; i < files.length; i++) {
            try {
              const file = files[i];
              const base64Data = await convertFileToBase64(file);
              formData.append(`${prefix}File_${i}`, base64Data);
              formData.append(`${prefix}FileName_${i}`, file.name);
              formData.append(`${prefix}MimeType_${i}`, file.type);
            } catch (error) {
              console.error(`Error converting ${prefix} file ${i}:`, error);
            }
          }

          // Also keep legacy single file parameter for backend compatibility
          try {
            const firstFile = files[0];
            const base64Data = await convertFileToBase64(firstFile);
            formData.append(`${prefix}File`, base64Data);
            formData.append(`${prefix}FileName`, firstFile.name);
            formData.append(`${prefix}MimeType`, firstFile.type);
          } catch (e) { }
        };

        await uploadFileArray(beforePhotos, "beforePhoto");
        await uploadFileArray(afterPhotos, "afterPhoto");
        await uploadFileArray(biltyUploads, "bilty");
      }

      // Create rowData with all 140 columns (expanded for data safety)
      const rowData = new Array(140).fill("");

      // Add today's date to BT column (index 71, Column 72)
      const today = new Date();
      const formattedDate =
        `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()} ` +
        `${today.getHours()}:${today.getMinutes()}:${today.getSeconds()}`;

      rowData[71] = formattedDate; // BT (Column 72)

      // Add pre-uploaded file URLs to the row data columns
      // BV(73) = Before Photo, BW(74) = After Photo, BX(75) = Bilty
      if (hasPreUploadedUrls) {
        rowData[73] = fileUrls.beforePhotoUrl || ""; // Column BV - Before Photo URLs
        rowData[74] = fileUrls.afterPhotoUrl || "";  // Column BW - After Photo URLs
        rowData[75] = fileUrls.biltyUrl || "";       // Column BX - Bilty URLs
      }

      // Add warehouse data to columns BY to CC (indexes 76-80)
      rowData[76] = transporterName;    // Column BY
      rowData[77] = transporterContact; // Column BZ
      rowData[78] = biltyNumber;        // Column CA
      rowData[79] = totalCharges;       // Column CB
      rowData[80] = warehouseRemarks;   // Column CC
      rowData[115] = expenseAmount;      // Column DL

      // Note: Columns EB (131) and EC (132) are intentionally NOT written to on DISPATCH-DELIVERY sheet

      // Process ALL items: First column items (1-14), then JSON items continue from 15 onwards
      let allItems = [];
      let totalQty = 0;

      // 1. Collect column items (1-14)
      for (let i = 1; i <= 14; i++) {
        const itemName = order[`itemName${i}`];
        let quantity = order[`quantity${i}`];

        // Check if we have updated quantity in itemQuantities
        const itemKey = `column-${i}`;
        if (itemQuantities[itemKey] !== undefined) {
          quantity = itemQuantities[itemKey];
        }

        if (itemName || quantity) {
          allItems.push({
            name: itemName || "",
            quantity: quantity || "",
          });

          const qtyNum = parseInt(quantity) || 0;
          totalQty += qtyNum;
        }
      }

      // 2. Collect JSON items (continue from item 15 onwards)
      if (order.itemQtyJson) {
        try {
          let jsonItems = [];

          if (typeof order.itemQtyJson === "string") {
            jsonItems = JSON.parse(order.itemQtyJson);
          } else if (Array.isArray(order.itemQtyJson)) {
            jsonItems = order.itemQtyJson;
          }

          jsonItems.forEach((item, idx) => {
            const itemKey = `json-${idx}`;
            let quantity = item.quantity;

            if (itemQuantities[itemKey] !== undefined) {
              quantity = itemQuantities[itemKey];
            }

            if (item.name || quantity) {
              allItems.push({
                name: item.name || "",
                quantity: quantity || "",
              });

              const qtyNum = parseInt(quantity) || 0;
              totalQty += qtyNum;
            }
          });
        } catch (error) {
          console.error("Error parsing JSON items:", error);
        }
      }

      formData.append("rowData", JSON.stringify(rowData));

      const updateResponse = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "cors",
        body: formData,
      });

      if (!updateResponse.ok) {
        throw new Error(`HTTP error! status: ${updateResponse.status}`);
      }

      // Warehouse sheet update (second call) - Now using updateByOrderNo to prevent duplicates
      const formData2 = new FormData();
      formData2.append("sheetName", "Warehouse");
      formData2.append("action", "updateByOrderNo");
      formData2.append("orderNo", order.orderNo);

      formData2.append("totalItems", allItems.length.toString());

      // Prepare Warehouse sheet data with fixed columns EB (index 131) and EC (index 132)
      // and Serial components at EQ (146), ER (147), ES (148)
      const warehouseRowData = new Array(149).fill("");
      warehouseRowData[0] = formattedDate; // 1. Time Stamp
      warehouseRowData[1] = order.orderNo; // 2. Order No.
      warehouseRowData[2] = order.quotationNo; // 3. Quotation No.

      // Use pre-uploaded file URLs if available, otherwise preserve existing
      if (hasPreUploadedUrls) {
        warehouseRowData[3] = fileUrls.beforePhotoUrl || ""; // 4. Before Photo URLs
        warehouseRowData[4] = fileUrls.afterPhotoUrl || "";  // 5. After Photo URLs
        warehouseRowData[5] = fileUrls.biltyUrl || "";       // 6. Bilty Upload URLs
      } else {
        warehouseRowData[3] = order.beforePhoto || "";
        warehouseRowData[4] = order.afterPhoto || "";
        warehouseRowData[5] = order.biltyUpload || "";
      }

      warehouseRowData[6] = transporterName || order.transporterName || ""; // 7. Transporter Name
      warehouseRowData[7] = transporterContact || order.transporterContact || ""; // 8. Transporter Contact
      warehouseRowData[8] = biltyNumber || order.biltyNumber || ""; // 9. Bilty No.
      warehouseRowData[9] = totalCharges || order.totalCharges || ""; // 10. Total Charges
      warehouseRowData[10] = warehouseRemarks || order.warehouseRemarks || ""; // 11. Warehouse Remarks
      warehouseRowData[115] = expenseAmount; // 116. Expense Amount

      // Add ALL items to warehouse sheet starting from index 11
      // Items: Column L onwards (index 11 = Item Name 1, index 12 = Qty 1, etc.)
      let itemIndex = 11;
      allItems.forEach((item) => {
        warehouseRowData[itemIndex] = item.name || "";
        warehouseRowData[itemIndex + 1] = item.quantity || "";
        itemIndex += 2;
      });

      // Explicitly submit to Column EB (Index 131) and Column EC (Index 132)
      // Preserve existing if not provided
      warehouseRowData[131] = dispatchStatus || order.dispatchStatus || "okay";
      warehouseRowData[132] = dispatchStatus === "notokay" ? notOkReason : (order.notOkReason || "");
      
      // New mappings for Warehouse sheet EO and EP
      warehouseRowData[144] = order.dSrNumber || ""; // EO: D-Sr No.
      warehouseRowData[145] = order.warehouseLocation || ""; // EP: Dispatch Location
      
      // Handle S-Code splitting for Warehouse columns EQ, ER, ES
      let finalSNs = [];
      let finalDates = [];
      let finalLocs = [];

      if (dialogData.itemSCodes && Array.isArray(dialogData.itemSCodes)) {
        dialogData.itemSCodes.forEach(code => {
          if (!code) {
            finalSNs.push("");
            finalDates.push("");
            finalLocs.push("");
            return;
          }
          const parts = code.split("-");
          finalSNs.push(parts[0] || "");
          finalDates.push(parts[1] || "");
          finalLocs.push(parts[2] || "");
        });
      }

      warehouseRowData[146] = finalSNs.length > 0 ? finalSNs.join(", ") : (serialNumbers || order.serialNumbers || ""); // EQ
      warehouseRowData[147] = finalDates.length > 0 ? finalDates.join(", ") : (serialDates || order.serialDates || "");     // ER
      warehouseRowData[148] = finalLocs.length > 0 ? finalLocs.join(", ") : (serialLocations || order.serialLocations || ""); // ES

      formData2.append("rowData", JSON.stringify(warehouseRowData));

      let response2 = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "cors",
        body: formData2,
      });

      let whResult;
      try {
        const text = await response2.text();
        whResult = JSON.parse(text);
      } catch (e) {
        whResult = { success: false, error: "Parse error" };
      }

      // If update failed because order was not found, try inserting instead
      if (!whResult.success && (whResult.error?.includes("not found") || whResult.error?.includes("Order No."))) {
        console.log("Order not found in Warehouse, falling back to insert...");
        const formDataInsert = new FormData();
        formDataInsert.append("sheetName", "Warehouse");
        formDataInsert.append("action", "insertWarehouseWithDynamicColumns");
        formDataInsert.append("orderNo", order.orderNo);
        formDataInsert.append("totalItems", allItems.length.toString());
        formDataInsert.append("rowData", JSON.stringify(warehouseRowData));

        response2 = await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          mode: "cors",
          body: formDataInsert,
        });

        try {
          const text = await response2.text();
          whResult = JSON.parse(text);
        } catch (e) {
          whResult = { success: true }; // Assume success if insert fetch completed
        }
      }

      if (whResult.success !== false) {
        setIsSaving(false);
        setIsDialogOpen(false);
        fetchPendingOrders();
        fetchHistoryOrders();
        return {
          success: true,
          fileUrls: whResult.fileUrls,
          totalItems: allItems.length,
          totalQty: totalQty,
        };
      } else {
        throw new Error(whResult.error || "Warehouse update failed");
      }
    } catch (err) {
      console.error("Error processing warehouse order:", err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsSaving(false);
    }
  };

  const handleProcess = (orderId) => {
    const order = pendingOrders.find((o) => o.id === orderId);

    if (!order || !order.dSrNumber) {
      alert(
        `Error: D-Sr Number not found for order ${orderId}. Please ensure column DB has a value.`
      );
      return;
    }

    setSelectedOrder(order);
    setIsDialogOpen(true);
  };

  const handleProcessSubmit = async (dialogData) => {
    const result = await processWarehouseOrder(dialogData);

    if (result.success) {
      setIsDialogOpen(false);
      setSelectedOrder(null);

      let message = `✅ Warehouse processing COMPLETED!\n\n`;

      if (result.totalItems > 14) {
        message += `- Remaining ${result.totalItems - 14
          } items saved in JSON format\n`;
      }

      if (result.fileUrls) {
        message += `\n📎 Files uploaded:\n`;
        if (result.fileUrls.beforePhotoUrl) message += `• Before photo\n`;
        if (result.fileUrls.afterPhotoUrl) message += `• After photo\n`;
        if (result.fileUrls.biltyUrl) message += `• Bilty document\n`;
      }

      alert(message);

      // Refresh data
      setTimeout(() => {
        fetchPendingOrders();
        fetchHistoryOrders();
      }, 1000);
    } else {
      alert(
        `❌ Error: ${result.error}\n\nPlease try again or contact support.`
      );
    }
  };

  // Edit functions for History section
  const handleEdit = (order) => {
    console.log("Editing order:", order);
    console.log("Order dSrNumber:", order.dSrNumber);

    setEditingOrder(order);

    // Create a complete copy of the order object including dSrNumber
    const completeEditedData = { ...order };

    // Also copy any nested objects if needed
    Object.keys(order).forEach((key) => {
      if (order[key] !== undefined) {
        completeEditedData[key] = order[key];
      }
    });

    setEditedData(completeEditedData);
    setEditedFiles({});

    console.log("Edited data after copy:", completeEditedData);
  };

  const handleCancelEdit = () => {
    setEditingOrder(null);
    setEditedData({});
    setEditedFiles({});
  };

  const handleSaveEdit = async () => {
    if (!editingOrder) {
      console.error("No order being edited");
      return;
    }

    // Use orderNo from editingOrder if not in editedData
    const orderNoToUpdate = editedData.orderNo || editingOrder.orderNo;

    if (!orderNoToUpdate) {
      alert("❌ Error: Order number not found. Cannot update.");
      return;
    }

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append("sheetName", SHEET_NAME);
      formData.append("action", "updateByOrderNo");
      formData.append("orderNo", orderNoToUpdate);

      // Handle file uploads for edit with correct parameter names
      if (editedFiles.beforePhoto) {
        try {
          const base64Data = await convertFileToBase64(editedFiles.beforePhoto);
          formData.append("beforePhotoFile", base64Data);
          formData.append("beforePhotoFileName", editedFiles.beforePhoto.name);
          formData.append("beforePhotoMimeType", editedFiles.beforePhoto.type);
        } catch (error) {
          console.error("Error converting before photo:", error);
        }
      }

      if (editedFiles.afterPhoto) {
        try {
          const base64Data = await convertFileToBase64(editedFiles.afterPhoto);
          formData.append("afterPhotoFile", base64Data);
          formData.append("afterPhotoFileName", editedFiles.afterPhoto.name);
          formData.append("afterPhotoMimeType", editedFiles.afterPhoto.type);
        } catch (error) {
          console.error("Error converting after photo:", error);
        }
      }

      if (editedFiles.biltyUpload) {
        try {
          const base64Data = await convertFileToBase64(editedFiles.biltyUpload);
          formData.append("biltyFile", base64Data);
          formData.append("biltyFileName", editedFiles.biltyUpload.name);
          formData.append("biltyMimeType", editedFiles.biltyUpload.type);
        } catch (error) {
          console.error("Error converting bilty file:", error);
        }
      }

      if (editedFiles.invoiceUpload) {
        try {
          const base64Data = await convertFileToBase64(
            editedFiles.invoiceUpload
          );
          formData.append("invoiceFile", base64Data);
          formData.append("invoiceFileName", editedFiles.invoiceUpload.name);
          formData.append("invoiceMimeType", editedFiles.invoiceUpload.type);
        } catch (error) {
          console.error("Error converting invoice file:", error);
        }
      }

      if (editedFiles.ewayBillUpload) {
        try {
          const base64Data = await convertFileToBase64(
            editedFiles.ewayBillUpload
          );
          formData.append("ewayBillFile", base64Data);
          formData.append("ewayBillFileName", editedFiles.ewayBillUpload.name);
          formData.append("ewayBillMimeType", editedFiles.ewayBillUpload.type);
        } catch (error) {
          console.error("Error converting eway bill file:", error);
        }
      }

      if (editedFiles.quotationCopy) {
        try {
          const base64Data = await convertFileToBase64(
            editedFiles.quotationCopy
          );
          formData.append("quotationFile", base64Data);
          formData.append("quotationFileName", editedFiles.quotationCopy.name);
          formData.append("quotationMimeType", editedFiles.quotationCopy.type);
        } catch (error) {
          console.error("Error converting quotation file:", error);
        }
      }

      if (editedFiles.quotationCopy2) {
        try {
          const base64Data = await convertFileToBase64(
            editedFiles.quotationCopy2
          );
          formData.append("quotationFile2", base64Data);
          formData.append(
            "quotationFileName2",
            editedFiles.quotationCopy2.name
          );
          formData.append(
            "quotationMimeType2",
            editedFiles.quotationCopy2.type
          );
        } catch (error) {
          console.error("Error converting quotation file:", error);
        }
      }

      if (editedFiles.acceptanceCopy) {
        try {
          const base64Data = await convertFileToBase64(
            editedFiles.acceptanceCopy
          );
          formData.append("acceptanceFile", base64Data);
          formData.append(
            "acceptanceFileName",
            editedFiles.acceptanceCopy.name
          );
          formData.append(
            "acceptanceMimeType",
            editedFiles.acceptanceCopy.type
          );
        } catch (error) {
          console.error("Error converting acceptance file:", error);
        }
      }

      if (editedFiles.srnNumberAttachment) {
        try {
          const base64Data = await convertFileToBase64(
            editedFiles.srnNumberAttachment
          );
          formData.append("srnNumberAttachmentFile", base64Data);
          formData.append(
            "srnNumberAttachmentFileName",
            editedFiles.srnNumberAttachment.name
          );
          formData.append(
            "srnNumberAttachmentMimeType",
            editedFiles.srnNumberAttachment.type
          );
        } catch (error) {
          console.error("Error converting srn number attachment file:", error);
        }
      }

      if (editedFiles.attachment) {
        try {
          const base64Data = await convertFileToBase64(editedFiles.attachment);
          formData.append("attachmentFile", base64Data);
          formData.append("attachmentFileName", editedFiles.attachment.name);
          formData.append("attachmentMimeType", editedFiles.attachment.type);
        } catch (error) {
          console.error("Error converting attachment file:", error);
        }
      }

      // Create rowData with all 110 columns
      const rowData = new Array(110).fill("");

      // Map ALL edited data to their respective column positions
      // Basic order information (columns B-AE)
      if (editedData.orderNo !== undefined) rowData[1] = editedData.orderNo; // Column B
      if (editedData.quotationNo !== undefined)
        rowData[2] = editedData.quotationNo; // Column C
      if (editedData.companyName !== undefined)
        rowData[3] = editedData.companyName; // Column D
      if (editedData.contactPersonName !== undefined)
        rowData[4] = editedData.contactPersonName; // Column E
      if (editedData.contactNumber !== undefined)
        rowData[5] = editedData.contactNumber; // Column F
      if (editedData.billingAddress !== undefined)
        rowData[6] = editedData.billingAddress; // Column G
      if (editedData.shippingAddress !== undefined)
        rowData[7] = editedData.shippingAddress; // Column H
      if (editedData.paymentMode !== undefined)
        rowData[8] = editedData.paymentMode; // Column I
      if (editedData.quotationCopy !== undefined)
        rowData[9] = editedData.quotationCopy; // Column J
      if (editedData.paymentTerms !== undefined)
        rowData[10] = editedData.paymentTerms; // Column K
      if (editedData.transportMode !== undefined)
        rowData[12] = editedData.transportMode; // Column M
      if (editedData.freightType !== undefined)
        rowData[11] = editedData.freightType; // Column L
      if (editedData.destination !== undefined)
        rowData[13] = editedData.destination; // Column N
      if (editedData.poNumber !== undefined) rowData[14] = editedData.poNumber; // Column O
      if (editedData.quotationCopy2 !== undefined)
        rowData[15] = editedData.quotationCopy2; // Column P
      if (editedData.acceptanceCopy !== undefined)
        rowData[16] = editedData.acceptanceCopy; // Column Q
      if (editedData.offer !== undefined) rowData[17] = editedData.offer; // Column R
      if (editedData.conveyedForRegistration !== undefined)
        rowData[18] = editedData.conveyedForRegistration; // Column S
      if (editedData.qty !== undefined) rowData[19] = editedData.qty; // Column T
      if (editedData.amount !== undefined) rowData[20] = editedData.amount; // Column U
      if (editedData.approvedName !== undefined)
        rowData[21] = editedData.approvedName; // Column V
      if (editedData.calibrationCertRequired !== undefined)
        rowData[22] = editedData.calibrationCertRequired; // Column W
      if (editedData.certificateCategory !== undefined)
        rowData[23] = editedData.certificateCategory; // Column X
      if (editedData.installationRequired !== undefined)
        rowData[24] = editedData.installationRequired; // Column Y
      if (editedData.transporterId !== undefined)
        rowData[25] = editedData.transporterId; // Column Z
      if (editedData.vehicleNo !== undefined)
        rowData[26] = editedData.vehicleNo; // Column AA
      if (editedData.srnNumber !== undefined)
        rowData[27] = editedData.srnNumber; // Column AB
      if (editedData.srnNumberAttachment !== undefined)
        rowData[28] = editedData.srnNumberAttachment; // Column AC
      if (editedData.attachment !== undefined)
        rowData[29] = editedData.attachment; // Column AD

      if (editedData.totalQty !== undefined) rowData[59] = editedData.totalQty; // Column BH
      if (editedData.remarks !== undefined) rowData[60] = editedData.remarks; // Column BI
      if (editedData.invoiceNumber !== undefined)
        rowData[65] = editedData.invoiceNumber; // Column BN

      if (editedData.invoiceUpload !== undefined)
        rowData[66] = editedData.invoiceUpload; // Column BO
      if (editedData.ewayBillUpload !== undefined)
        rowData[67] = editedData.ewayBillUpload;
      if (editedData.totalQtyHistory !== undefined)
        rowData[68] = editedData.totalQtyHistory; // Column BQ
      if (editedData.totalBillAmount !== undefined)
        rowData[69] = editedData.totalBillAmount; // Column BR

      if (editedData.beforePhoto !== undefined)
        rowData[73] = editedData.beforePhoto; // Column CE
      if (editedData.afterPhoto !== undefined)
        rowData[74] = editedData.afterPhoto; // Column CF
      if (editedData.biltyUpload !== undefined)
        rowData[75] = editedData.biltyUpload; // Column CG

      // Warehouse data columns (BZ to CD: indexes 76-80)
      if (editedData.transporterName !== undefined)
        rowData[76] = editedData.transporterName; // Column BZ
      if (editedData.transporterContact !== undefined)
        rowData[77] = editedData.transporterContact; // Column CA
      if (editedData.biltyNumber !== undefined)
        rowData[78] = editedData.biltyNumber; // Column CB
      if (editedData.totalCharges !== undefined)
        rowData[79] = editedData.totalCharges; // Column CC
      if (editedData.warehouseRemarks !== undefined)
        rowData[80] = editedData.warehouseRemarks; // Column CD

      // Item columns (columns AE to BH: indexes 30-59)
      for (let i = 1; i <= 14; i++) {
        const itemNameKey = `itemName${i}`;
        const quantityKey = `quantity${i}`;
        if (editedData[itemNameKey] !== undefined)
          rowData[30 + (i - 1) * 2] = editedData[itemNameKey];
        if (editedData[quantityKey] !== undefined)
          rowData[31 + (i - 1) * 2] = editedData[quantityKey];
      }

      formData.append("rowData", JSON.stringify(rowData));

      const updateResponse = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "cors",
        body: formData,
      });

      console.log("Response status:", updateResponse.status);

      if (!updateResponse.ok) {
        throw new Error(`HTTP error! status: ${updateResponse.status}`);
      }

      let result;
      try {
        const responseText = await updateResponse.text();
        console.log("Response text:", responseText);
        result = JSON.parse(responseText);
        console.log("Parsed result:", result);
      } catch (parseError) {
        console.log("Parse error:", parseError);
        result = { success: true };
      }

      if (result.success !== false) {
        // Update local state
        const updatedOrders = historyOrders.map((order) =>
          order.id === editingOrder.id ? { ...order, ...editedData } : order
        );
        setHistoryOrders(updatedOrders);

        setEditingOrder(null);
        setEditedData({});
        setEditedFiles({});

        alert("✅ Order updated successfully!");

        // Refresh data
        setTimeout(() => {
          fetchHistoryOrders();
        }, 1000);
      } else {
        throw new Error(result.error || "Update failed");
      }
    } catch (err) {
      console.error("Error updating order:", err);
      alert(`❌ Error: ${err.message}\n\nPlease try again or contact support.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDataChange = (key, value) => {
    setEditedData((prev) => ({ ...prev, [key]: value }));
  };

  const handleFileChange = (key, file) => {
    setEditedFiles((prev) => ({ ...prev, [key]: file }));
    // Also update the editedData to track the file name
    // setEditedData((prev) => ({
    //   ...prev,
    //   [key]: file ? `[New Upload: ${file.name}]` : prev[key],
    // }));
  };

  // Updated renderCellContent for History section with edit mode
  const renderHistoryCellContent = (order, columnKey) => {
    const isEditing = editingOrder?.id === order.id;

    if (columnKey === "editActions") {
      if (isEditing) {
        return (
          <div className="flex gap-1">
            <Button
              size="sm"
              onClick={handleSaveEdit}
              disabled={isSaving}
              className="h-7 px-2"
            >
              {isSaving ? (
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Save className="h-3 w-3 mr-1" />
              )}
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelEdit}
              className="h-7 px-2"
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          </div>
        );
      } else {
        return (
          <Button
            size="sm"
            onClick={() => handleEdit(order)}
            className="h-7 px-2"
          >
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
        );
      }
    }

    const isEditable =
      isEditing && columnKey !== "orderNo" && columnKey !== "quotationNo" && columnKey !== "planned5";

    if (isEditable) {
      // Render editable inputs for editable columns
      switch (columnKey) {
        case "companyName":
        case "contactPersonName":
        case "contactNumber":
        case "billingAddress":
        case "shippingAddress":
        case "paymentMode":
        case "paymentTerms":
        case "transportMode":
        case "freightType":
        case "destination":
        case "poNumber":
        case "offer":
        case "conveyedForRegistration":
        case "approvedName":
        case "calibrationCertRequired":
        case "certificateCategory":
        case "installationRequired":
        case "transporterId":
        case "srnNumber":
        case "remarks":
        case "invoiceNumber":
        case "transporterName":
        case "transporterContact":
        case "biltyNumber":
        case "totalCharges":
        case "warehouseRemarks":
          return (
            <Input
              value={editedData[columnKey] || ""}
              onChange={(e) => handleDataChange(columnKey, e.target.value)}
              className="h-7 text-sm"
              placeholder={`Enter ${columnKey}`}
            />
          );

        case "amount":
        case "totalBillAmount":
          return (
            <Input
              type="number"
              value={editedData[columnKey] || ""}
              onChange={(e) => handleDataChange(columnKey, e.target.value)}
              className="h-7 text-sm"
              placeholder="0"
            />
          );

        // File upload columns
        case "quotationCopy":
        case "quotationCopy2":
        case "acceptanceCopy":
        case "srnNumberAttachment":
        case "attachment":
        case "invoiceUpload":
        case "ewayBillUpload":
        case "beforePhoto":
        case "afterPhoto":
        case "biltyUpload":
          const currentValue = editedData[columnKey] || "";
          return (
            <div className="space-y-1">
              {currentValue && (
                <div className="flex items-center gap-1 mb-1">
                  <a
                    href={currentValue.startsWith("http") ? currentValue : "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Current:{" "}
                    {currentValue.includes("[New Upload")
                      ? currentValue
                      : "View Attachment"}
                  </a>
                </div>
              )}
              <Input
                type="file"
                onChange={(e) => handleFileChange(columnKey, e.target.files[0])}
                className="h-7 text-xs"
                accept={
                  columnKey.includes("Photo") ? "image/*" : "image/*,.pdf"
                }
              />
            </div>
          );

        // Item columns
        default:
          if (
            columnKey.startsWith("itemName") ||
            columnKey.startsWith("quantity")
          ) {
            return (
              <Input
                value={editedData[columnKey] || ""}
                onChange={(e) => handleDataChange(columnKey, e.target.value)}
                className="h-7 text-sm"
                type={columnKey.startsWith("quantity") ? "number" : "text"}
              />
            );
          }
          return (
            <Input
              value={editedData[columnKey] || ""}
              onChange={(e) => handleDataChange(columnKey, e.target.value)}
              className="h-7 text-sm"
            />
          );
      }
    }

    // Non-edit mode rendering
    const value = order[columnKey];
    const actualValue =
      value && typeof value === "object" && "v" in value ? value.v : value;

    switch (columnKey) {
      case "quotationCopy":
      case "quotationCopy2":
      case "acceptanceCopy":
      case "srnNumberAttachment":
      case "attachment":
      case "invoiceUpload":
      case "ewayBillUpload":
      case "beforePhoto":
      case "afterPhoto":
      case "biltyUpload":
        // Handle multiple URLs (comma-separated)
        if (actualValue && typeof actualValue === "string" &&
          (actualValue.startsWith("http") || actualValue.startsWith("https"))) {
          const urls = actualValue.split(",").map(url => url.trim()).filter(url => url.startsWith("http"));
          if (urls.length === 0) {
            return <Badge variant="secondary">N/A</Badge>;
          }
          if (urls.length === 1) {
            return (
              <a href={urls[0]} target="_blank" rel="noopener noreferrer">
                <Badge variant="default" className="cursor-pointer hover:bg-blue-700">
                  View Attachment
                </Badge>
              </a>
            );
          }
          // Multiple URLs - show each as a numbered link
          return (
            <div className="flex flex-wrap gap-1">
              {urls.map((url, index) => (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Open file ${index + 1} in new tab`}
                >
                  <Badge
                    variant="default"
                    className="cursor-pointer hover:bg-blue-700 text-xs"
                  >
                    {index + 1}
                  </Badge>
                </a>
              ))}
            </div>
          );
        }
        return <Badge variant="secondary">{actualValue || "N/A"}</Badge>;
      case "calibrationCertRequired":
      case "installationRequired":
        return (
          <Badge variant={actualValue === "Yes" ? "default" : "secondary"}>
            {actualValue || "N/A"}
          </Badge>
        );
      case "billingAddress":
      case "shippingAddress":
      case "remarks":
      case "warehouseRemarks":
        return (
          <div className="max-w-[200px] whitespace-normal break-words">
            {actualValue || ""}
          </div>
        );
      case "paymentMode":
        return (
          <div className="flex items-center gap-2">
            {actualValue}
            {actualValue === "Advance" && (
              <Badge variant="secondary">Required</Badge>
            )}
          </div>
        );
      case "dispatchStatus":
        if (!actualValue) return <Badge variant="secondary">N/A</Badge>;
        return (
          <Badge
            variant={actualValue.toLowerCase() === "okay" ? "default" : "destructive"}
            className={actualValue.toLowerCase() === "okay" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
          >
            {actualValue.toLowerCase() === "okay" ? "✓ Okay" : "✗ Not Okay"}
          </Badge>
        );
      case "notOkReason":
        if (!actualValue) return "";
        return (
          <div className="max-w-[200px] whitespace-normal break-words text-red-600 font-medium">
            {actualValue}
          </div>
        );
      case "amount":
      case "totalBillAmount":
      case "totalCharges":
        return actualValue ? `₹${Number(actualValue).toLocaleString()}` : "";
      case "planned5":
        // Format the date for display
        if (!actualValue) return "";
        const historyDateStr = String(actualValue);
        // Handle Google Sheets GVIZ Date format: "Date(2026,0,31)"
        if (historyDateStr.startsWith("Date(")) {
          const match = historyDateStr.match(/Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)/);
          if (match) {
            const date = new Date(
              parseInt(match[1]),
              parseInt(match[2]),
              parseInt(match[3])
            );
            return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          }
        }
        // Handle DD/MM/YYYY or DD-MM-YYYY
        const historyParts = historyDateStr.split(/[/-]/);
        if (historyParts.length >= 3 && historyParts[0].length <= 2 && historyParts[2].length === 4) {
          const day = parseInt(historyParts[0], 10);
          const month = parseInt(historyParts[1], 10) - 1;
          const year = parseInt(historyParts[2], 10);
          const date = new Date(year, month, day);
          if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          }
        }
        // Default browser parsing
        const historyParsedDate = new Date(actualValue);
        if (!isNaN(historyParsedDate.getTime())) {
          return historyParsedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        return actualValue || "";
      case "invoiceCreatedDate":
        return formatDateToMMDDYYYY(actualValue);
      default:
        return actualValue || "";
    }
  };

  // Add this renderCellContent function for Pending tab
  const renderCellContent = (order, columnKey) => {
    const value = order[columnKey];
    // Handle Google Sheets API response format where value might be {v: actualValue}
    const actualValue =
      value && typeof value === "object" && "v" in value ? value.v : value;

    switch (columnKey) {
      case "actions":
        const actual5 = order.actual5;
        return actual5 ? (
          <Button size="sm" onClick={() => handleProcess(order.id)}>
            Process
          </Button>
        ) : (
          <Badge variant="secondary">Waiting</Badge>
        );

      case "quotationCopy":
      case "quotationCopy2":
      case "acceptanceCopy":
      case "srnNumberAttachment":
      case "attachment":
      case "invoiceUpload":
      case "ewayBillUpload":
      case "beforePhoto":
      case "afterPhoto":
      case "biltyUpload":
        // Handle multiple URLs (comma-separated)
        if (actualValue && typeof actualValue === "string" &&
          (actualValue.startsWith("http") || actualValue.startsWith("https"))) {
          const urls = actualValue.split(",").map(url => url.trim()).filter(url => url.startsWith("http"));
          if (urls.length === 0) {
            return <Badge variant="secondary">N/A</Badge>;
          }
          if (urls.length === 1) {
            return (
              <a href={urls[0]} target="_blank" rel="noopener noreferrer">
                <Badge variant="default" className="cursor-pointer hover:bg-blue-700">
                  View Attachment
                </Badge>
              </a>
            );
          }
          // Multiple URLs - show each as a numbered link
          return (
            <div className="flex flex-wrap gap-1">
              {urls.map((url, index) => (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Open file ${index + 1} in new tab`}
                >
                  <Badge
                    variant="default"
                    className="cursor-pointer hover:bg-blue-700 text-xs"
                  >
                    {index + 1}
                  </Badge>
                </a>
              ))}
            </div>
          );
        }
        return <Badge variant="secondary">{actualValue || "N/A"}</Badge>;
      case "calibrationCertRequired":
      case "installationRequired":
        return (
          <Badge variant={actualValue === "Yes" ? "default" : "secondary"}>
            {actualValue || "N/A"}
          </Badge>
        );
      case "billingAddress":
      case "shippingAddress":
      case "remarks":
        return (
          <div className="max-w-[200px] whitespace-normal break-words">
            {actualValue || ""}
          </div>
        );
      case "paymentMode":
        return (
          <div className="flex items-center gap-2">
            {actualValue}
            {actualValue === "Advance" && (
              <Badge variant="secondary">Required</Badge>
            )}
          </div>
        );
      case "amount":
      case "totalBillAmount":
      case "totalCharges":
        return actualValue ? `₹${Number(actualValue).toLocaleString()}` : "";
      case "planned5":
        // Format the date for display
        if (!actualValue) return "";
        const dateStr = String(actualValue);
        // Handle Google Sheets GVIZ Date format: "Date(2026,0,31)"
        if (dateStr.startsWith("Date(")) {
          const match = dateStr.match(/Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)/);
          if (match) {
            const date = new Date(
              parseInt(match[1]),
              parseInt(match[2]),
              parseInt(match[3])
            );
            return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          }
        }
        // Handle DD/MM/YYYY or DD-MM-YYYY
        const parts = dateStr.split(/[/-]/);
        if (parts.length >= 3 && parts[0].length <= 2 && parts[2].length === 4) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          const date = new Date(year, month, day);
          if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          }
        }
        // Default browser parsing
        const parsedDate = new Date(actualValue);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        return actualValue || "";
      case "invoiceCreatedDate":
        return formatDateToMMDDYYYY(actualValue);
      default:
        return actualValue || "";
    }
  };

  const handleView = (order) => {
    setViewOrder(order);
    setViewDialogOpen(true);
  };


  if (error) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">
              Error Loading Data
            </h1>
            <p className="text-muted-foreground mt-2">{error}</p>
            <Button
              onClick={() => {
                fetchPendingOrders();
                fetchHistoryOrders();
              }}
              className="mt-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const handleRefresh = async () => {
    setLoadingPending(true);
    setLoadingHistory(true);
    try {
      await Promise.all([fetchPendingOrders(), fetchHistoryOrders()]);
    } catch (err) {
      setError(err.message);
    }
    // Note: Loading states are reset in the individual fetch functions
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Warehouse
            </h1>
            {currentUser && (
              <p className="text-sm text-muted-foreground mt-1">
                Logged in as: {currentUser.fullName} ({currentUser.role})
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setIsLocationUpdateModalOpen(true)} 
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-md transition-all active:scale-95"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Location Update
            </Button>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            value={companyNameFilter}
            onChange={(e) => setCompanyNameFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white min-w-[200px]"
          >
            <option value="all">All Companies</option>
            {getUniqueCompanyNames().map((companyName) => (
              <option key={companyName} value={companyName}>
                {companyName}
              </option>
            ))}
          </select>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="hidden sm:block space-y-4">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({filteredPendingOrders.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              History ({filteredHistoryOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Pending Warehouse Operations</CardTitle>
                    <CardDescription>
                      Orders waiting for warehouse processing
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        Column Visibility
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto">
                      <DropdownMenuLabel>Show/Hide Columns</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <div className="flex gap-2 p-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={showAllPendingColumns}
                        >
                          Show All
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={hideAllPendingColumns}
                        >
                          Hide All
                        </Button>
                      </div>
                      <DropdownMenuSeparator />
                      <div className="p-2 space-y-2">
                        {pendingColumns.map((column) => (
                          <div
                            key={column.key}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`pending-${column.key}`}
                              checked={visiblePendingColumns[column.key]}
                              onCheckedChange={() =>
                                togglePendingColumn(column.key)
                              }
                            />
                            <Label
                              htmlFor={`pending-${column.key}`}
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
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <div style={{ minWidth: "max-content" }}>
                      <Table>
                        <TableHeader className="sticky top-0 z-10 bg-gray-50">
                          <TableRow>
                            {pendingColumns
                              .filter((col) => visiblePendingColumns[col.key])
                              .map((column) => (
                                <TableHead
                                  key={column.key}
                                  className="bg-gray-50 font-semibold text-gray-900 border-b-2 border-gray-200 px-4 py-3"
                                  style={{
                                    width: getColumnWidth(column.key),
                                    minWidth: getColumnWidth(column.key),
                                    maxWidth: getColumnWidth(column.key),
                                  }}
                                >
                                  <div className="break-words">
                                    {column.label}
                                  </div>
                                </TableHead>
                              ))}
                          </TableRow>
                        </TableHeader>
                      </Table>

                      <div
                        className="overflow-y-auto"
                        style={{ maxHeight: "500px" }}
                      >
                        <Table>
                         <TableBody>
                            {loadingPending ? (
                              <TableRow>
                                <TableCell
                                  colSpan={
                                    pendingColumns.filter(
                                      (col) => visiblePendingColumns[col.key]
                                    ).length
                                  }
                                  className="h-64 text-center"
                                >
                                  <div className="flex flex-col items-center justify-center space-y-3">
                                    <RefreshCw className="h-10 w-10 animate-spin text-violet-600" />
                                    <div className="flex flex-col items-center">
                                      <p className="text-base font-medium text-gray-900">Fetching records...</p>
                                      <p className="text-xs text-gray-500">Connecting to Google Sheets</p>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : (
                              <>
                                {filteredPendingOrders.map((order) => (
                                  <TableRow
                                    key={order.id}
                                    className="hover:bg-gray-50"
                                  >
                                    {pendingColumns
                                      .filter(
                                        (col) => visiblePendingColumns[col.key]
                                      )
                                      .map((column) => (
                                        <TableCell
                                          key={column.key}
                                          className="border-b px-4 py-3 align-top"
                                          style={{
                                            width: getColumnWidth(column.key),
                                            minWidth: getColumnWidth(column.key),
                                            maxWidth: getColumnWidth(column.key),
                                          }}
                                        >
                                          <div className="break-words whitespace-normal leading-relaxed text-xs">
                                            {renderCellContent(order, column.key)}
                                          </div>
                                        </TableCell>
                                      ))}
                                  </TableRow>
                                ))}
                                {filteredPendingOrders.length === 0 && (
                                  <TableRow>
                                    <TableCell
                                      colSpan={
                                        pendingColumns.filter(
                                          (col) => visiblePendingColumns[col.key]
                                        ).length
                                      }
                                      className="text-center text-muted-foreground h-32"
                                    >
                                      {searchTerm
                                        ? "No orders match your search criteria"
                                        : "No pending orders found"}
                                    </TableCell>
                                  </TableRow>
                                )}
                              </>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Warehouse History</CardTitle>
                    <CardDescription>
                      Previously processed warehouse operations
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        Column Visibility
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto">
                      <DropdownMenuLabel>Show/Hide Columns</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <div className="flex gap-2 p-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={showAllHistoryColumns}
                        >
                          Show All
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={hideAllHistoryColumns}
                        >
                          Hide All
                        </Button>
                      </div>
                      <DropdownMenuSeparator />
                      <div className="p-2 space-y-2">
                        {historyColumns.map((column) => (
                          <div
                            key={column.key}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`history-${column.key}`}
                              checked={visibleHistoryColumns[column.key]}
                              onCheckedChange={() =>
                                toggleHistoryColumn(column.key)
                              }
                            />
                            <Label
                              htmlFor={`history-${column.key}`}
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
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <div style={{ minWidth: "max-content" }}>
                      <Table>
                        <TableHeader className="sticky top-0 z-10 bg-gray-50">
                          <TableRow>
                            {historyColumns
                              .filter((col) => visibleHistoryColumns[col.key])
                              .map((column) => (
                                <TableHead
                                  key={column.key}
                                  className="bg-gray-50 font-semibold text-gray-900 border-b-2 border-gray-200 px-4 py-3"
                                  style={{
                                    width: getColumnWidth(column.key),
                                    minWidth: getColumnWidth(column.key),
                                    maxWidth: getColumnWidth(column.key),
                                  }}
                                >
                                  <div className="break-words">
                                    {column.label}
                                  </div>
                                </TableHead>
                              ))}
                          </TableRow>
                        </TableHeader>
                      </Table>

                      <div
                        className="overflow-y-auto"
                        style={{ maxHeight: "500px" }}
                      >
                        <Table>
                          <TableBody>
                            {loadingHistory ? (
                              <TableRow>
                                <TableCell
                                  colSpan={
                                    historyColumns.filter(
                                      (col) => visibleHistoryColumns[col.key]
                                    ).length
                                  }
                                  className="h-64 text-center"
                                >
                                  <div className="flex flex-col items-center justify-center space-y-3">
                                    <RefreshCw className="h-10 w-10 animate-spin text-indigo-600" />
                                    <div className="flex flex-col items-center">
                                      <p className="text-base font-medium text-gray-900">Loading history...</p>
                                      <p className="text-xs text-gray-500">Retrieving past operations</p>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : (
                              <>
                                {filteredHistoryOrders.map((order) => (
                                  <TableRow
                                    key={order.id}
                                    className={
                                      order.dispatchStatus?.toLowerCase() === "not okay" ||
                                        order.dispatchStatus?.toLowerCase() === "notokay"
                                        ? "bg-orange-100 hover:bg-orange-200 border-orange-200"
                                        : "hover:bg-gray-50"
                                    }
                                  >
                                    {historyColumns
                                      .filter(
                                        (col) => visibleHistoryColumns[col.key]
                                      )
                                      .map((column) => (
                                        <TableCell
                                          key={column.key}
                                          className="border-b px-4 py-3 align-top"
                                          style={{
                                            width: getColumnWidth(column.key),
                                            minWidth: getColumnWidth(column.key),
                                            maxWidth: getColumnWidth(column.key),
                                          }}
                                        >
                                          <div className="break-words whitespace-normal leading-relaxed text-xs">
                                            {renderHistoryCellContent(
                                              order,
                                              column.key
                                            )}
                                          </div>
                                        </TableCell>
                                      ))}
                                  </TableRow>
                                ))}
                                {filteredHistoryOrders.length === 0 && (
                                  <TableRow>
                                    <TableCell
                                      colSpan={
                                        historyColumns.filter(
                                          (col) => visibleHistoryColumns[col.key]
                                        ).length
                                      }
                                      className="text-center text-muted-foreground h-32"
                                    >
                                      {searchTerm
                                        ? "No orders match your search criteria"
                                        : "No history orders found"}
                                    </TableCell>
                                  </TableRow>
                                )}
                              </>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Mobile Card View */}
        <div className="block sm:hidden space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending">
                Pending ({filteredPendingOrders.length})
              </TabsTrigger>
              <TabsTrigger value="history">
                History ({filteredHistoryOrders.length})
              </TabsTrigger>
            </TabsList>

            {/* Pending Tab - Mobile */}
            <TabsContent value="pending" className="space-y-4">
              <div className="space-y-3">
                {filteredPendingOrders.length > 0 ? (
                  filteredPendingOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-white border rounded-lg shadow-sm overflow-hidden"
                    >
                      {/* Card Header */}
                      <div className="bg-violet-50 px-4 py-3 border-b">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {order.companyName || "N/A"}
                            </h3>
                            <p className="text-xs text-gray-600 mt-1">
                              Order: {order.orderNo || "N/A"}
                            </p>
                          </div>
                          {order.actual5 ? (
                            <button
                              onClick={() => handleProcess(order.id)}
                              className="px-3 py-1 bg-violet-600 text-white text-xs rounded hover:bg-violet-700"
                            >
                              Process
                            </button>
                          ) : (
                            <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">
                              Waiting
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 space-y-3">
                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500 text-xs">
                              Date:
                            </span>
                            <p className="font-medium">
                              {renderCellContent(order, "planned5")}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">
                              Quotation Number:
                            </span>
                            <p className="font-medium">
                              {order.quotationNo || "-"}
                            </p>
                          </div>
                        </div>

                        {/* Contact Info */}
                        <div className="border-t pt-3">
                          <span className="text-gray-500 text-xs">
                            Contact Person:
                          </span>
                          <p className="text-sm font-medium mt-1">
                            {order.contactPersonName || "-"}
                          </p>
                          {order.contactNumber && (
                            <a
                              href={`tel:${order.contactNumber}`}
                              className="text-blue-600 text-sm"
                            >
                              {order.contactNumber}
                            </a>
                          )}
                        </div>

                        {/* Transport Details */}
                        <div className="border-t pt-3 text-sm">
                          <span className="text-gray-500 text-xs">
                            Transport Mode:
                          </span>
                          <p className="font-medium">
                            {order.transportMode || "-"}
                          </p>
                        </div>

                        {/* Invoice & Documents */}
                        {(order.invoiceNumber || order.invoiceUpload || order.invoiceCreatedDate) && (
                          <div className="border-t pt-3">
                            <span className="text-gray-500 text-xs">
                              Invoice:
                            </span>
                            <div className="mt-1 space-y-2">
                              {order.invoiceNumber && (
                                <p className="text-sm font-medium">
                                  No: {order.invoiceNumber}
                                </p>
                              )}
                              {order.invoiceCreatedDate && (
                                <p className="text-xs text-slate-500 font-medium italic">
                                  Date: {formatDateToMMDDYYYY(order.invoiceCreatedDate)}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-2 pt-1">
                                {typeof order.invoiceUpload === "string" &&
                                  order.invoiceUpload.startsWith("http") && (
                                    <a
                                      href={order.invoiceUpload}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded border border-blue-100 hover:bg-blue-100 transition-colors"
                                    >
                                      <Eye className="h-3 w-3" />
                                      Invoice Upload
                                    </a>
                                  )}
                                {typeof order.quotationCopy === "string" &&
                                  order.quotationCopy.startsWith("http") && (
                                    <a
                                      href={order.quotationCopy}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 text-xs rounded border border-purple-100 hover:bg-purple-100 transition-colors"
                                    >
                                      <FileText className="h-3 w-3" />
                                      Quotation Copy
                                    </a>
                                  )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-16">
                    {searchTerm
                      ? "No orders match your search criteria"
                      : "No pending orders found"}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* History Tab - Mobile */}
            <TabsContent value="history" className="space-y-4">
              <div className="space-y-3">
                {filteredHistoryOrders.length > 0 ? (
                  filteredHistoryOrders.map((order) => {
                    const isEditing = editingOrder?.id === order.id;

                    return (
                      <div
                        key={order.id}
                        className={`border rounded-lg shadow-sm overflow-hidden ${order.dispatchStatus?.toLowerCase() === "not okay" ||
                          order.dispatchStatus?.toLowerCase() === "notokay"
                          ? "bg-orange-50 border-orange-200"
                          : "bg-white border-gray-200"
                          }`}
                      >
                        {/* Card Header with Edit Button */}
                        <div className="bg-green-50 px-4 py-3 border-b">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                Order: {order.orderNo || "N/A"}
                              </h3>
                              <p className="text-xs text-gray-600 mt-1">
                                Company: {order.companyName || "N/A"}
                              </p>
                            </div>

                            {/* Edit/Save/Cancel Buttons - Same as desktop */}
                            <div className="flex gap-1">
                              {isEditing ? (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={handleSaveEdit}
                                    disabled={isSaving}
                                    className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700"
                                  >
                                    {isSaving ? (
                                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                    ) : (
                                      <Save className="h-3 w-3 mr-1" />
                                    )}
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleCancelEdit}
                                    className="h-6 px-2 text-xs"
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleEdit(order)}
                                  className="h-6 px-2 text-xs bg-violet-600 hover:bg-violet-700"
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Card Body - ALL Columns with Edit Support */}
                        <div className="p-4 space-y-4">
                          {/* Render ALL visible history columns except editActions */}
                          {historyColumns
                            .filter(
                              (col) =>
                                col.key !== "editActions" &&
                                visibleHistoryColumns[col.key]
                            )
                            .map((column) => (
                              <div
                                key={column.key}
                                className="border-b pb-3 last:border-0"
                              >
                                <div className="flex justify-between items-start">
                                  <span className="text-xs font-medium text-gray-700">
                                    {column.label}:
                                  </span>
                                  <div className="text-right flex-1 ml-4">
                                    {/* Use the SAME renderHistoryCellContent function as desktop */}
                                    <div className="text-sm text-gray-900 break-words">
                                      {column.key === "invoiceCreatedDate"
                                        ? formatDateToMMDDYYYY(order[column.key])
                                        : renderHistoryCellContent(order, column.key)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-gray-500 py-16">
                    {searchTerm
                      ? "No orders match your search criteria"
                      : "No history orders found"}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Process Dialog Component */}
        <ProcessDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          selectedOrder={selectedOrder}
          onSubmit={handleProcessSubmit}
          uploading={uploading}
          currentUser={currentUser}
          salesMode={true}
        />

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Warehouse Details</DialogTitle>
              <DialogDescription>
                View warehouse operation details
              </DialogDescription>
            </DialogHeader>
            {viewOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Order Number</Label>
                    <p className="text-sm">{viewOrder.id}</p>
                  </div>
                  <div>
                    <Label>Company Name</Label>
                    <p className="text-sm">{viewOrder.companyName}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Bill Number</Label>
                    <p className="text-sm">
                      {viewOrder.invoiceNumber || "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label>Transport Mode</Label>
                    <p className="text-sm">{viewOrder.transportMode}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Processed Date</Label>
                    <p className="text-sm">
                      {viewOrder.warehouseProcessedDate || "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label>Destination</Label>
                    <p className="text-sm">{viewOrder.destination}</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <LocationUpdateModal
        isOpen={isLocationUpdateModalOpen}
        onClose={() => setIsLocationUpdateModalOpen(false)}
        onRefreshData={handleRefresh}
      />
    </MainLayout>
  );
}