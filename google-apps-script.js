/**
 * DIVINE WAREHOUSE - Google Apps Script
 * Fully Updated Version with Pre-uploaded URL Support
 * Last Updated: 2026-02-02
 * 
 * Features:
 * - Multiple file upload support (base64)
 * - Pre-uploaded URL support (faster, recommended)
 * - Multiple URLs per cell (comma-separated)
 * - All sheet operations (DISPATCH-DELIVERY, Warehouse, PR-SR-DN-Data)
 */

// ============================================
// CONFIGURATION
// ============================================
var SPREADSHEET_ID = "1yEsh4yzyvglPXHxo-5PT70VpwVJbxV7wwH8rpU1RFJA";
var DRIVE_FOLDER_ID = "1ZGfbiQHFnVdMyoLv5s8y3gVTIlnQzW2e";

// ============================================
// GET REQUEST HANDLER
// ============================================
function doGet(e) {
    try {
        var params = e.parameter;

        if (params.sheet && params.action === 'fetch') {
            return fetchSheetData(params.sheet);
        } else if (params.sheet) {
            return fetchSheetData(params.sheet);
        }

        return ContentService.createTextOutput(JSON.stringify({
            status: "ready",
            message: "Google Apps Script is running",
            version: "2.0.0"
        })).setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
        console.error("Error in doGet:", error);
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: error.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

// ============================================
// FETCH SHEET DATA
// ============================================
function fetchSheetData(sheetName) {
    try {
        var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        var sheet = ss.getSheetByName(sheetName);

        if (!sheet) {
            throw new Error("Sheet '" + sheetName + "' not found");
        }

        var data = sheet.getDataRange().getValues();

        return ContentService.createTextOutput(JSON.stringify({
            success: true,
            data: data
        })).setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
        console.error("Error fetching sheet data:", error);
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: error.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

// ============================================
// FILE UPLOAD TO GOOGLE DRIVE
// ============================================
function uploadFileToDrive(base64Data, fileName, mimeType, folderId) {
    try {
        if (!base64Data || !fileName || !mimeType) {
            console.error("Missing required parameters for file upload");
            return null;
        }

        // Remove the data URL prefix if it exists
        var fileData = base64Data;
        if (base64Data.indexOf("base64,") !== -1) {
            fileData = base64Data.split("base64,")[1];
        }

        // Decode the base64 data
        var decoded = Utilities.base64Decode(fileData);

        // Create a blob from the decoded data
        var blob = Utilities.newBlob(decoded, mimeType, fileName);

        // Get the folder reference
        var folder = DriveApp.getFolderById(folderId || DRIVE_FOLDER_ID);

        // Upload the file to the folder
        var file = folder.createFile(blob);

        // Make the file accessible via link
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

        // Return the direct link to view the file
        return "https://drive.google.com/uc?export=view&id=" + file.getId();
    } catch (error) {
        console.error("Error uploading file: " + error.toString());
        return null;
    }
}

// ============================================
// UPLOAD MULTIPLE FILES
// ============================================
function uploadMultipleFiles(params, prefix, orderIdentifier) {
    var urls = [];
    var count = parseInt(params[prefix + "Count"]) || 0;

    // Handle multiple files (indexed)
    for (var i = 0; i < count; i++) {
        var fileData = params[prefix + "File_" + i];
        var fileName = params[prefix + "FileName_" + i];
        var mimeType = params[prefix + "MimeType_" + i];

        if (fileData && fileName && mimeType) {
            var fullFileName = prefix + "_" + orderIdentifier + "_" + new Date().getTime() + "_" + i + "_" + fileName;
            var url = uploadFileToDrive(fileData, fullFileName, mimeType, DRIVE_FOLDER_ID);
            if (url) {
                urls.push(url);
            }
        }
    }

    // Handle single file (legacy support)
    if (urls.length === 0 && params[prefix + "File"] && params[prefix + "FileName"] && params[prefix + "MimeType"]) {
        var singleFileName = prefix + "_" + orderIdentifier + "_" + new Date().getTime() + "_" + params[prefix + "FileName"];
        var singleUrl = uploadFileToDrive(params[prefix + "File"], singleFileName, params[prefix + "MimeType"], DRIVE_FOLDER_ID);
        if (singleUrl) {
            urls.push(singleUrl);
        }
    }

    return urls;
}

// ============================================
// POST REQUEST HANDLER
// ============================================
function doPost(e) {
    try {
        var params = e.parameter;
        var sheetName = params.sheetName;
        var action = params.action || "insert";

        // ========================================
        // ACTION: Upload File Only
        // ========================================
        if (action === "uploadFile") {
            var base64Data = params.base64Data;
            var fileName = params.fileName;
            var mimeType = params.mimeType;
            var folderId = params.folderId || DRIVE_FOLDER_ID;

            if (!base64Data || !fileName || !mimeType) {
                throw new Error("Missing required parameters for file upload");
            }

            var fileUrl = uploadFileToDrive(base64Data, fileName, mimeType, folderId);

            if (!fileUrl) {
                throw new Error("Failed to upload file to Google Drive");
            }

            return ContentService.createTextOutput(
                JSON.stringify({
                    success: true,
                    fileUrl: fileUrl,
                })
            ).setMimeType(ContentService.MimeType.JSON);
        }

        // Get spreadsheet and sheet
        var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        var sheet = ss.getSheetByName(sheetName);

        // ========================================
        // ACTION: Update Ten Days Orders
        // ========================================
        if (action === "updateTenDaysOrders") {
            var ordersData = JSON.parse(params.ordersData || "[]");
            var targetSheetName = params.sheetName || "ORDER-DISPATCH";
            var result = updateTenDaysOrders(ordersData, targetSheetName);
            return ContentService.createTextOutput(JSON.stringify(result))
                .setMimeType(ContentService.MimeType.JSON);
        }

        // ========================================
        // ACTION: Insert (DISP Form)
        // ========================================
        if (action === "insert") {
            var fileUrls = {};
            var orderNo = params.orderNo || "UNKNOWN";

            // Upload Eway Bill file if provided
            if (params.ewayBillFile && params.ewayBillFileName && params.ewayBillMimeType) {
                var ewayFileName = "eway_bill_" + orderNo + "_" + new Date().getTime() + "_" + params.ewayBillFileName;
                var ewayUrl = uploadFileToDrive(params.ewayBillFile, ewayFileName, params.ewayBillMimeType, DRIVE_FOLDER_ID);
                if (ewayUrl) {
                    fileUrls.ewayBillUrl = ewayUrl;
                }
            }

            // Upload SRN file if provided
            if (params.srnFile && params.srnFileName && params.srnMimeType) {
                var srnFileName = "srn_" + orderNo + "_" + new Date().getTime() + "_" + params.srnFileName;
                var srnUrl = uploadFileToDrive(params.srnFile, srnFileName, params.srnMimeType, DRIVE_FOLDER_ID);
                if (srnUrl) {
                    fileUrls.srnUrl = srnUrl;
                }
            }

            // Upload Payment file if provided
            if (params.paymentFile && params.paymentFileName && params.paymentMimeType) {
                var paymentFileName = "payment_" + orderNo + "_" + new Date().getTime() + "_" + params.paymentFileName;
                var paymentUrl = uploadFileToDrive(params.paymentFile, paymentFileName, params.paymentMimeType, DRIVE_FOLDER_ID);
                if (paymentUrl) {
                    fileUrls.paymentUrl = paymentUrl;
                }
            }

            var rowDataInsert = JSON.parse(params.rowData);

            // Add file URLs to the appropriate columns
            if (fileUrls.ewayBillUrl) {
                rowDataInsert[26] = fileUrls.ewayBillUrl; // Column AA
            }
            if (fileUrls.srnUrl) {
                rowDataInsert[28] = fileUrls.srnUrl; // Column AC
            }
            if (fileUrls.paymentUrl) {
                rowDataInsert[29] = fileUrls.paymentUrl; // Column AD
            }

            sheet.appendRow(rowDataInsert);

            return ContentService.createTextOutput(
                JSON.stringify({
                    success: true,
                    fileUrls: fileUrls,
                    message: "DISP form submitted successfully with attachments"
                })
            ).setMimeType(ContentService.MimeType.JSON);
        }

        // ========================================
        // ACTION: Update by Row Index
        // ========================================
        else if (action === "update") {
            var rowIndexUpdate = parseInt(params.rowIndex);
            var rowDataUpdate = JSON.parse(params.rowData);

            if (isNaN(rowIndexUpdate) || rowIndexUpdate < 2) {
                throw new Error("Invalid row index for update");
            }

            for (var i = 0; i < rowDataUpdate.length; i++) {
                if (rowDataUpdate[i] !== "" && rowDataUpdate[i] !== null && rowDataUpdate[i] !== undefined) {
                    sheet.getRange(rowIndexUpdate, i + 1).setValue(rowDataUpdate[i]);
                }
            }

            return ContentService.createTextOutput(JSON.stringify({
                success: true,
                message: "Row updated successfully"
            })).setMimeType(ContentService.MimeType.JSON);
        }

        // ========================================
        // ACTION: Update by Order No
        // ========================================
        else if (action === "updateByOrderNo") {
            var orderNo = params.orderNo;
            var rowDataByOrderNo = JSON.parse(params.rowData);
            var fileUrls = {};

            // Handle all file uploads
            var fileTypes = [
                { param: "invoice", column: 67 },
                { param: "ewayBill", column: 68 },
                { param: "beforePhoto", column: 74 },
                { param: "afterPhoto", column: 75 },
                { param: "bilty", column: 76 },
                { param: "quotation", column: 10 },
                { param: "quotation2", column: 16 },
                { param: "acceptance", column: 17 },
                { param: "srnNumberAttachment", column: 29 },
                { param: "attachment", column: 30 }
            ];

            fileTypes.forEach(function (ft) {
                if (params[ft.param + "File"] && params[ft.param + "FileName"] && params[ft.param + "MimeType"]) {
                    var fileName = ft.param + "_" + orderNo + "_" + new Date().getTime() + "_" + params[ft.param + "FileName"];
                    var url = uploadFileToDrive(params[ft.param + "File"], fileName, params[ft.param + "MimeType"], DRIVE_FOLDER_ID);
                    if (url) {
                        fileUrls[ft.param + "Url"] = url;
                    }
                }
            });

            // Handle pre-uploaded URLs (from dialog)
            if (params.beforePhotoUrl) fileUrls.beforePhotoUrl = params.beforePhotoUrl;
            if (params.afterPhotoUrl) fileUrls.afterPhotoUrl = params.afterPhotoUrl;
            if (params.biltyUrl) fileUrls.biltyUrl = params.biltyUrl;

            // Find row by Order No in column B
            var orderNos = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues();
            var rowIndexOrderNo = -1;

            for (var i = 0; i < orderNos.length; i++) {
                if (orderNos[i][0] == orderNo) {
                    rowIndexOrderNo = i + 2;
                    break;
                }
            }

            if (rowIndexOrderNo === -1) {
                throw new Error("Order No. " + orderNo + " not found in column B");
            }

            // Update row data
            for (var j = 0; j < rowDataByOrderNo.length; j++) {
                if (rowDataByOrderNo[j] !== "" && rowDataByOrderNo[j] !== null && rowDataByOrderNo[j] !== undefined) {
                    try {
                        sheet.getRange(rowIndexOrderNo, j + 1).setValue(rowDataByOrderNo[j]);
                    } catch (cellError) {
                        console.error("Error updating cell:", cellError.toString());
                    }
                }
            }

            // Write file URLs to specific columns
            if (fileUrls.quotationUrl) sheet.getRange(rowIndexOrderNo, 10).setValue(fileUrls.quotationUrl);
            if (fileUrls.quotation2Url) sheet.getRange(rowIndexOrderNo, 16).setValue(fileUrls.quotation2Url);
            if (fileUrls.acceptanceUrl) sheet.getRange(rowIndexOrderNo, 17).setValue(fileUrls.acceptanceUrl);
            if (fileUrls.srnNumberAttachmentUrl) sheet.getRange(rowIndexOrderNo, 29).setValue(fileUrls.srnNumberAttachmentUrl);
            if (fileUrls.attachmentUrl) sheet.getRange(rowIndexOrderNo, 30).setValue(fileUrls.attachmentUrl);
            if (fileUrls.invoiceUrl) sheet.getRange(rowIndexOrderNo, 67).setValue(fileUrls.invoiceUrl);
            if (fileUrls.ewayBillUrl) sheet.getRange(rowIndexOrderNo, 68).setValue(fileUrls.ewayBillUrl);
            if (fileUrls.beforePhotoUrl) sheet.getRange(rowIndexOrderNo, 74).setValue(fileUrls.beforePhotoUrl);
            if (fileUrls.afterPhotoUrl) sheet.getRange(rowIndexOrderNo, 75).setValue(fileUrls.afterPhotoUrl);
            if (fileUrls.biltyUrl) sheet.getRange(rowIndexOrderNo, 76).setValue(fileUrls.biltyUrl);

            return ContentService.createTextOutput(
                JSON.stringify({
                    success: true,
                    message: "Order updated successfully",
                    rowIndex: rowIndexOrderNo,
                    orderNo: orderNo,
                    fileUrls: fileUrls,
                })
            ).setMimeType(ContentService.MimeType.JSON);
        }

        // ========================================
        // ACTION: Update by Order No in Column B
        // ========================================
        else if (action === "updateByOrderNoInColumnB") {
            var orderNoB = params.orderNo;
            var rowDataB = JSON.parse(params.rowData);
            var fileUrls = {};

            // Handle pre-uploaded URLs FIRST (priority)
            if (params.beforePhotoUrl) fileUrls.beforePhotoUrl = params.beforePhotoUrl;
            if (params.afterPhotoUrl) fileUrls.afterPhotoUrl = params.afterPhotoUrl;
            if (params.biltyUrl) fileUrls.biltyUrl = params.biltyUrl;

            // Handle base64 file uploads (fallback)
            var uploadTypes = [
                { param: "invoice", key: "invoiceUrl" },
                { param: "ewayBill", key: "ewayBillUrl1" },
                { param: "srnFile", key: "srnUrl", paramBase: "srn" },
                { param: "payment", key: "paymentUrl" },
                { param: "beforePhoto", key: "beforePhotoUrl" },
                { param: "afterPhoto", key: "afterPhotoUrl" },
                { param: "deliveryPhoto", key: "deliveryPhotoUrl" },
                { param: "bilty", key: "biltyUrl" },
                { param: "certificate", key: "certificateUrl" },
                { param: "inventoryPhoto", key: "inventoryPhotoUrl" }
            ];

            uploadTypes.forEach(function (ut) {
                var base = ut.paramBase || ut.param;
                if (!fileUrls[ut.key] && params[base + "File"] && params[base + "FileName"] && params[base + "MimeType"]) {
                    var fileName = base + "_" + orderNoB + "_" + new Date().getTime() + "_" + params[base + "FileName"];
                    var url = uploadFileToDrive(params[base + "File"], fileName, params[base + "MimeType"], DRIVE_FOLDER_ID);
                    if (url) {
                        fileUrls[ut.key] = url;
                    }
                }
            });

            // Find row by Order No in column B
            var orderNosB = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues();
            var rowIndexOrderNoB = -1;

            for (var i = 0; i < orderNosB.length; i++) {
                if (orderNosB[i][0] == orderNoB) {
                    rowIndexOrderNoB = i + 2;
                    break;
                }
            }

            if (rowIndexOrderNoB === -1) {
                throw new Error("Order No. " + orderNoB + " not found in column B");
            }

            // Update row data
            for (var k = 0; k < rowDataB.length; k++) {
                if (rowDataB[k] !== "" && rowDataB[k] !== null && rowDataB[k] !== undefined) {
                    sheet.getRange(rowIndexOrderNoB, k + 1).setValue(rowDataB[k]);
                }
            }

            // Write file URLs to specific columns
            if (fileUrls.invoiceUrl) sheet.getRange(rowIndexOrderNoB, 67).setValue(fileUrls.invoiceUrl);
            if (fileUrls.ewayBillUrl1) sheet.getRange(rowIndexOrderNoB, 68).setValue(fileUrls.ewayBillUrl1);
            if (fileUrls.ewayBillUrl) sheet.getRange(rowIndexOrderNoB, 27).setValue(fileUrls.ewayBillUrl);
            if (fileUrls.srnUrl) sheet.getRange(rowIndexOrderNoB, 29).setValue(fileUrls.srnUrl);
            if (fileUrls.paymentUrl) sheet.getRange(rowIndexOrderNoB, 30).setValue(fileUrls.paymentUrl);
            if (fileUrls.inventoryPhotoUrl) sheet.getRange(rowIndexOrderNoB, 67).setValue(fileUrls.inventoryPhotoUrl);
            if (fileUrls.deliveryPhotoUrl) sheet.getRange(rowIndexOrderNoB, 102).setValue(fileUrls.deliveryPhotoUrl);
            if (fileUrls.beforePhotoUrl) sheet.getRange(rowIndexOrderNoB, 74).setValue(fileUrls.beforePhotoUrl);
            if (fileUrls.afterPhotoUrl) sheet.getRange(rowIndexOrderNoB, 75).setValue(fileUrls.afterPhotoUrl);
            if (fileUrls.biltyUrl) sheet.getRange(rowIndexOrderNoB, 76).setValue(fileUrls.biltyUrl);

            // Handle calibration certificate
            var calType = params.calibrationType ? params.calibrationType.toString().toUpperCase() : "";
            if (fileUrls.certificateUrl) {
                if (calType === "LAB") {
                    sheet.getRange(rowIndexOrderNoB, 91).setValue(fileUrls.certificateUrl);
                } else if (calType === "TOTAL STATION") {
                    sheet.getRange(rowIndexOrderNoB, 92).setValue(fileUrls.certificateUrl);
                }
            }

            // Add calibration data
            if (calType === "LAB") {
                if (params.calibrationDate) sheet.getRange(rowIndexOrderNoB, 93).setValue(params.calibrationDate);
                if (params.calibrationPeriod) sheet.getRange(rowIndexOrderNoB, 95).setValue(params.calibrationPeriod);
            } else if (calType === "TOTAL STATION") {
                if (params.calibrationDate) sheet.getRange(rowIndexOrderNoB, 94).setValue(params.calibrationDate);
                if (params.calibrationPeriod) sheet.getRange(rowIndexOrderNoB, 96).setValue(params.calibrationPeriod);
            }

            return ContentService.createTextOutput(
                JSON.stringify({
                    success: true,
                    message: "Order updated successfully in column B search",
                    rowIndex: rowIndexOrderNoB,
                    orderNo: orderNoB,
                    fileUrls: fileUrls,
                })
            ).setMimeType(ContentService.MimeType.JSON);
        }

        // ========================================
        // ACTION: Update by D-Sr Number (MAIN WAREHOUSE ACTION)
        // ========================================
        else if (action === "updateByDSrNumber") {
            var dSrNumber = params.dSrNumber;
            var rowDataDSr = JSON.parse(params.rowData);

            console.log("Searching for D-Sr Number:", dSrNumber);

            var fileUrls = {};

            // ★★★ HANDLE PRE-UPLOADED URLs FROM DIALOG (PRIORITY) ★★★
            if (params.beforePhotoUrl) {
                fileUrls.beforePhotoUrl = params.beforePhotoUrl;
                // Also update rowData
                if (rowDataDSr.length > 73) rowDataDSr[73] = params.beforePhotoUrl;
            }
            if (params.afterPhotoUrl) {
                fileUrls.afterPhotoUrl = params.afterPhotoUrl;
                if (rowDataDSr.length > 74) rowDataDSr[74] = params.afterPhotoUrl;
            }
            if (params.biltyUrl) {
                fileUrls.biltyUrl = params.biltyUrl;
                if (rowDataDSr.length > 75) rowDataDSr[75] = params.biltyUrl;
            }

            // Handle base64 file uploads (fallback if URLs not provided)
            if (!fileUrls.invoiceUrl && params.invoiceFile && params.invoiceFileName && params.invoiceMimeType) {
                var invoiceFileName = "invoice_" + dSrNumber + "_" + new Date().getTime() + "_" + params.invoiceFileName;
                fileUrls.invoiceUrl = uploadFileToDrive(params.invoiceFile, invoiceFileName, params.invoiceMimeType, DRIVE_FOLDER_ID);
            }

            if (!fileUrls.ewayBillUrl1 && params.ewayBillFile && params.ewayBillFileName && params.ewayBillMimeType) {
                var ewayFileName = "eway_bill_" + dSrNumber + "_" + new Date().getTime() + "_" + params.ewayBillFileName;
                fileUrls.ewayBillUrl1 = uploadFileToDrive(params.ewayBillFile, ewayFileName, params.ewayBillMimeType, DRIVE_FOLDER_ID);
            }

            // Handle multiple before photos (base64 - fallback)
            if (!fileUrls.beforePhotoUrl) {
                var beforeUrls = uploadMultipleFiles(params, "beforePhoto", dSrNumber);
                if (beforeUrls.length > 0) {
                    fileUrls.beforePhotoUrl = beforeUrls.join(", ");
                }
            }

            // Handle multiple after photos (base64 - fallback)
            if (!fileUrls.afterPhotoUrl) {
                var afterUrls = uploadMultipleFiles(params, "afterPhoto", dSrNumber);
                if (afterUrls.length > 0) {
                    fileUrls.afterPhotoUrl = afterUrls.join(", ");
                }
            }

            // Handle multiple bilty files (base64 - fallback)
            if (!fileUrls.biltyUrl) {
                var biltyUrls = uploadMultipleFiles(params, "bilty", dSrNumber);
                if (biltyUrls.length > 0) {
                    fileUrls.biltyUrl = biltyUrls.join(", ");
                }
            }

            // Handle certificate upload
            if (params.certificateFile && params.certificateFileName && params.certificateMimeType) {
                var certificateFileName = "calibration_cert_" + dSrNumber + "_" + new Date().getTime() + "_" + params.certificateFileName;
                fileUrls.certificateUrl = uploadFileToDrive(params.certificateFile, certificateFileName, params.certificateMimeType, DRIVE_FOLDER_ID);
            }

            // Find row by D-Sr Number in column DB (column 106)
            var dSrNumbers = sheet.getRange(2, 106, sheet.getLastRow() - 1, 1).getValues();
            var rowIndexDSr = -1;

            for (var i = 0; i < dSrNumbers.length; i++) {
                if (dSrNumbers[i][0] && dSrNumbers[i][0].toString().trim() == dSrNumber.toString().trim()) {
                    rowIndexDSr = i + 2;
                    break;
                }
            }

            console.log("Found row index:", rowIndexDSr);

            if (rowIndexDSr === -1) {
                throw new Error("D-Sr Number " + dSrNumber + " not found in column DB");
            }

            // Update each cell in the row
            for (var k = 0; k < rowDataDSr.length; k++) {
                if (rowDataDSr[k] !== "" && rowDataDSr[k] !== null && rowDataDSr[k] !== undefined) {
                    try {
                        sheet.getRange(rowIndexDSr, k + 1).setValue(rowDataDSr[k]);
                    } catch (cellError) {
                        console.error("Error updating cell at column " + (k + 1) + ":", cellError.toString());
                    }
                }
            }

            // Write file URLs to specific columns
            if (fileUrls.invoiceUrl) {
                sheet.getRange(rowIndexDSr, 67).setValue(fileUrls.invoiceUrl);
                console.log("Added invoice URL to column BP");
            }
            if (fileUrls.ewayBillUrl1) {
                sheet.getRange(rowIndexDSr, 68).setValue(fileUrls.ewayBillUrl1);
                console.log("Added eway bill URL to column BQ");
            }
            if (fileUrls.beforePhotoUrl) {
                sheet.getRange(rowIndexDSr, 74).setValue(fileUrls.beforePhotoUrl);
                console.log("Added before photo URL(s) to column BV");
            }
            if (fileUrls.afterPhotoUrl) {
                sheet.getRange(rowIndexDSr, 75).setValue(fileUrls.afterPhotoUrl);
                console.log("Added after photo URL(s) to column BW");
            }
            if (fileUrls.biltyUrl) {
                sheet.getRange(rowIndexDSr, 76).setValue(fileUrls.biltyUrl);
                console.log("Added bilty URL(s) to column BX");
            }

            // Handle calibration certificate
            var calType = params.calibrationType ? params.calibrationType.toString().toUpperCase() : "";
            if (fileUrls.certificateUrl) {
                if (calType === "LAB") {
                    sheet.getRange(rowIndexDSr, 91).setValue(fileUrls.certificateUrl);
                    console.log("Added LAB certificate URL to column CN");
                } else if (calType === "TOTAL STATION") {
                    sheet.getRange(rowIndexDSr, 92).setValue(fileUrls.certificateUrl);
                    console.log("Added TOTAL STATION certificate URL to column CO");
                }
            }

            // Add calibration data
            if (calType === "LAB") {
                if (params.calibrationDate) sheet.getRange(rowIndexDSr, 93).setValue(params.calibrationDate);
                if (params.calibrationPeriod) sheet.getRange(rowIndexDSr, 95).setValue(params.calibrationPeriod);
            } else if (calType === "TOTAL STATION") {
                if (params.calibrationDate) sheet.getRange(rowIndexDSr, 94).setValue(params.calibrationDate);
                if (params.calibrationPeriod) sheet.getRange(rowIndexDSr, 96).setValue(params.calibrationPeriod);
            }

            console.log("Update completed successfully");

            return ContentService.createTextOutput(
                JSON.stringify({
                    success: true,
                    message: "Order updated successfully by D-Sr Number",
                    rowIndex: rowIndexDSr,
                    dSrNumber: dSrNumber,
                    fileUrls: fileUrls,
                })
            ).setMimeType(ContentService.MimeType.JSON);
        }

        // ========================================
        // ACTION: Delete Row
        // ========================================
        else if (action === "delete") {
            var rowIndexDelete = parseInt(params.rowIndex);

            if (isNaN(rowIndexDelete) || rowIndexDelete < 2) {
                throw new Error("Invalid row index for delete");
            }

            sheet.deleteRow(rowIndexDelete);

            return ContentService.createTextOutput(JSON.stringify({
                success: true,
                message: "Row deleted successfully"
            })).setMimeType(ContentService.MimeType.JSON);
        }

        // ========================================
        // ACTION: Mark Row as Deleted
        // ========================================
        else if (action === "markDeleted") {
            var rowIndexMarkDeleted = parseInt(params.rowIndex);
            var columnIndexMarkDeleted = parseInt(params.columnIndex);
            var valueMarkDeleted = params.value || "Yes";

            if (isNaN(rowIndexMarkDeleted) || rowIndexMarkDeleted < 2) {
                throw new Error("Invalid row index for marking as deleted");
            }
            if (isNaN(columnIndexMarkDeleted) || columnIndexMarkDeleted < 1) {
                throw new Error("Invalid column index for marking as deleted");
            }

            sheet.getRange(rowIndexMarkDeleted, columnIndexMarkDeleted).setValue(valueMarkDeleted);

            return ContentService.createTextOutput(
                JSON.stringify({
                    success: true,
                    message: "Row marked as deleted successfully",
                })
            ).setMimeType(ContentService.MimeType.JSON);
        }

        // ========================================
        // ACTION: Insert Warehouse with Dynamic Columns
        // ========================================
        else if (action === "insertWarehouseWithDynamicColumns") {
            var orderNo = params.orderNo;
            var rowDataWarehouse = JSON.parse(params.rowData);
            var totalItems = parseInt(params.totalItems) || 0;

            var warehouseSheet = ss.getSheetByName("Warehouse");

            if (!warehouseSheet) {
                throw new Error("Warehouse sheet not found");
            }

            // Get current headers
            var lastCol = warehouseSheet.getLastColumn() || 1;
            var currentHeaders = warehouseSheet.getRange(1, 1, 1, lastCol).getValues()[0];
            var currentColumnCount = currentHeaders.length;

            // Fixed columns before items: 11
            var fixedColumnsBeforeItems = 11;
            var requiredItemColumns = totalItems * 2;
            var totalRequiredColumns = fixedColumnsBeforeItems + requiredItemColumns;

            // Add columns if needed
            if (totalRequiredColumns > currentColumnCount) {
                var columnsToAdd = totalRequiredColumns - currentColumnCount;
                warehouseSheet.insertColumnsAfter(currentColumnCount, columnsToAdd);

                var currentItemCount = Math.floor((currentColumnCount - fixedColumnsBeforeItems) / 2);

                for (var i = currentItemCount + 1; i <= totalItems; i++) {
                    var itemNameCol = fixedColumnsBeforeItems + ((i - 1) * 2) + 1;
                    var itemQtyCol = itemNameCol + 1;
                    warehouseSheet.getRange(1, itemNameCol).setValue("Item Name " + i);
                    warehouseSheet.getRange(1, itemQtyCol).setValue("Quantity " + i);
                }
            }

            // Handle file uploads
            var fileUrls = {};

            // Check for pre-uploaded URLs first
            if (params.beforePhotoUrl) fileUrls.beforePhotoUrl = params.beforePhotoUrl;
            if (params.afterPhotoUrl) fileUrls.afterPhotoUrl = params.afterPhotoUrl;
            if (params.biltyUrl) fileUrls.biltyUrl = params.biltyUrl;

            // Fallback to base64 uploads
            if (!fileUrls.beforePhotoUrl) {
                var beforeUrls = uploadMultipleFiles(params, "beforePhoto", orderNo);
                if (beforeUrls.length > 0) fileUrls.beforePhotoUrl = beforeUrls.join(", ");
            }
            if (!fileUrls.afterPhotoUrl) {
                var afterUrls = uploadMultipleFiles(params, "afterPhoto", orderNo);
                if (afterUrls.length > 0) fileUrls.afterPhotoUrl = afterUrls.join(", ");
            }
            if (!fileUrls.biltyUrl) {
                var biltyUrls = uploadMultipleFiles(params, "bilty", orderNo);
                if (biltyUrls.length > 0) fileUrls.biltyUrl = biltyUrls.join(", ");
            }

            // Build final row data with file URLs
            var finalRowData = rowDataWarehouse.slice();
            finalRowData[3] = fileUrls.beforePhotoUrl || finalRowData[3] || "";
            finalRowData[4] = fileUrls.afterPhotoUrl || finalRowData[4] || "";
            finalRowData[5] = fileUrls.biltyUrl || finalRowData[5] || "";

            warehouseSheet.appendRow(finalRowData);

            return ContentService.createTextOutput(
                JSON.stringify({
                    success: true,
                    message: "Warehouse data inserted with dynamic columns",
                    fileUrls: fileUrls,
                    columnsAdded: totalRequiredColumns > currentColumnCount,
                    totalItems: totalItems
                })
            ).setMimeType(ContentService.MimeType.JSON);
        }

        // ========================================
        // ACTION: Insert PR-SR-DN Data
        // ========================================
        else if (action === "insertPRSRDN") {
            var rowDataPRSRDN = JSON.parse(params.rowData);
            var targetSheetName = params.sheetName || "PR-SR-DN-Data";

            var targetSheet = ss.getSheetByName(targetSheetName);

            if (!targetSheet) {
                targetSheet = ss.getSheetByName("PR-SR-DN-Data");
                if (!targetSheet) {
                    throw new Error("Neither '" + targetSheetName + "' nor 'PR-SR-DN-Data' sheet found");
                }
            }

            targetSheet.appendRow(rowDataPRSRDN);

            return ContentService.createTextOutput(
                JSON.stringify({
                    success: true,
                    message: "Data submitted successfully to " + targetSheet.getName(),
                    sheetUsed: targetSheet.getName()
                })
            ).setMimeType(ContentService.MimeType.JSON);
        }

        // ========================================
        // Unknown Action
        // ========================================
        else {
            throw new Error("Unknown action: " + action);
        }

    } catch (error) {
        console.error("Error in doPost:", error);
        return ContentService.createTextOutput(
            JSON.stringify({
                success: false,
                error: error.toString(),
            })
        ).setMimeType(ContentService.MimeType.JSON);
    }
}

// ============================================
// UPDATE TEN DAYS ORDERS
// ============================================
function updateTenDaysOrders(ordersData, sheetName) {
    try {
        var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        var sheet = ss.getSheetByName(sheetName || "ORDER-DISPATCH");

        var lastRow = sheet.getLastRow();
        if (lastRow < 5) {
            return {
                success: false,
                error: "No data found in sheet"
            };
        }

        var orderNumbers = sheet.getRange(5, 2, lastRow - 4, 1).getValues();
        var headers = sheet.getRange(4, 1, 1, sheet.getLastColumn()).getValues()[0];

        // Find column indices
        var cgIndex = 85; // Column CG - revised order status
        var chIndex = 86; // Column CH - revised order remarks
        var cjIndex = 88; // Column CJ - date

        for (var i = 0; i < headers.length; i++) {
            var header = headers[i] ? headers[i].toString().toLowerCase() : "";
            if (header.includes("revised order status")) cgIndex = i + 1;
            if (header.includes("revised order remarks")) chIndex = i + 1;
            if (header.includes("date") || i === 87) cjIndex = i + 1;
        }

        var updatedCount = 0;
        var errors = [];

        for (var j = 0; j < ordersData.length; j++) {
            var orderInfo = ordersData[j];
            var orderId = orderInfo.orderNo;
            var status = orderInfo.status || "done";
            var remark = orderInfo.remark || "";
            var date = orderInfo.date || "";

            var found = false;

            for (var k = 0; k < orderNumbers.length; k++) {
                if (orderNumbers[k][0] && orderNumbers[k][0].toString().trim() === orderId.toString().trim()) {
                    var rowIndex = k + 5;

                    try {
                        sheet.getRange(rowIndex, cgIndex).setValue(status);
                        sheet.getRange(rowIndex, chIndex).setValue(remark);

                        if (date && status === "pending") {
                            sheet.getRange(rowIndex, cjIndex).setValue(date);
                        } else if (status === "done") {
                            sheet.getRange(rowIndex, cjIndex).setValue("");
                        }

                        updatedCount++;
                        found = true;
                        break;
                    } catch (updateError) {
                        errors.push("Error updating order " + orderId + ": " + updateError.toString());
                    }
                }
            }

            if (!found) {
                errors.push("Order " + orderId + " not found in sheet");
            }
        }

        return {
            success: true,
            message: "Updated " + updatedCount + " order(s) successfully",
            updatedCount: updatedCount,
            errors: errors.length > 0 ? errors : null
        };

    } catch (error) {
        console.error("Error in updateTenDaysOrders:", error);
        return {
            success: false,
            error: error.toString()
        };
    }
}













// function doGet(e) {
//   try {
//     var params = e.parameter;

//     if (params.sheet && params.action === 'fetch') {
//       return fetchSheetData(params.sheet);
//     } else if (params.sheet) {
//       return fetchSheetData(params.sheet);
//     }

//     // Return JSON response even for default case
//     return ContentService.createTextOutput(JSON.stringify({
//       status: "ready",
//       message: "Google Apps Script is running"
//     })).setMimeType(ContentService.MimeType.JSON);
//   } catch (error) {
//     console.error("Error in doGet:", error);
//     return ContentService.createTextOutput(JSON.stringify({
//       success: false,
//       error: error.toString()
//     })).setMimeType(ContentService.MimeType.JSON);
//   }
// }

// function fetchSheetData(sheetName) {
//   try {
//     var ss = SpreadsheetApp.openById("1yEsh4yzyvglPXHxo-5PT70VpwVJbxV7wwH8rpU1RFJA");
//     var sheet = ss.getSheetByName(sheetName);

//     // Get all data as a 2D array
//     var data = sheet.getDataRange().getValues();

//     // Return data with proper headers
//     return ContentService.createTextOutput(JSON.stringify({
//       success: true,
//       data: data
//     })).setMimeType(ContentService.MimeType.JSON);
//   } catch (error) {
//     console.error("Error fetching sheet data:", error);
//     return ContentService.createTextOutput(JSON.stringify({
//       success: false,
//       error: error.toString()
//     })).setMimeType(ContentService.MimeType.JSON);
//   }
// }


// // Set CORS headers for all responses
// function setCorsHeaders(response) {
//   response.setHeader("Access-Control-Allow-Origin", "*")
//   response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
//   response.setHeader("Access-Control-Allow-Headers", "Content-Type")
//   return response
// }

// // Handle OPTIONS requests for CORS preflight
// function doOptions(e) {
//   var response = ContentService.createTextOutput("")
//   return setCorsHeaders(response)
// }

// // Function to upload a file to Google Drive using base64
// function uploadFileToDrive(base64Data, fileName, mimeType, folderId) {
//   try {
//     // Remove the data URL prefix if it exists
//     let fileData = base64Data
//     if (base64Data.indexOf("base64,") !== -1) {
//       fileData = base64Data.split("base64,")[1]
//     }

//     // Decode the base64 data
//     const decoded = Utilities.base64Decode(fileData)

//     // Create a blob from the decoded data
//     const blob = Utilities.newBlob(decoded, mimeType, fileName)

//     // Get the folder reference
//     const folder = DriveApp.getFolderById(folderId)

//     // Upload the file to the folder
//     const file = folder.createFile(blob)

//     // Make the file accessible via link
//     file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)

//     // Return the direct link to view the file
//     return "https://drive.google.com/uc?export=view&id=" + file.getId()
//   } catch (error) {
//     console.error("Error uploading file: " + error.toString())
//     return null
//   }
// }

// // Function to submit data - this handles both form-encoded and JSON data
// function doPost(e) {
//   try {
//     var params = e.parameter
//     var sheetName = params.sheetName
//     var action = params.action || "insert" // Default to insert if action not specified

//     // Google Drive folder ID for uploads
//     var DRIVE_FOLDER_ID = "1ZGfbiQHFnVdMyoLv5s8y3gVTIlnQzW2e"

//     // Handle file upload action
//     if (action === "uploadFile") {
//       var base64Data = params.base64Data
//       var fileName = params.fileName
//       var mimeType = params.mimeType
//       var folderId = params.folderId || DRIVE_FOLDER_ID

//       if (!base64Data || !fileName || !mimeType) {
//         throw new Error("Missing required parameters for file upload")
//       }

//       var fileUrl = uploadFileToDrive(base64Data, fileName, mimeType, folderId)

//       return ContentService.createTextOutput(
//         JSON.stringify({
//           success: true,
//           fileUrl: fileUrl,
//         }),
//       )
//     }

//     var ss = SpreadsheetApp.getActiveSpreadsheet()
//     var sheet = ss.getSheetByName(sheetName)

//     if (action === "updateTenDaysOrders") {
//       var ordersData = JSON.parse(params.ordersData || "[]");
//       var sheetName = params.sheetName || "ORDER-DISPATCH";

//       var result = updateTenDaysOrders(ordersData, sheetName);
//       return ContentService.createTextOutput(JSON.stringify(result))
//         .setMimeType(ContentService.MimeType.JSON);
//     }

//     if (action === "insert") {
//       // Handle file uploads for DISP form (DISPATCH-DELIVERY sheet)
//       var fileUrls = {}
//       var orderNo = params.orderNo || "UNKNOWN"

//       // Upload Eway Bill file if provided
//       if (params.ewayBillFile && params.ewayBillFileName && params.ewayBillMimeType) {
//         var ewayFileName = "eway_bill_" + orderNo + "_" + new Date().getTime() + "_" + params.ewayBillFileName
//         var ewayUrl = uploadFileToDrive(params.ewayBillFile, ewayFileName, params.ewayBillMimeType, DRIVE_FOLDER_ID)
//         if (ewayUrl) {
//           fileUrls.ewayBillUrl = ewayUrl
//         }
//       }

//       // Upload SRN file if provided
//       if (params.srnFile && params.srnFileName && params.srnMimeType) {
//         var srnFileName = "srn_" + orderNo + "_" + new Date().getTime() + "_" + params.srnFileName
//         var srnUrl = uploadFileToDrive(params.srnFile, srnFileName, params.srnMimeType, DRIVE_FOLDER_ID)
//         if (srnUrl) {
//           fileUrls.srnUrl = srnUrl
//         }
//       }

//       // Upload Payment file if provided
//       if (params.paymentFile && params.paymentFileName && params.paymentMimeType) {
//         var paymentFileName = "payment_" + orderNo + "_" + new Date().getTime() + "_" + params.paymentFileName
//         var paymentUrl = uploadFileToDrive(params.paymentFile, paymentFileName, params.paymentMimeType, DRIVE_FOLDER_ID)
//         if (paymentUrl) {
//           fileUrls.paymentUrl = paymentUrl
//         }
//       }

//       // Add a new row at the end of the sheet
//       var rowDataInsert = JSON.parse(params.rowData)

//       // Add file URLs to the appropriate columns in the row data
//       // For DISPATCH-DELIVERY sheet columns:
//       // Column AA (index 26) - Eway Bill Attachment
//       // Column AC (index 28) - SRN Number Attachment  
//       // Column AD (index 29) - Payment Attachment
//       if (fileUrls.ewayBillUrl) {
//         rowDataInsert[26] = fileUrls.ewayBillUrl // Column AA
//       }
//       if (fileUrls.srnUrl) {
//         rowDataInsert[28] = fileUrls.srnUrl // Column AC
//       }
//       if (fileUrls.paymentUrl) {
//         rowDataInsert[29] = fileUrls.paymentUrl // Column AD
//       }

//       sheet.appendRow(rowDataInsert)

//       return ContentService.createTextOutput(
//         JSON.stringify({
//           success: true,
//           fileUrls: fileUrls,
//           message: "DISP form submitted successfully with attachments"
//         })
//       )
//     } else if (action === "update") {
//       // Update an existing row
//       var rowIndexUpdate = Number.parseInt(params.rowIndex)
//       var rowDataUpdate = JSON.parse(params.rowData)

//       // Verify rowIndex is valid
//       if (isNaN(rowIndexUpdate) || rowIndexUpdate < 2) {
//         throw new Error("Invalid row index for update")
//       }

//       // Update each cell in the row
//       for (var i = 0; i < rowDataUpdate.length; i++) {
//         // Skip empty cells to preserve original data if not changed
//         if (rowDataUpdate[i] !== "") {
//           sheet.getRange(rowIndexUpdate, i + 1).setValue(rowDataUpdate[i])
//         }
//       }

//       return ContentService.createTextOutput(JSON.stringify({ success: true }))
//     } else if (action === "updateByOrderNo") {
//       // Find row by matching Order No. in column B (index 1)
//       var orderNo = params.orderNo
//       var rowDataByOrderNo = JSON.parse(params.rowData)

//       // Handle file uploads if present
//       var fileUrls = {}

//       // Upload Invoice file if provided
//       if (params.invoiceFile && params.invoiceFileName && params.invoiceMimeType) {
//         var invoiceFileName = "invoice_" + orderNo + "_" + new Date().getTime() + "_" + params.invoiceFileName
//         var invoiceUrl = uploadFileToDrive(params.invoiceFile, invoiceFileName, params.invoiceMimeType, DRIVE_FOLDER_ID)
//         if (invoiceUrl) {
//           fileUrls.invoiceUrl = invoiceUrl
//         }
//       }

//       // Upload Eway Bill file if provided
//       if (params.ewayBillFile && params.ewayBillFileName && params.ewayBillMimeType) {
//         var ewayFileName = "eway_bill_" + orderNo + "_" + new Date().getTime() + "_" + params.ewayBillFileName
//         var ewayUrl = uploadFileToDrive(params.ewayBillFile, ewayFileName, params.ewayBillMimeType, DRIVE_FOLDER_ID)
//         if (ewayUrl) {
//           fileUrls.ewayBillUrl = ewayUrl
//         }
//       }

//       // Upload Warehouse Before Photo if provided
//       if (params.beforePhotoFile && params.beforePhotoFileName && params.beforePhotoMimeType) {
//         var beforePhotoFileName = "warehouse_before_" + orderNo + "_" + new Date().getTime() + "_" + params.beforePhotoFileName
//         var beforePhotoUrl = uploadFileToDrive(
//           params.beforePhotoFile,
//           beforePhotoFileName,
//           params.beforePhotoMimeType,
//           DRIVE_FOLDER_ID,
//         )
//         if (beforePhotoUrl) {
//           fileUrls.beforePhotoUrl = beforePhotoUrl
//         }
//       }

//       // Upload Warehouse After Photo if provided
//       if (params.afterPhotoFile && params.afterPhotoFileName && params.afterPhotoMimeType) {
//         var afterPhotoFileName = "warehouse_after_" + orderNo + "_" + new Date().getTime() + "_" + params.afterPhotoFileName
//         var afterPhotoUrl = uploadFileToDrive(
//           params.afterPhotoFile,
//           afterPhotoFileName,
//           params.afterPhotoMimeType,
//           DRIVE_FOLDER_ID,
//         )
//         if (afterPhotoUrl) {
//           fileUrls.afterPhotoUrl = afterPhotoUrl
//         }
//       }

//       // Upload Warehouse Bilty file if provided
//       if (params.biltyFile && params.biltyFileName && params.biltyMimeType) {
//         var biltyFileName = "warehouse_bilty_" + orderNo + "_" + new Date().getTime() + "_" + params.biltyFileName
//         var biltyUrl = uploadFileToDrive(params.biltyFile, biltyFileName, params.biltyMimeType, DRIVE_FOLDER_ID)
//         if (biltyUrl) {
//           fileUrls.biltyUrl = biltyUrl
//         }
//       }


//       if (params.quotationFile && params.quotationFileName && params.quotationMimeType) {
//         var quotationFileName = "warehouse_bilty_" + orderNo + "_" + new Date().getTime() + "_" + params.quotationFileName
//         var quotationURL = uploadFileToDrive(params.quotationFile, quotationFileName, params.quotationMimeType, DRIVE_FOLDER_ID)
//         if (quotationURL) {
//           fileUrls.quotationURL = quotationURL
//         }
//       }

//       if (params.quotationFile2 && params.quotationFileName2 && params.quotationMimeType2) {
//         var quotationFileName2 = "warehouse_bilty_" + orderNo + "_" + new Date().getTime() + "_" + params.quotationFileName2
//         var quotationURL2 = uploadFileToDrive(params.quotationFile2, quotationFileName2, params.quotationMimeType2, DRIVE_FOLDER_ID)
//         if (quotationURL2) {
//           fileUrls.quotationURL2 = quotationURL2
//         }
//       }

//       if (params.acceptanceFile && params.acceptanceFileName && params.acceptanceMimeType) {
//         var acceptanceFileName = "warehouse_bilty_" + orderNo + "_" + new Date().getTime() + "_" + params.acceptanceFileName
//         var acceptanceURL = uploadFileToDrive(params.acceptanceFile, acceptanceFileName, params.acceptanceMimeType, DRIVE_FOLDER_ID)
//         if (acceptanceURL) {
//           fileUrls.acceptanceURL = acceptanceURL
//         }
//       }

//       if (params.srnNumberAttachmentFile && params.srnNumberAttachmentFileName && params.srnNumberAttachmentMimeType) {
//         var srnNumberAttachmentFileName = "warehouse_bilty_" + orderNo + "_" + new Date().getTime() + "_" + params.srnNumberAttachmentFileName
//         var srnNumberAttachmentURL = uploadFileToDrive(params.srnNumberAttachmentFile, srnNumberAttachmentFileName, params.srnNumberAttachmentMimeType, DRIVE_FOLDER_ID)
//         if (srnNumberAttachmentURL) {
//           fileUrls.srnNumberAttachmentURL = srnNumberAttachmentURL
//         }
//       }

//       if (params.attachmentFile && params.attachmentFileName && params.attachmentMimeType) {
//         var attachmentFileName = "warehouse_bilty_" + orderNo + "_" + new Date().getTime() + "_" + params.attachmentFileName
//         var attachmentURL = uploadFileToDrive(params.attachmentFile, attachmentFileName, params.attachmentMimeType, DRIVE_FOLDER_ID)
//         if (attachmentURL) {
//           fileUrls.attachmentURL = attachmentURL
//         }
//       }


//       // Get all values in column B (Order No.)
//       var orderNos = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues()

//       // Find the row index that matches the orderNo
//       var rowIndexOrderNo = -1
//       for (let i = 0; i < orderNos.length; i++) {
//         if (orderNos[i][0] == orderNo) {
//           rowIndexOrderNo = i + 2 // +2 because array starts at 0 and sheet starts at row 2
//           break
//         }
//       }

//       if (rowIndexOrderNo === -1) {
//         throw new Error("Order No. " + orderNo + " not found in column B")
//       }

//       // Update each cell in the row, preserving existing data for empty values
//       for (var j = 0; j < rowDataByOrderNo.length; j++) {
//         if (rowDataByOrderNo[j] !== "" && rowDataByOrderNo[j] !== null && rowDataByOrderNo[j] !== undefined) {
//           try {
//             sheet.getRange(rowIndexOrderNo, j + 1).setValue(rowDataByOrderNo[j])
//           } catch (cellError) {
//             console.error("Error updating cell:", cellError.toString())
//           }
//         }
//       }

//       // Add file URLs to specific columns if files were uploaded
//       // Column mappings:
//       // - beforePhoto: Column CE (index 74 in 1-based, but we need to check your sheet)
//       // - afterPhoto: Column CF (index 75)
//       // - biltyUpload: Column CG (index 76)
//       // - invoiceUpload: Column BP (index 67)
//       // - ewayBillUpload: Column BQ (index 68)

//       // Based on your image and code, these are likely the correct columns:
//       if (fileUrls.quotationURL) {
//         sheet.getRange(rowIndexOrderNo, 10).setValue(fileUrls.quotationURL); // Column J
//       }
//       if (fileUrls.quotationURL2) {
//         sheet.getRange(rowIndexOrderNo, 16).setValue(fileUrls.quotationURL2); // Column P
//       }
//       if (fileUrls.acceptanceURL) {
//         sheet.getRange(rowIndexOrderNo, 17).setValue(fileUrls.acceptanceURL); // Column Q
//       }
//       if (fileUrls.srnNumberAttachmentURL) {
//         sheet.getRange(rowIndexOrderNo, 29).setValue(fileUrls.srnNumberAttachmentURL); // Column AC
//       }
//       if (fileUrls.attachmentURL) {
//         sheet.getRange(rowIndexOrderNo, 30).setValue(fileUrls.attachmentURL); // Column AD
//       }

//       if (fileUrls.beforePhotoUrl) {
//         sheet.getRange(rowIndexOrderNo, 74).setValue(fileUrls.beforePhotoUrl) // Column CE
//       }
//       if (fileUrls.afterPhotoUrl) {
//         sheet.getRange(rowIndexOrderNo, 75).setValue(fileUrls.afterPhotoUrl) // Column CF
//       }
//       if (fileUrls.biltyUrl) {
//         sheet.getRange(rowIndexOrderNo, 76).setValue(fileUrls.biltyUrl) // Column CG
//       }
//       if (fileUrls.invoiceUrl) {
//         sheet.getRange(rowIndexOrderNo, 67).setValue(fileUrls.invoiceUrl) // Column BP
//       }
//       if (fileUrls.ewayBillUrl) {
//         sheet.getRange(rowIndexOrderNo, 68).setValue(fileUrls.ewayBillUrl) // Column BQ
//       }

//       return ContentService.createTextOutput(
//         JSON.stringify({
//           success: true,
//           message: "Order updated successfully",
//           rowIndex: rowIndexOrderNo,
//           orderNo: orderNo,
//           fileUrls: fileUrls,
//         }),
//       )
//     } else if (action === "updateByOrderNoInColumnB") {
//       var orderNoB = params.orderNo
//       var rowDataB = JSON.parse(params.rowData)

//       // Handle file uploads if present
//       var fileUrls = {}

//       // Upload Invoice file if provided
//       if (params.invoiceFile && params.invoiceFileName && params.invoiceMimeType) {
//         var invoiceFileName = "invoice_" + orderNoB + "_" + new Date().getTime() + "_" + params.invoiceFileName
//         var invoiceUrl = uploadFileToDrive(params.invoiceFile, invoiceFileName, params.invoiceMimeType, DRIVE_FOLDER_ID)
//         if (invoiceUrl) {
//           fileUrls.invoiceUrl = invoiceUrl
//         }
//       }

//       // Upload Eway Bill file if provided
//       if (params.ewayBillFile && params.ewayBillFileName && params.ewayBillMimeType) {
//         var ewayFileName = "eway_bill_" + orderNoB + "_" + new Date().getTime() + "_" + params.ewayBillFileName
//         var ewayUrl = uploadFileToDrive(params.ewayBillFile, ewayFileName, params.ewayBillMimeType, DRIVE_FOLDER_ID)
//         if (ewayUrl) {
//           fileUrls.ewayBillUrl1 = ewayUrl
//         }
//       }

//       // Upload SRN file if provided
//       if (params.srnFile && params.srnFileName && params.srnMimeType) {
//         var srnFileName = "srn_" + orderNoB + "_" + new Date().getTime() + "_" + params.srnFileName
//         var srnUrl = uploadFileToDrive(params.srnFile, srnFileName, params.srnMimeType, DRIVE_FOLDER_ID)
//         if (srnUrl) {
//           fileUrls.srnUrl = srnUrl
//         }
//       }

//       // Upload Payment file if provided
//       if (params.paymentFile && params.paymentFileName && params.paymentMimeType) {
//         var paymentFileName = "payment_" + orderNoB + "_" + new Date().getTime() + "_" + params.paymentFileName
//         var paymentUrl = uploadFileToDrive(params.paymentFile, paymentFileName, params.paymentMimeType, DRIVE_FOLDER_ID)
//         if (paymentUrl) {
//           fileUrls.paymentUrl = paymentUrl
//         }
//       }

//       // NEW: Upload Warehouse Before Photo if provided
//       if (params.beforePhotoFile && params.beforePhotoFileName && params.beforePhotoMimeType) {
//         var beforePhotoFileName =
//           "warehouse_before_" + orderNoB + "_" + new Date().getTime() + "_" + params.beforePhotoFileName
//         var beforePhotoUrl = uploadFileToDrive(
//           params.beforePhotoFile,
//           beforePhotoFileName,
//           params.beforePhotoMimeType,
//           DRIVE_FOLDER_ID,
//         )
//         if (beforePhotoUrl) {
//           fileUrls.beforePhotoUrl = beforePhotoUrl
//         }
//       }

//       // NEW: Upload Warehouse After Photo if provided
//       if (params.afterPhotoFile && params.afterPhotoFileName && params.afterPhotoMimeType) {
//         var afterPhotoFileName =
//           "warehouse_after_" + orderNoB + "_" + new Date().getTime() + "_" + params.afterPhotoFileName
//         var afterPhotoUrl = uploadFileToDrive(
//           params.afterPhotoFile,
//           afterPhotoFileName,
//           params.afterPhotoMimeType,
//           DRIVE_FOLDER_ID,
//         )
//         if (afterPhotoUrl) {
//           fileUrls.afterPhotoUrl = afterPhotoUrl
//         }
//       }

//       // delivery image upload code
//       if (params.deliveryPhotoFile && params.deliveryPhotoFileName && params.deliveryPhotoMimeType) {
//         var deliveryPhotoFileName =
//           "delivery_proof_" + orderNoB + "_" + new Date().getTime() + "_" + params.deliveryPhotoFileName
//         var deliveryPhotoUrl = uploadFileToDrive(
//           params.deliveryPhotoFile,
//           deliveryPhotoFileName,
//           params.deliveryPhotoMimeType,
//           DRIVE_FOLDER_ID,
//         )
//         if (deliveryPhotoUrl) {
//           fileUrls.deliveryPhotoUrl = deliveryPhotoUrl
//         }
//       }

//       // NEW: Upload Warehouse Bilty file if provided
//       if (params.biltyFile && params.biltyFileName && params.biltyMimeType) {
//         var biltyFileName = "warehouse_bilty_" + orderNoB + "_" + new Date().getTime() + "_" + params.biltyFileName
//         var biltyUrl = uploadFileToDrive(params.biltyFile, biltyFileName, params.biltyMimeType, DRIVE_FOLDER_ID)
//         if (biltyUrl) {
//           fileUrls.biltyUrl = biltyUrl
//         }
//       }

//       // NEW: Upload Calibration Certificate if provided
//       if (params.certificateFile && params.certificateFileName && params.certificateMimeType) {
//         var certificateFileName =
//           "calibration_cert_" + orderNoB + "_" + new Date().getTime() + "_" + params.certificateFileName
//         var certificateUrl = uploadFileToDrive(
//           params.certificateFile,
//           certificateFileName,
//           params.certificateMimeType,
//           DRIVE_FOLDER_ID,
//         )
//         if (certificateUrl) {
//           fileUrls.certificateUrl = certificateUrl
//         }
//       }

//       if (params.inventoryPhotoFile && params.inventoryPhotoFileName && params.inventoryPhotoMimeType) {
//         var inventoryPhotoFileName = "inventory_photo_" + orderNoB + "_" + new Date().getTime() + "_" + params.inventoryPhotoFileName;
//         var inventoryPhotoUrl = uploadFileToDrive(
//           params.inventoryPhotoFile,
//           inventoryPhotoFileName,
//           params.inventoryPhotoMimeType,
//           DRIVE_FOLDER_ID
//         );
//         if (inventoryPhotoUrl) {
//           fileUrls.inventoryPhotoUrl = inventoryPhotoUrl;
//         }
//       }

//       // Get all values in column B (Order No.)
//       var orderNosB = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues() // Column B = index 2

//       // Find the row index that matches the orderNo
//       var rowIndexOrderNoB = -1
//       for (let i = 0; i < orderNosB.length; i++) {
//         if (orderNosB[i][0] == orderNoB) {
//           rowIndexOrderNoB = i + 2 // +2 because array starts at 0 and sheet starts at row 2
//           break
//         }
//       }

//       if (rowIndexOrderNoB === -1) {
//         throw new Error("Order No. " + orderNoB + " not found in column B")
//       }

//       // Update each cell in the row, preserving existing data for empty values
//       for (var k = 0; k < rowDataB.length; k++) {
//         if (rowDataB[k] !== "") {
//           sheet.getRange(rowIndexOrderNoB, k + 1).setValue(rowDataB[k])
//         }
//       }


//       // Add file URLs to specific columns if files were uploaded
//       // For Invoice functionality - existing columns
//       if (fileUrls.invoiceUrl) {
//         sheet.getRange(rowIndexOrderNoB, 67).setValue(fileUrls.invoiceUrl) // Column BP (index 67)
//       }
//       if (fileUrls.ewayBillUrl1) {
//         sheet.getRange(rowIndexOrderNoB, 68).setValue(fileUrls.ewayBillUrl1) // Column BQ (index 68)
//       }

//       if (fileUrls.ewayBillUrl) {
//         sheet.getRange(rowIndexOrderNoB, 27).setValue(fileUrls.ewayBillUrl) // Column BQ (index 68)
//       }

//       // For Dispatch functionality - existing columns
//       if (fileUrls.srnUrl) {
//         sheet.getRange(rowIndexOrderNoB, 29).setValue(fileUrls.srnUrl) // Column AD
//       }
//       if (fileUrls.paymentUrl) {
//         sheet.getRange(rowIndexOrderNoB, 30).setValue(fileUrls.paymentUrl) // Column AE
//       }

//       if (fileUrls.inventoryPhotoUrl) {
//         sheet.getRange(rowIndexOrderNoB, 67).setValue(fileUrls.inventoryPhotoUrl);
//       }

//       if (fileUrls.deliveryPhotoUrl) {
//         sheet.getRange(rowIndexOrderNoB, 102).setValue(fileUrls.deliveryPhotoUrl) // Column CV (index 100, which is column 101)
//       }

//       // NEW: For Warehouse functionality - add photo URLs to columns BW, BX, BY
//       if (fileUrls.beforePhotoUrl) {
//         sheet.getRange(rowIndexOrderNoB, 74).setValue(fileUrls.beforePhotoUrl) // Column BW (index 74)
//       }
//       if (fileUrls.afterPhotoUrl) {
//         sheet.getRange(rowIndexOrderNoB, 75).setValue(fileUrls.afterPhotoUrl) // Column BX (index 75)
//       }
//       if (fileUrls.biltyUrl) {
//         sheet.getRange(rowIndexOrderNoB, 76).setValue(fileUrls.biltyUrl) // Column BY (index 76)
//       }

//       // NEW: For Calibration functionality - add certificate URLs to specific columns based on type
//       var calType = params.calibrationType ? params.calibrationType.toString().toUpperCase() : ""
//       if (fileUrls.certificateUrl) {
//         if (calType === "LAB") {
//           // LAB: Image URL in column CN (index 92)
//           sheet.getRange(rowIndexOrderNoB, 91).setValue(fileUrls.certificateUrl) // Column CN
//         } else if (calType === "TOTAL STATION") {
//           // TOTAL STATION: Image URL in column CO (index 93)
//           sheet.getRange(rowIndexOrderNoB, 92).setValue(fileUrls.certificateUrl) // Column CO
//         }
//       }

//       // Add calibration data to appropriate columns based on the type
//       if (calType === "LAB") {
//         // LAB: Calibration Date in CP (index 94), Calibration Period in CR (index 96)
//         if (params.calibrationDate) {
//           sheet.getRange(rowIndexOrderNoB, 93).setValue(params.calibrationDate) // Column CP
//         }
//         if (params.calibrationPeriod) {
//           sheet.getRange(rowIndexOrderNoB, 95).setValue(params.calibrationPeriod) // Column CR
//         }
//       } else if (calType === "TOTAL STATION") {
//         // TOTAL STATION: Date in CQ (index 95), Period in CS (index 97)
//         if (params.calibrationDate) {
//           sheet.getRange(rowIndexOrderNoB, 94).setValue(params.calibrationDate) // Column CQ
//         }
//         if (params.calibrationPeriod) {
//           sheet.getRange(rowIndexOrderNoB, 96).setValue(params.calibrationPeriod) // Column CS
//         }
//       }

//       // Both types: Submit date in CL (index 90) - this is already handled in the main rowData update
//       // The CL column update is handled by the existing rowData[89] = formattedDate in the React component

//       return ContentService.createTextOutput(
//         JSON.stringify({
//           success: true,
//           message: "Order updated successfully in column B search",
//           rowIndex: rowIndexOrderNoB,
//           orderNo: orderNoB,
//           fileUrls: fileUrls,
//         }),
//       )
//     } else if (action === "updateByDSrNumber") {
//       // Find row by matching D-Sr Number in column DB (column 106 in 1-based indexing)
//       var dSrNumber = params.dSrNumber
//       var rowDataDSr = JSON.parse(params.rowData)

//       console.log("Searching for D-Sr Number:", dSrNumber)

//       // Handle file uploads if present
//       var fileUrls = {}

//       // Upload Invoice file if provided
//       if (params.invoiceFile && params.invoiceFileName && params.invoiceMimeType) {
//         var invoiceFileName = "invoice_" + dSrNumber + "_" + new Date().getTime() + "_" + params.invoiceFileName
//         var invoiceUrl = uploadFileToDrive(params.invoiceFile, invoiceFileName, params.invoiceMimeType, DRIVE_FOLDER_ID)
//         if (invoiceUrl) {
//           fileUrls.invoiceUrl = invoiceUrl
//         }
//       }

//       // Upload Eway Bill file if provided
//       if (params.ewayBillFile && params.ewayBillFileName && params.ewayBillMimeType) {
//         var ewayFileName = "eway_bill_" + dSrNumber + "_" + new Date().getTime() + "_" + params.ewayBillFileName
//         var ewayUrl = uploadFileToDrive(params.ewayBillFile, ewayFileName, params.ewayBillMimeType, DRIVE_FOLDER_ID)
//         if (ewayUrl) {
//           fileUrls.ewayBillUrl1 = ewayUrl
//         }
//       }

//       // Upload Warehouse Before Photo if provided
//       if (params.beforePhotoFile && params.beforePhotoFileName && params.beforePhotoMimeType) {
//         var beforePhotoFileName =
//           "warehouse_before_" + dSrNumber + "_" + new Date().getTime() + "_" + params.beforePhotoFileName
//         var beforePhotoUrl = uploadFileToDrive(
//           params.beforePhotoFile,
//           beforePhotoFileName,
//           params.beforePhotoMimeType,
//           DRIVE_FOLDER_ID,
//         )
//         if (beforePhotoUrl) {
//           fileUrls.beforePhotoUrl = beforePhotoUrl
//         }
//       }

//       // Upload Warehouse After Photo if provided
//       if (params.afterPhotoFile && params.afterPhotoFileName && params.afterPhotoMimeType) {
//         var afterPhotoFileName =
//           "warehouse_after_" + dSrNumber + "_" + new Date().getTime() + "_" + params.afterPhotoFileName
//         var afterPhotoUrl = uploadFileToDrive(
//           params.afterPhotoFile,
//           afterPhotoFileName,
//           params.afterPhotoMimeType,
//           DRIVE_FOLDER_ID,
//         )
//         if (afterPhotoUrl) {
//           fileUrls.afterPhotoUrl = afterPhotoUrl
//         }
//       }

//       // Upload Warehouse Bilty file if provided
//       if (params.biltyFile && params.biltyFileName && params.biltyMimeType) {
//         var biltyFileName = "warehouse_bilty_" + dSrNumber + "_" + new Date().getTime() + "_" + params.biltyFileName
//         var biltyUrl = uploadFileToDrive(params.biltyFile, biltyFileName, params.biltyMimeType, DRIVE_FOLDER_ID)
//         if (biltyUrl) {
//           fileUrls.biltyUrl = biltyUrl
//         }
//       }

//       // NEW: Upload Calibration Certificate if provided
//       if (params.certificateFile && params.certificateFileName && params.certificateMimeType) {
//         var certificateFileName =
//           "calibration_cert_" + dSrNumber + "_" + new Date().getTime() + "_" + params.certificateFileName
//         var certificateUrl = uploadFileToDrive(
//           params.certificateFile,
//           certificateFileName,
//           params.certificateMimeType,
//           DRIVE_FOLDER_ID,
//         )
//         if (certificateUrl) {
//           fileUrls.certificateUrl = certificateUrl
//         }
//       }

//       // Get all values in column DB (D-Sr Number) - Column DB is column 106 in 1-based indexing
//       var dSrNumbers = sheet.getRange(2, 106, sheet.getLastRow() - 1, 1).getValues()

//       console.log("Found D-Sr Numbers:", dSrNumbers)

//       // Find the row index that matches the dSrNumber
//       var rowIndexDSr = -1
//       for (let i = 0; i < dSrNumbers.length; i++) {
//         console.log("Comparing:", dSrNumbers[i][0], "with", dSrNumber)
//         if (dSrNumbers[i][0] && dSrNumbers[i][0].toString().trim() == dSrNumber.toString().trim()) {
//           rowIndexDSr = i + 2 // +2 because array starts at 0 and sheet starts at row 2
//           break
//         }
//       }

//       console.log("Found row index:", rowIndexDSr)

//       if (rowIndexDSr === -1) {
//         throw new Error("D-Sr Number " + dSrNumber + " not found in column DB")
//       }

//       // Update each cell in the row, preserving existing data for empty values
//       for (var k = 0; k < rowDataDSr.length; k++) {
//         if (rowDataDSr[k] !== "" && rowDataDSr[k] !== null && rowDataDSr[k] !== undefined) {
//           try {
//             sheet.getRange(rowIndexDSr, k + 1).setValue(rowDataDSr[k])
//             console.log("Updated cell at row", rowIndexDSr, "column", k + 1, "with value:", rowDataDSr[k])
//           } catch (cellError) {
//             console.error("Error updating cell:", cellError.toString())
//           }
//         }
//       }

//       // Add file URLs to specific columns if files were uploaded
//       if (fileUrls.invoiceUrl) {
//         sheet.getRange(rowIndexDSr, 67).setValue(fileUrls.invoiceUrl) // Column BP
//         console.log("Added invoice URL to column BP")
//       }
//       if (fileUrls.ewayBillUrl1) {
//         sheet.getRange(rowIndexDSr, 68).setValue(fileUrls.ewayBillUrl1) // Column BQ
//         console.log("Added eway bill URL to column BQ")
//       }

//       // For Warehouse functionality - add photo URLs to columns BW, BX, BY
//       if (fileUrls.beforePhotoUrl) {
//         sheet.getRange(rowIndexDSr, 74).setValue(fileUrls.beforePhotoUrl) // Column BW
//         console.log("Added before photo URL to column BW")
//       }
//       if (fileUrls.afterPhotoUrl) {
//         sheet.getRange(rowIndexDSr, 75).setValue(fileUrls.afterPhotoUrl) // Column BX
//         console.log("Added after photo URL to column BX")
//       }
//       if (fileUrls.biltyUrl) {
//         sheet.getRange(rowIndexDSr, 76).setValue(fileUrls.biltyUrl) // Column BY
//         console.log("Added bilty URL to column BY")
//       }

//       // NEW: For Calibration functionality - add certificate URLs to specific columns based on type
//       var calType = params.calibrationType ? params.calibrationType.toString().toUpperCase() : ""
//       if (fileUrls.certificateUrl) {
//         if (calType === "LAB") {
//           // LAB: Image URL in column CN (index 91)
//           sheet.getRange(rowIndexDSr, 91).setValue(fileUrls.certificateUrl) // Column CN
//           console.log("Added LAB certificate URL to column CN")
//         } else if (calType === "TOTAL STATION") {
//           // TOTAL STATION: Image URL in column CO (index 92)
//           sheet.getRange(rowIndexDSr, 92).setValue(fileUrls.certificateUrl) // Column CO
//           console.log("Added TOTAL STATION certificate URL to column CO")
//         }
//       }

//       // Add calibration data to appropriate columns based on the type
//       if (calType === "LAB") {
//         // LAB: Calibration Date in CP (index 93), Calibration Period in CR (index 95)
//         if (params.calibrationDate) {
//           sheet.getRange(rowIndexDSr, 93).setValue(params.calibrationDate) // Column CP
//           console.log("Added LAB calibration date to column CP")
//         }
//         if (params.calibrationPeriod) {
//           sheet.getRange(rowIndexDSr, 95).setValue(params.calibrationPeriod) // Column CR
//           console.log("Added LAB calibration period to column CR")
//         }
//       } else if (calType === "TOTAL STATION") {
//         // TOTAL STATION: Date in CQ (index 94), Period in CS (index 96)
//         if (params.calibrationDate) {
//           sheet.getRange(rowIndexDSr, 94).setValue(params.calibrationDate) // Column CQ
//           console.log("Added TOTAL STATION calibration date to column CQ")
//         }
//         if (params.calibrationPeriod) {
//           sheet.getRange(rowIndexDSr, 96).setValue(params.calibrationPeriod) // Column CS
//           console.log("Added TOTAL STATION calibration period to column CS")
//         }
//       }

//       console.log("Update completed successfully")

//       return ContentService.createTextOutput(
//         JSON.stringify({
//           success: true,
//           message: "Order updated successfully by D-Sr Number",
//           rowIndex: rowIndexDSr,
//           dSrNumber: dSrNumber,
//           fileUrls: fileUrls,
//         }),
//       )
//     } else if (action === "delete") {
//       // Delete an existing row
//       var rowIndexDelete = Number.parseInt(params.rowIndex)

//       // Verify rowIndex is valid
//       if (isNaN(rowIndexDelete) || rowIndexDelete < 2) {
//         throw new Error("Invalid row index for delete")
//       }

//       // Delete the entire row
//       sheet.deleteRow(rowIndexDelete)

//       return ContentService.createTextOutput(JSON.stringify({ success: true }))
//     } else if (action === "markDeleted") {
//       var rowIndexMarkDeleted = Number.parseInt(params.rowIndex)
//       var columnIndexMarkDeleted = Number.parseInt(params.columnIndex)
//       var valueMarkDeleted = params.value || "Yes" // Default to "Yes" if not specified

//       // Verify rowIndex is valid
//       if (isNaN(rowIndexMarkDeleted) || rowIndexMarkDeleted < 2) {
//         throw new Error("Invalid row index for marking as deleted")
//       }

//       // Verify columnIndex is valid
//       if (isNaN(columnIndexMarkDeleted) || columnIndexMarkDeleted < 1) {
//         throw new Error("Invalid column index for marking as deleted")
//       }

//       // Set the specified column to "Yes" (or specified value)
//       sheet.getRange(rowIndexMarkDeleted, columnIndexMarkDeleted).setValue(valueMarkDeleted)

//       return ContentService.createTextOutput(
//         JSON.stringify({
//           success: true,
//           message: "Row marked as deleted successfully",
//         }),
//       )
//     }
    
//      else if (action === "insertWarehouseWithDynamicColumns") {
//       var orderNo = params.orderNo;
//       var rowDataWarehouse = JSON.parse(params.rowData);
//       var totalItems = parseInt(params.totalItems) || 0;

//       var ss = SpreadsheetApp.openById("1yEsh4yzyvglPXHxo-5PT70VpwVJbxV7wwH8rpU1RFJA");
//       var warehouseSheet = ss.getSheetByName("Warehouse");

//       if (!warehouseSheet) {
//         throw new Error("Warehouse sheet not found");
//       }

//       // Get current headers
//       var currentHeaders = warehouseSheet.getRange(1, 1, 1, warehouseSheet.getLastColumn()).getValues()[0];
//       var currentColumnCount = currentHeaders.length;

//       // Calculate required columns
//       // Fixed columns (before items): 
//       // 1. Time Stamp
//       // 2. Order No.
//       // 3. Quotation No.
//       // 4. Before Photo Upload
//       // 5. After Photo Upload
//       // 6. Bilty Upload
//       // 7. Transporter Name
//       // 8. Transporter Contact
//       // 9. Bilty No.
//       // 10. Total Charges
//       // 11. Warehouse Remarks
//       // Total = 11 fixed columns BEFORE items

//       var fixedColumnsBeforeItems = 11;
//       var requiredItemColumns = totalItems * 2; // Each item has Name + Quantity
//       var totalRequiredColumns = fixedColumnsBeforeItems + requiredItemColumns;

//       // If we need more columns, add them
//       if (totalRequiredColumns > currentColumnCount) {
//         var columnsToAdd = totalRequiredColumns - currentColumnCount;
//         warehouseSheet.insertColumnsAfter(currentColumnCount, columnsToAdd);

//         // Figure out how many item columns we currently have
//         var currentItemCount = Math.floor((currentColumnCount - fixedColumnsBeforeItems) / 2);

//         // Add headers for new item columns
//         for (var i = currentItemCount + 1; i <= totalItems; i++) {
//           var itemNameCol = fixedColumnsBeforeItems + ((i - 1) * 2) + 1;
//           var itemQtyCol = itemNameCol + 1;

//           warehouseSheet.getRange(1, itemNameCol).setValue("Item Name " + i);
//           warehouseSheet.getRange(1, itemQtyCol).setValue("Quantity " + i);
//         }
//       }

//       // Handle file uploads
//       var fileUrls = {};

//       if (params.beforePhotoFile && params.beforePhotoFileName && params.beforePhotoMimeType) {
//         var beforePhotoFileName = "warehouse_before_" + orderNo + "_" + new Date().getTime() + "_" + params.beforePhotoFileName;
//         var beforePhotoUrl = uploadFileToDrive(params.beforePhotoFile, beforePhotoFileName, params.beforePhotoMimeType, DRIVE_FOLDER_ID);
//         if (beforePhotoUrl) {
//           fileUrls.beforePhotoUrl = beforePhotoUrl;
//         }
//       }

//       if (params.afterPhotoFile && params.afterPhotoFileName && params.afterPhotoMimeType) {
//         var afterPhotoFileName = "warehouse_after_" + orderNo + "_" + new Date().getTime() + "_" + params.afterPhotoFileName;
//         var afterPhotoUrl = uploadFileToDrive(params.afterPhotoFile, afterPhotoFileName, params.afterPhotoMimeType, DRIVE_FOLDER_ID);
//         if (afterPhotoUrl) {
//           fileUrls.afterPhotoUrl = afterPhotoUrl;
//         }
//       }

//       if (params.biltyFile && params.biltyFileName && params.biltyMimeType) {
//         var biltyFileName = "warehouse_bilty_" + orderNo + "_" + new Date().getTime() + "_" + params.biltyFileName;
//         var biltyUrl = uploadFileToDrive(params.biltyFile, biltyFileName, params.biltyMimeType, DRIVE_FOLDER_ID);
//         if (biltyUrl) {
//           fileUrls.biltyUrl = biltyUrl;
//         }
//       }

//       // Build the complete row with file URLs at correct positions
//       var finalRowData = [...rowDataWarehouse];

//       // Add file URLs at positions 4, 5, 6 (columns D, E, F)
//       finalRowData[3] = fileUrls.beforePhotoUrl || "";  // Column 4 (index 3)
//       finalRowData[4] = fileUrls.afterPhotoUrl || "";   // Column 5 (index 4)
//       finalRowData[5] = fileUrls.biltyUrl || "";        // Column 6 (index 5)

//       // Append the row
//       warehouseSheet.appendRow(finalRowData);

//       return ContentService.createTextOutput(
//         JSON.stringify({
//           success: true,
//           message: "Warehouse data inserted with dynamic columns",
//           fileUrls: fileUrls,
//           columnsAdded: totalRequiredColumns > currentColumnCount,
//           totalItems: totalItems
//         })
//       ).setMimeType(ContentService.MimeType.JSON);
//     }


//     // else if (action === "insertPRSRDN") {
//     //   // This handles PR-SR-DN-Data sheet submission
//     //   var rowDataPRSRDN = JSON.parse(params.rowData);

//     //   // Append the row to PR-SR-DN-Data sheet
//     //   var ss = SpreadsheetApp.openById("1yEsh4yzyvglPXHxo-5PT70VpwVJbxV7wwH8rpU1RFJA");
//     //   var prSrDnSheet = ss.getSheetByName("PR-SR-DN-Data");

//     //   if (!prSrDnSheet) {
//     //     throw new Error("PR-SR-DN-Data sheet not found");
//     //   }

//     //   prSrDnSheet.appendRow(rowDataPRSRDN);

//     //   return ContentService.createTextOutput(
//     //     JSON.stringify({
//     //       success: true,
//     //       message: "PR-SR-DN data submitted successfully"
//     //     })
//     //   ).setMimeType(ContentService.MimeType.JSON);
//     // }

//     else if (action === "insertPRSRDN") {
//   // This handles PR-SR-DN-Data sheet submission
//   var rowDataPRSRDN = JSON.parse(params.rowData);

//   // Get the correct sheet name from params
//   var targetSheetName = params.sheetName || "PR-SR-DN-Data"; // Default to old name if not specified
  
//   // Append the row to the specified sheet
//   var ss = SpreadsheetApp.openById("1yEsh4yzyvglPXHxo-5PT70VpwVJbxV7wwH8rpU1RFJA");
//   var targetSheet = ss.getSheetByName(targetSheetName);

//   if (!targetSheet) {
//     // If "PR-SR-DN-Data" not found, try "PR-SR-DN-Data"
//     if (targetSheetName === "PR-SR-DN-Data") {
//       targetSheet = ss.getSheetByName("PR-SR-DN-Data");
//       if (!targetSheet) {
//         throw new Error("Neither 'PR-SR-DN-Data' nor 'PR-SR-DN-Data' sheet found");
//       }
//     } else {
//       throw new Error("Sheet '" + targetSheetName + "' not found");
//     }
//   }

//   targetSheet.appendRow(rowDataPRSRDN);

//   return ContentService.createTextOutput(
//     JSON.stringify({
//       success: true,
//       message: "Data submitted successfully to " + (targetSheetName || "PR-SR-DN-Data"),
//       sheetUsed: targetSheet.getName()
//     })
//   ).setMimeType(ContentService.MimeType.JSON);
// }

//      else {
//       throw new Error("Unknown action: " + action)
//     }
//   } catch (error) {
//     return ContentService.createTextOutput(
//       JSON.stringify({
//         error: error.toString(),
//       }),
//     )
//   }
// }

// function updateTenDaysOrders(ordersData, sheetName) {
//   try {
//     var ss = SpreadsheetApp.openById("1yEsh4yzyvglPXHxo-5PT70VpwVJbxV7wwH8rpU1RFJA");
//     var sheet = ss.getSheetByName(sheetName || "ORDER-DISPATCH");

//     // Get all order numbers from column B (starting from row 5)
//     var lastRow = sheet.getLastRow();
//     if (lastRow < 5) {
//       return {
//         success: false,
//         error: "No data found in sheet"
//       };
//     }

//     var orderNumbers = sheet.getRange(5, 2, lastRow - 4, 1).getValues();

//     // Get header row to determine correct indices for CG, CH, and CJ columns
//     var headers = sheet.getRange(4, 1, 1, sheet.getLastColumn()).getValues()[0];

//     // Find CG, CH, and CJ column indices
//     var cgIndex = -1; // revised order status
//     var chIndex = -1; // revised order remarks
//     var cjIndex = -1; // date column

//     for (var i = 0; i < headers.length; i++) {
//       var header = headers[i] ? headers[i].toString().toLowerCase() : "";
//       if (header.includes("revised order status")) {
//         cgIndex = i + 1; // Convert to 1-based index
//       }
//       if (header.includes("revised order remarks")) {
//         chIndex = i + 1; // Convert to 1-based index
//       }
//       // Add logic to find CJ column based on your header name
//       if (header.includes("date") || i === 87) { // Adjust condition based on your CJ column header
//         cjIndex = i + 1; // Convert to 1-based index
//       }
//     }

//     // Fallback to default column indices if not found
//     if (cgIndex === -1) cgIndex = 85; // Column CG
//     if (chIndex === -1) chIndex = 86; // Column CH
//     if (cjIndex === -1) cjIndex = 88; // Column CJ (88th column)

//     var updatedCount = 0;
//     var errors = [];

//     // Process each selected order
//     for (var j = 0; j < ordersData.length; j++) {
//       var orderInfo = ordersData[j];
//       var orderId = orderInfo.orderNo;
//       var status = orderInfo.status || "done";
//       var remark = orderInfo.remark || "";
//       var date = orderInfo.date || ""; // Get the date from orderInfo

//       var found = false;

//       // Find matching order in the sheet
//       for (var k = 0; k < orderNumbers.length; k++) {
//         if (orderNumbers[k][0] && orderNumbers[k][0].toString().trim() === orderId.toString().trim()) {
//           var rowIndex = k + 5; // Data starts at row 5

//           try {
//             // Update column CG (status), CH (remarks), and CJ (date)
//             sheet.getRange(rowIndex, cgIndex).setValue(status);
//             sheet.getRange(rowIndex, chIndex).setValue(remark);

//             // Only update date column if date is provided and status is pending
//             if (date && status === "pending") {
//               sheet.getRange(rowIndex, cjIndex).setValue(date);
//             } else if (status === "done") {
//               // Clear date when status is done
//               sheet.getRange(rowIndex, cjIndex).setValue("");
//             }

//             updatedCount++;
//             found = true;
//             break;
//           } catch (updateError) {
//             errors.push("Error updating order " + orderId + ": " + updateError.toString());
//           }
//         }
//       }

//       if (!found) {
//         errors.push("Order " + orderId + " not found in sheet");
//       }
//     }

//     return {
//       success: true,
//       message: "Updated " + updatedCount + " order(s) successfully",
//       updatedCount: updatedCount,
//       errors: errors.length > 0 ? errors : null
//     };

//   } catch (error) {
//     console.error("Error in updateTenDaysOrders:", error);
//     return {
//       success: false,
//       error: error.toString()
//     };
//   }
// }


// // Declare variables to avoid lint errors
// var ContentService = ContentService
// var Utilities = Utilities
// var DriveApp = DriveApp
// var SpreadsheetApp = SpreadsheetApp