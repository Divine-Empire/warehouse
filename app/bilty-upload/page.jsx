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
    { key: "companyName", label: "Company Name" },
    { key: "invoiceNumber", label: "Invoice Number" },
    { key: "invoiceUpload", label: "Invoice Upload" },
    { key: "invoiceCreatedDate", label: "Invoice Date" },
    { key: "transportMode", label: "Transport Mode" },
    { key: "shippingAddress", label: "Shipping Address" },
    { key: "transporterName", label: "Assigned Driver for Dispatch" },
    { key: "warehouseRemarks", label: "Transporter Assigned" },
];

const pendingColumns = [
    { key: "actions", label: "Actions" },
    ...sharedColumns
];

const historyColumns = [
    { key: "actions", label: "Status" },
    ...sharedColumns,
    { key: "biltyUpload", label: "Bilty Upload" },
];

export default function BiltyUploadPage() {
    const { user, isLoading } = useAuth();
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

            // 1. Fetch DISPATCH-DELIVERY sheet via Proxy
            const dispatchFetchUrl = `${APPS_SCRIPT_URL}?sheet=${encodeURIComponent(SHEET_NAME)}&action=fetch`;
            const dispatchResponse = await fetch(dispatchFetchUrl);
            const dispatchResult = await dispatchResponse.json();
            
            if (!dispatchResult.success || !Array.isArray(dispatchResult.data)) {
                throw new Error(dispatchResult.message || "Failed to fetch DISPATCH-DELIVERY data");
            }

            // 2. Fetch Warehouse sheet via Proxy for supplementary data
            const whFetchUrl = `${APPS_SCRIPT_URL}?sheet=${encodeURIComponent(WAREHOUSE_SHEET_NAME)}&action=fetch`;
            const whResponse = await fetch(whFetchUrl);
            const whResult = await whResponse.json();

            // Build a map of orderNo -> detailed data from Warehouse sheet
            const whDataMap = new Map();
            if (whResult.success && Array.isArray(whResult.data)) {
                whResult.data.slice(1).forEach((row) => {
                    if (!row || row.length < 2) return;
                    const orderNo = row[1] ? String(row[1]).trim() : "";
                    if (orderNo) {
                        whDataMap.set(orderNo, {
                            beforePhoto: row[3] || "",
                            afterPhoto: row[4] || "",
                            biltyUpload: row[5] || "",
                            transporterName: row[6] || "",
                            transporterContact: row[7] || "",
                            biltyNumber: row[8] || "",
                            totalCharges: row[9] || "",
                            warehouseRemarks: row[10] || "",
                            dispatchStatus: row[131] || "okay",
                            notOkReason: row[132] || "",
                            driverCharges: row[143] || ""
                        });
                    }
                });
            }

            const ordersMap = new Map();

            // Process DISPATCH-DELIVERY rows (slice(6) to skip headers)
            dispatchResult.data.slice(6).forEach((row, index) => {
                if (!row || !row[105]) return; // D-Sr Number at index 105

                const dSrNumber = String(row[105]).trim();
                const bvColumn = row[73] || null; // Column BV
                const bxColumn = row[75] || null; // Column BX
                const byColumn = row[76] ? String(row[76]).trim() : ""; // Column BY (Index 76)

                const orderNo = row[1] ? String(row[1]).trim() : "";
                const whInfo = whDataMap.get(orderNo) || {};
                
                const order = {
                    rowIndex: index + 7,
                    id: dSrNumber,
                    dSrNumber: dSrNumber,
                    orderNo,
                    quotationNo: row[2] || "",
                    companyName: row[3] || "",
                    shippingAddress: row[7] || "",
                    transportMode: row[11] || "",
                    
                    // Exclusive source from Column BY (index 76) with NO FALLBACK as requested
                    transporterName: byColumn, 
                    
                    transporterContact: whInfo.transporterContact || "",
                    biltyNumber: whInfo.biltyNumber || "",
                    totalCharges: whInfo.totalCharges || "",
                    warehouseRemarks: whInfo.warehouseRemarks || "",
                    invoiceNumber: row[65] || "",
                    invoiceUpload: row[66] || "",
                    attachment: row[29] || "",
                    beforePhoto: whInfo.beforePhoto || "",
                    afterPhoto: whInfo.afterPhoto || "",
                    biltyUpload: bxColumn || whInfo.biltyUpload || "",
                    driverCharges: whInfo.driverCharges || "",
                    dispatchStatus: whInfo.dispatchStatus || "okay",
                    notOkReason: whInfo.notOkReason || "",
                    transporterByName: byColumn,
                    invoiceCreatedDate: row[63] || "-", 
                    warehouseLocation: row[103] || "", 
                    bvColumn,
                    bxColumn
                };
                ordersMap.set(dSrNumber, order);
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
        // 1. Filter by Column BY (matching user.fullName)
        let userFiltered = orders;

        // Debug: Check user data
        console.log("Current user:", user);
        console.log("User role:", user?.role);
        console.log("User fullName:", user?.fullName);

        if (user && user.role === "user") {
            const userFullName = user.fullName?.toLowerCase().trim();
            console.log("Filtering for fullName:", userFullName);
            userFiltered = orders.filter(o => {
                const match = o.transporterByName?.toLowerCase().trim() === userFullName;
                if (match) {
                    console.log("Matched order:", o.orderNo, "transporterByName:", o.transporterByName);
                }
                return match;
            });
        }

        // Warehouse-based filtering
        const normalizeLoc = (loc) => String(loc || "").toLowerCase().replace(/^by\s*/i, "").replace(/[^a-z0-9]/g, "").trim();
        if (user && user.role !== "super_admin") {
            const userLocations = user.location || ["None"];
            const isAllLocations = userLocations.some(l => l.toLowerCase() === "all");

            if (!isAllLocations) {
                userFiltered = userFiltered.filter(order => {
                    const orderLocNormalized = normalizeLoc(order.warehouseLocation);
                    return userLocations.some(l => normalizeLoc(l) === orderLocNormalized);
                });
            }
        }

        // 2. Filter by tab status (BX - Bilty Uploaded)
        let tabFiltered = [];
        if (activeTab === "pending") {
            tabFiltered = userFiltered.filter(o => !o.bxColumn);
        } else {
            tabFiltered = userFiltered.filter(o => o.bxColumn);
        }

        // 3. Filter by search query
        if (!searchQuery) return tabFiltered;
        const lowQuery = searchQuery.toLowerCase();
        return tabFiltered.filter(
            (o) =>
                o.orderNo?.toLowerCase().includes(lowQuery) ||
                o.companyName?.toLowerCase().includes(lowQuery) ||
                o.dSrNumber?.toLowerCase().includes(lowQuery)
        );
    }, [orders, activeTab, searchQuery, user]);

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

    const handleProcessBilty = async (dialogData) => {
        try {
            setUploading(true);
            const { order, driverCharges, fileUrls, transporterContact, biltyNumber, totalCharges, warehouseRemarks } = dialogData;

            // 1. Update DISPATCH-DELIVERY (Main Sheet)
            // BX (index 75), BZ (index 77), CA (index 78), CB (index 79), CC (index 80)
            const formData = new FormData();
            formData.append("sheetName", SHEET_NAME);
            formData.append("action", "updateByDSrNumber");
            formData.append("dSrNumber", order.dSrNumber);

            const rowData = new Array(143).fill("");
            rowData[75] = fileUrls.biltyUrl || ""; // Column BX - Bilty Upload
            rowData[77] = transporterContact || ""; // Column BZ - Transporter Contact
            rowData[78] = biltyNumber || ""; // Column CA - Bilty Number
            rowData[79] = totalCharges || ""; // Column CB - Total Charges
            rowData[80] = warehouseRemarks || ""; // Column CC - Warehouse Remarks
            formData.append("rowData", JSON.stringify(rowData));

            // 2. Update Warehouse Sheet
            const formData2 = new FormData();
            formData2.append("sheetName", "Warehouse");
            formData2.append("action", "updateByOrderNo");
            formData2.append("orderNo", order.orderNo);

            const warehouseRowData = new Array(145).fill("");
            warehouseRowData[5] = fileUrls.biltyUrl || "";
            warehouseRowData[7] = transporterContact || "";
            warehouseRowData[8] = biltyNumber || "";
            warehouseRowData[9] = totalCharges || "";
            warehouseRowData[10] = warehouseRemarks || "";
            warehouseRowData[143] = driverCharges;
            warehouseRowData[105] = order.dSrNumber;
            formData2.append("rowData", JSON.stringify(warehouseRowData));

            // Run both updates in parallel
            const [response, response2] = await Promise.all([
                fetch(APPS_SCRIPT_URL, {
                    method: "POST",
                    mode: "cors",
                    body: formData,
                }),
                fetch(APPS_SCRIPT_URL, {
                    method: "POST",
                    mode: "cors",
                    body: formData2,
                })
            ]);

            if (!response.ok) throw new Error("Main sheet update failed");
            if (!response2.ok) throw new Error("Warehouse sheet update failed");

            // Verify success for both
            const res1 = await response.json();
            const res2 = await response2.json();

            if (!res1.success) throw new Error(`Main sheet: ${res1.error}`);
            if (!res2.success) throw new Error(`Warehouse sheet: ${res2.error}`);

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

    if (isLoading) {
        return (
            <MainLayout>
                <div className="flex h-screen items-center justify-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                            <FileText className="h-8 w-8 text-blue-600" />
                            Bilty Upload
                        </h1>
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

                    <TabsContent value="pending" className="m-0">
                        <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
                            <CardHeader className="bg-blue-50/30 border-b border-blue-100/50">
                                <CardTitle className="text-lg font-bold text-slate-800">Pending Uploads</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="relative overflow-x-auto max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                                    <Table className="relative border-separate border-spacing-0">
                                        <TableHeader className="sticky top-0 z-20">
                                            <TableRow className="bg-blue-50 hover:bg-blue-50 border-b border-blue-100">
                                                {pendingColumns.map((col) => (
                                                    <TableHead key={col.key} className="font-bold text-blue-900 h-12 whitespace-nowrap border-r border-blue-100/50 last:border-r-0 sticky top-0 bg-blue-50 z-30 shadow-sm">
                                                        {col.label}
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loading ? (
                                                <TableRow>
                                                    <TableCell colSpan={pendingColumns.length} className="h-32 text-center">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
                                                            <span className="text-slate-500 font-medium">Fetching orders...</span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : filteredOrders.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={pendingColumns.length} className="h-32 text-center text-slate-500 font-medium">
                                                        No orders found
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredOrders.map((order) => (
                                                    <TableRow key={order.dSrNumber} className="hover:bg-blue-50/30 transition-colors border-b border-slate-100">
                                                        <TableCell className="border-r border-slate-100">
                                                            <Button
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedOrder(order);
                                                                    setIsDialogOpen(true);
                                                                }}
                                                                className="bg-blue-600 hover:bg-blue-700 font-semibold h-8 rounded-lg shadow-sm"
                                                            >
                                                                Upload Bilty
                                                            </Button>
                                                        </TableCell>
                                                        <TableCell className="font-semibold text-slate-900 border-r border-slate-100">{order.companyName}</TableCell>
                                                        <TableCell className="text-slate-600 font-medium border-r border-slate-100">{order.invoiceNumber || "-"}</TableCell>
                                                        <TableCell className="border-r border-slate-100">
                                                            {order.invoiceUpload ? (
                                                                <a href={order.invoiceUpload} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-2 py-1 rounded text-[10px] font-bold border border-green-100 transition-colors hover:bg-green-100">
                                                                    <FileText className="h-2.5 w-2.5" /> View
                                                                </a>
                                                            ) : <span className="text-slate-300">-</span>}
                                                        </TableCell>
                                                        <TableCell className="text-slate-600 font-medium border-r border-slate-100">{formatDateToMMDDYYYY(order.invoiceCreatedDate)}</TableCell>
                                                        <TableCell className="text-slate-600 border-r border-slate-100">{order.transportMode || "-"}</TableCell>
                                                        <TableCell className="text-slate-600 max-w-[200px] truncate border-r border-slate-100" title={order.shippingAddress}>{order.shippingAddress || "-"}</TableCell>
                                                        <TableCell className="text-slate-800 font-medium border-r border-slate-100">{order.transporterName || "-"}</TableCell>
                                                        <TableCell className="text-slate-600 border-r border-slate-100">
                                                            {order.warehouseRemarks || <span className="text-slate-400 italic">No remarks</span>}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="history" className="m-0">
                        <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
                            <CardHeader className="bg-blue-50/30 border-b border-blue-100/50">
                                <CardTitle className="text-lg font-bold text-slate-800">Upload History</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="relative overflow-x-auto max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                                    <Table className="relative border-separate border-spacing-0">
                                        <TableHeader className="sticky top-0 z-20">
                                            <TableRow className="bg-blue-50 hover:bg-blue-50 border-b border-blue-100">
                                                {historyColumns.map((col) => (
                                                    <TableHead key={col.key} className="font-bold text-blue-900 h-12 whitespace-nowrap border-r border-blue-100/50 last:border-r-0 sticky top-0 bg-blue-50 z-30 shadow-sm">
                                                        {col.label}
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loading ? (
                                                <TableRow>
                                                    <TableCell colSpan={historyColumns.length} className="h-32 text-center">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
                                                            <span className="text-slate-500 font-medium">Fetching orders...</span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : filteredOrders.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={historyColumns.length} className="h-32 text-center text-slate-500 font-medium">
                                                        No orders found
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredOrders.map((order) => (
                                                    <TableRow key={order.dSrNumber} className="hover:bg-blue-50/30 transition-colors border-b border-slate-100">
                                                        <TableCell className="border-r border-slate-100">
                                                            <div className="flex items-center gap-2 text-green-700 font-bold bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 w-fit text-xs">
                                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                                Uploaded
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-semibold text-slate-900 border-r border-slate-100">{order.companyName}</TableCell>
                                                        <TableCell className="text-slate-600 font-medium border-r border-slate-100">{order.invoiceNumber || "-"}</TableCell>
                                                        <TableCell className="border-r border-slate-100">
                                                            {order.invoiceUpload ? (
                                                                <a href={order.invoiceUpload} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-2 py-1 rounded text-[10px] font-bold border border-green-100 transition-colors hover:bg-green-100">
                                                                    <FileText className="h-2.5 w-2.5" /> View
                                                                </a>
                                                            ) : <span className="text-slate-300">-</span>}
                                                        </TableCell>
                                                        <TableCell className="text-slate-600 font-medium border-r border-slate-100">{formatDateToMMDDYYYY(order.invoiceCreatedDate)}</TableCell>
                                                        <TableCell className="text-slate-600 border-r border-slate-100">{order.transportMode || "-"}</TableCell>
                                                        <TableCell className="text-slate-600 max-w-[200px] truncate border-r border-slate-100" title={order.shippingAddress}>{order.shippingAddress || "-"}</TableCell>
                                                        <TableCell className="text-slate-800 font-medium border-r border-slate-100">{order.transporterName || "-"}</TableCell>
                                                        <TableCell className="text-slate-600 border-r border-slate-100">
                                                            {order.warehouseRemarks || <span className="text-slate-400 italic">No remarks</span>}
                                                        </TableCell>
                                                        <TableCell>
                                                            {order.biltyUpload ? (
                                                                <a
                                                                    href={order.biltyUpload}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-1.5 text-blue-700 hover:text-blue-900 font-bold bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 transition-all w-fit text-xs shadow-sm"
                                                                >
                                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                                    View Bilty
                                                                </a>
                                                            ) : (
                                                                <span className="text-slate-400 text-xs flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                                                    <AlertCircle className="h-3.5 w-3.5" />
                                                                    Missing
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
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
