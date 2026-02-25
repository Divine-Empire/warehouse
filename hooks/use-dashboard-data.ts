"use client"

import { useState, useEffect } from "react"

const SHEET_ID = "1yEsh4yzyvglPXHxo-5PT70VpwVJbxV7wwH8rpU1RFJA"
const ORDER_DISPATCH_SHEET = "ORDER-DISPATCH"
const DISPATCH_DELIVERY_SHEET = "DISPATCH-DELIVERY"

export function useDashboardData() {
  const [dashboardData, setDashboardData] = useState({
    // Order metrics (for overview/orders tabs)
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    cancelOrders: 0,
    deliveredOrders: 0,
    totalRevenue: 0,

    // Dispatch metrics (for dispatch/analytics tabs)
    totalDispatches: 0,
    pendingDispatches: 0,
    completedDispatches: 0,
    dispatchRevenue: 0,

    // Other existing metrics
    completedRevenue: 0,
    pendingRevenue: 0,
    inventoryPending: 0,
    materialReceived: 0,
    calibrationRequired: 0,
    monthlyData: [],
    topCustomers: [],
    recentOrders: [], // This will now contain ALL orders with ALL columns
    paymentModeData: [],
    transportModeData: [],
    approvalPending: 0,
    invoiceGenerated: 0,
    dispatchComplete: 0,

    // New dispatch order lists
    allDispatchOrders: [], // All dispatch orders from DISPATCH-DELIVERY sheet
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Helper function to extract month from date
  const extractMonthFromDate = (dateValue) => {
    if (!dateValue) return null

    try {
      let date
      if (typeof dateValue === "string") {
        // Handle dates like "6/7/2025" format
        const parts = dateValue.split('/')
        if (parts.length === 3) {
          const month = parseInt(parts[0]) - 1 // Month is 0-indexed in JS Date
          const day = parseInt(parts[1])
          const year = parseInt(parts[2])
          date = new Date(year, month, day)
        } else if (dateValue.includes("Date(")) {
          // Handle Google Sheets Date format
          const match = dateValue.match(/Date\((\d+),(\d+),(\d+)\)/)
          if (match) {
            date = new Date(Number.parseInt(match[1]), Number.parseInt(match[2]), Number.parseInt(match[3]))
          }
        } else {
          date = new Date(dateValue)
        }
      } else {
        date = new Date(dateValue)
      }

      if (date && !isNaN(date.getTime())) {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        return monthNames[date.getMonth()]
      }
    } catch (e) {
      console.error("Error parsing date:", e)
    }
    return null
  }

  // Helper function to safely get cell value
  const getCellValue = (row, index) => {
    return row.c && row.c[index] && row.c[index].v ? row.c[index].v.toString().trim() : ""
  }

  // Helper function to format date from cell
  const formatDateFromCell = (row, index) => {
    if (!row.c || !row.c[index] || !row.c[index].v) return ""

    const dateValue = row.c[index].v
    if (typeof dateValue === "string" && dateValue.includes('/')) {
      return dateValue
    } else if (typeof dateValue === "string" && dateValue.includes("Date(")) {
      const match = dateValue.match(/Date\((\d+),(\d+),(\d+)\)/)
      if (match) {
        const date = new Date(Number.parseInt(match[1]), Number.parseInt(match[2]), Number.parseInt(match[3]))
        return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
      }
    } else {
      try {
        const date = new Date(dateValue)
        if (!isNaN(date.getTime())) {
          return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
        }
      } catch (e) {
        console.error("Date parsing error:", e)
      }
    }
    return dateValue.toString()
  }

  // Convert data to chart format
  const convertToChartData = (dataMap) => {
    return Object.entries(dataMap).map(([key, value]) => ({
      name: key,
      value: value,
    }))
  }

  const convertMonthlyData = (monthlyOrdersMap) => {
    const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return monthOrder.map((month) => ({
      month,
      orders: monthlyOrdersMap[month] || 0,
    }))
  }

  // Fetch data from ORDER-DISPATCH sheet with ALL columns
  const fetchOrderDispatchData = async () => {
    try {
      const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${ORDER_DISPATCH_SHEET}`
      const response = await fetch(sheetUrl)
      const text = await response.text()

      const jsonStart = text.indexOf("{")
      const jsonEnd = text.lastIndexOf("}") + 1
      const jsonData = text.substring(jsonStart, jsonEnd)

      const data = JSON.parse(jsonData)

      if (data && data.table && data.table.rows) {
        let totalOrderCount = 0
        let pendingOrderCount = 0
        let completedOrderCount = 0
        let cancelOrderCount = 0
        let totalOrderRevenue = 0
        let deliveredCount = 0

        // Dispatch metrics from ORDER-DISPATCH sheet
        let pendingDispatchCount = 0
        let completedDispatchCount = 0
        let dispatchRevenueSum = 0

        const monthlyOrdersMap = {}
        const paymentModeMap = {}
        const transportModeMap = {}
        const allOrdersList = []

        // Process data rows (skip header rows)
        data.table.rows.slice(6).forEach((row, index) => {
          // Check if row has data in column B (index 1)
          if (row.c && row.c[1] && row.c[1].v) {
            totalOrderCount++

            // Order Status - Column AW (index 48)
            const orderStatus = getCellValue(row, 48)

            // Categorize orders based on Column AW
            if (orderStatus.toLowerCase() === "complete") {
              completedOrderCount++
            } else if (orderStatus.toLowerCase() === "pending" || orderStatus === "") {
              pendingOrderCount++
            }

            // Cancel Status - Column AS (index 44)
            const cancelStatus = getCellValue(row, 44).toLowerCase()
            if (cancelStatus === "cancel") {
              cancelOrderCount++
            }

            // Delivery Status - Column AV (index 47)
            const deliveryStatus = getCellValue(row, 47)
            if (deliveryStatus) {
              deliveredCount++
            }

            // Revenue - Column AP (index 41)
            const revenueAmount = Number.parseFloat(
              getCellValue(row, 41).replace(/[^0-9.-]/g, "") || "0"
            ) || 0
            totalOrderRevenue += revenueAmount

            // Dispatch Status - Column AX (index 49)
            const dispatchStatus = getCellValue(row, 49).toLowerCase()
            if (dispatchStatus === "pending") {
              pendingDispatchCount++
            } else if (dispatchStatus === "complete") {
              completedDispatchCount++
            }

            // Dispatch Revenue - Column CA (index 78)
            const dispatchRevenueAmount = Number.parseFloat(
              getCellValue(row, 78).replace(/[^0-9.-]/g, "") || "0"
            ) || 0
            dispatchRevenueSum += dispatchRevenueAmount

            // Analytics data
            const paymentMode = getCellValue(row, 8) || "Unknown"
            const transportModeValue = getCellValue(row, 32)

            let transportMode
            if (!transportModeValue || transportModeValue === "null") {
              transportMode = "Not Specified"
            } else {
              transportMode = transportModeValue
            }

            transportModeMap[transportMode] = (transportModeMap[transportMode] || 0) + 1
            paymentModeMap[paymentMode] = (paymentModeMap[paymentMode] || 0) + 1

            // Monthly data - Column A (index 0)
            const dateValue = row.c[0] && row.c[0].v
            if (dateValue) {
              const month = extractMonthFromDate(dateValue)
              if (month) {
                monthlyOrdersMap[month] = (monthlyOrdersMap[month] || 0) + 1
              }
            }

            // Create complete order object with ALL columns from B to CA
            const orderObject = {
              // Basic info (columns B-D)
              orderNo: getCellValue(row, 1), // Column B
              quotationNo: getCellValue(row, 2), // Column C
              company: getCellValue(row, 3), // Column D

              // Contact info (columns E-G)
              contactPersonName: getCellValue(row, 4), // Column E
              contactNumber: getCellValue(row, 5), // Column F
              billingAddress: getCellValue(row, 6), // Column G
              shippingAddress: getCellValue(row, 7), // Column H

              // Payment info (columns I-K)
              paymentMode: getCellValue(row, 8), // Column I
              paymentTerms: getCellValue(row, 9), // Column J
              referenceName: getCellValue(row, 10), // Column K
              email: getCellValue(row, 11), // Column L

              // Items 1-10 (columns M-Z, AA-AF)
              itemName1: getCellValue(row, 12), // Column M
              quantity1: getCellValue(row, 13), // Column N
              itemName2: getCellValue(row, 14), // Column O
              quantity2: getCellValue(row, 15), // Column P
              itemName3: getCellValue(row, 16), // Column Q
              quantity3: getCellValue(row, 17), // Column R
              itemName4: getCellValue(row, 18), // Column S
              quantity4: getCellValue(row, 19), // Column T
              itemName5: getCellValue(row, 20), // Column U
              quantity5: getCellValue(row, 21), // Column V
              itemName6: getCellValue(row, 22), // Column W
              quantity6: getCellValue(row, 23), // Column X
              itemName7: getCellValue(row, 24), // Column Y
              quantity7: getCellValue(row, 25), // Column Z
              itemName8: getCellValue(row, 26), // Column AA
              quantity8: getCellValue(row, 27), // Column AB
              itemName9: getCellValue(row, 28), // Column AC
              quantity9: getCellValue(row, 29), // Column AD
              itemName10: getCellValue(row, 30), // Column AE
              quantity10: getCellValue(row, 31), // Column AF

              // Transport info (columns AG-AI)
              transportMode: getCellValue(row, 32), // Column AG
              freightType: getCellValue(row, 33), // Column AH
              destination: getCellValue(row, 34), // Column AI

              // Order details (columns AJ-AO)
              poNumber: getCellValue(row, 35), // Column AJ
              quotationCopy: getCellValue(row, 36), // Column AK
              acceptanceCopy: getCellValue(row, 37), // Column AL
              offerShow: getCellValue(row, 38), // Column AM
              conveyedForRegistration: getCellValue(row, 39), // Column AN
              totalOrderQty: getCellValue(row, 40), // Column AO

              // Financial info (column AP)
              amount: getCellValue(row, 41), // Column AP

              // Dispatch info (columns AQ-AU)
              totalDispatchQuantity: getCellValue(row, 42), // Column AQ
              quantityDelivered: getCellValue(row, 43), // Column AR
              orderCancel: getCellValue(row, 44), // Column AS
              pendingDeliveryQty: getCellValue(row, 45), // Column AT
              pendingDispatchQty: getCellValue(row, 46), // Column AU
              materialReturn: getCellValue(row, 47), // Column AV

              // Status info (columns AW-AZ)
              deliveryStatus: getCellValue(row, 47), // Column AV
              status: getCellValue(row, 48), // Column AW (Order Status)
              dispatchStatus: getCellValue(row, 49), // Column AX
              dispatchCompleteDate: formatDateFromCell(row, 50), // Column AY
              deliveryCompleteDate: formatDateFromCell(row, 51), // Column AZ

              // Additional fields (continue pattern for remaining columns up to CA)
              isOrderAcceptable: getCellValue(row, 55), // Column BD
              orderAcceptanceChecklist: getCellValue(row, 56), // Column BE
              remark: getCellValue(row, 57), // Column BF
              availabilityStatus: getCellValue(row, 60), // Column BI
              remarks: getCellValue(row, 61), // Column BJ
              customerWantsMaterial: getCellValue(row, 62), // Column BK
              createdBy: getCellValue(row, 63), // Column BL
              warehouseLocation: getCellValue(row, 64), // Column BM
              createIndent: getCellValue(row, 65), // Column BN
              lineItemNumber: getCellValue(row, 66), // Column BO
              totalQty: getCellValue(row, 67), // Column BP
              materialReceivedLeadTime: getCellValue(row, 68), // Column BQ
              receivedDate: formatDateFromCell(row, 72), // Column BU
              approvalName: getCellValue(row, 77), // Column BZ
              revenue: getCellValue(row, 78), // Column CA

              // Date (column A)
              date: formatDateFromCell(row, 0), // Column A
            }

            allOrdersList.push(orderObject)
          }
        })

        // Sort orders by date (most recent first)
        allOrdersList.sort((a, b) => {
          const dateA = new Date(a.date)
          const dateB = new Date(b.date)
          return dateB.getTime() - dateA.getTime()
        })

        return {
          // Order metrics
          totalOrders: totalOrderCount,
          pendingOrders: pendingOrderCount,
          completedOrders: completedOrderCount,
          cancelOrders: cancelOrderCount,
          totalRevenue: totalOrderRevenue,
          deliveredOrders: deliveredCount,

          // Dispatch metrics
          pendingDispatches: pendingDispatchCount,
          completedDispatches: completedDispatchCount,
          dispatchRevenue: dispatchRevenueSum,

          // Analytics data
          monthlyOrdersMap,
          paymentModeMap,
          transportModeMap,
          allOrdersList,
        }
      }
      return {}
    } catch (err) {
      console.error("Error fetching ORDER-DISPATCH data:", err)
      throw err
    }
  }

  // Fetch data from DISPATCH-DELIVERY sheet with ALL columns
  const fetchDispatchDeliveryData = async () => {
    try {
      const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${DISPATCH_DELIVERY_SHEET}`
      const response = await fetch(sheetUrl)
      const text = await response.text()

      const jsonStart = text.indexOf("{")
      const jsonEnd = text.lastIndexOf("}") + 1
      const jsonData = text.substring(jsonStart, jsonEnd)

      const data = JSON.parse(jsonData)

      if (data && data.table && data.table.rows) {
        let totalDispatchCount = 0
        let invoiceGenerated = 0
        let dispatchComplete = 0
        let calibrationRequired = 0

        const customerData = {}
        const allDispatchOrdersList = []

        data.table.rows.slice(6).forEach((row, index) => {
          if (row.c && row.c[1] && row.c[1].v) {
            totalDispatchCount++

            // Dispatch Status from Column CY (index 102)
            const dispatchStatus = getCellValue(row, 102)

            const invoiceNumber = row.c[68] && row.c[68].v
            if (invoiceNumber) {
              invoiceGenerated++
            }

            const dispatchCompleteStatus = row.c[100] && row.c[100].v
            if (dispatchCompleteStatus && dispatchCompleteStatus.toString().toLowerCase().includes("complete")) {
              dispatchComplete++
            }

            const calibrationReq = row.c[21] && row.c[21].v
            if (calibrationReq && calibrationReq.toString().toLowerCase() === "yes") {
              calibrationRequired++
            }

            const revenue = Number.parseFloat(
              getCellValue(row, 69).replace(/[^0-9.-]/g, "") || "0"
            ) || 0

            const companyName = getCellValue(row, 3)
            if (companyName) {
              if (!customerData[companyName]) {
                customerData[companyName] = { name: companyName, orders: 0, revenue: 0 }
              }
              customerData[companyName].orders += 1
              customerData[companyName].revenue += revenue
            }

            // Create complete dispatch order object with ALL columns from B to CY (excluding planned/actual)
            const dispatchOrderObject = {
              // Basic info (columns B-D)
              orderNo: getCellValue(row, 1), // Column B
              quotationNo: getCellValue(row, 2), // Column C
              company: getCellValue(row, 3), // Column D

              // Contact info (columns E-H)
              contactPersonName: getCellValue(row, 4), // Column E
              contactNumber: getCellValue(row, 5), // Column F
              billingAddress: getCellValue(row, 6), // Column G
              shippingAddress: getCellValue(row, 7), // Column H

              // Payment and logistics (columns I-L)
              paymentMode: getCellValue(row, 8), // Column I
              quotationCopy: getCellValue(row, 9), // Column J
              paymentTerms: getCellValue(row, 10), // Column K
              transportMode: getCellValue(row, 11), // Column L
              freightType: getCellValue(row, 12), // Column M
              destination: getCellValue(row, 13), // Column N
              poNumber: getCellValue(row, 14), // Column O
              quotationCopyField: getCellValue(row, 15), // Column P
              acceptanceCopy: getCellValue(row, 16), // Column Q
              offer: getCellValue(row, 17), // Column R
              conveyedForRegistration: getCellValue(row, 18), // Column S
              qty: getCellValue(row, 19), // Column T
              amount: getCellValue(row, 20), // Column U
              approvedName: getCellValue(row, 21), // Column V

              // Calibration and installation (columns W-AC)
              calibrationCertificateRequired: getCellValue(row, 22), // Column W
              certificateCategory: getCellValue(row, 23), // Column X
              installationRequired: getCellValue(row, 24), // Column Y
              ewayBillDetails: getCellValue(row, 25), // Column Z
              ewayBillAttachment: getCellValue(row, 26), // Column AA
              srnNumber: getCellValue(row, 27), // Column AB
              srnNumberAttachment: getCellValue(row, 28), // Column AC
              attachment: getCellValue(row, 29), // Column AD

              // Items 1-15 (columns AE-BC)
              itemName1: getCellValue(row, 30), // Column AE
              quantity1: getCellValue(row, 31), // Column AF
              itemName2: getCellValue(row, 32), // Column AG
              quantity2: getCellValue(row, 33), // Column AH
              itemName3: getCellValue(row, 34), // Column AI
              quantity3: getCellValue(row, 35), // Column AJ
              itemName4: getCellValue(row, 36), // Column AK
              quantity4: getCellValue(row, 37), // Column AL
              itemName5: getCellValue(row, 38), // Column AM
              quantity5: getCellValue(row, 39), // Column AN
              itemName6: getCellValue(row, 40), // Column AO
              quantity6: getCellValue(row, 41), // Column AP
              itemName7: getCellValue(row, 42), // Column AQ
              quantity7: getCellValue(row, 43), // Column AR
              itemName8: getCellValue(row, 44), // Column AS
              quantity8: getCellValue(row, 45), // Column AT
              itemName9: getCellValue(row, 46), // Column AU
              quantity9: getCellValue(row, 47), // Column AV
              itemName10: getCellValue(row, 48), // Column AW
              quantity10: getCellValue(row, 49), // Column AX
              itemName11: getCellValue(row, 50), // Column AY
              quantity11: getCellValue(row, 51), // Column AZ
              itemName12: getCellValue(row, 52), // Column BA
              quantity12: getCellValue(row, 53), // Column BB
              itemName13: getCellValue(row, 54), // Column BC
              quantity13: getCellValue(row, 55), // Column BD
              itemName14: getCellValue(row, 56), // Column BE
              quantity14: getCellValue(row, 57), // Column BF
              itemName15: getCellValue(row, 58), // Column BG
              quantity15: getCellValue(row, 59), // Column BH

              // Quantities and remarks (columns BI-BL)
              totalQty: getCellValue(row, 60), // Column BI
              remarks: getCellValue(row, 61), // Column BJ
              // Skip planned/actual columns (BK-BM)

              // Invoice and billing (columns BN-BT)
              invoiceNumber: getCellValue(row, 65), // Column BN
              invoiceUpload: getCellValue(row, 66), // Column BO
              ewayBillUpload: getCellValue(row, 67), // Column BP
              totalQtyField: getCellValue(row, 68), // Column BQ
              totalBillAmount: getCellValue(row, 69), // Column BR
              // Skip planned/actual columns (BS-BU)

              // Photo and transport (columns BV-CD)
              beforePhotoUpload: getCellValue(row, 73), // Column BV
              afterPhotoUpload: getCellValue(row, 74), // Column BW
              biltyUpload: getCellValue(row, 75), // Column BX
              transporterName: getCellValue(row, 76), // Column BY
              transporterContact: getCellValue(row, 77), // Column BZ
              transporterBiltyNo: getCellValue(row, 78), // Column CA
              totalCharges: getCellValue(row, 79), // Column CB
              warehouseRemarks: getCellValue(row, 80), // Column CC
              // Skip planned/actual columns (CD-CF)

              // Material and installation (columns CG-CK)
              materialReceivingStatus: getCellValue(row, 84), // Column CG
              reason: getCellValue(row, 85), // Column CH
              installationRequiredField: getCellValue(row, 86), // Column CI
              // Skip planned/actual columns (CJ-CL)

              // Calibration details (columns CM-CX)
              labCalibrationCertificate: getCellValue(row, 90), // Column CM
              stCalibrationCertificate: getCellValue(row, 91), // Column CN
              labCalibrationDate: formatDateFromCell(row, 92), // Column CO
              stCalibrationDate: formatDateFromCell(row, 93), // Column CP
              labCalibrationPeriod: getCellValue(row, 94), // Column CQ
              stCalibrationPeriod: getCellValue(row, 95), // Column CR
              labDueDate: formatDateFromCell(row, 96), // Column CS
              stDueDate: formatDateFromCell(row, 97), // Column CT
              // Skip planned/actual columns (CU-CW)

              // Final fields (columns CX-CY)
              uploadDN: getCellValue(row, 101), // Column CX
              status: dispatchStatus, // Column CY (Dispatch Status)

              // Date (column A)
              date: formatDateFromCell(row, 0), // Column A
            }

            allDispatchOrdersList.push(dispatchOrderObject)
          }
        })

        allDispatchOrdersList.sort((a, b) => {
          const dateA = new Date(a.date)
          const dateB = new Date(b.date)
          return dateB.getTime() - dateA.getTime()
        })

        const topCustomers = Object.values(customerData)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)

        return {
          totalDispatches: totalDispatchCount,
          invoiceGenerated,
          dispatchComplete,
          calibrationRequired,
          topCustomers,
          allDispatchOrders: allDispatchOrdersList,
        }
      }
      return {}
    } catch (err) {
      console.error("Error fetching DISPATCH-DELIVERY data:", err)
      throw err
    }
  }

  // Fetch all data
  const fetchAllData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [orderDispatchData, dispatchDeliveryData] = await Promise.all([
        fetchOrderDispatchData(),
        fetchDispatchDeliveryData(),
      ])

      setDashboardData({
        ...orderDispatchData,
        ...dispatchDeliveryData,
        monthlyData: convertMonthlyData(orderDispatchData.monthlyOrdersMap || {}),
        paymentModeData: convertToChartData(orderDispatchData.paymentModeMap || {}),
        transportModeData: convertToChartData(orderDispatchData.transportModeMap || {}),
        recentOrders: orderDispatchData.allOrdersList || [],
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [])

  return {
    dashboardData,
    loading,
    error,
    fetchAllData,
  }
}