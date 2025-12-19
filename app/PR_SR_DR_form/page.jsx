"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Send, X } from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";

const FormDataPage = () => {
  const SHEET_ID = "1yEsh4yzyvglPXHxo-5PT70VpwVJbxV7wwH8rpU1RFJA";
  const SHEET_NAME = "PR-SR-DN-Data";

  const [selectedSection, setSelectedSection] = useState("sales");

  // Add this state
  const [dropdownVisible, setDropdownVisible] = useState({
    customer: false,
    supplier: false,
    item: false,
    dnCustomer: false,
    damageItem: false,
  });

  const [formData, setFormData] = useState({
    salesReturnDate: "",
    invoiceNumber: "",
    srCustomerName: "",
    quantityReceived: "",
    itemName: "",
    receivedBy: "",

    purchaseReturnDate: "",
    purchaseInvoiceNo: "",
    purchaseInvoiceDate: "",
    supplierName: "",
    quantityReturned: "",
    prItemName: "",

    deliveryNote: "",
    deliveryNoteDate: "",
    dnCustomerName: "",
    quantityDispatched: "",
    dnItemName: "",

    damageDate: "",
    damageItemName: "",
    quantityDamaged: "",
    reasonForDamage: "",
    damageIdentifiedAt: "",
    approvedBy: "",
  });

  const [masterData, setMasterData] = useState({
    customers: [],
    suppliers: [],
    items: [],
  });
  const [searchTerm, setSearchTerm] = useState({
    customer: "",
    supplier: "",
    item: "",
    dnCustomer: "",
    damageItem: "",
  });

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const formatDateTime = (dateValue) => {
    if (!dateValue) return "";
    let d = new Date(dateValue);
    // Handle Google Sheets serial date format (if needed)
    if (typeof dateValue === "number") {
      // Convert from Excel/Google Sheets serial date
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

    // Check if date is in Date(YYYY,MM,DD) format
    if (typeof date === "string" && date.startsWith("Date(")) {
      // Parse Date(2025,11,27) format
      try {
        const match = date.match(/Date\((\d+),(\d+),(\d+)\)/);
        if (match) {
          const year = parseInt(match[1]);
          const month = parseInt(match[2]); // Already 0-indexed in this format
          const day = parseInt(match[3]);
          const d = new Date(year, month, day);

          const formattedDay = String(d.getDate()).padStart(2, "0");
          const formattedMonth = String(d.getMonth() + 1).padStart(2, "0"); // +1 to make it 1-indexed
          const formattedYear = d.getFullYear();

          return `${formattedDay}/${formattedMonth}/${formattedYear}`;
        }
      } catch (error) {
        console.error("Error parsing date string:", error);
      }
    }

    // Handle other date formats (numbers, regular dates, etc.)
    let d = new Date(date);
    if (typeof date === "number") {
      // Convert from Excel/Google Sheets serial date
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
        salesReturnDate: formatDate(row.c[1]?.v) || "",
        invoiceNumber: row.c[2]?.v || "",
        srCustomerName: row.c[3]?.v || "",
        quantityReceived: row.c[4]?.v || "",
        itemName: row.c[5]?.v || "",
        receivedBy: row.c[6]?.v || "",
        purchaseReturnDate: formatDate(row.c[7]?.v) || "",
        purchaseInvoiceNo: row.c[8]?.v || "",
        purchaseInvoiceDate: formatDate(row.c[9]?.v) || "",
        supplierName: row.c[10]?.v || "",
        quantityReturned: row.c[11]?.v || "",
        prItemName: row.c[12]?.v || "", // ADD THIS - Column M (index 12)
        deliveryNote: row.c[13]?.v || "", // CHANGE from index 12 to 13
        deliveryNoteDate: formatDate(row.c[14]?.v) || "", // CHANGE from index 13 to 14
        dnCustomerName: row.c[15]?.v || "", // CHANGE from index 14 to 15
        quantityDispatched: row.c[16]?.v || "", // CHANGE from index 15 to 16
        dnItemName: row.c[17]?.v || "", // ADD THIS - Column R (index 17)

        damageDate: formatDate(row.c[18]?.v) || "",
        damageItemName: row.c[19]?.v || "",
        quantityDamaged: row.c[20]?.v || "",
        reasonForDamage: row.c[21]?.v || "",
        damageIdentifiedAt: row.c[22]?.v || "",
        approvedBy: row.c[23]?.v || "",
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
      const dataToSend = new URLSearchParams({
        action: "insertPRSRDN",
        sheetName: SHEET_NAME,
        rowData: JSON.stringify([
          new Date().toISOString(),
          formData.salesReturnDate,
          formData.invoiceNumber,
          formData.srCustomerName,
          formData.quantityReceived,
          formData.itemName,
          formData.receivedBy,
          formData.purchaseReturnDate,
          formData.purchaseInvoiceNo,
          formData.purchaseInvoiceDate,
          formData.supplierName,
          formData.quantityReturned,
          formData.prItemName, // ADD THIS - Column M

          formData.deliveryNote,
          formData.deliveryNoteDate,
          formData.dnCustomerName,
          formData.quantityDispatched,
          formData.dnItemName,

          formData.damageDate,
          formData.damageItemName,
          formData.quantityDamaged,
          formData.reasonForDamage,
          formData.damageIdentifiedAt,
          formData.approvedBy,
        ]),
      });

      await fetch(scriptUrl, {
        method: "POST",
        body: dataToSend,
      });

      setMessage("Form submitted successfully!");
      setFormData({
        salesReturnDate: "",
        invoiceNumber: "",
        srCustomerName: "",
        quantityReceived: "",
        itemName: "",
        receivedBy: "",
        purchaseReturnDate: "",
        purchaseInvoiceNo: "",
        purchaseInvoiceDate: "",
        supplierName: "",
        quantityReturned: "",
        prItemName: "",

        deliveryNote: "",
        deliveryNoteDate: "",
        dnCustomerName: "",
        quantityDispatched: "",
        dnItemName: "",
      });

      // Immediately fetch new data and close form
      await fetchData();
      setIsFormOpen(false);

      // Clear message after 3 seconds
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

      // Process rows
      json.table.rows.forEach((row) => {
        // Column A - Customer Name
        if (row.c[0]?.v) customers.push(row.c[0].v);
        // Column C - Supplier Name
        if (row.c[2]?.v) suppliers.push(row.c[2].v);
        // Column E - Item Name
        if (row.c[4]?.v) items.push(row.c[4].v);
      });

      // Remove duplicates
      setMasterData({
        customers: [...new Set(customers)],
        suppliers: [...new Set(suppliers)],
        items: [...new Set(items)],
      });
    } catch (error) {
      console.error("Error fetching master data:", error);
    }
  };

  // Call in useEffect
  useEffect(() => {
    fetchData();
    fetchMasterData();
  }, []);

  const getFilteredCustomers = () => {
    const searchValue = formData.srCustomerName.toLowerCase();
    return masterData.customers.filter((customer) =>
      customer.toLowerCase().includes(searchValue)
    );
  };

  const getFilteredItems = () => {
    const searchValue = formData.itemName.toLowerCase();
    return masterData.items.filter((item) =>
      item.toLowerCase().includes(searchValue)
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Update search terms for relevant fields
    if (name === "srCustomerName" || name === "dnCustomerName") {
      setSearchTerm((prev) => ({ ...prev, customer: value }));
    }
    if (name === "supplierName") {
      setSearchTerm((prev) => ({ ...prev, supplier: value }));
    }
    if (name === "itemName") {
      setSearchTerm((prev) => ({ ...prev, item: value }));
    }
  };

  console.log("masterdata", masterData);

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
              className={`mb-4 p-4 rounded-lg text-center font-medium ${
                message.includes("success")
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

                {/* Inside the modal form, after the header */}
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
                  {selectedSection === "sales" && (
                    <div className="mb-8">
                      <h3 className="text-xl font-semibold text-blue-600 mb-4 border-b-2 border-blue-200 pb-2">
                        Sales Return Section
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                                // Delay closing so user can click on dropdown items
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

                            {/* Dropdown show condition change */}
                            {dropdownVisible.customer &&
                              getFilteredCustomers().length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                  {getFilteredCustomers().map(
                                    (customer, idx) => (
                                      <div
                                        key={idx}
                                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                                        onMouseDown={(e) => {
                                          e.preventDefault(); // Prevent input blur
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
                            Quantity Received
                          </label>
                          <input
                            type="number"
                            name="quantityReceived"
                            value={formData.quantityReceived}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Item Name
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              name="itemName"
                              value={formData.itemName}
                              onChange={(e) => {
                                handleChange(e);
                                setDropdownVisible((prev) => ({
                                  ...prev,
                                  item: true,
                                }));
                              }}
                              onFocus={() =>
                                setDropdownVisible((prev) => ({
                                  ...prev,
                                  item: true,
                                }))
                              }
                              onBlur={() => {
                                setTimeout(() => {
                                  setDropdownVisible((prev) => ({
                                    ...prev,
                                    item: false,
                                  }));
                                }, 200);
                              }}
                              placeholder="Select or type item name"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />

                            {dropdownVisible.item &&
                              getFilteredItems().length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                  {getFilteredItems().map((item, idx) => (
                                    <div
                                      key={idx}
                                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        setFormData({
                                          ...formData,
                                          itemName: item,
                                        });
                                        setDropdownVisible((prev) => ({
                                          ...prev,
                                          item: false,
                                        }));
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
                    </div>
                  )}

                  {selectedSection === "purchase" && (
                    <div className="mb-8">
                      <h3 className="text-xl font-semibold text-green-600 mb-4 border-b-2 border-green-200 pb-2">
                        Purchase Return Section
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                                  {getFilteredSuppliers().map(
                                    (supplier, idx) => (
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
                                    )
                                  )}
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
                            name="quantityReturned"
                            value={formData.quantityReturned}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Item Name
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              name="prItemName"
                              value={formData.prItemName}
                              onChange={(e) => {
                                handleChange(e);
                                setDropdownVisible((prev) => ({
                                  ...prev,
                                  prItem: true,
                                }));
                              }}
                              onFocus={() =>
                                setDropdownVisible((prev) => ({
                                  ...prev,
                                  prItem: true,
                                }))
                              }
                              onBlur={() => {
                                setTimeout(() => {
                                  setDropdownVisible((prev) => ({
                                    ...prev,
                                    prItem: false,
                                  }));
                                }, 200);
                              }}
                              placeholder="Select or type item name"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            />

                            {dropdownVisible.prItem &&
                              getFilteredItems().length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                  {getFilteredItems().map((item, idx) => (
                                    <div
                                      key={idx}
                                      className="px-3 py-2 hover:bg-green-50 cursor-pointer"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        setFormData({
                                          ...formData,
                                          prItemName: item,
                                        });
                                        setDropdownVisible((prev) => ({
                                          ...prev,
                                          prItem: false,
                                        }));
                                      }}
                                    >
                                      {item}
                                    </div>
                                  ))}
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedSection === "delivery" && (
                    <div className="mb-6">
                      <h3 className="text-xl font-semibold text-purple-600 mb-4 border-b-2 border-purple-200 pb-2">
                        Delivery Note Section
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                                  {getFilteredDNCustomers().map(
                                    (customer, idx) => (
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
                                    )
                                  )}
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
                            name="quantityDispatched"
                            value={formData.quantityDispatched}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Item Name
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              name="dnItemName"
                              value={formData.dnItemName}
                              onChange={(e) => {
                                handleChange(e);
                                setDropdownVisible((prev) => ({
                                  ...prev,
                                  dnItem: true,
                                }));
                              }}
                              onFocus={() =>
                                setDropdownVisible((prev) => ({
                                  ...prev,
                                  dnItem: true,
                                }))
                              }
                              onBlur={() => {
                                setTimeout(() => {
                                  setDropdownVisible((prev) => ({
                                    ...prev,
                                    dnItem: false,
                                  }));
                                }, 200);
                              }}
                              placeholder="Select or type item name"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />

                            {dropdownVisible.dnItem &&
                              getFilteredItems().length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                  {getFilteredItems().map((item, idx) => (
                                    <div
                                      key={idx}
                                      className="px-3 py-2 hover:bg-purple-50 cursor-pointer"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        setFormData({
                                          ...formData,
                                          dnItemName: item,
                                        });
                                        setDropdownVisible((prev) => ({
                                          ...prev,
                                          dnItem: false,
                                        }));
                                      }}
                                    >
                                      {item}
                                    </div>
                                  ))}
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedSection === "damage" && (
                    <div className="mb-6">
                      <h3 className="text-xl font-semibold text-red-600 mb-4 border-b-2 border-red-200 pb-2">
                        Damage Entry Section
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Date Field */}
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

                        {/* Item Name Dropdown */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Item Name
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              name="damageItemName"
                              value={formData.damageItemName}
                              onChange={(e) => {
                                handleChange(e);
                                setDropdownVisible((prev) => ({
                                  ...prev,
                                  damageItem: true,
                                }));
                              }}
                              onFocus={() =>
                                setDropdownVisible((prev) => ({
                                  ...prev,
                                  damageItem: true,
                                }))
                              }
                              onBlur={() => {
                                setTimeout(() => {
                                  setDropdownVisible((prev) => ({
                                    ...prev,
                                    damageItem: false,
                                  }));
                                }, 200);
                              }}
                              placeholder="Select or type item name"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                            {dropdownVisible.damageItem &&
                              getFilteredItems().length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                  {getFilteredItems().map((item, idx) => (
                                    <div
                                      key={idx}
                                      className="px-3 py-2 hover:bg-red-50 cursor-pointer"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        setFormData({
                                          ...formData,
                                          damageItemName: item,
                                        });
                                        setDropdownVisible((prev) => ({
                                          ...prev,
                                          damageItem: false,
                                        }));
                                      }}
                                    >
                                      {item}
                                    </div>
                                  ))}
                                </div>
                              )}
                          </div>
                        </div>

                        {/* Quantity Damaged */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity Damaged
                          </label>
                          <input
                            type="number"
                            name="quantityDamaged"
                            value={formData.quantityDamaged}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>

                        {/* Reason for Damage (Textarea - spans 2 columns on medium+) */}
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

                        {/* Damage Identified At Dropdown */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Damage Identified At
                          </label>
                          <select
                            name="damageIdentifiedAt"
                            value={formData.damageIdentifiedAt}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                          >
                            <option value="">Select location</option>
                            <option value="Warehouse">Warehouse</option>
                            <option value="Transit">Transit</option>
                            <option value="Customer Site">Customer Site</option>
                          </select>
                        </div>

                        {/* Approved By Dropdown */}
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
                      disabled={loading}
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
                        Sales Return Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                        Invoice Number
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                        Customer Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                        Qty Received
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                        Item Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                        Received By
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                        Purchase Return Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                        Purchase Invoice No.
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                        Purchase Invoice Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                        Supplier Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                        Qty Returned
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                        PR Item Name
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                        Delivery Note
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                        Delivery Note Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                        Customer Name (DN)
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                        Qty Dispatched
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                        DN Item Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                        Damage Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                        Damage Item Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                        Qty Damaged
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
                          colSpan="16"
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
                            {row.salesReturnDate}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {row.invoiceNumber}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {row.srCustomerName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {row.quantityReceived}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {row.itemName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {row.receivedBy}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {row.purchaseReturnDate}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {row.purchaseInvoiceNo}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {row.purchaseInvoiceDate}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {row.supplierName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {row.quantityReturned}
                          </td>

                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {row.prItemName}
                          </td>

                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {row.deliveryNote}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {row.deliveryNoteDate}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {row.dnCustomerName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {row.quantityDispatched}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {row.dnItemName}
                          </td>

                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {row.damageDate}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {row.damageItemName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {row.quantityDamaged}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap max-w-xs truncate">
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

                {/* Mobile Card View - Shows only on small screens */}
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
                          {/* Sales Return Info */}
                          {row.salesReturnDate && (
                            <>
                              <h3 className="font-semibold text-blue-600 border-b pb-1">
                                Sales Return
                              </h3>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="font-medium">Date:</span>{" "}
                                  {row.salesReturnDate}
                                </div>
                                <div>
                                  <span className="font-medium">Invoice:</span>{" "}
                                  {row.invoiceNumber}
                                </div>
                                <div className="col-span-2">
                                  <span className="font-medium">Customer:</span>{" "}
                                  {row.srCustomerName}
                                </div>
                                <div>
                                  <span className="font-medium">Qty:</span>{" "}
                                  {row.quantityReceived}
                                </div>
                                <div>
                                  <span className="font-medium">Item:</span>{" "}
                                  {row.itemName}
                                </div>
                                <div>
                                  <span className="font-medium">
                                    Received By:
                                  </span>{" "}
                                  {row.receivedBy}
                                </div>
                              </div>
                            </>
                          )}

                          {/* Purchase Return Info */}
                          {row.purchaseReturnDate && (
                            <>
                              <h3 className="font-semibold text-green-600 border-b pb-1 mt-4">
                                Purchase Return
                              </h3>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="font-medium">Date:</span>{" "}
                                  {row.purchaseReturnDate}
                                </div>
                                <div>
                                  <span className="font-medium">Invoice:</span>{" "}
                                  {row.purchaseInvoiceNo}
                                </div>
                                <div>
                                  <span className="font-medium">Supplier:</span>{" "}
                                  {row.supplierName}
                                </div>
                                <div>
                                  <span className="font-medium">Qty:</span>{" "}
                                  {row.quantityReturned}
                                </div>
                                <div className="col-span-2">
                                  <span className="font-medium">Item:</span>{" "}
                                  {row.prItemName}
                                </div>
                              </div>
                            </>
                          )}

                          {/* Delivery Note Info */}
                          {row.deliveryNote && (
                            <>
                              <h3 className="font-semibold text-purple-600 border-b pb-1 mt-4">
                                Delivery Note
                              </h3>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="font-medium">Note:</span>{" "}
                                  {row.deliveryNote}
                                </div>
                                <div>
                                  <span className="font-medium">Date:</span>{" "}
                                  {row.deliveryNoteDate}
                                </div>
                                <div className="col-span-2">
                                  <span className="font-medium">Customer:</span>{" "}
                                  {row.dnCustomerName}
                                </div>
                                <div>
                                  <span className="font-medium">Qty:</span>{" "}
                                  {row.quantityDispatched}
                                </div>
                                <div>
                                  <span className="font-medium">Item:</span>{" "}
                                  {row.dnItemName}
                                </div>
                              </div>
                            </>
                          )}

                          {/* Damage Entry Info */}
                          {row.damageDate && (
                            <>
                              <h3 className="font-semibold text-red-600 border-b pb-1 mt-4">
                                Damage Entry
                              </h3>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="font-medium">Date:</span>{" "}
                                  {row.damageDate}
                                </div>
                                <div>
                                  <span className="font-medium">Qty:</span>{" "}
                                  {row.quantityDamaged}
                                </div>
                                <div className="col-span-2">
                                  <span className="font-medium">Item:</span>{" "}
                                  {row.damageItemName}
                                </div>
                                <div className="col-span-2">
                                  <span className="font-medium">
                                    Identified At:
                                  </span>{" "}
                                  {row.damageIdentifiedAt}
                                </div>
                                <div>
                                  <span className="font-medium">
                                    Approved By:
                                  </span>{" "}
                                  {row.approvedBy}
                                </div>
                                <div className="col-span-2">
                                  <span className="font-medium">Reason:</span>
                                  <div className="text-gray-600 mt-1">
                                    {row.reasonForDamage}
                                  </div>
                                </div>
                              </div>
                            </>
                          )}

                          {/* Timestamp - shows at bottom for all */}
                          <div className="pt-3 border-t text-xs text-gray-500">
                            <span className="font-medium">Added:</span>{" "}
                            {row.timestamp}
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
