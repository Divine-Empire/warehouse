"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Eye, RefreshCw, Search, Settings, Edit, Save, X, FileText, CloudUpload, Trash2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import ProcessDialog from "@/components/process-dialog";

// Column definitions for Pending tab (B to BJ) - Defined before component to avoid temporal dead zone
const pendingColumns = [
  { key: "actions", label: "Actions", searchable: false },
  { key: "orderNo", label: "Order No.", searchable: true },
  { key: "planned5", label: "Date", searchable: true },
  { key: "quotationNo", label: "Quotation No.", searchable: true },
  { key: "companyName", label: "Company Name", searchable: true },
  {
    key: "contactPersonName",
    label: "Contact Person Name",
    searchable: true,
  },
  { key: "contactNumber", label: "Contact Number", searchable: true },
  { key: "billingAddress", label: "Billing Address", searchable: true },
  { key: "shippingAddress", label: "Shipping Address", searchable: true },
  { key: "paymentMode", label: "Payment Mode", searchable: true },
  { key: "quotationCopy", label: "Quotation Copy", searchable: true },
  { key: "paymentTerms", label: "Payment Terms(In Days)", searchable: true },
  { key: "transportMode", label: "Transport Mode", searchable: true },
  { key: "transportid", label: "Transport ID", searchable: true },
  { key: "freightType", label: "Freight Type", searchable: true },
  { key: "destination", label: "Destination", searchable: true },
  { key: "poNumber", label: "Po Number", searchable: true },
  { key: "quotationCopy2", label: "Quotation Copy", searchable: true },
  {
    key: "acceptanceCopy",
    label: "Acceptance Copy (Purchase Order Only)",
    searchable: true,
  },
  { key: "offer", label: "Offer", searchable: true },
  {
    key: "conveyedForRegistration",
    label: "Conveyed For Registration Form",
    searchable: true,
  },
  { key: "qty", label: "Qty", searchable: true },
  { key: "amount", label: "Amount", searchable: true },
  { key: "approvedName", label: "Approved Name", searchable: true },
  {
    key: "calibrationCertRequired",
    label: "Calibration Certificate Required",
    searchable: true,
  },
  {
    key: "certificateCategory",
    label: "Certificate Category",
    searchable: true,
  },
  {
    key: "installationRequired",
    label: "Installation Required",
    searchable: true,
  },
  { key: "ewayBillDetails", label: "Eway Bill Details", searchable: true },
  {
    key: "ewayBillAttachment",
    label: "Eway Bill Attachment",
    searchable: true,
  },
  { key: "srnNumber", label: "Srn Number", searchable: true },
  {
    key: "srnNumberAttachment",
    label: "Srn Number Attachment",
    searchable: true,
  },
  { key: "attachment", label: "Attachment", searchable: true },
  { key: "vehicleNo", label: "Vehicle No.", searchable: true },

  { key: "itemName1", label: "Item Name 1", searchable: true },
  { key: "quantity1", label: "Quantity 1", searchable: true },
  { key: "itemName2", label: "Item Name 2", searchable: true },
  { key: "quantity2", label: "Quantity 2", searchable: true },
  { key: "itemName3", label: "Item Name 3", searchable: true },
  { key: "quantity3", label: "Quantity 3", searchable: true },
  { key: "itemName4", label: "Item Name 4", searchable: true },
  { key: "quantity4", label: "Quantity 4", searchable: true },
  { key: "itemName5", label: "Item Name 5", searchable: true },
  { key: "quantity5", label: "Quantity 5", searchable: true },
  { key: "itemName6", label: "Item Name 6", searchable: true },
  { key: "quantity6", label: "Quantity 6", searchable: true },
  { key: "itemName7", label: "Item Name 7", searchable: true },
  { key: "quantity7", label: "Quantity 7", searchable: true },
  { key: "itemName8", label: "Item Name 8", searchable: true },
  { key: "quantity8", label: "Quantity 8", searchable: true },
  { key: "itemName9", label: "Item Name 9", searchable: true },
  { key: "quantity9", label: "Quantity 9", searchable: true },
  { key: "itemName10", label: "Item Name 10", searchable: true },
  { key: "quantity10", label: "Quantity 10", searchable: true },
  { key: "itemName11", label: "Item Name 11", searchable: true },
  { key: "quantity11", label: "Quantity 11", searchable: true },
  { key: "itemName12", label: "Item Name 12", searchable: true },
  { key: "quantity12", label: "Quantity 12", searchable: true },
  { key: "itemName13", label: "Item Name 13", searchable: true },
  { key: "quantity13", label: "Quantity 13", searchable: true },
  { key: "itemName14", label: "Item Name 14", searchable: true },
  { key: "quantity14", label: "Quantity 14", searchable: true },
  { key: "totalQty", label: "Total Qty", searchable: true },
  { key: "remarks", label: "Remarks", searchable: true },
  { key: "invoiceNumber", label: "Invoice Number", searchable: true },
  { key: "invoiceUpload", label: "Invoice Upload", searchable: true },
  { key: "ewayBillUpload", label: "Eway Bill Upload", searchable: true },
  { key: "totalQtyHistory", label: "Total Qty", searchable: true },
  { key: "totalBillAmount", label: "Total Bill Amount", searchable: true },
  { key: "dSrNumber", label: "D-Sr Number", searchable: true },
];

// Column definitions for History tab (includes BN to BR and BV to CC) - Defined before component to avoid temporal dead zone
const historyColumns = [
  { key: "editActions", label: "Actions", searchable: false },
  { key: "orderNo", label: "Order No.", searchable: true },
  { key: "planned5", label: "Date", searchable: true },
  { key: "quotationNo", label: "Quotation No.", searchable: true },
  { key: "companyName", label: "Company Name", searchable: true },
  {
    key: "contactPersonName",
    label: "Contact Person Name",
    searchable: true,
  },
  { key: "contactNumber", label: "Contact Number", searchable: true },
  { key: "billingAddress", label: "Billing Address", searchable: true },
  { key: "shippingAddress", label: "Shipping Address", searchable: true },
  { key: "paymentMode", label: "Payment Mode", searchable: true },
  { key: "quotationCopy", label: "Quotation Copy", searchable: true },
  { key: "paymentTerms", label: "Payment Terms(In Days)", searchable: true },
  { key: "transportMode", label: "Transport Mode", searchable: true },
  { key: "transportid", label: "Transport ID", searchable: true },
  { key: "freightType", label: "Freight Type", searchable: true },
  { key: "destination", label: "Destination", searchable: true },
  { key: "poNumber", label: "Po Number", searchable: true },
  { key: "quotationCopy2", label: "Quotation Copy", searchable: true },
  {
    key: "acceptanceCopy",
    label: "Acceptance Copy (Purchase Order Only)",
    searchable: true,
  },
  { key: "offer", label: "Offer", searchable: true },
  {
    key: "conveyedForRegistration",
    label: "Conveyed For Registration Form",
    searchable: true,
  },
  { key: "qty", label: "Qty", searchable: true },
  { key: "amount", label: "Amount", searchable: true },
  { key: "approvedName", label: "Approved Name", searchable: true },
  {
    key: "calibrationCertRequired",
    label: "Calibration Certificate Required",
    searchable: true,
  },
  {
    key: "certificateCategory",
    label: "Certificate Category",
    searchable: true,
  },
  {
    key: "installationRequired",
    label: "Installation Required",
    searchable: true,
  },
  { key: "transporterId", label: "Transporter ID", searchable: true },

  { key: "srnNumber", label: "Srn Number", searchable: true },
  {
    key: "srnNumberAttachment",
    label: "Srn Number Attachment",
    searchable: true,
  },
  { key: "attachment", label: "Attachment", searchable: true },
  { key: "vehicleNo", label: "Vehicle No.", searchable: true },

  { key: "itemName1", label: "Item Name 1", searchable: true },
  { key: "quantity1", label: "Quantity 1", searchable: true },
  { key: "itemName2", label: "Item Name 2", searchable: true },
  { key: "quantity2", label: "Quantity 2", searchable: true },
  { key: "itemName3", label: "Item Name 3", searchable: true },
  { key: "quantity3", label: "Quantity 3", searchable: true },
  { key: "itemName4", label: "Item Name 4", searchable: true },
  { key: "quantity4", label: "Quantity 4", searchable: true },
  { key: "itemName5", label: "Item Name 5", searchable: true },
  { key: "quantity5", label: "Quantity 5", searchable: true },
  { key: "itemName6", label: "Item Name 6", searchable: true },
  { key: "quantity6", label: "Quantity 6", searchable: true },
  { key: "itemName7", label: "Item Name 7", searchable: true },
  { key: "quantity7", label: "Quantity 7", searchable: true },
  { key: "itemName8", label: "Item Name 8", searchable: true },
  { key: "quantity8", label: "Quantity 8", searchable: true },
  { key: "itemName9", label: "Item Name 9", searchable: true },
  { key: "quantity9", label: "Quantity 9", searchable: true },
  { key: "itemName10", label: "Item Name 10", searchable: true },
  { key: "quantity10", label: "Quantity 10", searchable: true },
  { key: "itemName11", label: "Item Name 11", searchable: true },
  { key: "quantity11", label: "Quantity 11", searchable: true },
  { key: "itemName12", label: "Item Name 12", searchable: true },
  { key: "quantity12", label: "Quantity 12", searchable: true },
  { key: "itemName13", label: "Item Name 13", searchable: true },
  { key: "quantity13", label: "Quantity 13", searchable: true },
  { key: "itemName14", label: "Item Name 14", searchable: true },
  { key: "quantity14", label: "Quantity 14", searchable: true },
  { key: "totalQty", label: "Total Qty", searchable: true },
  { key: "remarks", label: "Remarks", searchable: true },
  { key: "invoiceNumber", label: "Invoice Number", searchable: true },
  { key: "invoiceUpload", label: "Invoice Upload", searchable: true },
  { key: "ewayBillUpload", label: "Eway Bill Upload", searchable: true },
  { key: "totalQtyHistory", label: "Total Qty", searchable: true },
  { key: "totalBillAmount", label: "Total Bill Amount", searchable: true },
  { key: "dSrNumber", label: "D-Sr Number", searchable: true },
  // BV to CC columns
  { key: "transporterName", label: "Transporter Name", searchable: true },
  {
    key: "transporterContact",
    label: "Transporter Contact",
    searchable: true,
  },
  { key: "biltyNumber", label: "Bilty Number", searchable: true },
  { key: "totalCharges", label: "Total Charges", searchable: true },
  { key: "warehouseRemarks", label: "Warehouse Remarks", searchable: true },
  { key: "beforePhoto", label: "Before Photo", searchable: false },
  { key: "afterPhoto", label: "After Photo", searchable: false },
  { key: "biltyUpload", label: "Bilty Upload", searchable: false },
  { key: "dispatchStatus", label: "Dispatch Status", searchable: true },
  { key: "notOkReason", label: "Reason for Not Okay", searchable: true },
];

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

  const [companyNameFilter, setCompanyNameFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedColumn, setSelectedColumn] = useState("all");

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

  const fetchPendingOrders = async () => {
    setLoadingPending(true);
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
        const pendingOrders = [];

        data.table.rows.slice(6).forEach((row, index) => {
          if (row.c) {
            const actualRowIndex = index + 2;
            const btColumn = row.c[70] ? row.c[70].v : null; // Column BT (index 71)
            const buColumn = row.c[71] ? row.c[71].v : null; // Column BU (index 72)

            const planned5 = row.c[62] ? row.c[62].v : null;
            const actual6 = row.c[71] ? row.c[71].v : null;
            if (planned5 && !actual6) {
              const order = {
                rowIndex: actualRowIndex,
                id: row.c[105] ? row.c[105].v : `ORDER-${actualRowIndex}`,
                timeStamp: row.c[0] ? row.c[0].v : "",
                orderNo: row.c[1] ? row.c[1].v : "", // Column B - Order No
                quotationNo: row.c[2] ? row.c[2].v : "", // Column C
                companyName: row.c[3] ? row.c[3].v : "",
                contactPersonName: row.c[4] ? row.c[4].v : "", // Fix field name to match column definition
                contactNumber: row.c[5] ? row.c[5].v : "",
                billingAddress: row.c[6] ? row.c[6].v : "",
                shippingAddress: row.c[7] ? row.c[7].v : "",
                paymentMode: row.c[8] ? row.c[8].v : "",
                paymentTerms: row.c[10] ? row.c[10].v : "",
                qty: row.c[19] ? row.c[19].v : "", // Map to qty field for column definition
                transportMode: row.c[11] ? row.c[11].v : "",
                transportid: row.c[25] ? row.c[25].v : "",
                freightType: row.c[12] ? row.c[12].v : "",
                destination: row.c[13] ? row.c[13].v : "",
                poNumber: row.c[14] ? row.c[14].v : "",
                offer: row.c[17] ? row.c[17].v : "",
                amount: row.c[20] ? Number.parseFloat(row.c[20].v) || 0 : 0,
                invoiceNumber: row.c[65] ? row.c[65].v : "", // Column BO (invoice number)
                // Keep existing fields for backward compatibility
                contactPerson: row.c[4] ? row.c[4].v : "",
                quantity: row.c[10] ? row.c[10].v : "",
                totalQty: row.c[19] ? row.c[19].v : "",
                quotationCopy: row.c[9] ? row.c[9] : "",
                dSrNumber: row.c[105] ? row.c[105].v : "",
                fullRowData: row.c,
                conveyedForRegistration: row.c[18] ? row.c[18].v : "",
                approvedName: row.c[21] ? row.c[21].v : "",
                calibrationCertRequired: row.c[22] ? row.c[22].v : "",
                certificateCategory: row.c[23] ? row.c[23].v : "",
                installationRequired: row.c[24] ? row.c[24].v : "",
                ewayBillDetails: row.c[25] ? row.c[25].v : "",
                ewayBillAttachment: row.c[26] ? row.c[26].v : "",
                srnNumber: row.c[27] ? row.c[27].v : "",
                srnNumberAttachment: row.c[28] ? row.c[28].v : "",
                attachment: row.c[29] ? row.c[29].v : "",
                itemName1: row.c[30] ? row.c[30].v : "",
                quantity1: row.c[31] ? row.c[31].v : "",
                itemName2: row.c[32] ? row.c[32].v : "",
                quantity2: row.c[33] ? row.c[33].v : "",
                itemName3: row.c[34] ? row.c[34].v : "",
                quantity3: row.c[35] ? row.c[35].v : "",
                itemName4: row.c[36] ? row.c[36].v : "",
                quantity4: row.c[37] ? row.c[37].v : "",
                itemName5: row.c[38] ? row.c[38].v : "",
                quantity5: row.c[39] ? row.c[39].v : "",
                itemName6: row.c[40] ? row.c[40].v : "",
                quantity6: row.c[41] ? row.c[41].v : "",
                itemName7: row.c[42] ? row.c[42].v : "",
                quantity7: row.c[43] ? row.c[43].v : "",
                itemName8: row.c[44] ? row.c[44].v : "",
                quantity8: row.c[45] ? row.c[45].v : "",
                itemName9: row.c[46] ? row.c[46].v : "",
                quantity9: row.c[47] ? row.c[47].v : "",
                itemName10: row.c[48] ? row.c[48].v : "",
                quantity10: row.c[49] ? row.c[49].v : "",
                itemName11: row.c[50] ? row.c[50].v : "",
                quantity11: row.c[51] ? row.c[51].v : "",
                itemName12: row.c[52] ? row.c[52].v : "",
                quantity12: row.c[53] ? row.c[53].v : "",
                itemName13: row.c[54] ? row.c[54].v : "",
                quantity13: row.c[55] ? row.c[55].v : "",
                itemName14: row.c[56] ? row.c[56].v : "",
                quantity14: row.c[57] ? row.c[57].v : "",

                itemQtyJson: row.c[58] ? row.c[58].v : null,
                remarks: row.c[60] ? row.c[60].v : "",
                quotationCopy2: row.c[15] ? row.c[15].v : "",
                acceptanceCopy: row.c[16] ? row.c[16].v : "",
                vehicleNo: row.c[26] ? row.c[26].v : "",
                // invoiceNumber: row.c[65] ? row.c[65].v : "",
                invoiceUpload: row.c[66] ? row.c[66].v : "",
                ewayBillUpload: row.c[67] ? row.c[67].v : "",
                totalQtyHistory: row.c[68] ? row.c[68].v : "",
                totalBillAmount: row.c[69] ? row.c[69].v : "",
                creName: row.c[106] ? row.c[106].v : "", // Column CD (index 81) - CRE Name

                planned5: row.c[62] ? row.c[62].v : "",
                actual5: row.c[63] ? row.c[63].v : "",
                actual6: row.c[71] ? row.c[71] : "",
              };
              pendingOrders.push(order);
            }
          }
        });

        const parseItemQtyJson = (jsonString) => {
          if (!jsonString) return null;
          try {
            return JSON.parse(jsonString);
          } catch (error) {
            console.error("Error parsing JSON:", error);
            return null;
          }
        };

        // Sort pending orders by Column BK date (planned5) - most recent first
        pendingOrders.sort((a, b) => {
          return parseFlexibleDate(b.planned5) - parseFlexibleDate(a.planned5);
        });

        setPendingOrders(pendingOrders);
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
      // 1. Fetch main history data from DISPATCH-DELIVERY
      const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;
      const response = await fetch(sheetUrl);
      const text = await response.text();

      // 2. Fetch Dispatch Status data from Warehouse sheet
      const warehouseSheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=Warehouse`;
      const whResponse = await fetch(warehouseSheetUrl);
      const whText = await whResponse.text();

      const parseSheetJson = (txt) => {
        const jsonStart = txt.indexOf("{");
        const jsonEnd = txt.lastIndexOf("}") + 1;
        const jsonData = txt.substring(jsonStart, jsonEnd);
        return JSON.parse(jsonData);
      };

      const data = parseSheetJson(text);
      const whData = parseSheetJson(whText);

      // Create lookup map for Warehouse data (orderNo -> { status, reason })
      const warehouseStatusMap = {};
      if (whData && whData.table && whData.table.rows) {
        whData.table.rows.forEach((row) => {
          if (row.c && row.c[1] && row.c[1].v) {
            const orderNo = String(row.c[1].v).trim();
            warehouseStatusMap[orderNo] = {
              status: row.c[131] ? row.c[131].v : "",
              reason: row.c[132] ? row.c[132].v : "",
            };
          }
        });
      }

      if (data && data.table && data.table.rows) {
        const historyOrders = [];

        data.table.rows.slice(6).forEach((row, index) => {
          if (row.c) {
            const actualRowIndex = index + 2;
            const planned5 = row.c[62] ? row.c[62].v : null;
            const actual6 = row.c[71] ? row.c[71].v : null;

            if (planned5 && actual6) {
              const orderNo = row.c[1] ? String(row.c[1].v).trim() : "";
              const whEntry = warehouseStatusMap[orderNo] || {};

              const order = {
                rowIndex: actualRowIndex,
                id: row.c[105] ? row.c[105].v : `ORDER-${actualRowIndex}`,
                orderNo: orderNo, // Column B - Order No
                quotationNo: row.c[2] ? row.c[2].v : "", // Column C
                companyName: row.c[3] ? row.c[3].v : "",
                contactPersonName: row.c[4] ? row.c[4].v : "",
                contactNumber: row.c[5] ? row.c[5].v : "",
                billingAddress: row.c[6] ? row.c[6].v : "",
                shippingAddress: row.c[7] ? row.c[7].v : "",
                paymentMode: row.c[8] ? row.c[8].v : "",
                quotationCopy: row.c[9] ? row.c[9].v : "",
                paymentTerms: row.c[10] ? row.c[10].v : "",
                transportMode: row.c[11] ? row.c[11].v : "",
                freightType: row.c[12] ? row.c[12].v : "",
                destination: row.c[13] ? row.c[13].v : "",
                poNumber: row.c[14] ? row.c[14].v : "",
                quotationCopy2: row.c[15] ? row.c[15].v : "",
                acceptanceCopy: row.c[16] ? row.c[16].v : "",
                offer: row.c[17] ? row.c[17].v : "",
                conveyedForRegistration: row.c[18] ? row.c[18].v : "",
                qty: row.c[19] ? row.c[19].v : "",
                amount: row.c[20] ? Number.parseFloat(row.c[20].v) || 0 : 0,
                approvedName: row.c[21] ? row.c[21].v : "",
                calibrationCertRequired: row.c[22] ? row.c[22].v : "",
                certificateCategory: row.c[23] ? row.c[23].v : "",
                installationRequired: row.c[24] ? row.c[24].v : "",
                transportid: row.c[25] ? row.c[25].v : "",
                vehicleNo: row.c[26] ? row.c[26].v : "",
                srnNumber: row.c[27] ? row.c[27].v : "",
                srnNumberAttachment: row.c[28] ? row.c[28].v : "",
                attachment: row.c[29] ? row.c[29].v : "",
                itemName1: row.c[30] ? row.c[30].v : "",
                quantity1: row.c[31] ? row.c[31].v : "",
                itemName2: row.c[32] ? row.c[32].v : "",
                quantity2: row.c[33] ? row.c[33].v : "",
                itemName3: row.c[34] ? row.c[34].v : "",
                quantity3: row.c[35] ? row.c[35].v : "",
                itemName4: row.c[36] ? row.c[36].v : "",
                quantity4: row.c[37] ? row.c[37].v : "",
                itemName5: row.c[38] ? row.c[38].v : "",
                quantity5: row.c[39] ? row.c[39].v : "",
                itemName6: row.c[40] ? row.c[40].v : "",
                quantity6: row.c[41] ? row.c[41].v : "",
                itemName7: row.c[42] ? row.c[42].v : "",
                quantity7: row.c[43] ? row.c[43].v : "",
                itemName8: row.c[44] ? row.c[44].v : "",
                quantity8: row.c[45] ? row.c[45].v : "",
                itemName9: row.c[46] ? row.c[46].v : "",
                quantity9: row.c[47] ? row.c[47].v : "",
                itemName10: row.c[48] ? row.c[48].v : "",
                quantity10: row.c[49] ? row.c[49].v : "",
                itemName11: row.c[50] ? row.c[50].v : "",
                quantity11: row.c[51] ? row.c[51].v : "",
                itemName12: row.c[52] ? row.c[52].v : "",
                quantity12: row.c[53] ? row.c[53].v : "",
                itemName13: row.c[54] ? row.c[54].v : "",
                quantity13: row.c[55] ? row.c[55].v : "",
                itemName14: row.c[56] ? row.c[56].v : "",
                quantity14: row.c[57] ? row.c[57].v : "",
                itemQtyJson: row.c[58] ? row.c[58].v : null,
                totalQty: row.c[59] ? row.c[59].v : "",
                remarks: row.c[60] ? row.c[60].v : "",
                gstNumber: row.c[61] ? row.c[61].v : "",
                invoiceNumber: row.c[65] ? row.c[65].v : "",
                invoiceUpload: row.c[66] ? row.c[66].v : "",
                ewayBillUpload: row.c[67] ? row.c[67].v : "",
                totalQtyHistory: row.c[68] ? row.c[68].v : "",
                totalBillAmount: row.c[69] ? row.c[69].v : "",
                beforePhoto: row.c[73] ? row.c[73].v : "",
                afterPhoto: row.c[74] ? row.c[74].v : "",
                biltyUpload: row.c[75] ? row.c[75].v : "",
                transporterName: row.c[76] ? row.c[76].v : "",
                transporterContact: row.c[77] ? row.c[77].v : "",
                biltyNumber: row.c[78] ? row.c[78].v : "",
                totalCharges: row.c[79] ? row.c[79].v : "",
                warehouseRemarks: row.c[80] ? row.c[80].v : "",
                planned5: row.c[62] ? row.c[62].v : "",
                dSrNumber: row.c[105] ? row.c[105].v : "",
                creName: row.c[106] ? row.c[106].v : "",

                // Fetch Dispatch Status specifically from Warehouse lookup map
                dispatchStatus: whEntry.status || "okay",
                notOkReason: whEntry.reason || "",

                warehouseData: {
                  processedAt: actual6,
                  processedBy: "Current User",
                },
              };
              historyOrders.push(order);
            }
          }
        });

        // Sort history orders by Column BK date (planned5) - most recent first
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

    // Admin and regular users only see data where CRE Name matches their username
    return orders.filter((order) => order.creName === currentUser.username);
  };

  const getUniqueCompanyNames = () => {
    const companies = [
      ...new Set(pendingOrders.map((order) => order.companyName)),
    ];
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
        itemQuantities,
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

      // Warehouse sheet insert (second call)
      const formData2 = new FormData();
      formData2.append("sheetName", "Warehouse");
      formData2.append("action", "insertWarehouseWithDynamicColumns");
      formData2.append("orderNo", order.orderNo);

      formData2.append("totalItems", allItems.length.toString());

      // Prepare Warehouse sheet data with fixed columns EB (index 131) and EC (index 132)
      const warehouseRowData = new Array(133).fill("");
      warehouseRowData[0] = formattedDate; // 1. Time Stamp
      warehouseRowData[1] = order.orderNo; // 2. Order No.
      warehouseRowData[2] = order.quotationNo; // 3. Quotation No.

      // Use pre-uploaded file URLs if available
      if (hasPreUploadedUrls) {
        warehouseRowData[3] = fileUrls.beforePhotoUrl || ""; // 4. Before Photo URLs
        warehouseRowData[4] = fileUrls.afterPhotoUrl || "";  // 5. After Photo URLs
        warehouseRowData[5] = fileUrls.biltyUrl || "";       // 6. Bilty Upload URLs
      }

      warehouseRowData[6] = transporterName || ""; // 7. Transporter Name
      warehouseRowData[7] = transporterContact || ""; // 8. Transporter Contact
      warehouseRowData[8] = biltyNumber || ""; // 9. Bilty No.
      warehouseRowData[9] = totalCharges || ""; // 10. Total Charges
      warehouseRowData[10] = warehouseRemarks || ""; // 11. Warehouse Remarks

      // Add ALL items to warehouse sheet starting from index 11
      // Items: Column L onwards (index 11 = Item Name 1, index 12 = Qty 1, etc.)
      let itemIndex = 11;
      allItems.forEach((item) => {
        warehouseRowData[itemIndex] = item.name || "";
        warehouseRowData[itemIndex + 1] = item.quantity || "";
        itemIndex += 2;
      });

      // Explicitly submit to Column EB (Index 131) and Column EC (Index 132)
      // Note: Column EE (Index 134) is intentionally left empty
      warehouseRowData[131] = dispatchStatus || "okay";
      warehouseRowData[132] = dispatchStatus === "notokay" ? notOkReason : "";
      // Index 133 (ED) and 134 (EE) are left empty

      formData2.append("rowData", JSON.stringify(warehouseRowData));

      const updateResponse2 = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "cors",
        body: formData2,
      });

      if (!updateResponse2.ok) {
        throw new Error(
          `Warehouse insert HTTP error! status: ${updateResponse2.status}`
        );
      }

      let result;
      try {
        const responseText = await updateResponse.text();
        result = JSON.parse(responseText);
      } catch (parseError) {
        result = { success: true };
      }

      if (result.success !== false) {
        await fetchPendingOrders();
        await fetchHistoryOrders();
        return {
          success: true,
          fileUrls: result.fileUrls,
          totalItems: allItems.length,
          totalQty: totalQty,
        };
      } else {
        throw new Error(result.error || "Update failed");
      }
    } catch (err) {
      console.error("Error updating order:", err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setUploading(false);
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
        rowData[11] = editedData.transportMode; // Column L
      if (editedData.freightType !== undefined)
        rowData[12] = editedData.freightType; // Column M
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
      isEditing && columnKey !== "orderNo" && columnKey !== "quotationNo";

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
      default:
        return actualValue || "";
    }
  };

  const handleView = (order) => {
    setViewOrder(order);
    setViewDialogOpen(true);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading orders from Google Sheets...</span>
        </div>
      </MainLayout>
    );
  }

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
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
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

        <Tabs defaultValue="pending" className="hidden sm:block space-y-4">
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
                                    width:
                                      column.key === "actions"
                                        ? "120px"
                                        : column.key === "orderNo"
                                          ? "120px"
                                          : column.key === "quotationNo"
                                            ? "150px"
                                            : column.key === "companyName"
                                              ? "250px"
                                              : column.key === "contactPersonName"
                                                ? "180px"
                                                : column.key === "contactNumber"
                                                  ? "140px"
                                                  : column.key === "billingAddress"
                                                    ? "200px"
                                                    : column.key === "shippingAddress"
                                                      ? "200px"
                                                      : column.key === "isOrderAcceptable"
                                                        ? "150px"
                                                        : column.key ===
                                                          "orderAcceptanceChecklist"
                                                          ? "250px"
                                                          : column.key === "remarks"
                                                            ? "200px"
                                                            : "160px",
                                    minWidth:
                                      column.key === "actions"
                                        ? "120px"
                                        : column.key === "orderNo"
                                          ? "120px"
                                          : column.key === "quotationNo"
                                            ? "150px"
                                            : column.key === "companyName"
                                              ? "250px"
                                              : column.key === "contactPersonName"
                                                ? "180px"
                                                : column.key === "contactNumber"
                                                  ? "140px"
                                                  : column.key === "billingAddress"
                                                    ? "200px"
                                                    : column.key === "shippingAddress"
                                                      ? "200px"
                                                      : column.key === "isOrderAcceptable"
                                                        ? "150px"
                                                        : column.key ===
                                                          "orderAcceptanceChecklist"
                                                          ? "250px"
                                                          : column.key === "remarks"
                                                            ? "200px"
                                                            : "160px",
                                    maxWidth:
                                      column.key === "actions"
                                        ? "120px"
                                        : column.key === "orderNo"
                                          ? "120px"
                                          : column.key === "quotationNo"
                                            ? "150px"
                                            : column.key === "companyName"
                                              ? "250px"
                                              : column.key === "contactPersonName"
                                                ? "180px"
                                                : column.key === "contactNumber"
                                                  ? "140px"
                                                  : column.key === "billingAddress"
                                                    ? "200px"
                                                    : column.key === "shippingAddress"
                                                      ? "200px"
                                                      : column.key === "isOrderAcceptable"
                                                        ? "150px"
                                                        : column.key ===
                                                          "orderAcceptanceChecklist"
                                                          ? "250px"
                                                          : column.key === "remarks"
                                                            ? "200px"
                                                            : "160px",
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
                                        width:
                                          column.key === "actions"
                                            ? "120px"
                                            : column.key === "orderNo"
                                              ? "120px"
                                              : column.key === "quotationNo"
                                                ? "150px"
                                                : column.key === "companyName"
                                                  ? "250px"
                                                  : column.key === "contactPersonName"
                                                    ? "180px"
                                                    : column.key === "contactNumber"
                                                      ? "140px"
                                                      : column.key === "billingAddress"
                                                        ? "200px"
                                                        : column.key === "shippingAddress"
                                                          ? "200px"
                                                          : column.key === "isOrderAcceptable"
                                                            ? "150px"
                                                            : column.key ===
                                                              "orderAcceptanceChecklist"
                                                              ? "250px"
                                                              : column.key === "remarks"
                                                                ? "200px"
                                                                : "160px",
                                        minWidth:
                                          column.key === "actions"
                                            ? "120px"
                                            : column.key === "orderNo"
                                              ? "120px"
                                              : column.key === "quotationNo"
                                                ? "150px"
                                                : column.key === "companyName"
                                                  ? "250px"
                                                  : column.key === "contactPersonName"
                                                    ? "180px"
                                                    : column.key === "contactNumber"
                                                      ? "140px"
                                                      : column.key === "billingAddress"
                                                        ? "200px"
                                                        : column.key === "shippingAddress"
                                                          ? "200px"
                                                          : column.key === "isOrderAcceptable"
                                                            ? "150px"
                                                            : column.key ===
                                                              "orderAcceptanceChecklist"
                                                              ? "250px"
                                                              : column.key === "remarks"
                                                                ? "200px"
                                                                : "160px",
                                        maxWidth:
                                          column.key === "actions"
                                            ? "120px"
                                            : column.key === "orderNo"
                                              ? "120px"
                                              : column.key === "quotationNo"
                                                ? "150px"
                                                : column.key === "companyName"
                                                  ? "250px"
                                                  : column.key === "contactPersonName"
                                                    ? "180px"
                                                    : column.key === "contactNumber"
                                                      ? "140px"
                                                      : column.key === "billingAddress"
                                                        ? "200px"
                                                        : column.key === "shippingAddress"
                                                          ? "200px"
                                                          : column.key === "isOrderAcceptable"
                                                            ? "150px"
                                                            : column.key ===
                                                              "orderAcceptanceChecklist"
                                                              ? "250px"
                                                              : column.key === "remarks"
                                                                ? "200px"
                                                                : "160px",
                                      }}
                                    >
                                      <div className="break-words whitespace-normal leading-relaxed">
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
                                    width:
                                      column.key === "editActions"
                                        ? "120px"
                                        : column.key === "orderNo"
                                          ? "120px"
                                          : column.key === "quotationNo"
                                            ? "150px"
                                            : column.key === "companyName"
                                              ? "250px"
                                              : column.key === "contactPersonName"
                                                ? "180px"
                                                : column.key === "contactNumber"
                                                  ? "140px"
                                                  : column.key === "billingAddress"
                                                    ? "200px"
                                                    : column.key === "shippingAddress"
                                                      ? "200px"
                                                      : column.key === "isOrderAcceptable"
                                                        ? "150px"
                                                        : column.key ===
                                                          "orderAcceptanceChecklist"
                                                          ? "250px"
                                                          : column.key === "remarks"
                                                            ? "200px"
                                                            : column.key === "availabilityStatus"
                                                              ? "150px"
                                                              : column.key === "inventoryRemarks"
                                                                ? "200px"
                                                                : "160px",
                                    minWidth:
                                      column.key === "editActions"
                                        ? "120px"
                                        : column.key === "orderNo"
                                          ? "120px"
                                          : column.key === "quotationNo"
                                            ? "150px"
                                            : column.key === "companyName"
                                              ? "250px"
                                              : column.key === "contactPersonName"
                                                ? "180px"
                                                : column.key === "contactNumber"
                                                  ? "140px"
                                                  : column.key === "billingAddress"
                                                    ? "200px"
                                                    : column.key === "shippingAddress"
                                                      ? "200px"
                                                      : column.key === "isOrderAcceptable"
                                                        ? "150px"
                                                        : column.key ===
                                                          "orderAcceptanceChecklist"
                                                          ? "250px"
                                                          : column.key === "remarks"
                                                            ? "200px"
                                                            : column.key === "availabilityStatus"
                                                              ? "150px"
                                                              : column.key === "inventoryRemarks"
                                                                ? "200px"
                                                                : "160px",
                                    maxWidth:
                                      column.key === "editActions"
                                        ? "120px"
                                        : column.key === "orderNo"
                                          ? "120px"
                                          : column.key === "quotationNo"
                                            ? "150px"
                                            : column.key === "companyName"
                                              ? "250px"
                                              : column.key === "contactPersonName"
                                                ? "180px"
                                                : column.key === "contactNumber"
                                                  ? "140px"
                                                  : column.key === "billingAddress"
                                                    ? "200px"
                                                    : column.key === "shippingAddress"
                                                      ? "200px"
                                                      : column.key === "isOrderAcceptable"
                                                        ? "150px"
                                                        : column.key ===
                                                          "orderAcceptanceChecklist"
                                                          ? "250px"
                                                          : column.key === "remarks"
                                                            ? "200px"
                                                            : column.key === "availabilityStatus"
                                                              ? "150px"
                                                              : column.key === "inventoryRemarks"
                                                                ? "200px"
                                                                : "160px",
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
                                        width:
                                          column.key === "editActions"
                                            ? "120px"
                                            : column.key === "orderNo"
                                              ? "120px"
                                              : column.key === "quotationNo"
                                                ? "150px"
                                                : column.key === "companyName"
                                                  ? "250px"
                                                  : column.key === "contactPersonName"
                                                    ? "180px"
                                                    : column.key === "contactNumber"
                                                      ? "140px"
                                                      : column.key === "billingAddress"
                                                        ? "200px"
                                                        : column.key === "shippingAddress"
                                                          ? "200px"
                                                          : column.key === "isOrderAcceptable"
                                                            ? "150px"
                                                            : column.key ===
                                                              "orderAcceptanceChecklist"
                                                              ? "250px"
                                                              : column.key === "remarks"
                                                                ? "200px"
                                                                : column.key ===
                                                                  "availabilityStatus"
                                                                  ? "150px"
                                                                  : column.key === "inventoryRemarks"
                                                                    ? "200px"
                                                                    : "160px",
                                        minWidth:
                                          column.key === "editActions"
                                            ? "120px"
                                            : column.key === "orderNo"
                                              ? "120px"
                                              : column.key === "quotationNo"
                                                ? "150px"
                                                : column.key === "companyName"
                                                  ? "250px"
                                                  : column.key === "contactPersonName"
                                                    ? "180px"
                                                    : column.key === "contactNumber"
                                                      ? "140px"
                                                      : column.key === "billingAddress"
                                                        ? "200px"
                                                        : column.key === "shippingAddress"
                                                          ? "200px"
                                                          : column.key === "isOrderAcceptable"
                                                            ? "150px"
                                                            : column.key ===
                                                              "orderAcceptanceChecklist"
                                                              ? "250px"
                                                              : column.key === "remarks"
                                                                ? "200px"
                                                                : column.key ===
                                                                  "availabilityStatus"
                                                                  ? "150px"
                                                                  : column.key === "inventoryRemarks"
                                                                    ? "200px"
                                                                    : "160px",
                                        maxWidth:
                                          column.key === "editActions"
                                            ? "120px"
                                            : column.key === "orderNo"
                                              ? "120px"
                                              : column.key === "quotationNo"
                                                ? "150px"
                                                : column.key === "companyName"
                                                  ? "250px"
                                                  : column.key === "contactPersonName"
                                                    ? "180px"
                                                    : column.key === "contactNumber"
                                                      ? "140px"
                                                      : column.key === "billingAddress"
                                                        ? "200px"
                                                        : column.key === "shippingAddress"
                                                          ? "200px"
                                                          : column.key === "isOrderAcceptable"
                                                            ? "150px"
                                                            : column.key ===
                                                              "orderAcceptanceChecklist"
                                                              ? "250px"
                                                              : column.key === "remarks"
                                                                ? "200px"
                                                                : column.key ===
                                                                  "availabilityStatus"
                                                                  ? "150px"
                                                                  : column.key === "inventoryRemarks"
                                                                    ? "200px"
                                                                    : "160px",
                                      }}
                                    >
                                      <div className="break-words whitespace-normal leading-relaxed">
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
          <Tabs defaultValue="pending" className="space-y-4">
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
                              Quotation No:
                            </span>
                            <p className="font-medium">
                              {order.quotationNo || "-"}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">
                              D-Sr Number:
                            </span>
                            <p className="font-medium">
                              {order.dSrNumber || "-"}
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

                        {/* Addresses */}
                        <div className="border-t pt-3 space-y-2">
                          <div>
                            <span className="text-gray-500 text-xs">
                              Billing Address:
                            </span>
                            <p className="text-sm mt-1">
                              {order.billingAddress || "-"}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">
                              Shipping Address:
                            </span>
                            <p className="text-sm mt-1">
                              {order.shippingAddress || "-"}
                            </p>
                          </div>
                        </div>

                        {/* Payment & Transport Details */}
                        <div className="border-t pt-3 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500 text-xs">
                              Payment Mode:
                            </span>
                            <p className="font-medium">
                              {order.paymentMode || "-"}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">
                              Payment Terms:
                            </span>
                            <p className="font-medium">
                              {order.paymentTerms || "-"}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">
                              Transport Mode:
                            </span>
                            <p className="font-medium">
                              {order.transportMode || "-"}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">
                              Freight Type:
                            </span>
                            <p className="font-medium">
                              {order.freightType || "-"}
                            </p>
                          </div>
                        </div>

                        {/* Destination & Vehicle */}
                        <div className="border-t pt-3 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500 text-xs">
                              Destination:
                            </span>
                            <p className="font-medium">
                              {order.destination || "-"}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">
                              Vehicle No:
                            </span>
                            <p className="font-medium">
                              {order.vehicleNo || "-"}
                            </p>
                          </div>
                        </div>

                        {/* Items Summary */}
                        <div className="border-t pt-3">
                          <span className="text-gray-500 text-xs">Items:</span>
                          <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                            {[
                              1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
                            ].map((num) => {
                              const itemName = order[`itemName${num}`];
                              const quantity = order[`quantity${num}`];
                              if (itemName || quantity) {
                                return (
                                  <div
                                    key={num}
                                    className="flex justify-between text-xs bg-gray-50 p-2 rounded"
                                  >
                                    <span className="font-medium">
                                      {itemName || "-"}
                                    </span>
                                    <span className="text-gray-600">
                                      Qty: {quantity || "-"}
                                    </span>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        </div>

                        {/* Total Quantity & Amount */}
                        <div className="border-t pt-3 flex justify-between items-center">
                          <div>
                            <span className="text-gray-500 text-xs">
                              Total Qty:
                            </span>
                            <p className="text-lg font-bold text-violet-600">
                              {order.totalQty || "0"}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-gray-500 text-xs">
                              Amount:
                            </span>
                            <p className="text-lg font-bold text-violet-600">
                              {order.amount
                                ? `₹${Number(order.amount).toLocaleString(
                                  "en-IN"
                                )}`
                                : "₹0"}
                            </p>
                          </div>
                        </div>

                        {/* Invoice & Documents */}
                        {(order.invoiceNumber || order.invoiceUpload) && (
                          <div className="border-t pt-3">
                            <span className="text-gray-500 text-xs">
                              Invoice:
                            </span>
                            <div className="mt-1 space-y-1">
                              {order.invoiceNumber && (
                                <p className="text-sm font-medium">
                                  {order.invoiceNumber}
                                </p>
                              )}
                              {order.invoiceUpload &&
                                order.invoiceUpload.startsWith("http") && (
                                  <a
                                    href={order.invoiceUpload}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded"
                                  >
                                    <Eye className="h-3 w-3" />
                                    View Invoice
                                  </a>
                                )}
                            </div>
                          </div>
                        )}

                        {/* Certificates & Installation */}
                        <div className="border-t pt-3 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500 text-xs">
                              Calibration Cert:
                            </span>
                            <span
                              className={`inline-block mt-1 px-2 py-1 text-xs rounded ${order.calibrationCertRequired === "Yes"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                                }`}
                            >
                              {order.calibrationCertRequired || "N/A"}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">
                              Installation:
                            </span>
                            <span
                              className={`inline-block mt-1 px-2 py-1 text-xs rounded ${order.installationRequired === "Yes"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                                }`}
                            >
                              {order.installationRequired || "N/A"}
                            </span>
                          </div>
                        </div>

                        {/* Remarks */}
                        {order.remarks && (
                          <div className="border-t pt-3">
                            <span className="text-gray-500 text-xs">
                              Remarks:
                            </span>
                            <p className="text-sm mt-1 text-gray-700">
                              {order.remarks}
                            </p>
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
                                      {renderHistoryCellContent(
                                        order,
                                        column.key
                                      )}
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
    </MainLayout>
  );
}