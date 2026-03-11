"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Send, X } from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";

const FormDataPage = () => {
  const SHEET_ID = "1yEsh4yzyvglPXHxo-5PT70VpwVJbxV7wwH8rpU1RFJA";
  const SHEET_NAME = "PR-SR-DN-Data";

  const [selectedSection, setSelectedSection] = useState("sales");

  // Update state structure for multiple items with quantities
  const [itemsWithQuantities, setItemsWithQuantities] = useState({
    sales: [], // [{item: "", quantity: ""}, ...]
    purchase: [], // [{item: "", quantity: ""}, ...]
    delivery: [], // [{item: "", quantity: ""}, ...]
    damage: [], // [{item: "", quantity: "", damageIdentifiedAt: ""}, ...]
  });

  // Add this state
  const [dropdownVisible, setDropdownVisible] = useState({
    customer: false,
    supplier: false,
    dnCustomer: false,

    salesItem: false,
    purchaseItem: false,
    deliveryItem: false,
    damageItem: false,
  });

  const [formData, setFormData] = useState({
    // Sales Return
    salesReturnDate: "",
    invoiceNumber: "",
    srCustomerName: "",
    receivedBy: "",

    // Purchase Return
    purchaseReturnDate: "",
    purchaseInvoiceNo: "",
    purchaseInvoiceDate: "",
    supplierName: "",

    // Delivery Note
    deliveryNote: "",
    deliveryNoteDate: "",
    dnCustomerName: "",

    // Damage Entry
    damageDate: "",
    reasonForDamage: "",
    approvedBy: "",
  });

  // Temporary input for adding new items
  const [tempItemInput, setTempItemInput] = useState({
    sales: { item: "", quantity: "" },
    purchase: { item: "", quantity: "" },
    delivery: { item: "", quantity: "" },
    damage: { item: "", quantity: "", damageIdentifiedAt: "" },
  });

  const [masterData, setMasterData] = useState({
    customers: [],
    suppliers: [],
    items: [],
  });
  const [searchTerm, setSearchTerm] = useState({
    customer: "",
    supplier: "",
    dnCustomer: "",
    salesItem: "",
    purchaseItem: "",
    deliveryItem: "",
    damageItem: "",
  });

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    fetchData();
    fetchMasterData();
  }, []);

  const formatDateTime = (dateValue) => {
    if (!dateValue) return "";
    let d = new Date(dateValue);
    if (typeof dateValue === "number") {
      const excelEpoch = new Date(1899, 11, 30);
      const msPerDay = 24 * 60 * 60 * 1000;
      d = new Date(excelEpoch.getTime() + dateValue * msPerDay);
    }

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  const formatDate = (date) => {
    if (!date) return "";

    if (typeof date === "string" && date.startsWith("Date(")) {
      try {
        const match = date.match(/Date\((\d+),(\d+),(\d+)\)/);
        if (match) {
          const year = parseInt(match[1]);
          const month = parseInt(match[2]);
          const day = parseInt(match[3]);
          const d = new Date(year, month, day);

          const formattedDay = String(d.getDate()).padStart(2, "0");
          const formattedMonth = String(d.getMonth() + 1).padStart(2, "0");
          const formattedYear = d.getFullYear();

          return `${formattedDay}/${formattedMonth}/${formattedYear}`;
        }
      } catch (error) {
        console.error("Error parsing date string:", error);
      }
    }

    let d = new Date(date);
    if (typeof date === "number") {
      const excelEpoch = new Date(1899, 11, 30);
      const msPerDay = 24 * 60 * 60 * 1000;
      d = new Date(excelEpoch.getTime() + date * msPerDay);
    }

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`
      );
      const text = await response.text();
      const json = JSON.parse(text.substring(47).slice(0, -2));

      const rows = json.table.rows.slice(0).map((row) => ({
        timestamp: formatDateTime(row.c[0]?.v) || "",
        status: row.c[1]?.v || "",
        date: formatDate(row.c[2]?.v) || "",
        invoiceNumber: row.c[3]?.v || "",
        customerSupplierName: row.c[4]?.v || "",
        itemName: row.c[5]?.v || "",
        quantity: row.c[6]?.v || "",
        receivedBy: row.c[7]?.v || "",
        reasonForDamage: row.c[8]?.v || "",
        damageIdentifiedAt: row.c[9]?.v || "",
        approvedBy: row.c[10]?.v || "",
      }));

      setTableData(rows);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setMessage("");

    const scriptUrl = `https://script.google.com/macros/s/AKfycbyzW8-RldYx917QpAfO4kY-T8_ntg__T0sbr7Yup2ZTVb1FC5H1g6TYuJgAU6wTquVM/exec`;

    try {
      // Prepare data for each section
      const rowsToInsert = [];

      // Helper function to add rows
      const addRows = (section, status, date, invoiceNumber, customerSupplier, receivedBy, reason, damageAt, approved) => {
        const items = itemsWithQuantities[section];
        items.forEach((itemData) => {
          rowsToInsert.push([
            new Date().toISOString(),
            status,
            date,
            invoiceNumber,
            customerSupplier,
            itemData.item,
            itemData.quantity,
            receivedBy,
            reason,
            itemData.damageIdentifiedAt || damageAt,
            approved,
          ]);
        });
      };

      // Add rows for each section
      if (selectedSection === "sales" && itemsWithQuantities.sales.length > 0) {
        addRows(
          "sales",
          "Sales Return Section",
          formData.salesReturnDate,
          formData.invoiceNumber,
          formData.srCustomerName,
          formData.receivedBy,
          "",
          "",
          ""
        );
      }

      if (selectedSection === "purchase" && itemsWithQuantities.purchase.length > 0) {
        addRows(
          "purchase",
          "Purchase Return Section",
          formData.purchaseReturnDate,
          formData.purchaseInvoiceNo,
          formData.supplierName,
          "",
          "",
          "",
          ""
        );
      }

      if (selectedSection === "delivery" && itemsWithQuantities.delivery.length > 0) {
        addRows(
          "delivery",
          "Delivery Note Section",
          formData.deliveryNoteDate,
          formData.deliveryNote,
          formData.dnCustomerName,
          "",
          "",
          "",
          ""
        );
      }

      if (selectedSection === "damage" && itemsWithQuantities.damage.length > 0) {
        addRows(
          "damage",
          "Damage Entry Section",
          formData.damageDate,
          "",
          "",
          "",
          formData.reasonForDamage,
          "", // This will be overwritten by item-specific damageIdentifiedAt
          formData.approvedBy
        );
      }

      // Send all rows
      for (const rowData of rowsToInsert) {
        const dataToSend = new URLSearchParams({
          action: "insertPRSRDN",
          sheetName: SHEET_NAME,
          rowData: JSON.stringify(rowData),
        });

        await fetch(scriptUrl, {
          method: "POST",
          body: dataToSend,
        });
      }

      setMessage(`${rowsToInsert.length} record(s) submitted successfully!`);

      // Reset form
      setItemsWithQuantities({
        sales: [],
        purchase: [],
        delivery: [],
        damage: [],
      });

      setTempItemInput({
        sales: { item: "", quantity: "" },
        purchase: { item: "", quantity: "" },
        delivery: { item: "", quantity: "" },
        damage: { item: "", quantity: "", damageIdentifiedAt: "" },
      });

      setFormData({
        salesReturnDate: "",
        invoiceNumber: "",
        srCustomerName: "",
        receivedBy: "",
        purchaseReturnDate: "",
        purchaseInvoiceNo: "",
        purchaseInvoiceDate: "",
        supplierName: "",
        deliveryNote: "",
        deliveryNoteDate: "",
        dnCustomerName: "",
        damageDate: "",
        reasonForDamage: "",
        approvedBy: "",
      });

      // Fetch new data and close form
      await fetchData();
      setIsFormOpen(false);

      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("Error submitting form. Please try again.");
      console.error("Error:", error);
    }
    setLoading(false);
  };

  const fetchMasterData = async () => {
    const MASTER_SHEET_ID = "1DpJWUnXKsS7C4mHva9ZkX4bOC51A9xugDKAX8eUDiR0";
    try {
      const response = await fetch(
        `https://docs.google.com/spreadsheets/d/${MASTER_SHEET_ID}/gviz/tq?tqx=out:json&sheet=Master`
      );
      const text = await response.text();
      const json = JSON.parse(text.substring(47).slice(0, -2));

      const customers = [];
      const suppliers = [];
      const items = [];

      json.table.rows.forEach((row) => {
        if (row.c[0]?.v) customers.push(row.c[0].v);
        if (row.c[2]?.v) suppliers.push(row.c[2].v);
        if (row.c[4]?.v) items.push(row.c[4].v);
      });

      setMasterData({
        customers: [...new Set(customers)],
        suppliers: [...new Set(suppliers)],
        items: [...new Set(items)],
      });
    } catch (error) {
      console.error("Error fetching master data:", error);
    }
  };

  const getFilteredCustomers = () => {
    const searchValue = formData.srCustomerName.toLowerCase();
    return masterData.customers.filter((customer) =>
      customer.toLowerCase().includes(searchValue)
    );
  };

  const getFilteredSuppliers = () => {
    const searchValue = formData.supplierName.toLowerCase();
    return masterData.suppliers.filter((supplier) =>
      supplier.toLowerCase().includes(searchValue)
    );
  };

  const getFilteredDNCustomers = () => {
    const searchValue = formData.dnCustomerName.toLowerCase();
    return masterData.customers.filter((customer) =>
      customer.toLowerCase().includes(searchValue)
    );
  };

  const getFilteredItems = (section) => {
    const searchValue = tempItemInput[section].item.toLowerCase();
    return masterData.items.filter((item) =>
      item.toLowerCase().includes(searchValue)
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    if (name === "srCustomerName" || name === "dnCustomerName") {
      setSearchTerm((prev) => ({ ...prev, customer: value }));
    }
    if (name === "supplierName") {
      setSearchTerm((prev) => ({ ...prev, supplier: value }));
    }
  };

  const handleTempItemChange = (section, field, value) => {
    setTempItemInput((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const addItem = (section) => {
    const input = tempItemInput[section];
    if (!input.item.trim()) return;

    // For damage section, require damageIdentifiedAt
    if (section === "damage" && !input.damageIdentifiedAt) {
      alert("Please select Damage Identified At for damage items");
      return;
    }

    // Check if item already exists
    const exists = itemsWithQuantities[section].some(
      (item) => item.item === input.item.trim()
    );
    if (exists) {
      alert("Item already added");
      return;
    }

    setItemsWithQuantities((prev) => ({
      ...prev,
      [section]: [
        ...prev[section],
        {
          item: input.item.trim(),
          quantity: input.quantity,
          damageIdentifiedAt: section === "damage" ? input.damageIdentifiedAt : "",
        },
      ],
    }));

    // Reset temp input
    setTempItemInput((prev) => ({
      ...prev,
      [section]: section === "damage"
        ? { item: "", quantity: "", damageIdentifiedAt: "" }
        : { item: "", quantity: "" }
    }));
  };

  const removeItem = (section, index) => {
    setItemsWithQuantities((prev) => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== index),
    }));
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">
              Data Management System
            </h1>
            <button
              onClick={() => setIsFormOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg"
            >
              <Plus size={20} />
              Add Entry
            </button>
          </div>

          {/* Success/Error Message */}
          {message && (
            <div
              className={`mb-4 p-4 rounded-lg text-center font-medium ${message.includes("success")
                ? "bg-green-100 text-green-700 border border-green-300"
                : "bg-red-100 text-red-700 border border-red-300"
                }`}
            >
              {message}
            </div>
          )}

          {/* Modal Form */}
          {isFormOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-800">
                    Add New Entry
                  </h2>
                  <button
                    onClick={() => setIsFormOpen(false)}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Section selector */}
                <div className="mb-6">
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-4"
                  >
                    <option value="sales">Sales Return Section</option>
                    <option value="purchase">Purchase Return Section</option>
                    <option value="delivery">Delivery Note Section</option>
                    <option value="damage">Damage Entry Section</option>
                  </select>
                </div>

                <div className="p-6">
                  {/* Sales Return Section */}
                  {selectedSection === "sales" && (
                    <div className="mb-8">
                      <h3 className="text-xl font-semibold text-blue-600 mb-4 border-b-2 border-blue-200 pb-2">
                        Sales Return Section
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Sales Return Date
                          </label>
                          <input
                            type="date"
                            name="salesReturnDate"
                            value={formData.salesReturnDate}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Invoice Number
                          </label>
                          <input
                            type="text"
                            name="invoiceNumber"
                            value={formData.invoiceNumber}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Customer Name
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              name="srCustomerName"
                              value={formData.srCustomerName}
                              onChange={(e) => {
                                handleChange(e);
                                setDropdownVisible((prev) => ({
                                  ...prev,
                                  customer: true,
                                }));
                              }}
                              onFocus={() =>
                                setDropdownVisible((prev) => ({
                                  ...prev,
                                  customer: true,
                                }))
                              }
                              onBlur={() => {
                                setTimeout(() => {
                                  setDropdownVisible((prev) => ({
                                    ...prev,
                                    customer: false,
                                  }));
                                }, 200);
                              }}
                              placeholder="Select or type customer name"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {dropdownVisible.customer &&
                              getFilteredCustomers().length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                  {getFilteredCustomers().map(
                                    (customer, idx) => (
                                      <div
                                        key={idx}
                                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          setFormData({
                                            ...formData,
                                            srCustomerName: customer,
                                          });
                                          setDropdownVisible((prev) => ({
                                            ...prev,
                                            customer: false,
                                          }));
                                        }}
                                      >
                                        {customer}
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Received By
                          </label>
                          <input
                            type="text"
                            name="receivedBy"
                            value={formData.receivedBy}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Item and Quantity Input */}
                      <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-blue-50">
                        <h4 className="font-medium text-blue-700 mb-3">Add Items</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Item Name
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={tempItemInput.sales.item}
                                onChange={(e) => handleTempItemChange("sales", "item", e.target.value)}
                                onFocus={() =>
                                  setDropdownVisible((prev) => ({
                                    ...prev,
                                    salesItem: true,
                                  }))
                                }
                                onBlur={() =>
                                  setTimeout(
                                    () =>
                                      setDropdownVisible((prev) => ({
                                        ...prev,
                                        salesItem: false,
                                      })),
                                    200
                                  )
                                }
                                placeholder="Select or type item name"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              {dropdownVisible.salesItem &&
                                getFilteredItems("sales").length > 0 && (
                                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                    {getFilteredItems("sales").map((item, idx) => (
                                      <div
                                        key={idx}
                                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          handleTempItemChange("sales", "item", item);
                                        }}
                                      >
                                        {item}
                                      </div>
                                    ))}
                                  </div>
                                )}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Quantity Received
                            </label>
                            <input
                              type="number"
                              value={tempItemInput.sales.quantity}
                              onChange={(e) => handleTempItemChange("sales", "quantity", e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              onClick={() => addItem("sales")}
                              className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-medium"
                            >
                              Add Item
                            </button>
                          </div>
                        </div>

                        {/* Selected Items Table */}
                        {itemsWithQuantities.sales.length > 0 && (
                          <div className="mt-4">
                            <h5 className="font-medium text-gray-700 mb-2">Selected Items:</h5>
                            <div className="overflow-x-auto">
                              <table className="min-w-full bg-white border border-gray-300">
                                <thead>
                                  <tr className="bg-blue-100">
                                    <th className="px-3 py-2 border text-left">Item Name</th>
                                    <th className="px-3 py-2 border text-left">Quantity</th>
                                    <th className="px-3 py-2 border text-left">Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {itemsWithQuantities.sales.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-blue-50">
                                      <td className="px-3 py-2 border">{item.item}</td>
                                      <td className="px-3 py-2 border">{item.quantity}</td>
                                      <td className="px-3 py-2 border">
                                        <button
                                          onClick={() => removeItem("sales", idx)}
                                          className="text-red-600 hover:text-red-800"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Purchase Return Section */}
                  {selectedSection === "purchase" && (
                    <div className="mb-8">
                      <h3 className="text-xl font-semibold text-green-600 mb-4 border-b-2 border-green-200 pb-2">
                        Purchase Return Section
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Purchase Return Date
                          </label>
                          <input
                            type="date"
                            name="purchaseReturnDate"
                            value={formData.purchaseReturnDate}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Purchase Invoice No.
                          </label>
                          <input
                            type="text"
                            name="purchaseInvoiceNo"
                            value={formData.purchaseInvoiceNo}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Purchase Invoice Date
                          </label>
                          <input
                            type="date"
                            name="purchaseInvoiceDate"
                            value={formData.purchaseInvoiceDate}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Supplier Name
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              name="supplierName"
                              value={formData.supplierName}
                              onChange={(e) => {
                                handleChange(e);
                                setDropdownVisible((prev) => ({
                                  ...prev,
                                  supplier: true,
                                }));
                              }}
                              onFocus={() =>
                                setDropdownVisible((prev) => ({
                                  ...prev,
                                  supplier: true,
                                }))
                              }
                              onBlur={() => {
                                setTimeout(() => {
                                  setDropdownVisible((prev) => ({
                                    ...prev,
                                    supplier: false,
                                  }));
                                }, 200);
                              }}
                              placeholder="Select or type supplier name"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                            {dropdownVisible.supplier &&
                              getFilteredSuppliers().length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                  {getFilteredSuppliers().map((supplier, idx) => (
                                    <div
                                      key={idx}
                                      className="px-3 py-2 hover:bg-green-50 cursor-pointer"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        setFormData({
                                          ...formData,
                                          supplierName: supplier,
                                        });
                                        setDropdownVisible((prev) => ({
                                          ...prev,
                                          supplier: false,
                                        }));
                                      }}
                                    >
                                      {supplier}
                                    </div>
                                  ))}
                                </div>
                              )}
                          </div>
                        </div>
                      </div>

                      {/* Item and Quantity Input */}
                      <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-green-50">
                        <h4 className="font-medium text-green-700 mb-3">Add Items</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Item Name
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={tempItemInput.purchase.item}
                                onChange={(e) => handleTempItemChange("purchase", "item", e.target.value)}
                                onFocus={() =>
                                  setDropdownVisible((prev) => ({
                                    ...prev,
                                    purchaseItem: true,
                                  }))
                                }
                                onBlur={() =>
                                  setTimeout(
                                    () =>
                                      setDropdownVisible((prev) => ({
                                        ...prev,
                                        purchaseItem: false,
                                      })),
                                    200
                                  )
                                }
                                placeholder="Select or type item name"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                              />
                              {dropdownVisible.purchaseItem &&
                                getFilteredItems("purchase").length > 0 && (
                                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                    {getFilteredItems("purchase").map((item, idx) => (
                                      <div
                                        key={idx}
                                        className="px-3 py-2 hover:bg-green-50 cursor-pointer"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          handleTempItemChange("purchase", "item", item);
                                        }}
                                      >
                                        {item}
                                      </div>
                                    ))}
                                  </div>
                                )}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Quantity Returned
                            </label>
                            <input
                              type="number"
                              value={tempItemInput.purchase.quantity}
                              onChange={(e) => handleTempItemChange("purchase", "quantity", e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              onClick={() => addItem("purchase")}
                              className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 font-medium"
                            >
                              Add Item
                            </button>
                          </div>
                        </div>

                        {/* Selected Items Table */}
                        {itemsWithQuantities.purchase.length > 0 && (
                          <div className="mt-4">
                            <h5 className="font-medium text-gray-700 mb-2">Selected Items:</h5>
                            <div className="overflow-x-auto">
                              <table className="min-w-full bg-white border border-gray-300">
                                <thead>
                                  <tr className="bg-green-100">
                                    <th className="px-3 py-2 border text-left">Item Name</th>
                                    <th className="px-3 py-2 border text-left">Quantity</th>
                                    <th className="px-3 py-2 border text-left">Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {itemsWithQuantities.purchase.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-green-50">
                                      <td className="px-3 py-2 border">{item.item}</td>
                                      <td className="px-3 py-2 border">{item.quantity}</td>
                                      <td className="px-3 py-2 border">
                                        <button
                                          onClick={() => removeItem("purchase", idx)}
                                          className="text-red-600 hover:text-red-800"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Delivery Note Section */}
                  {selectedSection === "delivery" && (
                    <div className="mb-8">
                      <h3 className="text-xl font-semibold text-purple-600 mb-4 border-b-2 border-purple-200 pb-2">
                        Delivery Note Section
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Delivery Note
                          </label>
                          <input
                            type="text"
                            name="deliveryNote"
                            value={formData.deliveryNote}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Delivery Note Date
                          </label>
                          <input
                            type="date"
                            name="deliveryNoteDate"
                            value={formData.deliveryNoteDate}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Customer Name
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              name="dnCustomerName"
                              value={formData.dnCustomerName}
                              onChange={(e) => {
                                handleChange(e);
                                setDropdownVisible((prev) => ({
                                  ...prev,
                                  dnCustomer: true,
                                }));
                              }}
                              onFocus={() =>
                                setDropdownVisible((prev) => ({
                                  ...prev,
                                  dnCustomer: true,
                                }))
                              }
                              onBlur={() => {
                                setTimeout(() => {
                                  setDropdownVisible((prev) => ({
                                    ...prev,
                                    dnCustomer: false,
                                  }));
                                }, 200);
                              }}
                              placeholder="Select or type customer name"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            {dropdownVisible.dnCustomer &&
                              getFilteredDNCustomers().length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                  {getFilteredDNCustomers().map((customer, idx) => (
                                    <div
                                      key={idx}
                                      className="px-3 py-2 hover:bg-purple-50 cursor-pointer"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        setFormData({
                                          ...formData,
                                          dnCustomerName: customer,
                                        });
                                        setDropdownVisible((prev) => ({
                                          ...prev,
                                          dnCustomer: false,
                                        }));
                                      }}
                                    >
                                      {customer}
                                    </div>
                                  ))}
                                </div>
                              )}
                          </div>
                        </div>
                      </div>

                      {/* Item and Quantity Input */}
                      <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-purple-50">
                        <h4 className="font-medium text-purple-700 mb-3">Add Items</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Item Name
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={tempItemInput.delivery.item}
                                onChange={(e) => handleTempItemChange("delivery", "item", e.target.value)}
                                onFocus={() =>
                                  setDropdownVisible((prev) => ({
                                    ...prev,
                                    deliveryItem: true,
                                  }))
                                }
                                onBlur={() =>
                                  setTimeout(
                                    () =>
                                      setDropdownVisible((prev) => ({
                                        ...prev,
                                        deliveryItem: false,
                                      })),
                                    200
                                  )
                                }
                                placeholder="Select or type item name"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                              />
                              {dropdownVisible.deliveryItem &&
                                getFilteredItems("delivery").length > 0 && (
                                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                    {getFilteredItems("delivery").map((item, idx) => (
                                      <div
                                        key={idx}
                                        className="px-3 py-2 hover:bg-purple-50 cursor-pointer"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          handleTempItemChange("delivery", "item", item);
                                        }}
                                      >
                                        {item}
                                      </div>
                                    ))}
                                  </div>
                                )}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Quantity Dispatched
                            </label>
                            <input
                              type="number"
                              value={tempItemInput.delivery.quantity}
                              onChange={(e) => handleTempItemChange("delivery", "quantity", e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              onClick={() => addItem("delivery")}
                              className="w-full px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 font-medium"
                            >
                              Add Item
                            </button>
                          </div>
                        </div>

                        {/* Selected Items Table */}
                        {itemsWithQuantities.delivery.length > 0 && (
                          <div className="mt-4">
                            <h5 className="font-medium text-gray-700 mb-2">Selected Items:</h5>
                            <div className="overflow-x-auto">
                              <table className="min-w-full bg-white border border-gray-300">
                                <thead>
                                  <tr className="bg-purple-100">
                                    <th className="px-3 py-2 border text-left">Item Name</th>
                                    <th className="px-3 py-2 border text-left">Quantity</th>
                                    <th className="px-3 py-2 border text-left">Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {itemsWithQuantities.delivery.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-purple-50">
                                      <td className="px-3 py-2 border">{item.item}</td>
                                      <td className="px-3 py-2 border">{item.quantity}</td>
                                      <td className="px-3 py-2 border">
                                        <button
                                          onClick={() => removeItem("delivery", idx)}
                                          className="text-red-600 hover:text-red-800"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Damage Entry Section */}
                  {selectedSection === "damage" && (
                    <div className="mb-8">
                      <h3 className="text-xl font-semibold text-red-600 mb-4 border-b-2 border-red-200 pb-2">
                        Damage Entry Section
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date
                          </label>
                          <input
                            type="date"
                            name="damageDate"
                            value={formData.damageDate}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Reason for Damage
                          </label>
                          <textarea
                            name="reasonForDamage"
                            value={formData.reasonForDamage}
                            onChange={handleChange}
                            rows="3"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder="Enter reason for damage..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Approved By
                          </label>
                          <select
                            name="approvedBy"
                            value={formData.approvedBy}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                          >
                            <option value="">Select approver</option>
                            <option value="Shashank Sir">Shashank Sir</option>
                            <option value="Subham Sir">Subham Sir</option>
                            <option value="Kishan Sir">Kishan Sir</option>
                            <option value="Neeraj Sir">Neeraj Sir</option>
                          </select>
                        </div>
                      </div>

                      {/* Item, Quantity, and Damage Identified At Input */}
                      <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-red-50">
                        <h4 className="font-medium text-red-700 mb-3">Add Damage Items</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Item Name
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={tempItemInput.damage.item}
                                onChange={(e) => handleTempItemChange("damage", "item", e.target.value)}
                                onFocus={() =>
                                  setDropdownVisible((prev) => ({
                                    ...prev,
                                    damageItem: true,
                                  }))
                                }
                                onBlur={() =>
                                  setTimeout(
                                    () =>
                                      setDropdownVisible((prev) => ({
                                        ...prev,
                                        damageItem: false,
                                      })),
                                    200
                                  )
                                }
                                placeholder="Select or type item name"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                              />
                              {dropdownVisible.damageItem &&
                                getFilteredItems("damage").length > 0 && (
                                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                    {getFilteredItems("damage").map((item, idx) => (
                                      <div
                                        key={idx}
                                        className="px-3 py-2 hover:bg-red-50 cursor-pointer"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          handleTempItemChange("damage", "item", item);
                                        }}
                                      >
                                        {item}
                                      </div>
                                    ))}
                                  </div>
                                )}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Quantity Damaged
                            </label>
                            <input
                              type="number"
                              value={tempItemInput.damage.quantity}
                              onChange={(e) => handleTempItemChange("damage", "quantity", e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Damage Identified At
                            </label>
                            <select
                              value={tempItemInput.damage.damageIdentifiedAt}
                              onChange={(e) => handleTempItemChange("damage", "damageIdentifiedAt", e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                              <option value="">Select location</option>
                              <option value="Warehouse">Warehouse</option>
                              <option value="Transit">Transit</option>
                              <option value="Customer Site">Customer Site</option>
                            </select>
                          </div>
                          <div className="flex items-end">
                            <button
                              onClick={() => addItem("damage")}
                              className="w-full px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 font-medium"
                            >
                              Add Item
                            </button>
                          </div>
                        </div>

                        {/* Selected Items Table */}
                        {itemsWithQuantities.damage.length > 0 && (
                          <div className="mt-4">
                            <h5 className="font-medium text-gray-700 mb-2">Selected Damage Items:</h5>
                            <div className="overflow-x-auto">
                              <table className="min-w-full bg-white border border-gray-300">
                                <thead>
                                  <tr className="bg-red-100">
                                    <th className="px-3 py-2 border text-left">Item Name</th>
                                    <th className="px-3 py-2 border text-left">Quantity</th>
                                    <th className="px-3 py-2 border text-left">Damage Identified At</th>
                                    <th className="px-3 py-2 border text-left">Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {itemsWithQuantities.damage.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-red-50">
                                      <td className="px-3 py-2 border">{item.item}</td>
                                      <td className="px-3 py-2 border">{item.quantity}</td>
                                      <td className="px-3 py-2 border">{item.damageIdentifiedAt}</td>
                                      <td className="px-3 py-2 border">
                                        <button
                                          onClick={() => removeItem("damage", idx)}
                                          className="text-red-600 hover:text-red-800"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setIsFormOpen(false)}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={loading || itemsWithQuantities[selectedSection].length === 0}
                      className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-2 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                      <Send size={20} />
                      {loading ? "Submitting..." : "Submit Form"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Table Section with Fixed Header */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-800">
                Data Records
              </h2>
              <button
                onClick={fetchData}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>

            <div className="overflow-x-auto">
              <div className="max-h-[600px] overflow-y-auto">
                <table className="hidden sm:block min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                        Timestamp
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                        Invoice Number
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                        Customer/Supplier Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                        Item Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                        Received By
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                        Reason for Damage
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                        Damage Identified At
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                        Approved By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tableData.length === 0 ? (
                      <tr>
                        <td
                          colSpan="11"
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          No data available
                        </td>
                      </tr>
                    ) : (
                      tableData.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {row.timestamp}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {row.status}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {row.date}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {row.invoiceNumber}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {row.customerSupplierName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {row.itemName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {row.quantity}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {row.receivedBy}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {row.reasonForDamage}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {row.damageIdentifiedAt}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {row.approvedBy}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Mobile Card View */}
                <div className="sm:hidden space-y-4">
                  {tableData.length === 0 ? (
                    <div className="text-center text-gray-500 p-8">
                      No data available
                    </div>
                  ) : (
                    tableData.map((row, index) => (
                      <div
                        key={index}
                        className="bg-white rounded-lg shadow-md p-4 border border-gray-200"
                      >
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-medium text-sm text-gray-600">Status:</span>
                              <div className="font-medium">
                                {row.status}
                              </div>
                            </div>
                            <div className="text-sm text-gray-500">
                              {row.timestamp}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-sm text-gray-600">Date:</span>
                              <div>{row.date}</div>
                            </div>
                            {row.invoiceNumber && (
                              <div>
                                <span className="text-sm text-gray-600">Invoice:</span>
                                <div>{row.invoiceNumber}</div>
                              </div>
                            )}
                            {row.customerSupplierName && (
                              <div className="col-span-2">
                                <span className="text-sm text-gray-600">Customer/Supplier:</span>
                                <div>{row.customerSupplierName}</div>
                              </div>
                            )}
                            <div className="col-span-2">
                              <span className="text-sm text-gray-600">Item:</span>
                              <div className="font-medium">{row.itemName}</div>
                            </div>
                            <div>
                              <span className="text-sm text-gray-600">Quantity:</span>
                              <div>{row.quantity}</div>
                            </div>
                            {row.receivedBy && (
                              <div>
                                <span className="text-sm text-gray-600">Received By:</span>
                                <div>{row.receivedBy}</div>
                              </div>
                            )}
                            {row.reasonForDamage && (
                              <div className="col-span-2">
                                <span className="text-sm text-gray-600">Reason for Damage:</span>
                                <div>{row.reasonForDamage}</div>
                              </div>
                            )}
                            {row.damageIdentifiedAt && (
                              <div>
                                <span className="text-sm text-gray-600">Identified At:</span>
                                <div>{row.damageIdentifiedAt}</div>
                              </div>
                            )}
                            {row.approvedBy && (
                              <div>
                                <span className="text-sm text-gray-600">Approved By:</span>
                                <div>{row.approvedBy}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default FormDataPage;
