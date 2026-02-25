"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
import { RefreshCw, CloudUpload, FileText, X, Settings, Save, Eye, FileSpreadsheet } from "lucide-react";

export default function ProcessDialog({
    isOpen,
    onOpenChange,
    selectedOrder,
    onSubmit,
    uploading = false,
    currentUser,
    transportMode = false,
    packagingMode = false,
    salesMode = false,
    biltyMode = false
}) {
    const [beforePhotos, setBeforePhotos] = useState([]);
    const [afterPhotos, setAfterPhotos] = useState([]);
    const [biltyUploads, setBiltyUploads] = useState([]);
    const [transporterName, setTransporterName] = useState("");
    const [transporterContact, setTransporterContact] = useState("");
    const [biltyNumber, setBiltyNumber] = useState("");
    const [totalCharges, setTotalCharges] = useState("");
    const [warehouseRemarks, setWarehouseRemarks] = useState("");
    const [dispatchStatus, setDispatchStatus] = useState("okay");
    const [notOkReason, setNotOkReason] = useState("");
    const [driverCharges, setDriverCharges] = useState("");
    const [itemQuantities, setItemQuantities] = useState({});

    // Upload progress state
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState("");

    // Google Apps Script URL for file uploads
    const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyzW8-RldYx917QpAfO4kY-T8_ntg__T0sbr7Yup2ZTVb1FC5H1g6TYuJgAU6wTquVM/exec";
    const DRIVE_FOLDER_ID = "1ZGfbiQHFnVdMyoLv5s8y3gVTIlnQzW2e";

    // Reset form when dialog opens with new order
    useEffect(() => {
        if (selectedOrder) {
            setBeforePhotos([]);
            setAfterPhotos([]);
            setBiltyUploads([]);
            setTransporterName("");
            setTransporterContact("");
            setBiltyNumber("");
            setTotalCharges("");
            setWarehouseRemarks("");
            setDispatchStatus("okay");
            setNotOkReason("");
            setDriverCharges("");

            // Initialize item quantities
            const initialQuantities = {};

            // Process column items (1 to 14)
            for (let i = 1; i <= 14; i++) {
                if (selectedOrder[`itemName${i}`] || selectedOrder[`quantity${i}`]) {
                    initialQuantities[`column-${i}`] = selectedOrder[`quantity${i}`] || "0";
                }
            }

            // Process JSON items
            try {
                if (selectedOrder.itemQtyJson) {
                    let jsonItems = [];

                    if (typeof selectedOrder.itemQtyJson === "string" &&
                        selectedOrder.itemQtyJson.trim() !== "" &&
                        selectedOrder.itemQtyJson !== "Item/Qty" &&
                        (selectedOrder.itemQtyJson.startsWith("[") || selectedOrder.itemQtyJson.startsWith("{"))) {
                        jsonItems = JSON.parse(selectedOrder.itemQtyJson);
                    } else if (Array.isArray(selectedOrder.itemQtyJson)) {
                        jsonItems = selectedOrder.itemQtyJson;
                    }

                    jsonItems.forEach((item, idx) => {
                        if (item.name || item.quantity) {
                            initialQuantities[`json-${idx}`] = item.quantity || "0";
                        }
                    });
                }
            } catch (error) {
                console.error("Error parsing JSON items:", error);
            }

            setItemQuantities(initialQuantities);
        }
    }, [selectedOrder]);

    const convertTimestampToDDMMYYYY = (timestampString) => {
        if (!timestampString) return "";

        // Extract the date parts
        const parts = timestampString.match(/\d+/g);
        if (!parts || parts.length < 6) return timestampString;

        const partsNum = parts.map(Number);

        // Create Date object
        const date = new Date(
            partsNum[0],
            partsNum[1],
            partsNum[2],
            partsNum[3],
            partsNum[4],
            partsNum[5]
        );

        // Format to dd/mm/yyyy
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();

        return `${day}/${month}/${year}`;
    };

    const convertFileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
    };

    // Function to upload a single file to Google Drive and get URL
    const uploadFileToDrive = async (file, folderId = DRIVE_FOLDER_ID) => {
        try {
            if (!file) {
                console.error("No file provided for upload");
                return null;
            }

            // Convert file to base64
            const base64Data = await convertFileToBase64(file);

            // Create form data
            const formData = new FormData();
            formData.append("sheetName", "DISPATCH-DELIVERY");
            formData.append("action", "uploadFile");
            formData.append("base64Data", base64Data);
            formData.append("fileName", file.name);
            formData.append("mimeType", file.type);
            formData.append("folderId", folderId);

            const response = await fetch(APPS_SCRIPT_URL, {
                method: "POST",
                mode: "cors",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success && result.fileUrl) {
                return result.fileUrl;
            } else {
                throw new Error(result.error || "File upload failed");
            }
        } catch (error) {
            console.error("Error uploading file to Drive:", error);
            throw error;
        }
    };

    // Function to upload multiple files (for before/after photos)
    const uploadMultipleFilesToDrive = async (files, fileType, orderNo, folderId = DRIVE_FOLDER_ID) => {
        try {
            if (!files || files.length === 0) {
                return [];
            }

            const uploadPromises = files.map(async (file, index) => {
                const base64Data = await convertFileToBase64(file);

                const formData = new FormData();
                formData.append("sheetName", "DISPATCH-DELIVERY");
                formData.append("action", "uploadFile");
                formData.append("base64Data", base64Data);
                formData.append("fileName", `${fileType}_${orderNo}_${Date.now()}_${index}_${file.name}`);
                formData.append("mimeType", file.type);
                formData.append("folderId", folderId);

                const response = await fetch(APPS_SCRIPT_URL, {
                    method: "POST",
                    mode: "cors",
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                return result.success ? result.fileUrl : null;
            });

            const urls = await Promise.all(uploadPromises);
            return urls.filter(url => url !== null);
        } catch (error) {
            console.error(`Error uploading ${fileType} files:`, error);
            return [];
        }
    };

    // Main submit handler with file uploads
    const handleSubmit = async () => {
        if (!selectedOrder) return;

        // Validation for "Not Okay" status
        if (dispatchStatus === "notokay" && !notOkReason.trim()) {
            alert("Please provide a reason for 'Not Okay' status.");
            return;
        }

        // Mandatory field validation for Transport Mode
        if (transportMode && !transporterName.trim()) {
            alert("Please enter Transporter / Courier Name.");
            return;
        }

        // Mandatory field validation for Packaging Mode
        if (packagingMode && beforePhotos.length === 0) {
            alert("Please upload at least one 'Before Photo (Packing)'.");
            return;
        }

        // Mandatory field validation for Bilty Mode
        if (biltyMode) {
            if (biltyUploads.length === 0) {
                alert("Please upload at least one 'Bilty / Docket' file.");
                return;
            }
            if (!driverCharges.trim()) {
                alert("Please enter Driver Transporting Charges.");
                return;
            }
        }

        setIsUploading(true);
        setUploadProgress(0);
        setUploadStatus("Preparing files...");

        try {
            const orderNo = selectedOrder.orderNo || selectedOrder.dSrNumber;
            const fileUrls = {
                beforePhotoUrls: [],
                afterPhotoUrls: [],
                biltyUrls: [],
                beforePhotoUrl: "",
                afterPhotoUrl: "",
                biltyUrl: "",
            };

            // Step 1: Upload before photos
            if (beforePhotos.length > 0) {
                setUploadStatus(`Uploading before photos (0/${beforePhotos.length})...`);
                setUploadProgress(10);

                const beforePhotoUrls = await uploadMultipleFilesToDrive(
                    beforePhotos,
                    "before",
                    orderNo
                );

                if (beforePhotoUrls.length > 0) {
                    fileUrls.beforePhotoUrls = beforePhotoUrls;
                    fileUrls.beforePhotoUrl = beforePhotoUrls.join(", ");
                }
                setUploadProgress(30);
            }

            // Step 2: Upload after photos
            if (afterPhotos.length > 0) {
                setUploadStatus(`Uploading after photos (0/${afterPhotos.length})...`);
                setUploadProgress(35);

                const afterPhotoUrls = await uploadMultipleFilesToDrive(
                    afterPhotos,
                    "after",
                    orderNo
                );

                if (afterPhotoUrls.length > 0) {
                    fileUrls.afterPhotoUrls = afterPhotoUrls;
                    fileUrls.afterPhotoUrl = afterPhotoUrls.join(", ");
                }
                setUploadProgress(60);
            }

            // Step 3: Upload bilty/docket files
            if (biltyUploads.length > 0) {
                setUploadStatus(`Uploading bilty/docket (0/${biltyUploads.length})...`);
                setUploadProgress(65);

                const biltyUrls = await uploadMultipleFilesToDrive(
                    biltyUploads,
                    "bilty",
                    orderNo
                );

                if (biltyUrls.length > 0) {
                    fileUrls.biltyUrls = biltyUrls;
                    fileUrls.biltyUrl = biltyUrls.join(", ");
                }
                setUploadProgress(85);
            }

            setUploadStatus("Submitting data...");
            setUploadProgress(90);

            // Step 4: Call parent's onSubmit with all data including file URLs
            await onSubmit({
                order: selectedOrder,
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
                driverCharges,
                itemQuantities,
                // Include uploaded file URLs
                fileUrls,
            });

            setUploadProgress(100);
            setUploadStatus("Complete!");

        } catch (error) {
            console.error("Error during submission:", error);
            setUploadStatus(`Error: ${error.message}`);
            alert(`❌ Upload Error: ${error.message}\n\nPlease try again.`);
        } finally {
            // Reset upload state after a brief delay
            setTimeout(() => {
                setIsUploading(false);
                setUploadProgress(0);
                setUploadStatus("");
            }, 1000);
        }
    };


    const renderItemsSection = () => {
        if (!selectedOrder) {
            return (
                <div className="text-center py-4 text-gray-500">
                    No order selected
                </div>
            );
        }

        const allItems = [];
        let itemCounter = 0;

        // 1. Process Column Items (1 to 14)
        for (let i = 1; i <= 14; i++) {
            const itemName = selectedOrder[`itemName${i}`];
            const quantity = selectedOrder[`quantity${i}`];

            if (itemName || quantity) {
                itemCounter++;
                allItems.push({
                    id: `column-${i}`,
                    index: itemCounter,
                    name: itemName || "",
                    quantity: quantity || "",
                    type: "column",
                    rowNum: i,
                });
            }
        }

        // 2. Process JSON Items from "Item/Qty" column
        try {
            if (selectedOrder.itemQtyJson) {
                let jsonItems = [];

                if (typeof selectedOrder.itemQtyJson === "string" &&
                    selectedOrder.itemQtyJson.trim() !== "" &&
                    selectedOrder.itemQtyJson !== "Item/Qty" &&
                    (selectedOrder.itemQtyJson.startsWith("[") || selectedOrder.itemQtyJson.startsWith("{"))) {
                    jsonItems = JSON.parse(selectedOrder.itemQtyJson);
                } else if (Array.isArray(selectedOrder.itemQtyJson)) {
                    jsonItems = selectedOrder.itemQtyJson;
                }

                jsonItems.forEach((item, idx) => {
                    if (item.name || item.quantity) {
                        itemCounter++;
                        allItems.push({
                            id: `json-${idx}`,
                            index: itemCounter,
                            name: item.name || "",
                            quantity: item.quantity || "",
                            type: "json",
                            jsonIndex: idx,
                        });
                    }
                });
            }
        } catch (error) {
            console.error("Error parsing JSON items:", error);
        }

        if (allItems.length === 0) {
            return (
                <div className="text-center py-4 text-gray-500">
                    No items found in this order
                </div>
            );
        }

        return (
            <>
                <div className="space-y-3 max-h-80 overflow-y-auto p-1 custom-scrollbar">
                    {allItems.map((item) => {
                        const currentQuantity =
                            itemQuantities[item.id] !== undefined
                                ? itemQuantities[item.id]
                                : item.quantity || "";

                        return (
                            <div
                                key={item.id}
                                className="grid grid-cols-2 gap-3 border p-3 rounded-lg bg-white hover:border-violet-200 transition-all shadow-sm"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-medium text-slate-600">
                                            Item {item.index}
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            {item.type === "json" && (
                                                <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase">
                                                    JSON
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <Input
                                        value={item.name}
                                        disabled
                                        className="bg-slate-50 font-medium border-slate-100"
                                        placeholder="Item name"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-sm font-medium text-slate-600">
                                        Quantity
                                    </Label>
                                    <div className="flex items-center space-x-2">
                                        <Input
                                            type="number"
                                            min="0"
                                            value={currentQuantity}
                                            className="bg-white font-bold text-right focus:border-violet-400 focus:ring-violet-400"
                                            placeholder="Enter quantity"
                                            onChange={(e) => {
                                                const newValue = e.target.value;
                                                setItemQuantities((prev) => ({
                                                    ...prev,
                                                    [item.id]: newValue,
                                                }));
                                            }}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <div className="text-[10px] text-slate-400 font-medium">
                                            INITIAL: {item.quantity || "0"}
                                        </div>
                                        {currentQuantity !== item.quantity && (
                                            <div className="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 rounded">
                                                UPDATED
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Total Quantity */}
                <div className="mt-4 pt-3 border-t border-slate-200">
                    <div className="flex justify-between items-center bg-violet-50 p-3 rounded-lg border border-violet-100">
                        <span className="text-sm font-bold text-violet-700">
                            Total Quantity Verified:
                        </span>
                        <span className="text-xl font-black text-violet-800">
                            {(() => {
                                let total = 0;
                                Object.values(itemQuantities).forEach((qty) => {
                                    if (qty !== null && qty !== undefined && qty !== "") {
                                        const qtyStr = String(qty);
                                        if (qtyStr.trim() !== "") {
                                            total += parseInt(qtyStr) || 0;
                                        }
                                    }
                                });
                                return total;
                            })()}
                        </span>
                    </div>
                </div>
            </>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Warehouse Processing</DialogTitle>
                    <DialogDescription>
                        {transportMode ? "Enter transportation details for the order" :
                            packagingMode ? "Upload packaging photos and documentation" :
                                biltyMode ? "Upload Bilty/Docket and enter driver charges" :
                                    salesMode ? "Enter order items and basic details" :
                                        "Upload warehouse documentation and enter processing details"}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-2">
                    {!transportMode && !packagingMode && !biltyMode && (
                        <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                            {/* Section 1: Order/Items */}
                            <div className="flex items-center gap-2 mb-2 border-b border-slate-200 pb-3">
                                <div className="p-1.5 bg-violet-600 rounded-lg">
                                    <Settings className="h-4 w-4 text-white" />
                                </div>
                                <h4 className="text-lg font-bold text-slate-800 tracking-tight">
                                    Section 1
                                </h4>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="orderNumber">Order Number</Label>
                                    <Input
                                        id="orderNumber"
                                        className="font-bold bg-white"
                                        value={selectedOrder?.orderNo}
                                        disabled
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Quotation No.</Label>
                                    <Input
                                        className="font-bold bg-white"
                                        value={selectedOrder?.quotationNo || ""}
                                        disabled
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Date</Label>
                                    <Input
                                        className="font-bold bg-white"
                                        value={
                                            selectedOrder?.timeStamp
                                                ? convertTimestampToDDMMYYYY(selectedOrder.timeStamp)
                                                : ""
                                        }
                                        disabled
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <h5 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                    <div className="w-1.5 h-4 bg-violet-500 rounded-full"></div>
                                    Items Verification
                                </h5>
                                {renderItemsSection()}
                            </div>

                            <div className="mt-6">
                                <h5 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                    <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                                    Account Attachments
                                </h5>
                                <div className="grid grid-cols-2 gap-4">
                                    {selectedOrder?.invoiceUpload && (
                                        <div className="p-3 bg-white rounded-lg border border-slate-200 flex justify-between items-center shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <Eye className="h-4 w-4 text-indigo-500" />
                                                <Label className="text-xs font-semibold text-slate-600">
                                                    INVOICE DOCUMENT
                                                </Label>
                                            </div>
                                            <a
                                                href={selectedOrder.invoiceUpload}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-indigo-600 hover:text-indigo-800 text-xs font-bold bg-indigo-50 px-2 py-1 rounded transition-colors"
                                            >
                                                VIEW
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Section 2 */}
                    {!packagingMode && !salesMode && !biltyMode && (
                        <div className="space-y-6">
                            {/* Section 2: Transportation details */}
                            <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-200 shadow-sm space-y-6">
                                <div className="flex items-center gap-2 mb-2 border-b border-indigo-200 pb-3">
                                    <div className="p-1.5 bg-indigo-600 rounded-lg">
                                        <Save className="h-4 w-4 text-white" />
                                    </div>
                                    <h4 className="text-lg font-bold text-indigo-900 tracking-tight">
                                        Section 2
                                    </h4>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="transporterName" className="text-indigo-700 font-medium">
                                            Transporter / Courier Name <span className="text-red-500 font-bold">*</span>
                                        </Label>
                                        <Input
                                            id="transporterName"
                                            value={transporterName}
                                            className="bg-white border-indigo-100"
                                            onChange={(e) => setTransporterName(e.target.value)}
                                            placeholder="Enter transporter name"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="transporterContact" className="text-indigo-700 font-medium">
                                            Transporter Contact No.
                                        </Label>
                                        <Input
                                            id="transporterContact"
                                            value={transporterContact}
                                            className="bg-white border-indigo-100"
                                            onChange={(e) => setTransporterContact(e.target.value)}
                                            placeholder="Enter contact number"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="biltyNumber" className="text-indigo-700 font-medium">
                                            Bilty No. / Docket No.
                                        </Label>
                                        <Input
                                            id="biltyNumber"
                                            value={biltyNumber}
                                            className="bg-white border-indigo-100"
                                            onChange={(e) => setBiltyNumber(e.target.value)}
                                            placeholder="Enter bilty/docket number"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="totalCharges" className="text-indigo-700 font-medium">
                                            Total Charges (₹)
                                        </Label>
                                        <Input
                                            id="totalCharges"
                                            value={totalCharges}
                                            className="bg-white border-indigo-100"
                                            onChange={(e) => setTotalCharges(e.target.value)}
                                            placeholder="0.00"
                                            type="number"
                                            step="0.01"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="warehouseRemarks" className="text-indigo-700 font-medium">
                                        Warehouse Remarks
                                    </Label>
                                    <Textarea
                                        id="warehouseRemarks"
                                        value={warehouseRemarks}
                                        className="bg-white border-indigo-100 min-h-[100px]"
                                        onChange={(e) => setWarehouseRemarks(e.target.value)}
                                        placeholder="Enter additional warehouse/dispatch remarks..."
                                        rows={3}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bilty Mode Section */}
                    {biltyMode && (
                        <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-200 shadow-sm space-y-6">
                            <div className="flex items-center gap-2 mb-2 border-b border-indigo-200 pb-3">
                                <div className="p-1.5 bg-indigo-600 rounded-lg">
                                    <FileSpreadsheet className="h-4 w-4 text-white" />
                                </div>
                                <h4 className="text-lg font-bold text-indigo-900 tracking-tight">
                                    Bilty Details
                                </h4>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="driverCharges" className="text-indigo-700 font-medium">
                                        Driver Transporting Charges <span className="text-red-500 font-bold">*</span>
                                    </Label>
                                    <Input
                                        id="driverCharges"
                                        value={driverCharges}
                                        className="bg-white border-indigo-100"
                                        onChange={(e) => setDriverCharges(e.target.value)}
                                        placeholder="Enter charges"
                                        type="number"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="biltyUpload" className="text-indigo-700 font-semibold flex items-center gap-2">
                                        Bilty / Docket Upload <span className="text-red-500 font-bold">*</span>
                                        <span className="text-[10px] font-normal text-indigo-500 bg-indigo-100 px-1.5 py-0.5 rounded-full">MULTIPLE</span>
                                    </Label>
                                    <div className="relative group">
                                        <Input
                                            id="biltyUpload"
                                            className="bg-white border-indigo-100 h-12 cursor-pointer invisible absolute"
                                            type="file"
                                            accept="image/*,application/pdf"
                                            multiple
                                            onChange={(e) => {
                                                const newFiles = Array.from(e.target.files || []);
                                                setBiltyUploads((prev) => [...prev, ...newFiles]);
                                            }}
                                        />
                                        <label htmlFor="biltyUpload" className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-indigo-200 rounded-xl bg-white hover:bg-indigo-50/50 hover:border-indigo-400 transition-all cursor-pointer">
                                            <div className="flex flex-center gap-2 items-center">
                                                <CloudUpload className="h-5 w-5 text-indigo-500" />
                                                <span className="text-sm font-medium text-indigo-700">Click or drag to upload documents</span>
                                            </div>
                                        </label>
                                    </div>

                                    {biltyUploads.length > 0 && (
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-200 text-xs font-bold">
                                                <FileText className="h-3 w-3" />
                                                Bilty: {biltyUploads.length}
                                                <button onClick={() => setBiltyUploads([])} className="ml-1 hover:text-red-500"><X className="h-3 w-3" /></button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {!salesMode && !biltyMode && (
                        <>
                            {/* Section 3: Documentation upload & Photos */}
                            <div className="space-y-6 mt-6">
                                <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-200 shadow-sm space-y-6">
                                    <div className="flex items-center gap-2 mb-2 border-b border-emerald-200 pb-3">
                                        <div className="p-1.5 bg-emerald-600 rounded-lg">
                                            <CloudUpload className="h-4 w-4 text-white" />
                                        </div>
                                        <h4 className="text-lg font-bold text-emerald-900 tracking-tight">
                                            Section 3: Documentation
                                        </h4>
                                    </div>

                                    <div className="space-y-5">
                                        <div className="space-y-3">
                                            <Label htmlFor="beforePhoto" className="text-emerald-700 font-semibold flex items-center gap-2">
                                                Before Photo (Packing) <span className="text-red-500 font-bold">*</span>
                                                <span className="text-[10px] font-normal text-emerald-500 bg-emerald-100 px-1.5 py-0.5 rounded-full">MULTIPLE</span>
                                            </Label>
                                            <div className="relative group">
                                                <Input
                                                    id="beforePhoto"
                                                    className="bg-white border-emerald-100 h-12 cursor-pointer invisible absolute"
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    onChange={(e) => {
                                                        const newFiles = Array.from(e.target.files || []);
                                                        setBeforePhotos((prev) => [...prev, ...newFiles]);
                                                    }}
                                                />
                                                <label htmlFor="beforePhoto" className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-emerald-200 rounded-xl bg-white hover:bg-emerald-50/50 hover:border-emerald-400 transition-all cursor-pointer">
                                                    <div className="flex flex-center gap-2 items-center">
                                                        <CloudUpload className="h-5 w-5 text-emerald-500" />
                                                        <span className="text-sm font-medium text-emerald-700">Click or drag to upload photos</span>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                        {/* After Photo (Final Package) */}
                                        <div className="space-y-3">
                                            <Label htmlFor="afterPhoto" className="text-emerald-700 font-semibold flex items-center gap-2">
                                                After Photo (Final Package)
                                                <span className="text-[10px] font-normal text-emerald-500 bg-emerald-100 px-1.5 py-0.5 rounded-full">MULTIPLE</span>
                                            </Label>
                                            <div className="relative group">
                                                <Input
                                                    id="afterPhoto"
                                                    className="bg-white border-emerald-100 h-12 cursor-pointer invisible absolute"
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    onChange={(e) => {
                                                        const newFiles = Array.from(e.target.files || []);
                                                        setAfterPhotos((prev) => [...prev, ...newFiles]);
                                                    }}
                                                />
                                                <label htmlFor="afterPhoto" className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-emerald-200 rounded-xl bg-white hover:bg-emerald-50/50 hover:border-emerald-400 transition-all cursor-pointer">
                                                    <div className="flex flex-center gap-2 items-center">
                                                        <CloudUpload className="h-5 w-5 text-emerald-500" />
                                                        <span className="text-sm font-medium text-emerald-700">Click or drag to upload photos</span>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Bilty / Docket Upload */}
                                        {!packagingMode && (
                                            <div className="space-y-3">
                                                <Label htmlFor="biltyUpload" className="text-emerald-700 font-semibold flex items-center gap-2">
                                                    Bilty / Docket Upload
                                                    <span className="text-[10px] font-normal text-emerald-500 bg-emerald-100 px-1.5 py-0.5 rounded-full">MULTIPLE</span>
                                                </Label>
                                                <div className="relative group">
                                                    <Input
                                                        id="biltyUpload"
                                                        className="bg-white border-emerald-100 h-12 cursor-pointer invisible absolute"
                                                        type="file"
                                                        accept="image/*,application/pdf"
                                                        multiple
                                                        onChange={(e) => {
                                                            const newFiles = Array.from(e.target.files || []);
                                                            setBiltyUploads((prev) => [...prev, ...newFiles]);
                                                        }}
                                                    />
                                                    <label htmlFor="biltyUpload" className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-emerald-200 rounded-xl bg-white hover:bg-emerald-50/50 hover:border-emerald-400 transition-all cursor-pointer">
                                                        <div className="flex flex-center gap-2 items-center">
                                                            <CloudUpload className="h-5 w-5 text-emerald-500" />
                                                            <span className="text-sm font-medium text-emerald-700">Click or drag to upload documents</span>
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>
                                        )}

                                        {/* Selected files count badges */}
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {beforePhotos.length > 0 && (
                                                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-200 text-xs font-bold">
                                                    <FileText className="h-3 w-3" />
                                                    Before: {beforePhotos.length}
                                                    <button onClick={() => setBeforePhotos([])} className="ml-1 hover:text-red-500"><X className="h-3 w-3" /></button>
                                                </div>
                                            )}
                                            {afterPhotos.length > 0 && (
                                                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-200 text-xs font-bold">
                                                    <FileText className="h-3 w-3" />
                                                    After: {afterPhotos.length}
                                                    <button onClick={() => setAfterPhotos([])} className="ml-1 hover:text-red-500"><X className="h-3 w-3" /></button>
                                                </div>
                                            )}
                                            {biltyUploads.length > 0 && !packagingMode && (
                                                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-200 text-xs font-bold">
                                                    <FileText className="h-3 w-3" />
                                                    Bilty: {biltyUploads.length}
                                                    <button onClick={() => setBiltyUploads([])} className="ml-1 hover:text-red-500"><X className="h-3 w-3" /></button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {!salesMode && (
                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 shadow-sm">
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-slate-600 rounded-lg">
                                                    <RefreshCw className="h-4 w-4 text-white" />
                                                </div>
                                                <h4 className="text-base font-bold text-slate-800">Section 4: Dispatch Confirmation</h4>
                                            </div>
                                            <div className="flex bg-slate-200/50 p-1 rounded-xl border border-slate-200">
                                                <button type="button" onClick={() => setDispatchStatus("okay")} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${dispatchStatus === "okay" ? "bg-green-600 text-white shadow-md shadow-green-100" : "text-slate-500 hover:text-slate-700"}`}>OKAY</button>
                                                <button type="button" onClick={() => setDispatchStatus("notokay")} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${dispatchStatus === "notokay" ? "bg-red-600 text-white shadow-md shadow-red-100" : "text-slate-500 hover:text-slate-700"}`}>NOT OKAY</button>
                                            </div>
                                        </div>

                                        {dispatchStatus === "notokay" && (
                                            <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2 border-t border-slate-200">
                                                <Label htmlFor="notOkReason" className="text-red-700 font-semibold flex items-center gap-2">
                                                    Reason for NOT OKAY
                                                </Label>
                                                <Textarea
                                                    id="notOkReason"
                                                    value={notOkReason}
                                                    onChange={(e) => setNotOkReason(e.target.value)}
                                                    placeholder="Please specify why this order is not okay for dispatch..."
                                                    className="bg-white border-red-100 min-h-[80px] focus:ring-red-500 focus:border-red-500"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {isUploading && (
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 space-y-3 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                                    <span className="text-sm font-semibold text-blue-700">{uploadStatus || "Processing..."}</span>
                                </div>
                                <span className="text-sm font-bold text-blue-800">{uploadProgress}%</span>
                            </div>
                            <div className="w-full bg-blue-100 rounded-full h-2.5 overflow-hidden">
                                <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out" style={{ width: `${uploadProgress}%` }} />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={isUploading || uploading || currentUser?.role === "user"} className={isUploading ? "bg-blue-600 hover:bg-blue-700" : ""}>
                            {isUploading ? `Uploading... ${uploadProgress}%` : uploading ? "Processing..." : "Submit"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}