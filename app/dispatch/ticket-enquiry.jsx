"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardList,
  Loader2Icon,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/components/auth-provider";

export function TicketEnquiryDialog({ isOpen, onClose }) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const sheet_url = process.env.NEXT_PUBLIC_SERVICE_SHEET_URL;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [masterData, setMasterData] = useState({});
  const [companyList, setCompanyList] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showMachineDropdown, setShowMachineDropdown] = useState(false);
  const [machineSearchQuery, setMachineSearchQuery] = useState("");
  const [newFormSelectedMachines, setNewFormSelectedMachines] = useState([]);

  const [newEnquiryData, setNewEnquiryData] = useState({
    clientType: "New",
    sourceOfEnquiry: "",
    callType: "",
    enquiryReceiverName: "",
    companyName: "",
    clientName: "",
    phoneNumber: "",
    gstAddress: "",
    siteAddress: "",
    gstNo: "",
    machineName: "",
    category: "",
    mentionIssue: "",
    serviceLocation: ""
  });

  const fetchMasterSheet = async () => {
    if (!sheet_url) return;
    setIsLoadingData(true);
    try {
      const response = await fetch(`${sheet_url}?sheet=DROPDOWN`);
      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        const headers = result.data[0];
        const structuredData = {};

        headers.forEach((header, index) => {
          let normalizedHeader = header;
          if (header === "Enquiry-Receiver-Name") normalizedHeader = "Enquiry Receiver Name";
          if (header === "Company-Name") normalizedHeader = "Company Name";
          if (header === "GST-No.") normalizedHeader = "GST No.";
          if (index === 92) {
            structuredData["Requirement Service Category"] = [];
          }
          structuredData[normalizedHeader] = [];
        });

        result.data.slice(1).forEach((row) => {
          row.forEach((value, index) => {
            const header = headers[index];
            let normalizedHeader = header;
            if (header === "Enquiry-Receiver-Name") normalizedHeader = "Enquiry Receiver Name";
            if (header === "Company-Name") normalizedHeader = "Company Name";
            if (header === "GST-No.") normalizedHeader = "GST No.";

            const stringValue =
              value !== null && value !== undefined ? String(value).trim() : "";
            
            if (structuredData[normalizedHeader]) {
              structuredData[normalizedHeader].push(stringValue);
            }
            if (index === 92 && structuredData["Requirement Service Category"]) {
              structuredData["Requirement Service Category"].push(stringValue);
            }
          });
        });

        if (!structuredData["Call type"] || structuredData["Call type"].filter(x => x).length === 0) {
          structuredData["Call type"] = ["Incoming", "Outgoing"];
        }

        const companies = [];
        const seenCompanies = new Set();
        result.data.slice(1).forEach((row) => {
          const companyName = row[88] !== undefined && row[88] !== null ? String(row[88]).trim() : "";
          const gstAddress = row[89] !== undefined && row[89] !== null ? String(row[89]).trim() : "";
          const gstNo = row[90] !== undefined && row[90] !== null ? String(row[90]).trim() : "";

          if (companyName && !seenCompanies.has(companyName.toLowerCase())) {
            seenCompanies.add(companyName.toLowerCase());
            companies.push({
              companyName,
              gstAddress,
              gstNo,
            });
          }
        });
        setCompanyList(companies);

        setMasterData([structuredData]);
      }
    } catch (error) {
      console.error("Error fetching master data:", error);
      toast({
        title: "Error",
        description: "Failed to load master data",
        variant: "destructive",
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMasterSheet();
      // Reset form states on open
      setNewEnquiryData({
        clientType: "New",
        sourceOfEnquiry: "",
        callType: "",
        enquiryReceiverName: "",
        companyName: "",
        clientName: "",
        phoneNumber: "",
        gstAddress: "",
        siteAddress: "",
        gstNo: "",
        machineName: "",
        category: "",
        mentionIssue: "",
        serviceLocation: ""
      });
      setNewFormSelectedMachines([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-container')) {
        setShowMachineDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const formatDateTime = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  const handleNewEnquiryCompanyChange = (value) => {
    setNewEnquiryData((prev) => {
      const updated = { ...prev, companyName: value };
      
      if (prev.clientType === "Existing") {
        const found = companyList.find(
          (c) => c.companyName && c.companyName.toLowerCase() === value.toLowerCase()
        );
        if (found) {
          updated.gstAddress = found.gstAddress || "";
          updated.gstNo = found.gstNo || "";
        }
      }
      return updated;
    });
  };

  const handleNewEnquirySubmit = async (e) => {
    e.preventDefault();

    if (!newEnquiryData.clientName) {
      alert("Error: Client Name is required");
      return;
    }
    if (!newEnquiryData.phoneNumber) {
      alert("Error: Phone Number is required");
      return;
    }
    if (!newEnquiryData.category) {
      alert("Error: Category is required");
      return;
    }
    if (!newEnquiryData.callType) {
      alert("Error: Call Type is required");
      return;
    }
    if (!newEnquiryData.sourceOfEnquiry) {
      alert("Error: Source of Enquiry is required");
      return;
    }
    if (!newEnquiryData.enquiryReceiverName) {
      alert("Error: Enquiry Receiver Name is required");
      return;
    }
    if (!newEnquiryData.serviceLocation) {
      alert("Error: Service Location is required");
      return;
    }
    if (newEnquiryData.clientType === "Existing" && !newEnquiryData.companyName) {
      alert("Error: Company Name is required for existing clients");
      return;
    }
    if (newFormSelectedMachines.length === 0) {
      alert("Error: Machine Name is required");
      return;
    }
    if (!newEnquiryData.mentionIssue || !newEnquiryData.mentionIssue.trim()) {
      alert("Error: Mention Issue is required");
      return;
    }

    setIsSubmitting(true);
    const currentDateTime = formatDateTime(new Date());

    try {
      const rowData = Array(128).fill("");
      rowData[0] = currentDateTime;
      rowData[1] = "";
      rowData[9] = currentDateTime;

      rowData[12] = newEnquiryData.sourceOfEnquiry || "";
      rowData[13] = newEnquiryData.callType || "";
      rowData[14] = newEnquiryData.enquiryReceiverName || "";
      rowData[15] = newEnquiryData.clientType || "";
      rowData[16] = newEnquiryData.companyName || "";
      rowData[17] = newEnquiryData.clientName || "";
      rowData[18] = newEnquiryData.phoneNumber || "";
      rowData[19] = newEnquiryData.gstAddress || "";
      rowData[20] = newEnquiryData.siteAddress || "";
      rowData[21] = newEnquiryData.gstNo || "";
      rowData[22] = newFormSelectedMachines.join(", ");
      rowData[23] = newEnquiryData.category || "";
      rowData[24] = newEnquiryData.mentionIssue || "";
      rowData[25] = newEnquiryData.serviceLocation || "";

      rowData[117] = "No";
      rowData[127] = user?.fullName || "";

      const response = await fetch(sheet_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          sheetName: "Ticket_Enquiry",
          action: "insertTicket",
          rowData: JSON.stringify(rowData),
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`Success! Ticket No. generated: ${result.ticketId}`);
        toast({
          title: "Success",
          description: `Enquiry created successfully with Ticket ID: ${result.ticketId}`,
        });
        onClose();
      } else {
        throw new Error(result.error || "Failed to create enquiry");
      }
    } catch (error) {
      console.error("Error saving enquiry:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save enquiry",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-blue-100 p-6 rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-blue-950 text-xl font-bold flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-600 animate-pulse" />
            <span>New Ticket Enquiry</span>
          </DialogTitle>
          <DialogDescription className="text-gray-500 text-sm">
            Please fill in the enquiry details below. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        {isLoadingData ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2Icon className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-sm font-medium text-gray-500">Loading master data from sheet...</p>
          </div>
        ) : (
          <form onSubmit={handleNewEnquirySubmit} className="space-y-6 mt-4">
          <Card className="border border-blue-50 shadow-sm">
            <CardHeader className="bg-blue-50/50 px-4 py-3 border-b border-blue-50">
              <CardTitle className="text-sm font-semibold text-blue-900">
                Client Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">Client Type *</Label>
                <Select
                  onValueChange={(value) => {
                    setNewEnquiryData(prev => ({
                      ...prev,
                      clientType: value,
                      companyName: value === "New" ? "" : prev.companyName,
                      gstAddress: value === "New" ? "" : prev.gstAddress,
                      gstNo: value === "New" ? "" : prev.gstNo
                    }));
                  }}
                  value={newEnquiryData.clientType}
                >
                  <SelectTrigger className="border-gray-200">
                    <SelectValue placeholder="Select Client Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 rounded-md shadow-lg">
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Existing">Existing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">Company Name *</Label>
                {newEnquiryData.clientType === "Existing" ? (
                  <div className="relative">
                    <Input
                      value={newEnquiryData.companyName || ""}
                      onChange={(e) => handleNewEnquiryCompanyChange(e.target.value)}
                      placeholder="Type to search or select company name"
                      list="new-company-suggestions"
                      className="border-gray-200"
                    />
                    <datalist id="new-company-suggestions">
                      {companyList.map((c, index) => (
                        <option key={index} value={c.companyName} />
                      ))}
                    </datalist>
                  </div>
                ) : (
                  <Input
                    value={newEnquiryData.companyName || ""}
                    onChange={(e) => setNewEnquiryData(prev => ({ ...prev, companyName: e.target.value }))}
                    placeholder="Enter company name"
                    className="border-gray-200"
                  />
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">Client Name *</Label>
                <Input
                  value={newEnquiryData.clientName || ""}
                  onChange={(e) => setNewEnquiryData(prev => ({ ...prev, clientName: e.target.value }))}
                  placeholder="Enter client name"
                  className="border-gray-200"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">Phone Number *</Label>
                <Input
                  value={newEnquiryData.phoneNumber || ""}
                  onChange={(e) => setNewEnquiryData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  placeholder="Enter phone number"
                  className="border-gray-200"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-blue-50 shadow-sm">
            <CardHeader className="bg-blue-50/50 px-4 py-3 border-b border-blue-50">
              <CardTitle className="text-sm font-semibold text-blue-900">
                Enquiry Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">Call Type *</Label>
                <Select
                  onValueChange={(value) => setNewEnquiryData(prev => ({ ...prev, callType: value }))}
                  value={newEnquiryData.callType}
                >
                  <SelectTrigger className="border-gray-200">
                    <SelectValue placeholder="Select Call Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 rounded-md shadow-lg">
                    {(masterData[0]?.["Call type"] || [])
                      .filter(Boolean)
                      .map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">Source of Enquiry *</Label>
                <div className="relative">
                  <Input
                    value={newEnquiryData.sourceOfEnquiry || ""}
                    onChange={(e) => setNewEnquiryData(prev => ({ ...prev, sourceOfEnquiry: e.target.value }))}
                    placeholder="Search or enter source"
                    list="new-source-suggestions"
                    className="border-gray-200"
                  />
                  <datalist id="new-source-suggestions">
                    {(masterData[0]?.["Source of enquiry"] || [])
                      .filter((name, index, self) => name && self.indexOf(name) === index)
                      .map((name, index) => (
                        <option key={index} value={name} />
                      ))}
                  </datalist>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">Enquiry Receiver Name *</Label>
                <div className="relative">
                  <Input
                    value={newEnquiryData.enquiryReceiverName || ""}
                    onChange={(e) => setNewEnquiryData(prev => ({ ...prev, enquiryReceiverName: e.target.value }))}
                    placeholder="Search or enter receiver name"
                    list="new-receiver-suggestions"
                    className="border-gray-200"
                  />
                  <datalist id="new-receiver-suggestions">
                    {(masterData[0]?.["Enquiry Receiver Name"] || [])
                      .filter((name, index, self) => name && self.indexOf(name) === index)
                      .map((name, index) => (
                        <option key={index} value={name} />
                      ))}
                  </datalist>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">Category *</Label>
                <Select
                  onValueChange={(value) => setNewEnquiryData(prev => ({ ...prev, category: value }))}
                  value={newEnquiryData.category}
                >
                  <SelectTrigger className="border-gray-200">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 rounded-md shadow-lg">
                    {[...new Set(masterData[0]?.["Requirement Service Category"] || [])]
                      .filter(Boolean)
                      .map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">Billing Address</Label>
                <Input
                  value={newEnquiryData.gstAddress || ""}
                  onChange={(e) => setNewEnquiryData(prev => ({ ...prev, gstAddress: e.target.value }))}
                  placeholder="Enter Billing Address"
                  className="border-gray-200"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">GST No.</Label>
                <Input
                  value={newEnquiryData.gstNo || ""}
                  onChange={(e) => setNewEnquiryData(prev => ({ ...prev, gstNo: e.target.value }))}
                  placeholder="Enter GST No."
                  className="border-gray-200"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">Site Address</Label>
                <Input
                  value={newEnquiryData.siteAddress || ""}
                  onChange={(e) => setNewEnquiryData(prev => ({ ...prev, siteAddress: e.target.value }))}
                  placeholder="Enter Site Address"
                  className="border-gray-200"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">Service Location *</Label>
                <Select
                  onValueChange={(value) => setNewEnquiryData(prev => ({ ...prev, serviceLocation: value }))}
                  value={newEnquiryData.serviceLocation}
                >
                  <SelectTrigger className="border-gray-200">
                    <SelectValue placeholder="Select Service Location" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 rounded-md shadow-lg">
                    {[...new Set(masterData[0]?.["Service Location"] || [])]
                      .filter(Boolean)
                      .map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 md:col-span-2 relative">
                <Label className="text-sm font-medium text-gray-700">Machine Name *</Label>
                <div className="relative dropdown-container">
                  <button
                    type="button"
                    onClick={() => setShowMachineDropdown(!showMachineDropdown)}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="text-gray-500">Select machine(s)</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4 opacity-50"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>

                  {showMachineDropdown && (
                    <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-md border border-gray-200 bg-white p-1 shadow-lg">
                      <div className="px-2 py-1 sticky top-0 bg-white z-10">
                        <Input
                          placeholder="Search machine..."
                          value={machineSearchQuery}
                          onChange={(e) => setMachineSearchQuery(e.target.value)}
                          className="h-8 text-xs border-gray-200"
                        />
                      </div>
                      <div className="mt-1">
                        {[...new Set(masterData[0]?.["Machine Name"] || [])]
                          .filter(Boolean)
                          .filter(option =>
                            option.toLowerCase().includes(machineSearchQuery.toLowerCase())
                          )
                          .map((option) => (
                            <button
                              type="button"
                              disabled={newFormSelectedMachines.includes(option)}
                              onClick={() => {
                                if (!newFormSelectedMachines.includes(option)) {
                                  setNewFormSelectedMachines(prev => [...prev, option]);
                                }
                                setMachineSearchQuery("");
                                setShowMachineDropdown(false);
                              }}
                              className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-left"
                            >
                              {option}
                            </button>
                          ))}
                        {[...new Set(masterData[0]?.["Machine Name"] || [])]
                          .filter(Boolean)
                          .filter(option =>
                            option.toLowerCase().includes(machineSearchQuery.toLowerCase())
                          ).length === 0 && (
                          <p className="text-xs text-gray-500 text-center py-2">No machine found</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {newFormSelectedMachines.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newFormSelectedMachines.map((machine) => (
                      <div
                        key={machine}
                        className="bg-blue-50 text-blue-800 border border-blue-100 text-xs px-2 py-1 rounded flex items-center"
                      >
                        {machine}
                        <button
                          type="button"
                          onClick={() => {
                            setNewFormSelectedMachines(prev => prev.filter(m => m !== machine));
                          }}
                          className="ml-1.5 text-blue-600 hover:text-blue-800 font-bold"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1 md:col-span-2">
                <Label className="text-sm font-medium text-gray-700">Mention Issue *</Label>
                <Textarea
                  value={newEnquiryData.mentionIssue || ""}
                  onChange={(e) => setNewEnquiryData(prev => ({ ...prev, mentionIssue: e.target.value }))}
                  placeholder="Describe the issue"
                  rows={3}
                  className="border-gray-200"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <Loader2Icon className="animate-spin w-4 h-4 mr-2" />
              )}
              Create Enquiry
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
