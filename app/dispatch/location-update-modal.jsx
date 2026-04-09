"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  RefreshCw,
  Search,
  Box,
  Plus,
  Loader2,
  X,
  Camera,
  QrCode,
} from "lucide-react"
import { Html5QrcodeScanner } from "html5-qrcode"
import { format } from "date-fns"
import { useAuth } from "@/components/auth-provider"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby3jUc3Oxfn0rchMRCNhdvQNB44bSoEhS0PdmPq2GRv67CBZLoWlNkLRECgR9xyNfG0/exec"
const IMS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxkB72Tu0iDEEyQ5cdkYUTdJq7Ifj80hgqbXpwc9WnF3ruWs1Yppe3Z1TJce4yr9Gg/exec"

export function LocationUpdateModal({ isOpen, onClose, onRefreshData }) {
  const { user: currentUser } = useAuth()
  const [salesData, setSalesData] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalStep, setModalStep] = useState("status") // status, search, selection, stockTransfer
  const [selectedStatus, setSelectedStatus] = useState("")
  const [selectedInvoiceNo, setSelectedInvoiceNo] = useState("")
  const [modalEdits, setModalEdits] = useState({}) 
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState("")
  const [extraRows, setExtraRows] = useState([])
  const [locations, setLocations] = useState([])
  const [stockItems, setStockItems] = useState([])
  const [imsData, setImsData] = useState([])
  const [isImsLoading, setIsImsLoading] = useState(false)
  const [stockTransferRows, setStockTransferRows] = useState([
    { id: Date.now(), fromLoc: "", item: "", qty: "", toLoc: "", itemTo: "", qtyTo: "" }
  ])
  const [selectedRows, setSelectedRows] = useState({})
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [scannerTarget, setScannerTarget] = useState(null) // { id, field }

  const parseGoogleSheetsDate = (value) => {
    if (!value) return null
    try {
      if (typeof value === "string" && value.startsWith("Date(")) {
        const match = value.match(/Date\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/)
        if (match) {
          const [_, year, month, day, hours, minutes, seconds] = match
          return new Date(parseInt(year), parseInt(month), parseInt(day), parseInt(hours), parseInt(minutes), parseInt(seconds))
        }
      }
      return new Date(value)
    } catch (err) {
      return null
    }
  }

  const formatDate = (value) => {
    const date = parseGoogleSheetsDate(value)
    if (date && !isNaN(date.getTime())) {
      return format(date, "MM/dd/yyyy")
    }
    return value || "-"
  }

  const fetchData = useCallback(async () => {
    if (!isOpen) return
    setLoading(true)
    try {
      const [dispatchDeliveryRes, locationItemsRes] = await Promise.all([
        fetch(`${SCRIPT_URL}?sheet=DISPATCH-DELIVERY&action=fetch`),
        fetch(`${SCRIPT_URL}?sheet=LOCATION-ITEMS&action=fetch`)
      ])

      const dispatchResult = await dispatchDeliveryRes.json()
      const locationItemsResult = await locationItemsRes.json()

      let combinedData = []
      const dispatchMap = new Map()

      if (dispatchResult.success && dispatchResult.data) {
        dispatchResult.data.slice(7).forEach((row, index) => {
          const rowIndex = index + 8
          const warehouseLoc = row[103] ?? ""
          const dispatchNo = String(row[105] || "").trim()
          
          if (dispatchNo) {
            dispatchMap.set(dispatchNo, warehouseLoc)
          }
          const planned = row[108]
          const actual = row[109]

          const hasPlanned = planned !== undefined && planned !== null && String(planned).trim() !== "" && String(planned).trim() !== "-"
          const hasActual = actual !== undefined && actual !== null && String(actual).trim() !== "" && String(actual).trim() !== "-" && String(actual).trim().toLowerCase() !== "n/a"

          // Extract item pairs (AE-BF) and locations (DK)
          const allItems = []
          for (let i = 30; i <= 57; i += 2) {
            const name = row[i]
            const qty = row[i + 1]
            if (name && qty) {
              allItems.push({ name: String(name).trim(), qty: String(qty).trim() })
            }
          }
          const dkLocations = String(row[114] || "").split(",").map(l => l.trim())

          combinedData.push({
            id: `sale-${rowIndex}`,
            indentNo: row[1] ?? "",     
            liftNo: dispatchNo,         
            vendorName: row[3] ?? "",    
            itemName: row[30] ?? "", // Default/First item     
            qty: row[19] ?? "", // Total Qty or first item qty? Let's keep it for compatibility
            planned: formatDate(planned),
            actual: formatDate(actual),
            source: "DISPATCH-DELIVERY",
            rowIndex: rowIndex,
            warehouseLocation: warehouseLoc,
            invoiceNumber: row[65] ?? "",
            isPending: hasPlanned && !hasActual,
            allItems,
            dkLocations
          })
        })
      }
      setSalesData(combinedData)
    } catch (err) {
      console.error("Error fetching data:", err)
    } finally {
      setLoading(false)
    }
  }, [isOpen])

  const fetchLocations = useCallback(async () => {
    if (!isOpen) return
    try {
      const response = await fetch(`${SCRIPT_URL}?sheet=CRE&action=fetch`)
      const result = await response.json()
      if (result.success && result.data) {
        const locs = result.data.slice(1).map(row => row[7]).filter(Boolean)
        setLocations([...new Set(locs)].sort())
        const sItems = result.data.slice(1).map(row => row[9]).filter(Boolean)
        setStockItems([...new Set(sItems)].sort())
      }
    } catch (err) {
      console.error("Error fetching locations:", err)
    }
  }, [isOpen])

  const fetchIMSData = useCallback(async () => {
    if (!isOpen || modalStep !== "stockTransfer" || imsData.length > 0) return
    setIsImsLoading(true)
    try {
      const response = await fetch(`${IMS_SCRIPT_URL}?action=fetch&sheet=IMS`)
      const result = await response.json()
      if (result.success && result.data) {
        // Mapping Column D (index 3) and Column CA (index 78)
        // Ensure we handle rows that might be shorter than 79 columns
        const mapped = result.data.slice(1).map(row => {
          const itemName = String(row[3] || "").trim()
          const loc = String(row[78] || "").trim()
          if (!itemName) return null
          return { itemName, location: loc }
        }).filter(Boolean)
        setImsData(mapped)
        console.log(`IMS Data Loaded: ${mapped.length} records`)
      }
    } catch (err) {
      console.error("Error fetching IMS data:", err)
    } finally {
      setIsImsLoading(false)
    }
  }, [isOpen, modalStep, imsData.length])

  useEffect(() => {
    if (isOpen) {
      fetchData()
      fetchLocations()
    }
  }, [isOpen, fetchData, fetchLocations])

  useEffect(() => {
    if (modalStep === "stockTransfer") {
      fetchIMSData()
    }
  }, [modalStep, fetchIMSData])

  // Normalizing helper for loose matching
  const normalizeForMatch = (val) => String(val || "").toLowerCase().replace(/^by\s*/i, "").replace(/[^a-z0-9]/g, "").trim()

  const isLocMatch = (inputLoc, cellValue) => {
    const normalizedInput = normalizeForMatch(inputLoc)
    if (!normalizedInput) return false
    
    // Split by comma, semi-colon, or multiple spaces
    const locations = String(cellValue || "").split(/[,;\s]+/).map(l => normalizeForMatch(l)).filter(Boolean)
    return locations.some(l => l === normalizedInput)
  }

  const filteredSalesData = useMemo(() => {
    let data = salesData.filter(item => item.isPending)
    
    if (currentUser && currentUser.role !== "super_admin") {
      const userLocations = currentUser.location || ["None"]
      const isAllLocations = userLocations.some(l => l.toLowerCase() === "all")
      if (!isAllLocations) {
        data = data.filter(item => {
          const itemLocNormalized = normalizeForMatch(item.warehouseLocation)
          return userLocations.some(l => normalizeForMatch(l) === itemLocNormalized)
        })
      }
    }
    return data
  }, [salesData, currentUser])

  const uniqueInvoiceNumbers = useMemo(() => {
    const numbers = filteredSalesData.map(item => item.invoiceNumber).filter(Boolean)
    const sorted = [...new Set(numbers)].sort()

    if (invoiceSearchTerm) {
      return sorted.filter(no =>
        no.toString().toLowerCase().includes(invoiceSearchTerm.toLowerCase())
      )
    }
    return sorted
  }, [filteredSalesData, invoiceSearchTerm])

  const uniqueInvoicesGrouped = useMemo(() => {
    const grouped = {}
    filteredSalesData.forEach(item => {
      const key = item.invoiceNumber || "No Invoice"
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(item)
    })
    return grouped
  }, [filteredSalesData])

  const resetModal = () => {
    setModalStep("status")
    setSelectedInvoiceNo("")
    setInvoiceSearchTerm("")
    setSelectedRows({})
    setSelectedStatus("")
    setModalEdits({})
    setExtraRows([])
    setStockTransferRows([{ id: Date.now(), fromLoc: "", item: "", qty: "", toLoc: "", itemTo: "", qtyTo: "" }])
    onClose()
  }

  const handleEditChange = (id, field, value) => {
    setModalEdits(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }))
  }

  const toggleRow = (id, checked) => {
    setSelectedRows(prev => ({ ...prev, [id]: checked }))
  }

  const handleAddRow = () => {
    if (!selectedInvoiceNo) return
    const baseItems = uniqueInvoicesGrouped[selectedInvoiceNo] || []
    if (baseItems.length === 0) return

    const template = baseItems[0]
    const newId = `${template.id}_split_${Date.now()}`
    const newRow = {
      ...template,
      id: newId,
      isSplit: true,
      originalId: template.id
    }

    setExtraRows(prev => [...prev, newRow])
    setSelectedRows(prev => ({ ...prev, [newId]: true }))
  }

  const handleAddStockRow = () => {
    setStockTransferRows(prev => [
      ...prev,
      { id: Date.now(), fromLoc: "", item: "", qty: "", toLoc: "", itemTo: "", qtyTo: "" }
    ])
  }

  const handleStockEdit = (id, field, value) => {
    setStockTransferRows(prev => prev.map(row => {
      if (row.id === id) {
        const updated = { ...row, [field]: value }
        if (field === "item") {
          updated.itemTo = value
        }
        return updated
      }
      return row
    }))
  }

  const handleRowItemChange = (recordId, itemIndex, newItemName) => {
    const itemEntry = itemRecords.find(r => r.id === recordId)
    if (!itemEntry) return

    const newIdx = itemEntry.allItems.findIndex(it => it.name === newItemName)
    if (newIdx === -1) return

    const newQty = itemEntry.allItems[newIdx].qty
    const newLoc = itemEntry.dkLocations[newIdx] || ""

    setModalEdits(prev => ({
      ...prev,
      [recordId]: {
        ...prev[recordId],
        selectedItemName: newItemName,
        qty: newQty,
        receivedLocation: newLoc,
        prefilledLocation: newLoc,
        remarks: ""
      }
    }))
  }

  const itemRecords = useMemo(() => {
    if (!selectedInvoiceNo) return []
    const baseRecords = uniqueInvoicesGrouped[selectedInvoiceNo] || []
    
    // Flat map: each record i becomes multiple rows based on its allItems
    const expanded = baseRecords.flatMap(record => {
      // If no items found in row, at least show the main one? 
      // But user says total rows = total items.
      if (!record.allItems || record.allItems.length === 0) {
        return [{
          ...record,
          id: `${record.id}_item_0`,
          originalRowId: record.id,
          itemIndex: 0,
          prefilledLocation: record.warehouseLocation || ""
        }]
      }

      return record.allItems.map((item, index) => {
        return {
          ...record,
          id: `${record.id}_item_${index}`,
          originalRowId: record.id,
          itemIndex: index,
          itemName: item.name,
          qty: item.qty,
          prefilledLocation: record.dkLocations[index] || ""
        }
      })
    })

    return expanded
  }, [selectedInvoiceNo, uniqueInvoicesGrouped])

  const handleSubmitUpdate = async () => {
    const selectedIds = Object.keys(selectedRows).filter(id => selectedRows[id])
    if (selectedIds.length === 0) {
      alert("Please select at least one record.")
      return
    }

    if (selectedStatus === "Dispatch") {
      const invalid = selectedIds.some(id => !modalEdits[id]?.receivedLocation || !modalEdits[id]?.qty)
      if (invalid) {
        alert("Please fill all required fields (Location and Quantity) for all selected items.")
        return
      }
    }

    setIsSubmitting(true)
    try {
      const recordsToProcess = itemRecords.filter(r => selectedRows[r.id])
      const timestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss")

      const submissionPromises = recordsToProcess.map(async (record) => {
        const edits = modalEdits[record.id] || {}

        const rowData = [
          timestamp,
          selectedStatus,
          record.indentNo, 
          record.liftNo,   
          edits.receivedLocation || record.prefilledLocation || "",
          edits.selectedItemName || record.itemName,
          edits.qty || record.qty || ""
        ]
        // Add empty values up to Column K (index 10)
        while (rowData.length < 10) rowData.push("")
        rowData[10] = edits.remarks || ""

        const submissionData = new URLSearchParams({
          action: "insert",
          sheetName: "LOCATION-ITEMS",
          rowData: JSON.stringify(rowData)
        })

        const sourceUpdateData = []
        sourceUpdateData[109] = timestamp

        const updateData = new URLSearchParams({
          action: "update",
          sheetName: record.source,
          rowIndex: record.rowIndex,
          rowData: JSON.stringify(sourceUpdateData)
        })

        const [subRes, updateRes] = await Promise.all([
          fetch(SCRIPT_URL, { method: "POST", body: submissionData }),
          fetch(SCRIPT_URL, { method: "POST", body: updateData })
        ])

        const subResult = await subRes.json()
        const updateResult = await updateRes.json()

        if (!subResult.success) throw new Error(`Submission failed: ${subResult.error}`)
        if (!updateResult.success) throw new Error(`Update failed: ${updateResult.error}`)

        return { success: true }
      })

      const results = await Promise.all(submissionPromises)
      const allSuccessful = results.every(res => res.success)

      if (allSuccessful) {
        alert("Processed successfully and updated source records!")
        resetModal()
        if (onRefreshData) onRefreshData()
      } else {
        const errors = results.filter(res => !res.success).map(res => res.error || "Unknown error").join(", ")
        alert("Failed to complete processing: " + errors)
      }
    } catch (err) {
      console.error("Error submitting update:", err)
      alert("An error occurred during submission.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitStockTransfer = async () => {
    const invalid = stockTransferRows.some(row => !row.fromLoc || !row.toLoc || !row.item || !row.qty)
    if (invalid) {
      alert("Please fill all fields for all rows.")
      return
    }

    setIsSubmitting(true)
    try {
      const timestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss")

      const transferPromises = stockTransferRows.map(async (row) => {
        const submissionData = new URLSearchParams({
          action: "insert",
          sheetName: "LOCATION-ITEMS",
          rowData: JSON.stringify([
            timestamp,              
            "Stock Transfer",       
            "",                     
            "",                     
            row.toLoc,              
            row.itemTo || row.item, 
            row.qtyTo || row.qty,   
            row.fromLoc,            
            row.item,               
            row.qty                 
          ])
        })

        const subRes = await fetch(SCRIPT_URL, { method: "POST", body: submissionData })
        return await subRes.json()
      })

      const results = await Promise.all(transferPromises)
      const allSuccessful = results.every(res => res.success)

      if (allSuccessful) {
        alert("Stock transfer processed successfully!")
        resetModal()
        if (onRefreshData) onRefreshData()
      } else {
        alert("Some transfers failed. Please check the logs.")
      }
    } catch (err) {
      console.error("Error processing stock transfer:", err)
      alert("Failed to process stock transfer.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Scanner Logic
  useEffect(() => {
    let scanner = null
    if (isScannerOpen) {
      // Small delay to ensure the div is mounted
      const timer = setTimeout(() => {
        const scannerElement = document.getElementById("qr-reader");
        if (!scannerElement) return;

        scanner = new Html5QrcodeScanner(
          "qr-reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          /* verbose= */ false
        )

        const onScanSuccess = (decodedText) => {
          if (scannerTarget) {
            handleStockEdit(scannerTarget.id, scannerTarget.field, decodedText)
            setIsScannerOpen(false)
            setScannerTarget(null)
          }
          if (scanner) {
            scanner.clear().catch(e => console.error("Error clearing scanner on success:", e));
          }
        }

        scanner.render(onScanSuccess, (err) => {
          // Ignore errors during scanning
        })
      }, 300)
      return () => clearTimeout(timer)
    }
    return () => {
      if (scanner) {
        scanner.clear().catch(e => console.error("Error clearing scanner on cleanup:", e))
      }
    }
  }, [isScannerOpen, scannerTarget])

  const openScanner = (id, field) => {
    setScannerTarget({ id, field })
    setIsScannerOpen(true)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && resetModal()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between pr-8">
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-800">
                {modalStep === "status" && "Choose Processing Status"}
                {modalStep === "search" && "Search & Select Invoice"}
                {modalStep === "selection" && `Select Records for Invoice: ${selectedInvoiceNo}`}
                {modalStep === "stockTransfer" && "Stock Transfer Details"}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                {modalStep === "status" && "Select how these items are being processed"}
                {modalStep === "search" && "Type the invoice number to find matching records"}
                {modalStep === "selection" && "Choose one or more records to process"}
                {modalStep === "stockTransfer" && "Enter source and destination details"}
              </DialogDescription>
            </div>
            {(modalStep === "selection" || modalStep === "stockTransfer") && (
              <Button
                variant="outline"
                size="sm"
                onClick={modalStep === "selection" ? handleAddRow : handleAddStockRow}
                className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 font-medium"
              >
                <Plus className="h-4 w-4" />
                Add Row
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-[400px]">
          {modalStep === "status" && (
            <div className="p-8 flex flex-col items-center justify-center h-full gap-6">
              <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                <div
                  className="p-6 rounded-xl border-2 border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer flex flex-col items-center gap-3"
                  onClick={() => {
                    setSelectedStatus("Dispatch")
                    setModalStep("search")
                  }}
                >
                  <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                    <Box className="h-6 w-6" />
                  </div>
                  <span className="font-semibold text-gray-700">Dispatch</span>
                </div>
                <div
                  className="p-6 rounded-xl border-2 border-gray-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all cursor-pointer flex flex-col items-center gap-3"
                  onClick={() => {
                    setSelectedStatus("Stock Transfer")
                    setModalStep("stockTransfer")
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
            loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 min-h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm text-gray-500">Loading dispatch items...</p>
              </div>
            ) : (
              <div className="p-4 flex flex-col gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    className="pl-9"
                    placeholder="Type invoice number to search..."
                    value={invoiceSearchTerm}
                    onChange={(e) => setInvoiceSearchTerm(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-1 max-h-[400px] overflow-auto">
                  {uniqueInvoiceNumbers.length === 0 ? (
                    <p className="text-center py-10 text-gray-500">No invoices found.</p>
                  ) : (
                    uniqueInvoiceNumbers.map(no => (
                      <div
                        key={no}
                        className="p-3 rounded-lg border border-gray-100 hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition-colors font-medium text-gray-700"
                        onClick={() => {
                          const baseRecords = uniqueInvoicesGrouped[no] || []
                          setSelectedInvoiceNo(no)
                          setModalStep("selection")
                          
                          // Pre-fill modal edits
                          const initialEdits = {}
                          // I need to expansion logic here or use a useEffect
                          // But I can simulate the expansion here to get the IDs
                          baseRecords.forEach(record => {
                            if (record.allItems && record.allItems.length > 0) {
                              record.allItems.forEach((itm, idx) => {
                                const id = `${record.id}_item_${idx}`
                                initialEdits[id] = {
                                  selectedItemName: itm.name,
                                  qty: itm.qty,
                                  receivedLocation: record.dkLocations[idx] || "",
                                  prefilledLocation: record.dkLocations[idx] || "",
                                  remarks: ""
                                }
                              })
                            } else {
                              const id = `${record.id}_item_0`
                              initialEdits[id] = {
                                selectedItemName: record.itemName,
                                qty: record.qty,
                                receivedLocation: record.warehouseLocation || "",
                                prefilledLocation: record.warehouseLocation || "",
                                remarks: ""
                              }
                            }
                          })
                          setModalEdits(initialEdits)
                        }}
                      >
                        {no}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          )}

          {modalStep === "stockTransfer" && (
            <div className="p-4 flex flex-col h-full bg-slate-50/30">
              <div className="flex-1 overflow-auto rounded-lg border border-gray-200 bg-white">
                <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">From Location</th>
                      <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Item (Source)</th>
                      <th className="px-3 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Qty</th>
                      <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">To Location</th>
                      <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Item (Dest)</th>
                      <th className="px-3 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Qty</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stockTransferRows.map((row) => (
                      <tr key={row.id}>
                        <td className="p-2 w-[16%]">
                          <div className="flex items-center gap-1">
                            <input
                              list="modal-locations"
                              className="w-full h-9 text-[11px] border border-gray-200 rounded px-2 outline-none"
                              value={row.fromLoc}
                              placeholder="Loc..."
                              onChange={(e) => handleStockEdit(row.id, "fromLoc", e.target.value)}
                            />
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-blue-600 hover:bg-blue-50 shrink-0"
                              onClick={() => openScanner(row.id, "fromLoc")}
                            >
                              <Camera className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                        <td className="p-2 w-[22%]">
                          <input
                            list={`stockItems-${row.id}`}
                            className="w-full h-9 text-xs border border-gray-200 rounded px-2"
                            placeholder={isImsLoading ? "Loading IMS..." : "Type item..."}
                            value={row.item}
                            onChange={(e) => handleStockEdit(row.id, "item", e.target.value)}
                          />
                          <datalist id={`stockItems-${row.id}`}>
                            {(() => {
                              const rawInput = (row.fromLoc || "").trim();
                              if (!rawInput) return stockItems.map(it => <option key={it} value={it} />);
                              
                              const filteredIMS = imsData
                                .filter(item => isLocMatch(rawInput, item.location))
                                .map(item => item.itemName);
                              
                              // Deduplicate
                              const uniqueIMS = [...new Set(filteredIMS)];
                              
                              if (uniqueIMS.length === 0) return stockItems.map(it => <option key={it} value={it} />);
                              return uniqueIMS.map(it => <option key={it} value={it} />);
                            })()}
                          </datalist>
                        </td>
                        <td className="p-2 w-[10%]">
                          <input
                            type="number"
                            className="w-full h-9 text-xs border border-gray-200 rounded text-center"
                            value={row.qty}
                            onChange={(e) => handleStockEdit(row.id, "qty", e.target.value)}
                          />
                        </td>
                        <td className="p-2 w-[16%]">
                          <div className="flex items-center gap-1">
                            <input
                              list="modal-locations"
                              className="w-full h-9 text-[11px] border border-gray-200 rounded px-2 outline-none"
                              value={row.toLoc}
                              placeholder="Loc..."
                              onChange={(e) => handleStockEdit(row.id, "toLoc", e.target.value)}
                            />
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-purple-600 hover:bg-purple-50 shrink-0"
                              onClick={() => openScanner(row.id, "toLoc")}
                            >
                              <Camera className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                        <td className="p-2 w-[22%]">
                          <input
                            className="w-full h-9 text-xs border border-gray-200 rounded px-2"
                            value={row.itemTo}
                            onChange={(e) => handleStockEdit(row.id, "itemTo", e.target.value)}
                          />
                        </td>
                        <td className="p-2 w-[10%]">
                          <input
                            type="number"
                            className="w-full h-9 text-xs border border-gray-200 rounded text-center"
                            value={row.qtyTo || row.qty}
                            onChange={(e) => handleStockEdit(row.id, "qtyTo", e.target.value)}
                          />
                        </td>
                        <td className="p-2 text-center">
                          {stockTransferRows.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-red-500"
                              onClick={() => setStockTransferRows(prev => prev.filter(r => r.id !== row.id))}
                            >
                              <X className="h-4 w-4" />
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
            loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 min-h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm text-gray-500">Loading records...</p>
              </div>
            ) : (
              <div className="p-4">
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-700 uppercase font-semibold border-b text-[10px]">
                      <tr>
                        <th className="px-3 py-3 w-10 text-center">
                          <Checkbox
                            checked={itemRecords.length > 0 && itemRecords.every(item => selectedRows[item.id])}
                            onCheckedChange={(checked) => {
                              const nextSelected = {}
                              itemRecords.forEach(item => { nextSelected[item.id] = checked })
                              setSelectedRows(nextSelected)
                            }}
                          />
                        </th>
                        <th className="px-3 py-3 w-[12%]">Order No.</th>
                        <th className="px-3 py-3 w-[18%]">Item Name</th>
                        <th className="px-3 py-3 w-[8%] text-center">Qty</th>
                        <th className="px-3 py-3 w-[20%]">Rec. Location</th>
                        <th className="px-3 py-3 w-[25%]">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {itemRecords.map((item) => {
                        const edits = modalEdits[item.id] || {}
                        const isSelected = !!selectedRows[item.id]
                        const isLocationChanged = edits.receivedLocation && edits.receivedLocation !== edits.prefilledLocation
                        
                        return (
                          <tr key={item.id} className={`${isSelected ? "bg-blue-50/50" : ""} hover:bg-gray-50/50 transition-colors`}>
                            <td className="px-3 py-3 text-center">
                              <Checkbox checked={isSelected} onCheckedChange={(checked) => toggleRow(item.id, checked)} />
                            </td>
                            <td className="px-3 py-3 text-gray-600 font-medium">{item.indentNo}</td>
                            <td className="px-3 py-3">
                              <select
                                className={`w-full border rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none ${isSelected ? "border-blue-300 bg-white" : "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"}`}
                                disabled={!isSelected}
                                value={edits.selectedItemName || ""}
                                onChange={(e) => handleRowItemChange(item.id, item.itemIndex, e.target.value)}
                              >
                                {item.allItems?.map(ai => <option key={ai.name} value={ai.name}>{ai.name}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-3">
                              <Input
                                type="number"
                                className={`h-8 px-2 text-xs text-center ${isSelected ? "border-blue-300 bg-white" : "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"}`}
                                disabled={!isSelected}
                                value={edits.qty || ""}
                                onChange={(e) => handleEditChange(item.id, "qty", e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-3">
                              <div className="relative">
                                <Input
                                  list={`locations-list-${item.id}`}
                                  className={`h-8 px-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none ${isSelected ? "border-blue-300 bg-white" : "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"}`}
                                  disabled={!isSelected}
                                  placeholder="Select or type..."
                                  value={edits.receivedLocation || ""}
                                  onChange={(e) => handleEditChange(item.id, "receivedLocation", e.target.value)}
                                />
                                <datalist id={`locations-list-${item.id}`}>
                                  {locations.map(loc => (
                                    <option key={loc} value={loc} />
                                  ))}
                                </datalist>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <Input
                                placeholder={isLocationChanged ? "Enter reason for change..." : "Locked (No change)"}
                                className={`h-8 px-3 text-[11px] ${isSelected && isLocationChanged ? "border-orange-300 bg-white" : "border-gray-100 bg-gray-50/50 cursor-not-allowed opacity-60"}`}
                                disabled={!isSelected || !isLocationChanged}
                                value={edits.remarks || ""}
                                onChange={(e) => handleEditChange(item.id, "remarks", e.target.value)}
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </div>

        <div className="p-4 border-t flex items-center justify-between bg-gray-50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (modalStep === "search" || modalStep === "stockTransfer") setModalStep("status")
              else if (modalStep === "selection") setModalStep("search")
            }}
            disabled={modalStep === "status" || loading}
          >
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={resetModal}>Cancel</Button>
            {(modalStep === "selection" || modalStep === "stockTransfer") && (
              <Button 
                size="sm" 
                onClick={modalStep === "selection" ? handleSubmitUpdate : handleSubmitStockTransfer} 
                disabled={isSubmitting || loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
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

        {/* Global Datalist for Locations */}
        <datalist id="modal-locations">
          {locations.map(loc => <option key={loc} value={loc} />)}
        </datalist>

        {/* Scanner Overlay */}
        {isScannerOpen && (
          <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm relative">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-4 top-4"
                onClick={() => setIsScannerOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
              <div className="mb-6 text-center">
                <h3 className="text-lg font-bold text-gray-800">Scan Location</h3>
                <p className="text-sm text-gray-500">Position the barcode inside the frame</p>
              </div>
              <div id="qr-reader" className="overflow-hidden rounded-xl border-4 border-blue-100 mb-6 shadow-2xl"></div>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setIsScannerOpen(false)}
              >
                Cancel Scan
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
