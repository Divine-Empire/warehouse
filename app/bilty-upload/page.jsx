"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Search,
    RefreshCw,
    Package,
    History,
    FileText,
    ExternalLink,
    AlertCircle,
    CheckCircle2,
    CloudUpload
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import ProcessDialog from "@/components/process-dialog";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyzW8-RldYx917QpAfO4kY-T8_ntg__T0sbr7Yup2ZTVb1FC5H1g6TYuJgAU6wTquVM/exec";
const SHEET_ID = "1yEsh4yzyvglPXHxo-5PT70VpwVJbxV7wwH8rpU1RFJA";
const SHEET_NAME = "DISPATCH-DELIVERY";
const WAREHOUSE_SHEET_NAME = "Warehouse";

const sharedColumns = [
    { key: "orderNo", label: "Order No." },
    { key: "quotationNo", label: "Quotation No." },
    { key: "companyName", label: "Company Name" },
    { key: "transporterName", label: "Transporter Name" },
    { key: "transporterContact", label: "Transporter Contact" },
    { key: "biltyNumber", label: "Bilty/Docket No." },
    { key: "totalCharges", label: "Total Charges" },
    { key: "warehouseRemarks", label: "Warehouse Remarks" },
    { key: "attachment", label: "Attachment" },
    { key: "beforePhoto", label: "Before Photo Upload" },
    { key: "afterPhoto", label: "After Photo Upload" },
    { key: "dispatchStatus", label: "Dispatch Confirmation" },
    { key: "notOkReason", label: "Reason for not okay" },
];

const pendingColumns = [
    { key: "actions", label: "Actions" },
    ...sharedColumns
];

const historyColumns = [
    { key: "actions", label: "Status" },
    ...sharedColumns,
    { key: "biltyUpload", label: "Bilty Upload" },
    { key: "driverCharges", label: "Driver Charges" },
];

export default function BiltyUploadPage() {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("pending");

    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);

            // 1. Fetch DISPATCH-DELIVERY sheet
            const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;
            const response = await fetch(sheetUrl);
            const text = await response.text();
            const jsonStart = text.indexOf("{");
            const jsonEnd = text.lastIndexOf("}") + 1;
            const data = JSON.parse(text.substring(jsonStart, jsonEnd));
            if (!data || !data.table || !data.table.rows) return;

            // 2. Fetch Warehouse sheet for Driver Charges (Column EN = index 143)
            const whUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${WAREHOUSE_SHEET_NAME}`;
            const whResponse = await fetch(whUrl);
            const whText = await whResponse.text();
            const whJsonStart = whText.indexOf("{");
            const whJsonEnd = whText.lastIndexOf("}") + 1;
            const whData = JSON.parse(whText.substring(whJsonStart, whJsonEnd));

            // Build a map of orderNo -> detailed data from Warehouse sheet
            const whDataMap = new Map();
            if (whData && whData.table && whData.table.rows) {
                whData.table.rows.slice(1).forEach((row) => {
                    if (!row.c) return;
                    const orderNo = row.c[1] ? String(row.c[1].v || "").trim() : "";
                    if (orderNo) {
                        whDataMap.set(orderNo, {
                            beforePhoto: row.c[3]?.v || "",
                            afterPhoto: row.c[4]?.v || "",
                            biltyUpload: row.c[5]?.v || "",
                            transporterName: row.c[6]?.v || "",
                            transporterContact: row.c[7]?.v || "",
                            biltyNumber: row.c[8]?.v || "",
                            totalCharges: row.c[9]?.v || "",
                            warehouseRemarks: row.c[10]?.v || "",
                            dispatchStatus: row.c[131]?.v || "okay",
                            notOkReason: row.c[132]?.v || "",
                            driverCharges: row.c[143]?.v || ""
                        });
                    }
                });
            }

            const ordersMap = new Map();

            data.table.rows.slice(1).forEach((row, index) => {
                if (!row.c || !row.c[105] || !row.c[105].v) return;

                const dSrNumber = String(row.c[105].v).trim();
                const bvColumn = row.c[73] ? row.c[73].v : null; // BV
                const bxColumn = row.c[75] ? row.c[75].v : null; // BX

                if (bvColumn) {
                    const orderNo = row.c[1] ? String(row.c[1].v).trim() : "";
                    const whInfo = whDataMap.get(orderNo) || {};
                    const order = {
                        rowIndex: index + 2,
                        id: dSrNumber,
                        dSrNumber: dSrNumber,
                        orderNo,
                        quotationNo: row.c[2] ? row.c[2].v : "",
                        companyName: row.c[3] ? row.c[3].v : "",
                        transporterName: whInfo.transporterName || (row.c[6] ? row.c[6].v : ""),
                        transporterContact: whInfo.transporterContact || "",
                        biltyNumber: whInfo.biltyNumber || "",
                        totalCharges: whInfo.totalCharges || "",
                        warehouseRemarks: whInfo.warehouseRemarks || "",
                        attachment: row.c[29]?.v || "",
                        beforePhoto: whInfo.beforePhoto || "",
                        afterPhoto: whInfo.afterPhoto || "",
                        biltyUpload: bxColumn || whInfo.biltyUpload || "",
                        driverCharges: whInfo.driverCharges || "",
                        dispatchStatus: whInfo.dispatchStatus || "okay",
                        notOkReason: whInfo.notOkReason || "",
                        bvColumn,
                        bxColumn
                    };
                    ordersMap.set(dSrNumber, order);
                }
            });

            const allOrders = Array.from(ordersMap.values());
            setOrders(allOrders);
        } catch (error) {
            console.error("Error fetching orders:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const filteredOrders = useMemo(() => {
        // First filter by tab status (BV vs BX)
        let tabFiltered = [];
        if (activeTab === "pending") {
            tabFiltered = orders.filter(o => o.bvColumn && !o.bxColumn);
        } else {
            tabFiltered = orders.filter(o => o.bvColumn && o.bxColumn);
        }

        // Then filter by search query
        if (!searchQuery) return tabFiltered;
        const lowQuery = searchQuery.toLowerCase();
        return tabFiltered.filter(
            (o) =>
                o.orderNo?.toLowerCase().includes(lowQuery) ||
                o.companyName?.toLowerCase().includes(lowQuery) ||
                o.dSrNumber?.toLowerCase().includes(lowQuery)
        );
    }, [orders, activeTab, searchQuery]);

    const handleProcessBilty = async (dialogData) => {
        try {
            setUploading(true);
            const { order, driverCharges, fileUrls } = dialogData;

            // 1. Update DISPATCH-DELIVERY (Main Sheet)
            // BX (index 75)
            const formData = new FormData();
            formData.append("sheetName", SHEET_NAME);
            formData.append("action", "updateByDSrNumber");
            formData.append("dSrNumber", order.dSrNumber);

            const rowData = new Array(143).fill("");
            rowData[75] = fileUrls.biltyUrl || ""; // Column BX
            formData.append("rowData", JSON.stringify(rowData));

            const response = await fetch(APPS_SCRIPT_URL, {
                method: "POST",
                mode: "cors",
                body: formData,
            });

            if (!response.ok) throw new Error("Main sheet update failed");

            // 2. Update Warehouse Sheet
            // BX (index 5) and EN (index 143)
            const formData2 = new FormData();
            formData2.append("sheetName", "Warehouse");
            formData2.append("action", "updateByOrderNo");
            formData2.append("orderNo", order.orderNo);

            const warehouseRowData = new Array(145).fill("");
            warehouseRowData[5] = fileUrls.biltyUrl || ""; // Column BX (in Warehouse sheet this is index 5 usually)
            // Actually, let's check transportation/packaging logic for index mapping in Warehouse
            // In transportation page: warehouseRowData[5] = fileUrls.biltyUrl (Column F)
            warehouseRowData[143] = driverCharges; // Column EN

            // Ensure D-Sr Number is also there if missing
            warehouseRowData[105] = order.dSrNumber;

            formData2.append("rowData", JSON.stringify(warehouseRowData));

            const response2 = await fetch(APPS_SCRIPT_URL, {
                method: "POST",
                mode: "cors",
                body: formData2,
            });

            if (!response2.ok) throw new Error("Warehouse sheet update failed");

            setIsDialogOpen(false);
            await fetchOrders();
            return { success: true };
        } catch (error) {
            console.error("Error processing bilty:", error);
            return { success: false, error: error.message };
        } finally {
            setUploading(false);
        }
    };

    return (
        <MainLayout>
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                            <FileText className="h-8 w-8 text-blue-600" />
                            Bilty Upload
                        </h1>
                        <p className="text-slate-500 mt-1">Manage Bilty/Docket uploads and Driver charges</p>
                    </div>
                    <Button
                        onClick={fetchOrders}
                        variant="outline"
                        disabled={loading}
                        className="gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh Data
                    </Button>
                </div>

                <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search by Order No, Company, or D-Sr Number..."
                            className="pl-10 h-11 border-slate-200 focus:ring-blue-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-4">
                        <TabsTrigger value="pending" className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Pending Bilty
                        </TabsTrigger>
                        <TabsTrigger value="history" className="flex items-center gap-2">
                            <History className="h-4 w-4" />
                            History
                        </TabsTrigger>
                    </TabsList>

                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b border-slate-200">
                            <CardTitle className="text-xl">
                                {activeTab === "pending" ? "Pending Uploads" : "Upload History"}
                            </CardTitle>
                            <CardDescription>
                                {activeTab === "pending"
                                    ? "Orders waiting for Bilty/Docket documentation"
                                    : "Previously uploaded Bilty documentation"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                                <Table>
                                    <TableHeader className="sticky top-0 z-10">
                                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                                            {(activeTab === "pending" ? pendingColumns : historyColumns).map((col) => (
                                                <TableHead key={col.key} className="font-bold text-slate-700 whitespace-nowrap">
                                                    {col.label}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={activeTab === "pending" ? pendingColumns.length : historyColumns.length} className="h-32 text-center">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
                                                        <span className="text-slate-500 font-medium">Fetching orders...</span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredOrders.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={activeTab === "pending" ? pendingColumns.length : historyColumns.length} className="h-32 text-center text-slate-500 font-medium">
                                                    No orders found
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredOrders.map((order) => (
                                                <TableRow key={order.dSrNumber} className="hover:bg-slate-50 transition-colors">
                                                    <TableCell>
                                                        {activeTab === "pending" ? (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedOrder(order);
                                                                    setIsDialogOpen(true);
                                                                }}
                                                                className="bg-blue-600 hover:bg-blue-700 font-semibold"
                                                            >
                                                                Upload Bilty
                                                            </Button>
                                                        ) : (
                                                            <div className="flex items-center gap-2 text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full w-fit">
                                                                <CheckCircle2 className="h-4 w-4" />
                                                                Uploaded
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="font-bold text-slate-900">{order.orderNo}</TableCell>
                                                    <TableCell className="text-slate-600 font-medium">{order.quotationNo}</TableCell>
                                                    <TableCell className="font-medium text-slate-800">{order.companyName}</TableCell>
                                                    <TableCell className="text-slate-600">{order.transporterName}</TableCell>
                                                    <TableCell className="text-slate-600">{order.transporterContact || "-"}</TableCell>
                                                    <TableCell className="font-bold text-slate-900">{order.biltyNumber || "-"}</TableCell>
                                                    <TableCell className="font-bold text-slate-900">{order.totalCharges ? `₹${order.totalCharges}` : "-"}</TableCell>
                                                    <TableCell className="text-slate-600 max-w-[200px] truncate" title={order.warehouseRemarks}>
                                                        {order.warehouseRemarks || <span className="text-slate-400 italic">No remarks</span>}
                                                    </TableCell>
                                                    <TableCell>
                                                        {order.attachment ? (
                                                            <a href={order.attachment} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2 py-1 rounded text-[10px] font-bold border border-blue-100">
                                                                <FileText className="h-2.5 w-2.5" /> View
                                                            </a>
                                                        ) : <span className="text-slate-300">-</span>}
                                                    </TableCell>
                                                    <TableCell>
                                                        {order.beforePhoto ? (
                                                            <a href={order.beforePhoto} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-[10px] font-bold border border-indigo-100">
                                                                <CloudUpload className="h-2.5 w-2.5" /> Before
                                                            </a>
                                                        ) : <span className="text-slate-300">-</span>}
                                                    </TableCell>
                                                    <TableCell>
                                                        {order.afterPhoto ? (
                                                            <a href={order.afterPhoto} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-[10px] font-bold border border-indigo-100">
                                                                <CloudUpload className="h-2.5 w-2.5" /> After
                                                            </a>
                                                        ) : <span className="text-slate-300">-</span>}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className={`text-[10px] font-bold px-2 py-1 rounded w-fit border ${order.dispatchStatus === "okay"
                                                            ? "bg-green-50 text-green-700 border-green-100"
                                                            : "bg-red-50 text-red-700 border-red-100"
                                                            }`}>
                                                            {order.dispatchStatus === "okay" ? "Okay" : "Not Okay"}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-slate-600 max-w-[150px] truncate" title={order.notOkReason}>
                                                        {order.notOkReason || "-"}
                                                    </TableCell>

                                                    {activeTab === "history" && (
                                                        <>
                                                            <TableCell>
                                                                {order.biltyUpload ? (
                                                                    <a
                                                                        href={order.biltyUpload}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-bold bg-blue-50 px-2.5 py-1 rounded transition-colors w-fit"
                                                                    >
                                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                                        View Bilty
                                                                    </a>
                                                                ) : (
                                                                    <span className="text-slate-400 text-sm flex items-center gap-1.5">
                                                                        <AlertCircle className="h-3.5 w-3.5" />
                                                                        Missing
                                                                    </span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                {order.driverCharges ? (
                                                                    <span className="font-bold text-slate-900">₹{order.driverCharges}</span>
                                                                ) : (
                                                                    <span className="text-slate-400 italic">Not set</span>
                                                                )}
                                                            </TableCell>
                                                        </>
                                                    )}
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </Tabs>
            </div>

            <ProcessDialog
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                selectedOrder={selectedOrder}
                onSubmit={handleProcessBilty}
                uploading={uploading}
                currentUser={user}
                biltyMode={true}
            />
        </MainLayout>
    );
}
