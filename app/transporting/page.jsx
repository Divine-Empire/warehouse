"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Truck, Search, RefreshCw, FileText, Settings as SettingsIcon, Loader2 } from "lucide-react"
import ProcessDialog from "@/components/process-dialog"

export default function TransportingPage() {
    const [orders, setOrders] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [error, setError] = useState(null)
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [uploading, setUploading] = useState(false)

    const { user } = useAuth()

    const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyzW8-RldYx917QpAfO4kY-T8_ntg__T0sbr7Yup2ZTVb1FC5H1g6TYuJgAU6wTquVM/exec"
    const SHEET_ID = "1yEsh4yzyvglPXHxo-5PT70VpwVJbxV7wwH8rpU1RFJA"
    const SHEET_NAME = "DISPATCH-DELIVERY"

    const fetchOrders = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`
            const response = await fetch(sheetUrl)
            const text = await response.text()

            const jsonStart = text.indexOf("{")
            const jsonEnd = text.lastIndexOf("}") + 1
            const jsonData = text.substring(jsonStart, jsonEnd)
            const data = JSON.parse(jsonData)

            if (data && data.table && data.table.rows) {
                const ordersMap = new Map();

                data.table.rows.slice(1).forEach((row, index) => {
                    if (!row.c || !row.c[105] || !row.c[105].v) return;

                    const dSrNumber = String(row.c[105].v).trim();
                    if (!dSrNumber) return;

                    const order = {
                        rowIndex: index + 2,
                        timeStamp: row.c[0]?.v || "",
                        orderNo: row.c[1]?.v || "",
                        quotationNo: row.c[2]?.v || "",
                        companyName: row.c[3]?.v || "",
                        contactPersonName: row.c[4]?.v || "",
                        contactNumber: row.c[5]?.v || "",
                        billingAddress: row.c[6]?.v || "",
                        shippingAddress: row.c[7]?.v || "",
                        paymentMode: row.c[8]?.v || "",
                        paymentTerms: row.c[10]?.v || "",
                        transportMode: row.c[11]?.v || "",
                        freightType: row.c[12]?.v || "",
                        destination: row.c[13]?.v || "",
                        poNumber: row.c[14]?.v || "",
                        offer: row.c[17]?.v || "",
                        qty: row.c[19]?.v || "",
                        amount: row.c[20]?.v || 0,
                        approvedName: row.c[21]?.v || "",
                        calibrationCertRequired: row.c[22]?.v || "",
                        certificateCategory: row.c[23]?.v || "",
                        installationRequired: row.c[24]?.v || "",

                        // Item columns (AE to BH: indexes 30-57)
                        itemName1: row.c[30]?.v || "",
                        quantity1: row.c[31]?.v || "",
                        itemName2: row.c[32]?.v || "",
                        quantity2: row.c[33]?.v || "",
                        itemName3: row.c[34]?.v || "",
                        quantity3: row.c[35]?.v || "",
                        itemName4: row.c[36]?.v || "",
                        quantity4: row.c[37]?.v || "",
                        itemName5: row.c[38]?.v || "",
                        quantity5: row.c[39]?.v || "",
                        itemName6: row.c[40]?.v || "",
                        quantity6: row.c[41]?.v || "",
                        itemName7: row.c[42]?.v || "",
                        quantity7: row.c[43]?.v || "",
                        itemName8: row.c[44]?.v || "",
                        quantity8: row.c[45]?.v || "",
                        itemName9: row.c[46]?.v || "",
                        quantity9: row.c[47]?.v || "",
                        itemName10: row.c[48]?.v || "",
                        quantity10: row.c[49]?.v || "",
                        itemName11: row.c[50]?.v || "",
                        quantity11: row.c[51]?.v || "",
                        itemName12: row.c[52]?.v || "",
                        quantity12: row.c[53]?.v || "",
                        itemName13: row.c[54]?.v || "",
                        quantity13: row.c[55]?.v || "",
                        itemName14: row.c[56]?.v || "",
                        quantity14: row.c[57]?.v || "",

                        itemQtyJson: row.c[58]?.v || null,
                        totalQty: row.c[59]?.v || "", // BH (Index 59)
                        attachment: row.c[29]?.v || "", // BN (Index 29)
                        remarks: row.c[60]?.v || "",
                        planned5: row.c[62]?.v || "",
                        invoiceUpload: row.c[66]?.v || "",

                        bsColumn: row.c[70]?.v || null,
                        btColumn: row.c[71]?.v || null,
                        bvColumn: row.c[73]?.v || null,
                        byColumn: row.c[76]?.v || null,

                        dSrNumber: row.c[105]?.v || "",
                        creName: row.c[106]?.v || "",

                        // Additional Warehouse columns to preserve state
                        beforePhoto: row.c[73]?.v || "",      // BV
                        afterPhoto: row.c[74]?.v || "",       // BW
                        biltyUpload: row.c[75]?.v || "",      // BX
                        transporterName: row.c[76]?.v || "",   // BY
                        transporterContact: row.c[77]?.v || "",// BZ
                        biltyNumber: row.c[78]?.v || "",       // CA
                        totalCharges: row.c[79]?.v || "",      // CB
                        warehouseRemarks: row.c[80]?.v || "",  // CC
                        dispatchStatus: row.c[131]?.v || "okay", // EB
                        notOkReason: row.c[132]?.v || "",        // EC
                    }

                    order.id = dSrNumber
                    ordersMap.set(dSrNumber, order)
                })

                const allOrders = Array.from(ordersMap.values())
                setOrders(allOrders)
            }
        } catch (err) {
            console.error("Error fetching orders:", err)
            setError("Failed to fetch data. Please try again later.")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchOrders()
    }, [])

    const processWarehouseOrder = async (dialogData) => {
        try {
            setUploading(true)
            const {
                order,
                transporterName,
                transporterContact,
                biltyNumber,
                totalCharges,
                warehouseRemarks,
                dispatchStatus,
                notOkReason,
                itemQuantities,
                fileUrls,
            } = dialogData

            const formData = new FormData()
            formData.append("sheetName", SHEET_NAME)
            formData.append("action", "updateByDSrNumber")
            formData.append("dSrNumber", order.dSrNumber)

            // Create rowData with 140 columns
            const rowData = new Array(140).fill("")

            // Add today's date to BT column (index 71)
            const today = new Date()
            const formattedDate = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()} ${today.getHours()}:${today.getMinutes()}:${today.getSeconds()}`
            rowData[71] = formattedDate

            // Add pre-uploaded file URLs to the row data columns
            // BV(73) = Before Photo, BW(74) = After Photo, BX(75) = Bilty
            if (fileUrls) {
                rowData[73] = fileUrls.beforePhotoUrl || ""
                rowData[74] = fileUrls.afterPhotoUrl || ""
                rowData[75] = fileUrls.biltyUrl || ""
            }

            // Add warehouse data to columns BY to CC (indexes 76-80)
            rowData[76] = transporterName
            rowData[77] = transporterContact
            rowData[78] = biltyNumber
            rowData[79] = totalCharges
            rowData[80] = warehouseRemarks

            formData.append("rowData", JSON.stringify(rowData))

            const response = await fetch(APPS_SCRIPT_URL, {
                method: "POST",
                mode: "cors",
                body: formData,
            })

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

            // Also update Warehouse sheet
            const allItems = []
            for (let i = 1; i <= 14; i++) {
                const itemName = order[`itemName${i}`]
                const quantity = itemQuantities[`column-${i}`] || order[`quantity${i}`]
                if (itemName || quantity) {
                    allItems.push({ name: itemName || "", quantity: quantity || "" })
                }
            }

            if (order.itemQtyJson) {
                try {
                    const jsonItems = typeof order.itemQtyJson === "string" ? JSON.parse(order.itemQtyJson) : order.itemQtyJson
                    jsonItems.forEach((item, idx) => {
                        const quantity = itemQuantities[`json-${idx}`] || item.quantity
                        if (item.name || quantity) {
                            allItems.push({ name: item.name || "", quantity: quantity || "" })
                        }
                    })
                } catch (e) { }
            }

            const formData2 = new FormData()
            formData2.append("sheetName", "Warehouse")
            formData2.append("action", "updateByOrderNo")
            formData2.append("orderNo", order.orderNo)
            formData2.append("totalItems", allItems.length.toString())

            const warehouseRowData = new Array(143).fill("")
            warehouseRowData[0] = formattedDate
            warehouseRowData[1] = order.orderNo
            warehouseRowData[2] = order.quotationNo
            if (fileUrls) {
                warehouseRowData[3] = fileUrls.beforePhotoUrl || ""
                warehouseRowData[4] = fileUrls.afterPhotoUrl || ""
                warehouseRowData[5] = fileUrls.biltyUrl || ""
            }
            warehouseRowData[6] = transporterName || order.transporterName || ""
            warehouseRowData[7] = transporterContact || order.transporterContact || ""
            warehouseRowData[8] = biltyNumber || order.biltyNumber || ""
            warehouseRowData[9] = totalCharges || order.totalCharges || ""
            warehouseRowData[10] = warehouseRemarks || order.warehouseRemarks || ""

            let itemIndex = 11
            allItems.forEach((item) => {
                warehouseRowData[itemIndex] = item.name || ""
                warehouseRowData[itemIndex + 1] = item.quantity || ""
                itemIndex += 2
            })

            warehouseRowData[131] = dispatchStatus || "okay"
            warehouseRowData[132] = dispatchStatus === "notokay" ? notOkReason : ""
            warehouseRowData[105] = order.dSrNumber || ""

            formData2.append("rowData", JSON.stringify(warehouseRowData))

            let response2 = await fetch(APPS_SCRIPT_URL, {
                method: "POST",
                mode: "cors",
                body: formData2,
            })

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
                await fetchOrders()
                return { success: true }
            } else {
                throw new Error(whResult.error || "Warehouse update failed")
            }
        } catch (err) {
            console.error("Error updating order:", err)
            return { success: false, error: err.message }
        } finally {
            setUploading(false)
        }
    }

    const handleProcessSubmit = async (dialogData) => {
        const result = await processWarehouseOrder(dialogData)
        if (result.success) {
            setIsDialogOpen(false)
            setSelectedOrder(null)
            alert("✅ Warehouse processing COMPLETED!")
        } else {
            alert(`❌ Error: ${result.error}`)
        }
    }

    const handleProcess = (order) => {
        if (!order.dSrNumber) {
            alert("Error: D-Sr Number not found. Cannot process this order.")
            return
        }
        setSelectedOrder(order)
        setIsDialogOpen(true)
    }

    const filteredOrders = useMemo(() => {
        let result = orders

        if (user?.role !== "admin" && user?.role !== "super_admin") {
            result = result.filter(order => order.creName === user?.username)
        }

        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase()
            result = result.filter(order =>
                order.orderNo.toString().toLowerCase().includes(lowerSearch) ||
                order.companyName.toLowerCase().includes(lowerSearch) ||
                order.destination.toLowerCase().includes(lowerSearch) ||
                order.dSrNumber.toString().toLowerCase().includes(lowerSearch)
            )
        }

        return result
    }, [orders, searchTerm, user])

    const pendingOrders = useMemo(() =>
        filteredOrders.filter(order => !!order.btColumn && !order.byColumn),
        [filteredOrders])

    const historyOrders = useMemo(() =>
        filteredOrders.filter(order => !!order.btColumn && !!order.byColumn),
        [filteredOrders])

    const OrderTable = ({ data, showActions = true }) => {
        // Prepare item headers
        const itemHeaderCols = [];
        for (let i = 1; i <= 14; i++) {
            itemHeaderCols.push(<TableHead key={`in${i}`} className="font-bold text-slate-700 h-10 min-w-[200px] sticky top-0 z-10 bg-slate-50 border-b border-r border-slate-200">Item Name {i}</TableHead>);
            itemHeaderCols.push(<TableHead key={`iq${i}`} className="font-bold text-slate-700 h-10 min-w-[100px] sticky top-0 z-10 bg-slate-50 border-b border-r border-slate-200">Quantity {i}</TableHead>);
        }

        return (
            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-white flex flex-col">
                <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)] relative w-full scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                    <Table className="relative border-separate border-spacing-0">
                        <TableHeader className="sticky top-0 z-20">
                            <TableRow className="bg-slate-50 hover:bg-slate-50 text-xs">
                                {showActions && <TableHead className="w-[100px] font-bold text-slate-700 h-10 sticky top-0 z-10 bg-slate-50 border-b border-r border-slate-200">Actions</TableHead>}
                                <TableHead className="font-bold text-slate-700 h-10 min-w-[120px] sticky top-0 z-10 bg-slate-50 border-b border-r border-slate-200">Order No.</TableHead>
                                <TableHead className="font-bold text-slate-700 h-10 min-w-[130px] sticky top-0 z-10 bg-slate-50 border-b border-r border-slate-200">Quotation No.</TableHead>
                                <TableHead className="font-bold text-slate-700 h-10 min-w-[200px] sticky top-0 z-10 bg-slate-50 border-b border-r border-slate-200">Company Name</TableHead>
                                {itemHeaderCols}
                                <TableHead className="font-bold text-slate-700 h-10 min-w-[120px] sticky top-0 z-10 bg-slate-50 border-b border-r border-slate-200">Total Qty</TableHead>
                                <TableHead className="font-bold text-slate-700 h-10 min-w-[200px] sticky top-0 z-10 bg-slate-50 border-b border-r border-slate-200">Remarks</TableHead>
                                {!showActions && (
                                    <>
                                        <TableHead className="font-bold text-slate-700 h-10 min-w-[180px] sticky top-0 z-10 bg-slate-50 border-b border-r border-slate-200">Transporter Name</TableHead>
                                        <TableHead className="font-bold text-slate-700 h-10 min-w-[150px] sticky top-0 z-10 bg-slate-50 border-b border-r border-slate-200">Transporter Contact</TableHead>
                                        <TableHead className="font-bold text-slate-700 h-10 min-w-[150px] sticky top-0 z-10 bg-slate-50 border-b border-r border-slate-200">Bilty/Docket No.</TableHead>
                                        <TableHead className="font-bold text-slate-700 h-10 min-w-[120px] sticky top-0 z-10 bg-slate-50 border-b border-r border-slate-200">Total Charges</TableHead>
                                        <TableHead className="font-bold text-slate-700 h-10 min-w-[200px] sticky top-0 z-10 bg-slate-50 border-b border-r border-slate-200">Warehouse Remarks</TableHead>
                                        <TableHead className="font-bold text-slate-700 h-10 min-w-[150px] sticky top-0 z-10 bg-slate-50 border-b border-r border-slate-200">Attachment</TableHead>
                                    </>
                                )}
                                <TableHead className="font-bold text-slate-700 h-10 min-w-[120px] sticky top-0 z-10 bg-slate-50 border-b border-r border-slate-200">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={showActions ? 35 : 40} className="h-24 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                            <p className="font-medium">Loading data...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={showActions ? 35 : 40} className="h-24 text-center text-muted-foreground">
                                        No orders found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((order) => {
                                    // Collect all item cells
                                    const itemCells = [];
                                    for (let i = 1; i <= 14; i++) {
                                        const name = order[`itemName${i}`];
                                        const qty = order[`quantity${i}`];
                                        itemCells.push(
                                            <TableCell key={`in${i}`} className="font-medium text-slate-600 border-b border-r border-slate-100">
                                                {name || <span className="text-slate-300">-</span>}
                                            </TableCell>
                                        );
                                        itemCells.push(
                                            <TableCell key={`iq${i}`} className="font-medium text-slate-600 border-b border-r border-slate-100">
                                                {qty || <span className="text-slate-300">-</span>}
                                            </TableCell>
                                        );
                                    }

                                    return (
                                        <TableRow key={order.rowIndex} className="hover:bg-slate-50/50 transition-colors text-xs border-b border-slate-100">
                                            {showActions && (
                                                <TableCell className="bg-white border-r border-slate-200">
                                                    <Button
                                                        variant="gradient"
                                                        size="sm"
                                                        className="h-7 px-2 text-xs shadow-sm"
                                                        onClick={() => handleProcess(order)}
                                                    >
                                                        <SettingsIcon className="h-3 w-3 mr-1" />
                                                        Process
                                                    </Button>
                                                </TableCell>
                                            )}
                                            <TableCell className="font-bold text-blue-600 border-b border-r border-slate-100">{order.orderNo}</TableCell>
                                            <TableCell className="font-medium text-slate-600 border-b border-r border-slate-100">{order.quotationNo}</TableCell>
                                            <TableCell className="font-medium text-slate-800 border-b border-r border-slate-100">{order.companyName}</TableCell>
                                            {itemCells}
                                            <TableCell className="font-bold text-slate-700 border-b border-r border-slate-100">{order.totalQty}</TableCell>
                                            <TableCell className="text-slate-600 max-w-[200px] truncate border-b border-r border-slate-100" title={order.remarks}>
                                                {order.remarks || <span className="text-slate-400 italic">No remarks</span>}
                                            </TableCell>
                                            {!showActions && (
                                                <>
                                                    <TableCell className="text-slate-800 font-medium border-b border-r border-slate-100">{order.transporterName || <span className="text-slate-300">-</span>}</TableCell>
                                                    <TableCell className="text-slate-600 border-b border-r border-slate-100">{order.transporterContact || <span className="text-slate-300">-</span>}</TableCell>
                                                    <TableCell className="text-slate-700 font-bold border-b border-r border-slate-100">{order.biltyNumber || <span className="text-slate-300">-</span>}</TableCell>
                                                    <TableCell className="text-slate-700 font-bold border-b border-r border-slate-100">{order.totalCharges ? `₹${order.totalCharges}` : <span className="text-slate-300">-</span>}</TableCell>
                                                    <TableCell className="text-slate-600 max-w-[200px] truncate border-b border-r border-slate-100" title={order.warehouseRemarks}>
                                                        {order.warehouseRemarks || <span className="text-slate-400 italic">N/A</span>}
                                                    </TableCell>

                                                    <TableCell className="border-b border-r border-slate-100">
                                                        {order.attachment ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {order.attachment.split(',').map((url, idx) => {
                                                                    const cleanUrl = url.trim();
                                                                    if (!cleanUrl.startsWith('http')) return null;
                                                                    return (
                                                                        <a
                                                                            key={idx}
                                                                            href={cleanUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="inline-flex"
                                                                        >
                                                                            <Badge
                                                                                variant="secondary"
                                                                                className="h-6 px-2 bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 cursor-pointer text-[10px] font-bold"
                                                                            >
                                                                                <FileText className="h-2.5 w-2.5 mr-1" />
                                                                                {idx === 0 && order.attachment.split(',').length === 1 ? "View" : idx + 1}
                                                                            </Badge>
                                                                        </a>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 italic text-[10px]">No attachment</span>
                                                        )}
                                                    </TableCell>
                                                </>
                                            )}

                                            <TableCell className="border-b border-slate-100">
                                                <Badge variant={order.bvColumn ? "success" : "secondary"} className="font-semibold shadow-sm text-[10px] h-5">
                                                    {order.bvColumn ? "Completed" : "Pending Dispatch"}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        );
    }

    return (
        <MainLayout>
            <div className="flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600 rounded-xl shadow-blue-200 shadow-lg text-white">
                            <Truck className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Transporting</h1>
                            <p className="text-muted-foreground font-medium">Monitor dispatches and update transportation details.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="bg-white shadow-sm border-slate-200" onClick={fetchOrders} disabled={isLoading}>
                            <RefreshCw className={`h-4 w-4 mr-2 text-blue-600 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh Data
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search Order No, Company, D-Sr..."
                            className="pl-10 h-11 bg-white border-slate-200 shadow-sm focus:ring-blue-500 focus:border-blue-500 rounded-xl"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <Tabs defaultValue="pending" className="w-full">
                        <TabsList className="bg-slate-100 p-1 rounded-xl w-[320px]">
                            <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                Pending
                                {pendingOrders.length > 0 && (
                                    <Badge variant="destructive" className="ml-2 h-5 min-w-[20px] px-1 shadow-none">
                                        {pendingOrders.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                History
                            </TabsTrigger>
                        </TabsList>
                        <div className="mt-4">
                            <TabsContent value="pending" className="animate-in fade-in-50 duration-500">
                                <Card className="border-slate-200 shadow-sm overflow-hidden rounded-2xl">
                                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                                        <CardTitle className="text-lg font-bold text-slate-800">Pending Dispatch</CardTitle>
                                        <CardDescription className="text-slate-500 font-medium">
                                            Orders approved for dispatch but awaiting transportation details.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <OrderTable data={pendingOrders} showActions={true} />
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="history" className="animate-in fade-in-50 duration-500">
                                <Card className="border-slate-200 shadow-sm overflow-hidden rounded-2xl">
                                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                                        <CardTitle className="text-lg font-bold text-slate-800">Dispatch History</CardTitle>
                                        <CardDescription className="text-slate-500 font-medium">
                                            Successfully dispatched orders with recorded transportation data.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <OrderTable data={historyOrders} showActions={false} />
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </div>

            <ProcessDialog
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                selectedOrder={selectedOrder}
                onSubmit={handleProcessSubmit}
                uploading={uploading}
                currentUser={user}
                transportMode={true}
            />
        </MainLayout>
    )
}
