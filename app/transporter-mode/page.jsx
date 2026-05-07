"use client"

import { useState, useEffect, useMemo } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Truck, Search, RefreshCw, Loader2, Filter, X } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export default function TransporterModePage() {
    const [orders, setOrders] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [error, setError] = useState(null)
    const [transportFilter, setTransportFilter] = useState("all")
    const [dispatchFilter, setDispatchFilter] = useState("all")
    const [deliveryFilter, setDeliveryFilter] = useState("all")

    const SHEET_ID = "1yEsh4yzyvglPXHxo-5PT70VpwVJbxV7wwH8rpU1RFJA"
    const SHEET_NAME = "ORDER-DISPATCH"

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
                // Process data rows (skip header rows - assume 6 header rows as per useDashboardData)
                const ordersData = data.table.rows.slice(6).map((row, index) => {
                    if (!row.c || !row.c[1] || !row.c[1].v) return null;

                    const getVal = (idx) => row.c[idx]?.v || "-";

                    return {
                        rowIndex: index + 7,
                        orderNo: getVal(1),
                        companyName: getVal(3),
                        transportMode: getVal(32),
                        destination: getVal(33),
                        itemQty: getVal(34),
                        poNumber: getVal(35),
                        quotationCopy: getVal(36),
                        acceptanceCopy: getVal(37),
                        offerShow: getVal(38),
                        conveyedForRegistration: getVal(39),
                        totalOrderQty: getVal(40),
                        amount: getVal(41),
                        totalDispatch: getVal(42),
                        quantityDelivered: getVal(43),
                        orderCancel: getVal(44),
                        pendingDeliveryQty: getVal(45),
                        pendingDispatchQty: getVal(46),
                        materialReturn: getVal(47),
                        deliveryStatus: getVal(48),
                        dispatchStatus: getVal(49),
                        dispatchCompleteDate: getVal(50),
                        deliveryCompleteDate: getVal(51)
                    }
                }).filter(order => order && order.transportMode && order.transportMode !== "-" && order.transportMode !== "");

                setOrders(ordersData);
            }
        } catch (err) {
            console.error("Error fetching orders:", err)
            setError("Failed to fetch orders. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchOrders()
    }, [])

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const searchLower = searchTerm.toLowerCase()
            const matchesSearch = (
                String(order.orderNo).toLowerCase().includes(searchLower) ||
                String(order.companyName).toLowerCase().includes(searchLower) ||
                String(order.destination).toLowerCase().includes(searchLower)
            )
            
            const matchesTransport = transportFilter === "all" || order.transportMode === transportFilter
            const matchesDispatch = dispatchFilter === "all" || order.dispatchStatus === dispatchFilter
            const matchesDelivery = deliveryFilter === "all" || order.deliveryStatus === deliveryFilter
            
            return matchesSearch && matchesTransport && matchesDispatch && matchesDelivery
        })
    }, [orders, searchTerm, transportFilter, dispatchFilter, deliveryFilter])

    const transportModes = useMemo(() => ["all", ...new Set(orders.map(o => o.transportMode).filter(Boolean))].sort(), [orders])
    const dispatchStatuses = useMemo(() => ["all", ...new Set(orders.map(o => o.dispatchStatus).filter(Boolean))].sort(), [orders])
    const deliveryStatuses = useMemo(() => ["all", ...new Set(orders.map(o => o.deliveryStatus).filter(Boolean))].sort(), [orders])

    const clearFilters = () => {
        setSearchTerm("")
        setTransportFilter("all")
        setDispatchFilter("all")
        setDeliveryFilter("all")
    }

    const formatDate = (dateValue) => {
        if (!dateValue || dateValue === "-") return "-";
        const dateStr = String(dateValue);
        if (dateStr.includes("Date(")) {
            const matches = dateStr.match(/\d+/g);
            if (matches && matches.length >= 3) {
                const year = matches[0];
                const month = (parseInt(matches[1]) + 1).toString().padStart(2, '0');
                const day = matches[2].padStart(2, '0');
                return `${day}/${month}/${year}`;
            }
        }
        return dateStr;
    };

    const renderValue = (value) => {
        if (typeof value === 'string' && (value.startsWith('http') || value.startsWith('https'))) {
            return (
                <a 
                    href={value} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 font-bold underline underline-offset-4"
                >
                    View
                </a>
            );
        }
        return value;
    };

    return (
        <MainLayout>
            <div className="px-2 py-4 md:px-4 md:py-6 w-full max-w-[98vw] mx-auto">
                <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md">
                    <CardHeader className="border-b border-slate-100 pb-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-200">
                                        <Truck className="h-6 w-6 text-white" />
                                    </div>
                                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                                        Transporter Mode
                                    </CardTitle>
                                </div>
                                <CardDescription className="text-slate-500 font-medium ml-11">
                                    Detailed transportation and delivery reporting
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={fetchOrders}
                                    disabled={isLoading}
                                    className="h-10 border-slate-200 hover:bg-slate-50 hover:text-indigo-600 transition-all duration-200"
                                >
                                    {isLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                    )}
                                    Refresh
                                </Button>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="relative group col-span-1 md:col-span-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                <Input
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 h-10 border-slate-200 focus:ring-indigo-500 transition-all text-sm"
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <Select value={transportFilter} onValueChange={setTransportFilter}>
                                    <SelectTrigger className="h-10 border-slate-200 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Filter className="h-3 w-3 text-slate-400" />
                                            <SelectValue placeholder="Transport Mode" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {transportModes.map(mode => (
                                            <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <Select value={dispatchFilter} onValueChange={setDispatchFilter}>
                                    <SelectTrigger className="h-10 border-slate-200 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Filter className="h-3 w-3 text-slate-400" />
                                            <SelectValue placeholder="Dispatch Status" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {dispatchStatuses.map(status => (
                                            <SelectItem key={status} value={status}>{status}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-2">
                                <Select value={deliveryFilter} onValueChange={setDeliveryFilter} className="flex-1">
                                    <SelectTrigger className="h-10 border-slate-200 text-sm flex-1">
                                        <div className="flex items-center gap-2">
                                            <Filter className="h-3 w-3 text-slate-400" />
                                            <SelectValue placeholder="Delivery Status" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {deliveryStatuses.map(status => (
                                            <SelectItem key={status} value={status}>{status}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={clearFilters}
                                    className="h-10 w-10 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                    title="Clear All Filters"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <div className="overflow-auto max-h-[calc(100vh-280px)] scrollbar-thin scrollbar-thumb-slate-200">
                            <Table className="relative">
                                <TableHeader className="sticky top-0 z-20 bg-white shadow-sm">
                                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                                        <TableHead className="font-bold text-slate-700 h-10 bg-slate-50/80 backdrop-blur-sm sticky top-0 z-20 px-2 text-[11px] uppercase tracking-wider">Order No.</TableHead>
                                        <TableHead className="font-bold text-slate-700 h-10 bg-slate-50/80 backdrop-blur-sm sticky top-0 z-20 px-2 text-[11px] uppercase tracking-wider">Transport Mode</TableHead>
                                        <TableHead className="font-bold text-slate-700 h-10 bg-slate-50/80 backdrop-blur-sm sticky top-0 z-20 px-2 text-[11px] uppercase tracking-wider max-w-[120px]">Destination</TableHead>
                                        <TableHead className="font-bold text-slate-700 h-10 bg-slate-50/80 backdrop-blur-sm sticky top-0 z-20 px-2 text-[11px] uppercase tracking-wider max-w-[150px]">Item/Qty</TableHead>
                                        <TableHead className="font-bold text-slate-700 h-10 bg-slate-50/80 backdrop-blur-sm sticky top-0 z-20 px-2 text-[11px] uppercase tracking-wider">Po Number</TableHead>
                                        <TableHead className="font-bold text-slate-700 h-10 bg-slate-50/80 backdrop-blur-sm sticky top-0 z-20 px-2 text-[11px] uppercase tracking-wider">Quotation Copy</TableHead>
                                        <TableHead className="font-bold text-slate-700 h-10 bg-slate-50/80 backdrop-blur-sm sticky top-0 z-20 px-2 text-[11px] uppercase tracking-wider">Acceptance Copy</TableHead>
                                        <TableHead className="font-bold text-slate-700 h-10 bg-slate-50/80 backdrop-blur-sm sticky top-0 z-20 px-2 text-[11px] uppercase tracking-wider">Offer Show</TableHead>
                                        <TableHead className="font-bold text-slate-700 h-10 bg-slate-50/80 backdrop-blur-sm sticky top-0 z-20 px-2 text-[11px] uppercase tracking-wider">Registration Form</TableHead>
                                        <TableHead className="font-bold text-slate-700 h-10 bg-slate-50/80 backdrop-blur-sm sticky top-0 z-20 px-2 text-[11px] uppercase tracking-wider">Total Order Qty</TableHead>
                                        <TableHead className="font-bold text-slate-700 h-10 bg-slate-50/80 backdrop-blur-sm sticky top-0 z-20 px-2 text-[11px] uppercase tracking-wider">Amount</TableHead>
                                        <TableHead className="font-bold text-slate-700 h-10 bg-slate-50/80 backdrop-blur-sm sticky top-0 z-20 px-2 text-[11px] uppercase tracking-wider">Total Dispatch</TableHead>
                                        <TableHead className="font-bold text-slate-700 h-10 bg-slate-50/80 backdrop-blur-sm sticky top-0 z-20 px-2 text-[11px] uppercase tracking-wider">Qty Delivered</TableHead>
                                        <TableHead className="font-bold text-slate-700 h-10 bg-slate-50/80 backdrop-blur-sm sticky top-0 z-20 px-2 text-[11px] uppercase tracking-wider">Order Cancel</TableHead>
                                        <TableHead className="font-bold text-slate-700 h-10 bg-slate-50/80 backdrop-blur-sm sticky top-0 z-20 px-2 text-[11px] uppercase tracking-wider">Pending Del. Qty</TableHead>
                                        <TableHead className="font-bold text-slate-700 h-10 bg-slate-50/80 backdrop-blur-sm sticky top-0 z-20 px-2 text-[11px] uppercase tracking-wider">Pending Disp. Qty</TableHead>
                                        <TableHead className="font-bold text-slate-700 h-10 bg-slate-50/80 backdrop-blur-sm sticky top-0 z-20 px-2 text-[11px] uppercase tracking-wider">Material Return</TableHead>
                                        <TableHead className="font-bold text-slate-700 h-10 text-center bg-slate-50/80 backdrop-blur-sm sticky top-0 z-20 px-2 text-[11px] uppercase tracking-wider">Delivery Status</TableHead>
                                        <TableHead className="font-bold text-slate-700 h-10 text-center bg-slate-50/80 backdrop-blur-sm sticky top-0 z-20 px-2 text-[11px] uppercase tracking-wider">Dispatch Status</TableHead>
                                        <TableHead className="font-bold text-slate-700 h-10 bg-slate-50/80 backdrop-blur-sm sticky top-0 z-20 px-2 text-[11px] uppercase tracking-wider">Dispatch Date</TableHead>
                                        <TableHead className="font-bold text-slate-700 h-10 bg-slate-50/80 backdrop-blur-sm sticky top-0 z-20 px-2 text-[11px] uppercase tracking-wider">Delivery Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={21} className="h-48 text-center">
                                                <div className="flex flex-col items-center justify-center gap-3">
                                                    <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
                                                    <p className="text-slate-500 font-medium">Loading data...</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredOrders.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={21} className="h-48 text-center">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <div className="p-3 bg-slate-100 rounded-full">
                                                        <Search className="h-6 w-6 text-slate-400" />
                                                    </div>
                                                    <p className="text-slate-500 font-medium">No records found</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredOrders.map((order, idx) => (
                                            <TableRow key={`${order.orderNo}-${idx}`} className="hover:bg-slate-50/80 transition-colors text-xs">
                                                <TableCell className="font-bold text-indigo-600 px-2 py-1.5">{order.orderNo}</TableCell>
                                                <TableCell className="px-2 py-1.5">{renderValue(order.transportMode)}</TableCell>
                                                <TableCell className="px-2 py-1.5 max-w-[120px] break-words">{renderValue(order.destination)}</TableCell>
                                                <TableCell className="px-2 py-1.5 max-w-[150px] break-words">{renderValue(order.itemQty)}</TableCell>
                                                <TableCell className="px-2 py-1.5">{renderValue(order.poNumber)}</TableCell>
                                                <TableCell className="px-2 py-1.5 text-center">{renderValue(order.quotationCopy)}</TableCell>
                                                <TableCell className="px-2 py-1.5 text-center">{renderValue(order.acceptanceCopy)}</TableCell>
                                                <TableCell className="px-2 py-1.5 text-center">{renderValue(order.offerShow)}</TableCell>
                                                <TableCell className="px-2 py-1.5 text-center">{renderValue(order.conveyedForRegistration)}</TableCell>
                                                <TableCell className="px-2 py-1.5 text-center">{renderValue(order.totalOrderQty)}</TableCell>
                                                <TableCell className="px-2 py-1.5 text-center">{renderValue(order.amount)}</TableCell>
                                                <TableCell className="px-2 py-1.5 text-center">{renderValue(order.totalDispatch)}</TableCell>
                                                <TableCell className="px-2 py-1.5 text-center">{renderValue(order.quantityDelivered)}</TableCell>
                                                <TableCell className="px-2 py-1.5 text-center font-medium text-red-600">{renderValue(order.orderCancel)}</TableCell>
                                                <TableCell className="px-2 py-1.5 text-center">{renderValue(order.pendingDeliveryQty)}</TableCell>
                                                <TableCell className="px-2 py-1.5 text-center">{renderValue(order.pendingDispatchQty)}</TableCell>
                                                <TableCell className="px-2 py-1.5 text-center">{renderValue(order.materialReturn)}</TableCell>
                                                <TableCell className="text-center px-2 py-1.5">
                                                    <Badge className={`${
                                                        order.deliveryStatus?.toLowerCase().includes("complete") 
                                                        ? "bg-green-600 text-white hover:bg-green-700" 
                                                        : "bg-amber-500 text-white hover:bg-amber-600"
                                                    } border-none rounded-full text-[10px] px-2 py-0.5 font-bold shadow-sm`}>
                                                        {order.deliveryStatus}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center px-2 py-1.5">
                                                    <Badge className={`${
                                                        order.dispatchStatus?.toLowerCase().includes("complete") 
                                                        ? "bg-blue-600 text-white hover:bg-blue-700" 
                                                        : "bg-slate-500 text-white hover:bg-slate-600"
                                                    } border-none rounded-full text-[10px] px-2 py-0.5 font-bold shadow-sm`}>
                                                        {order.dispatchStatus}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="px-2 py-1.5 text-slate-600 font-medium">{formatDate(order.dispatchCompleteDate)}</TableCell>
                                                <TableCell className="px-2 py-1.5 text-slate-600 font-medium">{formatDate(order.deliveryCompleteDate)}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    )
}
