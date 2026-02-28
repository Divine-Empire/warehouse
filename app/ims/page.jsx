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
    { key: "group", label: "Item Group" },
    { key: "category", label: "Item Category" },
    { key: "itemCode", label: "Item Code" },
    { key: "image", label: "Image" },
    { key: "location", label: "Location" },
    { key: "liveStock", label: "Live Stock" },
    { key: "inTransitMaterial", label: "Material in Transit + Purchase Order Placed Qty" },
    { key: "leadTimeToWarehouse", label: "Mat. in Transition Lead Time (In Date)" },
    { key: "targetQty", label: "Total estimate Quantity" },
    { key: "expiryDate", label: "Expiry Date Of Material" },
    { key: "serialNumbers", label: "Serial Number" },
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
              group: row.c[1]?.v ?? "",
              category: row.c[2]?.v ?? "",
              itemCode: row.c[4]?.v ?? "",
              image: row.c[5]?.v ?? "",
              location: row.c[7]?.v ?? "",
              liveStock: row.c[20]?.v ?? "",
              inTransitMaterial: row.c[23]?.v ?? "",
              leadTimeToWarehouse: row.c[25]?.v ?? "",
              targetQty: row.c[28]?.v ?? "",
              expiryDate: row.c[13]?.v ?? "",
              serialNumbers: row.c[12]?.v ?? "",
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
    const items = [...new Set(inventoryData.map((item) => item.group))];
    return items.filter((item) => item).sort();
  };

  const filteredData = useMemo(() => {
    let filtered = inventoryData;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((item) => {
        const searchableFields = [
          item.group,
          item.category,
          item.itemCode,
          item.location,
          item.liveStock,
          item.serialNumbers,
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
      filtered = filtered.filter((item) => item.group === itemNameFilter);
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
            <option value="all">All Groups</option>
            {getUniqueItemNames().map((groupName) => (
              <option key={groupName} value={groupName}>
                {groupName}
              </option>
            ))}
          </select>
            </div>

          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by Group, Category, Item Code, Location..."
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
                <div className="overflow-auto max-h-[70vh]">
                  <table className="w-full min-w-max">
                    <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
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
                            {item.itemCode || "N/A"}
                          </h3>
                          <p className="text-xs text-gray-600 mt-1">
                            Group: {item.group || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 space-y-3">
                      {/* Group and Category */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500 text-xs">Item Group:</span>
                          <p className="font-medium">{item.group || "-"}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">Category:</span>
                          <p className="font-medium">{item.category || "-"}</p>
                        </div>
                      </div>

                      {/* Item Code and Location */}
                      <div className="grid grid-cols-2 gap-3 text-sm border-t pt-3">
                        <div>
                          <span className="text-gray-500 text-xs">Item Code:</span>
                          <p className="font-medium">{item.itemCode || "-"}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">Location:</span>
                          <p className="font-medium">{item.location || "-"}</p>
                        </div>
                      </div>

                      {/* Image */}
                      <div className="border-t pt-3 text-sm">
                        {item.image && item.image.startsWith("http") ? (
                          <a
                            href={item.image}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-700 text-xs rounded"
                          >
                            <Eye className="h-3 w-3" />
                            View Image
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs">No Image</span>
                        )}
                      </div>

                      {/* Live Stock and Total Estimate Qty */}
                      <div className="grid grid-cols-2 gap-3 text-sm border-t pt-3">
                        <div>
                          <span className="text-gray-500 text-xs">Live Stock:</span>
                          <p className="font-medium text-blue-600">{item.liveStock || "0"}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">Total Est. Qty:</span>
                          <p className="font-medium">{item.targetQty || "0"}</p>
                        </div>
                      </div>

                      {/* Material in Transit */}
                      {item.inTransitMaterial && (
                        <div className="border-t pt-3 text-sm">
                          <span className="text-gray-500 text-xs">Material in Transit + PO Placed Qty:</span>
                          <p className="font-medium text-orange-600">{item.inTransitMaterial}</p>
                        </div>
                      )}

                      {/* Lead Time */}
                      {item.leadTimeToWarehouse && (
                        <div className="border-t pt-3 text-sm">
                          <span className="text-gray-500 text-xs">Mat. in Transition Lead Time (In Date):</span>
                          <p className="font-medium">{item.leadTimeToWarehouse}</p>
                        </div>
                      )}

                      {/* Expiry Date */}
                      {item.expiryDate && (
                        <div className="border-t pt-3 text-sm">
                          <span className="text-gray-500 text-xs">Expiry Date:</span>
                          <p className="font-medium">{item.expiryDate}</p>
                        </div>
                      )}

                      {/* Serial Numbers */}
                      {item.serialNumbers && (
                        <div className="border-t pt-3 text-sm">
                          <span className="text-gray-500 text-xs">Serial Number:</span>
                          <p className="text-xs mt-1 text-gray-700 break-all">{item.serialNumbers}</p>
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
