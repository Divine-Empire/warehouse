"use client";
import { useState, useEffect, useMemo } from "react";
import { Eye, RefreshCw, Search } from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";

import { Settings } from "lucide-react";

// Add these new imports (if not already present)
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function MisPage() {
  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemNameFilter, setItemNameFilter] = useState("all");

  const SHEET_ID = "1DpJWUnXKsS7C4mHva9ZkX4bOC51A9xugDKAX8eUDiR0";
  const SHEET_NAME = "IMS";

  const columns = [
    { key: "srn", label: "SRN" },
    { key: "group", label: "GROUP" },
    { key: "category", label: "CATEGORY" },
    { key: "nameOfItem", label: "NAME OF ITEM" },
    { key: "itemCode", label: "ITEM CODE" },
    { key: "image", label: "IMAGE" },
    { key: "barCode", label: "BAR CODE" },
    { key: "location", label: "Location" },
    { key: "openingQty", label: "Opening QTY" },
    { key: "rate", label: "RATE" },
    { key: "amount", label: "AMOUNT" },
    { key: "unit", label: "UNIT" },
    { key: "serialNumbers", label: "SERIAL NUMBERS" },
    { key: "expiryDate", label: "EXPIRY DATE" },
    { key: "leadTime", label: "LEAD TIME" },
    { key: "safetyFactor", label: "SAFETY FACTOR" },
    { key: "regularPerDay", label: "REGULAR (PER DAY)" },
    { key: "offSeasonPerDay", label: "OFF SEASON (PER DAY)" },
    { key: "maxLevelRegular", label: "MAX LEVEL (REGULAR)" },
    { key: "maxLevelOffSeason", label: "MAX LEVEL (OFF SEASON)" },
    { key: "liveStock", label: "LIVE STOCK" },
    { key: "indentRaised", label: "INDENT RAISED" },
    { key: "poRaisedForApproval", label: "PO RAISED" },
    { key: "inTransitMaterial", label: "IN TRANSIT" },
    { key: "totalPurchase", label: "Total Purchase" },
    { key: "leadTimeToWarehouse", label: "LEAD TIME TO WH" },
    { key: "purchaseEntryPending", label: "PURCHASE PENDING" },
    { key: "totalSales", label: "Total Sales" },
    { key: "targetQty", label: "TARGET QTY" },
    { key: "rol", label: "ROL" },
    { key: "reorderQuantity", label: "REORDER QTY" },
    { key: "lastOutDay", label: "Last Out Day" },
    { key: "status", label: "Status" },
    { key: "inventoryTurnoverValue", label: "TURNOVER (VALUE)" },
    { key: "inventoryTurnoverQty", label: "TURNOVER (QTY)" },
    { key: "warningExpiryDates", label: "EXPIRY WARNING" },
  ];

  const [visibleColumns, setVisibleColumns] = useState(
    columns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  );

  const fetchInventoryData = async () => {
    setLoading(true);
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
        const items = [];

        data.table.rows.slice(0).forEach((row, index) => {
          if (row.c) {
            const item = {
              id: index + 1,
              srn: row.c[0]?.v ?? "",
              group: row.c[1]?.v ?? "",
              category: row.c[2]?.v ?? "",
              nameOfItem: row.c[3]?.v ?? "",
              itemCode: row.c[4]?.v ?? "",
              image: row.c[5]?.v ?? "",
              barCode: row.c[6]?.v ?? "",
              location: row.c[7]?.v ?? "",
              openingQty: row.c[8]?.v ?? "",
              rate: row.c[9]?.v ?? "",
              amount: row.c[10]?.v ?? "",
              unit: row.c[11]?.v ?? "",
              serialNumbers: row.c[12]?.v ?? "",
              expiryDate: row.c[13]?.v ?? "",
              leadTime: row.c[14]?.v ?? "",
              safetyFactor: row.c[15]?.v ?? "",
              regularPerDay: row.c[16]?.v ?? "",
              offSeasonPerDay: row.c[17]?.v ?? "",
              maxLevelRegular: row.c[18]?.v ?? "",
              maxLevelOffSeason: row.c[19]?.v ?? "",
              liveStock: row.c[20]?.v ?? "",
              indentRaised: row.c[21]?.v ?? "",
              poRaisedForApproval: row.c[22]?.v ?? "",
              inTransitMaterial: row.c[23]?.v ?? "",
              totalPurchase: row.c[24]?.v ?? "",
              leadTimeToWarehouse: row.c[25]?.v ?? "",
              purchaseEntryPending: row.c[26]?.v ?? "",
              totalSales: row.c[27]?.v ?? "",
              targetQty: row.c[28]?.v ?? "",
              rol: row.c[29]?.v ?? "",
              reorderQuantity: row.c[30]?.v ?? "",
              lastOutDay: row.c[31]?.v ?? "",
              status: row.c[32]?.v ?? "",
              inventoryTurnoverValue: row.c[33]?.v ?? "",
              inventoryTurnoverQty: row.c[34]?.v ?? "",
              warningExpiryDates: row.c[35]?.v ?? "",
            };
            items.push(item);
          }
        });

        setInventoryData(items);
      }
    } catch (err) {
      console.error("Error fetching inventory data:", err);
      setError(err.message);
      setInventoryData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const toggleColumn = (columnKey) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };

  const showAllColumns = () => {
    setVisibleColumns(
      columns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
    );
  };

  const hideAllColumns = () => {
    setVisibleColumns(
      columns.reduce((acc, col) => ({ ...acc, [col.key]: false }), {})
    );
  };

  const getUniqueItemNames = () => {
    const items = [...new Set(inventoryData.map((item) => item.nameOfItem))];
    return items.filter((item) => item).sort();
  };

  const filteredData = useMemo(() => {
    let filtered = inventoryData;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((item) => {
        const searchableFields = [
          item.srn,
          item.group,
          item.category,
          item.nameOfItem,
          item.itemCode,
          item.location,
          item.unit,
          item.status,
        ];

        return searchableFields.some(
          (field) =>
            field &&
            String(field).toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    // Apply item name filter
    if (itemNameFilter !== "all") {
      filtered = filtered.filter((item) => item.nameOfItem === itemNameFilter);
    }

    return filtered;
  }, [inventoryData, searchTerm, itemNameFilter]);

  const renderCellContent = (item, columnKey) => {
    const value = item[columnKey];

    switch (columnKey) {
      case "image":
        return value && value.startsWith("http") ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
          >
            View Image
          </a>
        ) : (
          <span className="inline-block px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">
            N/A
          </span>
        );

      case "barCode":
        const itemCode = item.itemCode || "";

        if (itemCode && itemCode.trim().length > 0) {
          // Alternative barcode service
          // const barcodeUrl = `https://quickchart.io/barcode?text=${encodeURIComponent(itemCode)}&format=svg&width=120&height=40&margin=5`;

          // OR use this one (more reliable):
          const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(
            itemCode
          )}&scale=2&height=40`;

          return (
            <div className="flex justify-center">
              <img
                src={barcodeUrl}
                alt={`Barcode: ${itemCode}`}
                className="h-8 w-auto"
                title={`Item Code: ${itemCode}`}
                loading="lazy" // Add lazy loading
                onError={(e) => {
                  console.error("Failed to load barcode for:", itemCode);
                  // Show item code as fallback
                  e.target.parentElement.innerHTML = `<span class="text-xs font-mono bg-gray-100 px-2 py-1 rounded">${itemCode}</span>`;
                }}
              />
            </div>
          );
        }

        return (
          <span className="inline-block px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">
            N/A
          </span>
        );

      case "rate":
      case "amount":
        return value ? `₹${Number(value).toLocaleString()}` : "";
      case "status":
        const statusColor =
          value === "In Stock"
            ? "bg-green-500"
            : value === "Low Stock"
            ? "bg-red-500"
            : "bg-gray-500";
        return (
          <span
            className={`inline-block px-2 py-1 ${statusColor} text-white text-xs rounded`}
          >
            {value || "N/A"}
          </span>
        );
      case "warningExpiryDates":
        return value ? (
          <span className="inline-block px-2 py-1 bg-red-500 text-white text-xs rounded">
            {value}
          </span>
        ) : (
          <span className="inline-block px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">
            No Warning
          </span>
        );
      default:
        return value || "";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-violet-600" />
          <span className="ml-2 text-gray-700">Loading inventory data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-md mx-auto text-center mt-20">
          <h1 className="text-2xl font-bold text-red-600 mb-2">
            Error Loading Data
          </h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchInventoryData}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 flex items-center justify-center mx-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 sm:p-6">
        <div className="space-y-6">
          <div className="flex flex-wrap justify-between items-center">
            <div className="w-[60%]">
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                IMS - Inventory Management
              </h1>
              {/* <p className="text-sm text-gray-600 mt-1">
                Complete inventory tracking and management
              </p> */}
            </div>
            <button
              onClick={fetchInventoryData}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>

          <div className="">


          <select
            value={itemNameFilter}
            onChange={(e) => setItemNameFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white w-full"
            >
            <option value="all">All Items</option>
            {getUniqueItemNames().map((itemName) => (
              <option key={itemName} value={itemName}>
                {itemName}
              </option>
            ))}
          </select>
            </div>

          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by SRN, Item Name, Code, Category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <span className="px-3 py-1 border border-gray-300 rounded-lg text-sm">
              Total Items: {filteredData.length}
            </span>
          </div>

          <div className="bg-white rounded-lg shadow hidden sm:block">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">Inventory Items</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Comprehensive view of all inventory items
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 flex items-center">
                      <Settings className="h-4 w-4 mr-2" />
                      Column Visibility
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto">
                    <DropdownMenuLabel>Show/Hide Columns</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="flex gap-2 p-2">
                      <button
                        onClick={showAllColumns}
                        className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
                      >
                        Show All
                      </button>
                      <button
                        onClick={hideAllColumns}
                        className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
                      >
                        Hide All
                      </button>
                    </div>
                    <DropdownMenuSeparator />
                    <div className="p-2 space-y-2">
                      {columns.map((column) => (
                        <div
                          key={column.key}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`mis-${column.key}`}
                            checked={visibleColumns[column.key]}
                            onCheckedChange={() => toggleColumn(column.key)}
                          />
                          <Label
                            htmlFor={`mis-${column.key}`}
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
            </div>

            <div className="p-6">
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-max">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        {columns
                          .filter((col) => visibleColumns[col.key])
                          .map((column) => (
                            <th
                              key={column.key}
                              className="bg-gray-50 font-semibold text-gray-900 border-b-2 border-gray-200 px-4 py-3 text-left whitespace-nowrap text-sm"
                              style={{ minWidth: "150px" }}
                            >
                              {column.label}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 border-b">
                          {columns
                            .filter((col) => visibleColumns[col.key])
                            .map((column) => (
                              <td
                                key={column.key}
                                className="px-4 py-3 align-top whitespace-nowrap text-sm"
                                style={{ minWidth: "150px" }}
                              >
                                {renderCellContent(item, column.key)}
                              </td>
                            ))}
                        </tr>
                      ))}
                      {filteredData.length === 0 && (
                        <tr>
                          <td
                            colSpan={columns.length}
                            className="text-center text-gray-500 py-16"
                          >
                            {searchTerm
                              ? "No items match your search criteria"
                              : "No inventory items found"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="block sm:hidden">
            <div className="space-y-4">
              {filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border rounded-lg shadow-sm overflow-hidden"
                  >
                    {/* Card Header */}
                    <div className="bg-violet-50 px-4 py-3 border-b">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-sm">
                            {item.nameOfItem || "N/A"}
                          </h3>
                          <p className="text-xs text-gray-600 mt-1">
                            Code: {item.itemCode || "N/A"}
                          </p>
                        </div>
                        {item.status && (
                          <span
                            className={`px-2 py-1 text-xs rounded font-medium ${
                              item.status === "In Stock"
                                ? "bg-green-100 text-green-700"
                                : item.status === "Low Stock"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {item.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 space-y-3">
                      {/* SRN and Category */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500 text-xs">SRN:</span>
                          <p className="font-medium">{item.srn || "-"}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">Group:</span>
                          <p className="font-medium">{item.group || "-"}</p>
                        </div>
                      </div>

                      {/* Category and Location */}
                      <div className="grid grid-cols-2 gap-3 text-sm border-t pt-3">
                        <div>
                          <span className="text-gray-500 text-xs">
                            Category:
                          </span>
                          <p className="font-medium">{item.category || "-"}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">
                            Location:
                          </span>
                          <p className="font-medium">{item.location || "-"}</p>
                        </div>
                      </div>

                      {/* Image and Barcode */}
                      <div className="border-t pt-3 flex gap-2">
                        {item.image && item.image.startsWith("http") && (
                          <a
                            href={item.image}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-700 text-xs rounded"
                          >
                            <Eye className="h-3 w-3" />
                            View Image
                          </a>
                        )}
                        {item.itemCode && item.itemCode.trim().length > 0 && (
                          <div className="flex-1 flex justify-center items-center bg-gray-50 rounded p-2">
                            <img
                              src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(
                                item.itemCode
                              )}&scale=2&height=30`}
                              alt={`Barcode: ${item.itemCode}`}
                              className="h-8 w-auto"
                              loading="lazy"
                              onError={(e) => {
                                e.target.parentElement.innerHTML = `<span class="text-xs font-mono bg-gray-100 px-2 py-1 rounded">${item.itemCode}</span>`;
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Stock Information */}
                      <div className="border-t pt-3 grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500 text-xs">
                            Opening Qty:
                          </span>
                          <p className="font-medium">
                            {item.openingQty || "0"}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">
                            Live Stock:
                          </span>
                          <p className="font-medium text-blue-600">
                            {item.liveStock || "0"}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">Unit:</span>
                          <p className="font-medium">{item.unit || "-"}</p>
                        </div>
                      </div>

                      {/* Rate and Amount */}
                      <div className="border-t pt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500 text-xs">Rate:</span>
                          <p className="font-medium text-green-600">
                            {item.rate
                              ? `₹${Number(item.rate).toLocaleString("en-IN")}`
                              : "-"}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">Amount:</span>
                          <p className="font-medium text-green-600">
                            {item.amount
                              ? `₹${Number(item.amount).toLocaleString(
                                  "en-IN"
                                )}`
                              : "-"}
                          </p>
                        </div>
                      </div>

                      {/* Purchase and Sales */}
                      <div className="border-t pt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500 text-xs">
                            Total Purchase:
                          </span>
                          <p className="font-medium">
                            {item.totalPurchase || "0"}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">
                            Total Sales:
                          </span>
                          <p className="font-medium">
                            {item.totalSales || "0"}
                          </p>
                        </div>
                      </div>

                      {/* Indent and PO Information */}
                      {(item.indentRaised ||
                        item.poRaisedForApproval ||
                        item.inTransitMaterial) && (
                        <div className="border-t pt-3 space-y-2 text-sm">
                          {item.indentRaised && (
                            <div className="flex justify-between">
                              <span className="text-gray-500 text-xs">
                                Indent Raised:
                              </span>
                              <span className="font-medium">
                                {item.indentRaised}
                              </span>
                            </div>
                          )}
                          {item.poRaisedForApproval && (
                            <div className="flex justify-between">
                              <span className="text-gray-500 text-xs">
                                PO Raised:
                              </span>
                              <span className="font-medium">
                                {item.poRaisedForApproval}
                              </span>
                            </div>
                          )}
                          {item.inTransitMaterial && (
                            <div className="flex justify-between">
                              <span className="text-gray-500 text-xs">
                                In Transit:
                              </span>
                              <span className="font-medium">
                                {item.inTransitMaterial}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Lead Time and ROL */}
                      <div className="border-t pt-3 grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500 text-xs">
                            Lead Time:
                          </span>
                          <p className="font-medium">{item.leadTime || "-"}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">ROL:</span>
                          <p className="font-medium">{item.rol || "-"}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">
                            Target Qty:
                          </span>
                          <p className="font-medium">{item.targetQty || "-"}</p>
                        </div>
                      </div>

                      {/* Reorder Information */}
                      {item.reorderQuantity && (
                        <div className="border-t pt-3">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 text-xs">
                              Reorder Qty:
                            </span>
                            <span className="font-medium text-orange-600">
                              {item.reorderQuantity}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Consumption Rates */}
                      {(item.regularPerDay || item.offSeasonPerDay) && (
                        <div className="border-t pt-3 grid grid-cols-2 gap-3 text-sm">
                          {item.regularPerDay && (
                            <div>
                              <span className="text-gray-500 text-xs">
                                Regular/Day:
                              </span>
                              <p className="font-medium">
                                {item.regularPerDay}
                              </p>
                            </div>
                          )}
                          {item.offSeasonPerDay && (
                            <div>
                              <span className="text-gray-500 text-xs">
                                Off Season/Day:
                              </span>
                              <p className="font-medium">
                                {item.offSeasonPerDay}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Max Levels */}
                      {(item.maxLevelRegular || item.maxLevelOffSeason) && (
                        <div className="border-t pt-3 grid grid-cols-2 gap-3 text-sm">
                          {item.maxLevelRegular && (
                            <div>
                              <span className="text-gray-500 text-xs">
                                Max (Regular):
                              </span>
                              <p className="font-medium">
                                {item.maxLevelRegular}
                              </p>
                            </div>
                          )}
                          {item.maxLevelOffSeason && (
                            <div>
                              <span className="text-gray-500 text-xs">
                                Max (Off Season):
                              </span>
                              <p className="font-medium">
                                {item.maxLevelOffSeason}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Inventory Turnover */}
                      {(item.inventoryTurnoverValue ||
                        item.inventoryTurnoverQty) && (
                        <div className="border-t pt-3 grid grid-cols-2 gap-3 text-sm">
                          {item.inventoryTurnoverValue && (
                            <div>
                              <span className="text-gray-500 text-xs">
                                Turnover (Value):
                              </span>
                              <p className="font-medium">
                                {item.inventoryTurnoverValue}
                              </p>
                            </div>
                          )}
                          {item.inventoryTurnoverQty && (
                            <div>
                              <span className="text-gray-500 text-xs">
                                Turnover (Qty):
                              </span>
                              <p className="font-medium">
                                {item.inventoryTurnoverQty}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Serial Numbers */}
                      {item.serialNumbers && (
                        <div className="border-t pt-3">
                          <span className="text-gray-500 text-xs">
                            Serial Numbers:
                          </span>
                          <p className="text-xs mt-1 text-gray-700 break-all">
                            {item.serialNumbers}
                          </p>
                        </div>
                      )}

                      {/* Expiry Date and Warning */}
                      {(item.expiryDate || item.warningExpiryDates) && (
                        <div className="border-t pt-3 space-y-2">
                          {item.expiryDate && (
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-500 text-xs">
                                Expiry Date:
                              </span>
                              <span className="font-medium">
                                {item.expiryDate}
                              </span>
                            </div>
                          )}
                          {item.warningExpiryDates && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 text-xs">
                                Warning:
                              </span>
                              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded font-medium flex-1 text-center">
                                {item.warningExpiryDates}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Last Out Day */}
                      {item.lastOutDay && (
                        <div className="border-t pt-3 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500 text-xs">
                              Last Out Day:
                            </span>
                            <span className="font-medium">
                              {item.lastOutDay}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Safety Factor and Lead Time to Warehouse */}
                      {(item.safetyFactor ||
                        item.leadTimeToWarehouse ||
                        item.purchaseEntryPending) && (
                        <div className="border-t pt-3 grid grid-cols-2 gap-3 text-sm">
                          {item.safetyFactor && (
                            <div>
                              <span className="text-gray-500 text-xs">
                                Safety Factor:
                              </span>
                              <p className="font-medium">{item.safetyFactor}</p>
                            </div>
                          )}
                          {item.leadTimeToWarehouse && (
                            <div>
                              <span className="text-gray-500 text-xs">
                                Lead Time (WH):
                              </span>
                              <p className="font-medium">
                                {item.leadTimeToWarehouse}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Purchase Entry Pending */}
                      {item.purchaseEntryPending && (
                        <div className="border-t pt-3">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 text-xs">
                              Purchase Pending:
                            </span>
                            <span className="font-medium text-orange-600">
                              {item.purchaseEntryPending}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-16">
                  {searchTerm
                    ? "No items match your search criteria"
                    : "No inventory items found"}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
