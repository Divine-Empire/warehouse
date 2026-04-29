"use client";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/components/auth-provider";
import { RefreshCw, Search, Settings } from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MisPage() {
  const { user } = useAuth();
  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemNameFilter, setItemNameFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");

  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxkB72Tu0iDEEyQ5cdkYUTdJq7Ifj80hgqbXpwc9WnF3ruWs1Yppe3Z1TJce4yr9Gg/exec";
  const SHEET_ID = "1O-fEA6iQvlJhSP6xcn2G-n0XxWE5LUX2kg2z6BVQLJw";
  const SHEET_NAME = "IMS";

  const LOCATION_TABS = [
    { key: "CG", label: "CG", normalized: "cgwarehouse" },
    { key: "NE", label: "NE", normalized: "newarehouse" },
    { key: "Maniquip", label: "Maniquip", normalized: "maniquipstore" },
    { key: "Head-Office", label: "Head-Office", normalized: "headoffice" },
  ];

  const availableTabs = useMemo(() => {
    if (!user) return [];
    if (user.role === "admin" || user.role === "super_admin") return LOCATION_TABS;
    
    const userLocations = user.location || [];
    const isAll = userLocations.some(l => l.toLowerCase() === "all");
    if (isAll) return LOCATION_TABS;

    const normalize = (loc) => String(loc || "").toLowerCase().replace(/^by\s*/i, "").replace(/[^a-z0-9]/g, "").trim();
    const normalizedUserLocs = userLocations.map(normalize);

    return LOCATION_TABS.filter(tab => 
      normalizedUserLocs.includes(tab.normalized) || 
      normalizedUserLocs.includes(tab.key.toLowerCase())
    );
  }, [user]);

  const [activeTab, setActiveTab] = useState("CG");

  // Set initial active tab when availableTabs are loaded
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.find(t => t.key === activeTab)) {
      setActiveTab(availableTabs[0].key);
    }
  }, [availableTabs]);

  const commonColumns = [
    { key: "group", label: "Group" },
    { key: "category", label: "Category" },
    { key: "itemName", label: "Item-Name" },
    { key: "itemCode", label: "Item-Code" },
    { key: "unit", label: "Unit" },
  ];

  const tabColumns = [
    { key: "liveStock", label: "Live Stock" },
    { key: "maxLevel", label: "Max-Level" },
    { key: "tallyQty", label: "Tally-Qty" },
    { key: "differentQty", label: "Different Qty" },
    { key: "indentRaised", label: "Indent-Raised" },
    { key: "poQty", label: "PO-Qty" },
    { key: "materialTransit", label: "Transit" },
    { key: "pendingPO", label: "Pending PO" },
    { key: "targetQty", label: "Target-Qty" },
    { key: "openingQty", label: "Opening Qty" },
    { key: "leadTime", label: "Lead-Time" },
    { key: "totalSales", label: "Total Sales" },
    { key: "totalReceived", label: "Total Received" },
    { key: "reOrderQty", label: "Re-Order Qty" },
  ];

  const allColumns = [...commonColumns, ...tabColumns];

  const [visibleColumns, setVisibleColumns] = useState(
    allColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  );

  const fetchInventoryData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${SCRIPT_URL}?action=read&sheet=${SHEET_NAME}`);
      const data = await response.json();

      if (data && data.success && data.data) {
        // Skip the two header rows returned by the script
        const dataRows = data.data.slice(2);
        
        const items = dataRows.map((row, index) => {
          return {
            id: index + 1,
            group: row[0] || "",
            category: row[1] || "",
            itemCode: row[2] || "",
            itemName: row[3] || "",
            unit: row[16] || "",
            CG: {
              openingQty: row[12] || 0,
              leadTime: row[25] || "",
              liveStock: row[49] || 0,
              maxLevel: row[37] || 0,
              tallyQty: row[50] || 0,
              differentQty: row[51] || 0,
              indentRaised: row[62] || 0,
              poQty: row[66] || 0,
              materialTransit: row[70] || 0,
              pendingPO: row[74] || 0,
              totalReceived: row[78] || 0,
              totalSales: row[86] || 0,
              targetQty: row[90] || 0,
              reOrderQty: row[94] || 0,
            },
            NE: {
              openingQty: row[13] || 0,
              leadTime: row[26] || "",
              liveStock: row[52] || 0,
              maxLevel: row[38] || 0,
              tallyQty: row[53] || 0,
              differentQty: row[54] || 0,
              indentRaised: row[63] || 0,
              poQty: row[67] || 0,
              materialTransit: row[71] || 0,
              pendingPO: row[75] || 0,
              totalReceived: row[79] || 0,
              totalSales: row[87] || 0,
              targetQty: row[91] || 0,
              reOrderQty: row[95] || 0,
            },
            Maniquip: {
              openingQty: row[14] || 0,
              leadTime: row[27] || "",
              liveStock: row[55] || 0,
              maxLevel: row[39] || 0,
              tallyQty: row[56] || 0,
              differentQty: row[57] || 0,
              indentRaised: row[64] || 0,
              poQty: row[68] || 0,
              materialTransit: row[72] || 0,
              pendingPO: row[76] || 0,
              totalReceived: row[80] || 0,
              totalSales: row[88] || 0,
              targetQty: row[92] || 0,
              reOrderQty: row[96] || 0,
            },
            "Head-Office": {
              openingQty: row[15] || 0,
              leadTime: row[28] || "",
              liveStock: row[58] || 0,
              maxLevel: row[40] || 0,
              tallyQty: row[59] || 0,
              differentQty: row[60] || 0,
              indentRaised: row[65] || 0,
              poQty: row[69] || 0,
              materialTransit: row[73] || 0,
              pendingPO: row[77] || 0,
              totalReceived: row[81] || 0,
              totalSales: row[89] || 0,
              targetQty: row[93] || 0,
              reOrderQty: row[97] || 0,
            }
          };
        });

        setInventoryData(items);
      } else {
        throw new Error(data.error || "Failed to fetch data from Apps Script");
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
      allColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
    );
  };

  const hideAllColumns = () => {
    setVisibleColumns(
      allColumns.reduce((acc, col) => ({ ...acc, [col.key]: false }), {})
    );
  };

  const getUniqueGroups = () => {
    const groups = [...new Set(inventoryData.map((item) => item.group))];
    return groups.filter((group) => group).sort();
  };

  const filteredData = useMemo(() => {
    let filtered = inventoryData;

    if (searchTerm) {
      filtered = filtered.filter((item) => {
        const searchableFields = [
          item.group,
          item.category,
          item.itemName,
          item.itemCode,
        ];

        return searchableFields.some(
          (field) =>
            field &&
            String(field).toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    if (itemNameFilter !== "all") {
      filtered = filtered.filter((item) => item.group === itemNameFilter);
    }

    if (stockFilter !== "all") {
      filtered = filtered.filter((item) => {
        const liveStock = item[activeTab]?.liveStock || 0;
        if (stockFilter === "zero") return liveStock === 0;
        if (stockFilter === "non-zero") return liveStock > 0;
        return true;
      });
    }

    return filtered;
  }, [inventoryData, searchTerm, itemNameFilter, stockFilter, activeTab]);

  const renderCellContent = (item, columnKey) => {
    if (commonColumns.find(c => c.key === columnKey)) {
      return item[columnKey] || "";
    }
    
    const value = item[activeTab]?.[columnKey] ?? "";
    
    // Format quantity columns to 0 decimal places if they are numbers
    const qtyColumns = [
      "liveStock", "maxLevel", "tallyQty", "differentQty", 
      "indentRaised", "poQty", "materialTransit", "pendingPO", 
      "targetQty", "openingQty", "totalSales", "totalReceived", "reOrderQty"
    ];

    if (qtyColumns.includes(columnKey) && value !== "" && !isNaN(value)) {
      return Number(value).toFixed(0);
    }
    
    return value;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-violet-600" />
        <span className="ml-2 text-gray-700">Loading inventory data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-red-600 mb-2">Error Loading Data</h1>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchInventoryData}
          className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 flex items-center"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Top Header Section */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            IMS - Inventory Management
          </h1>
          
          <div className="flex flex-1 max-w-md items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by Group, Category, Name, Code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <button
              onClick={fetchInventoryData}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 flex items-center shrink-0"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Tabs and Data Table Section */}
        <div className="bg-white rounded-lg shadow">
          {/* Section Header with Filter and visibility */}
          <div className="p-6 border-b flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">Inventory Items</h2>
              <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full text-xs font-medium">
                {filteredData.length} records
              </span>
            </div>

            <div className="flex items-center gap-4">
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
              >
                <option value="all">All Stock</option>
                <option value="zero">Zero</option>
                <option value="non-zero">Non-Zero</option>
              </select>

              <select
                value={itemNameFilter}
                onChange={(e) => setItemNameFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
              >
                <option value="all">All Groups</option>
                {getUniqueGroups().map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 flex items-center">
                    <Settings className="h-4 w-4 mr-2" />
                    Columns
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto">
                  <DropdownMenuLabel>Show/Hide Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="flex gap-2 p-2">
                    <button onClick={showAllColumns} className="px-3 py-1 text-sm border rounded hover:bg-gray-100">Show All</button>
                    <button onClick={hideAllColumns} className="px-3 py-1 text-sm border rounded hover:bg-gray-100">Hide All</button>
                  </div>
                  <DropdownMenuSeparator />
                  <div className="p-2 space-y-2">
                    {allColumns.map((column) => (
                      <div key={column.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`col-${column.key}`}
                          checked={visibleColumns[column.key]}
                          onCheckedChange={() => toggleColumn(column.key)}
                        />
                        <Label htmlFor={`col-${column.key}`} className="text-sm">
                          {column.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="px-6 py-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-gray-100 p-1 mb-4">
                {availableTabs.map((tab) => (
                  <TabsTrigger key={tab.key} value={tab.key} className="px-6">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-auto max-h-[60vh]">
                <table className="w-full min-w-max border-collapse">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      {allColumns
                        .filter((col) => visibleColumns[col.key])
                        .map((column) => {
                          const isWrapped = ["itemName", "group"].includes(column.key);
                          const isTabColumn = tabColumns.some(c => c.key === column.key);
                          const width = column.key === "itemName" ? "200px" : column.key === "group" ? "120px" : "150px";
                          
                          return (
                            <th
                              key={column.key}
                              className={`bg-gray-50 font-semibold text-gray-900 border-b border-gray-200 px-4 py-3 ${
                                isTabColumn ? "text-center" : "text-left"
                              } text-sm ${
                                isWrapped ? "whitespace-normal" : "whitespace-nowrap"
                              }`}
                              style={{ minWidth: width, width: isWrapped ? width : "auto" }}
                            >
                              {column.label}
                            </th>
                          );
                        })}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 border-b transition-colors">
                        {allColumns
                          .filter((col) => visibleColumns[col.key])
                          .map((column) => {
                            const isWrapped = ["itemName", "group"].includes(column.key);
                            const isTabColumn = tabColumns.some(c => c.key === column.key);
                            const width = column.key === "itemName" ? "200px" : column.key === "group" ? "120px" : null;

                            return (
                              <td
                                key={column.key}
                                className={`px-4 py-3 align-top text-sm text-gray-700 ${
                                  isTabColumn ? "text-center" : "text-left"
                                } ${
                                  isWrapped ? "whitespace-normal break-words" : "whitespace-nowrap"
                                }`}
                                style={isWrapped ? { maxWidth: width } : {}}
                              >
                                {renderCellContent(item, column.key)}
                              </td>
                            );
                          })}
                      </tr>
                    ))}
                    {filteredData.length === 0 && (
                      <tr>
                        <td colSpan={allColumns.length} className="text-center text-gray-500 py-16">
                          No items found matching your criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
