"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    UserPlus,
    Users,
    Shield,
    MapPin,
    Layers,
    Lock,
    RefreshCw,
    Search,
    Settings as SettingsIcon,
    AlertCircle,
    CheckCircle2,
    Pencil,
} from "lucide-react";

const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_DISPATCH_SCRIPT_URL;
const SHEET_ID = process.env.NEXT_PUBLIC_PRIMARY_SHEET_ID;
const LOGIN_SHEET_NAME = "Login";

const AVAILABLE_PAGES = [
    { key: "Dispatch", label: "Dispatch" },
    { key: "Transporting", label: "Transporting" },
    { key: "Packaging", label: "Packaging" },
    { key: "Bilty-Upload", label: "Bilty-Upload" },
    { key: "Purchase", label: "Purchase" },
    { key: "Purchase-Update-Location", label: "Purchase-Update-Location" },
    { key: "IMS", label: "IMS" },
    { key: "PR-DR-SR-Form", label: "PR-DR-SR-Form" },
];

// Stored as-is in sheet; all pages use normalizeLoc (strips non-alnum + lowercase) for matching
const AVAILABLE_LOCATIONS = [
    { key: "CG-Warehouse", label: "CG-Warehouse" },
    { key: "NE-Warehouse", label: "NE-Warehouse" },
    { key: "Maniquip-Store", label: "Maniquip-Store" },
    { key: "Head-Office", label: "Head-Office" },
];

// Parse comma-separated page/location string back into array of keys
const parseAccessString = (str) =>
    str ? str.split(",").map((s) => s.trim()).filter(Boolean) : [];

export default function SettingsPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    const [users, setUsers] = useState([]);
    const [fetchingUsers, setFetchingUsers] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isFormOpen, setIsFormOpen] = useState(false);

    // "create" | "edit"
    const [formMode, setFormMode] = useState("create");
    // Row index in Google Sheet (1-based); only set in edit mode
    const [editRowIndex, setEditRowIndex] = useState(null);

    // Form fields
    const [fullName, setFullName] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("user");
    const [selectedPages, setSelectedPages] = useState([]);
    const [selectedLocations, setSelectedLocations] = useState([]);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // ── Auth guard ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isLoading) {
            if (!user) router.push("/login");
            else if (user.role !== "admin") router.push("/");
        }
    }, [user, isLoading, router]);

    // ── Fetch users ─────────────────────────────────────────────────────────
    const fetchUsersList = async () => {
        try {
            setFetchingUsers(true);
            const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${LOGIN_SHEET_NAME}`;
            const response = await fetch(sheetUrl);
            const text = await response.text();
            const jsonData = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
            const data = JSON.parse(jsonData);
            const parsedUsers = [];

            if (data?.table?.rows) {
                // i=1 skips header row; sheet row = i + 1 (header is row 1)
                for (let i = 1; i < data.table.rows.length; i++) {
                    const row = data.table.rows[i];
                    if (row?.c) {
                        parsedUsers.push({
                            rowIndex: i + 1,          // actual Google Sheet row number
                            username:   row.c[0]?.v || "",
                            fullName:   row.c[1]?.v || "",
                            password:   row.c[2]?.v || "",
                            role:       row.c[3]?.v || "user",
                            pageAccess: row.c[6]?.v || "",
                            location:   row.c[7]?.v || "",
                        });
                    }
                }
            }
            setUsers(parsedUsers);
        } catch (err) {
            console.error("Error fetching users list:", err);
        } finally {
            setFetchingUsers(false);
        }
    };

    useEffect(() => {
        if (user?.role === "admin") fetchUsersList();
    }, [user]);

    // ── Form helpers ─────────────────────────────────────────────────────────
    const resetForm = () => {
        setFullName("");
        setUsername("");
        setPassword("");
        setRole("user");
        setSelectedPages([]);
        setSelectedLocations([]);
        setErrorMsg("");
        setSuccessMsg("");
        setEditRowIndex(null);
    };

    const openCreateForm = () => {
        resetForm();
        setFormMode("create");
        setIsFormOpen(true);
    };

    const openEditForm = (u) => {
        setErrorMsg("");
        setSuccessMsg("");
        setFormMode("edit");
        setEditRowIndex(u.rowIndex);
        setFullName(u.fullName);
        setUsername(u.username);
        setPassword(u.password);
        setRole(u.role === "admin" ? "admin" : "user");
        // Parse existing access strings back into arrays for checkboxes
        // If sheet value is "all", pre-select every option so the All checkbox shows checked
        const rawPages = (u.pageAccess || "").trim().toLowerCase();
        setSelectedPages(
            rawPages === "all" ? AVAILABLE_PAGES.map((p) => p.key) : parseAccessString(u.pageAccess)
        );
        const rawLocs = (u.location || "").trim().toLowerCase();
        setSelectedLocations(
            rawLocs === "all" ? AVAILABLE_LOCATIONS.map((l) => l.key) : parseAccessString(u.location)
        );
        setIsFormOpen(true);
    };

    const allPagesSelected = selectedPages.length === AVAILABLE_PAGES.length;
    const allLocationsSelected = selectedLocations.length === AVAILABLE_LOCATIONS.length;

    const togglePageAccess = (key) =>
        setSelectedPages((prev) =>
            prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
        );

    const toggleAllPages = () =>
        setSelectedPages(allPagesSelected ? [] : AVAILABLE_PAGES.map((p) => p.key));

    const toggleLocationAccess = (key) =>
        setSelectedLocations((prev) =>
            prev.includes(key) ? prev.filter((l) => l !== key) : [...prev, key]
        );

    const toggleAllLocations = () =>
        setSelectedLocations(allLocationsSelected ? [] : AVAILABLE_LOCATIONS.map((l) => l.key));

    // ── Submit handler (create + edit) ───────────────────────────────────────
    const handleSubmitUser = async (e) => {
        e.preventDefault();
        setErrorMsg("");
        setSuccessMsg("");

        if (!fullName.trim() || !username.trim() || !password.trim()) {
            setErrorMsg("Full name, username, and password are required.");
            return;
        }

        // Username uniqueness check (skip own record when editing)
        const usernameLower = username.toLowerCase().trim();
        const duplicate = users.some(
            (u) =>
                u.username.toLowerCase().trim() === usernameLower &&
                u.rowIndex !== editRowIndex
        );
        if (duplicate) {
            setErrorMsg("Username is already taken.");
            return;
        }

        setSubmitting(true);

        try {
            // Send "all" when every option is checked (or role is admin)
            const finalPages =
                role === "admin" || allPagesSelected ? "all" : selectedPages.join(",");
            const finalLocations =
                role === "admin" || allLocationsSelected ? "all" : selectedLocations.join(",");

            const formData = new URLSearchParams();
            formData.append("sheetName", "Login");

            if (formMode === "create") {
                // ── INSERT ──────────────────────────────────────────────────
                // Col E (index 4) is intentionally omitted (left empty)
                formData.append("action", "insert");
                formData.append(
                    "rowData",
                    JSON.stringify([
                        username.trim(), // Col A
                        fullName.trim(), // Col B
                        password,        // Col C
                        role,            // Col D
                        "",              // Col E — intentionally blank
                        "",              // Col F — placeholder
                        finalPages,      // Col G
                        finalLocations,  // Col H
                    ])
                );
            } else {
                // ── UPDATE (by row index via GAS `update` action) ───────────
                // The `update` action only writes cells where rowData[i] is non-empty.
                // Col E (index 4) = "" → backend skips it, leaving the sheet value intact.
                formData.append("action", "update");
                formData.append("rowIndex", String(editRowIndex));
                formData.append(
                    "rowData",
                    JSON.stringify([
                        username.trim(), // Col A
                        fullName.trim(), // Col B
                        password,        // Col C
                        role,            // Col D
                        "",              // Col E — skipped by backend (empty string)
                        "",              // Col F — skipped by backend
                        finalPages,      // Col G
                        finalLocations,  // Col H
                    ])
                );
            }

            const response = await fetch(APPS_SCRIPT_URL, { method: "POST", body: formData });
            const result = await response.json();

            if (result.success) {
                setSuccessMsg(
                    formMode === "create" ? "User created successfully!" : "User updated successfully!"
                );
                await fetchUsersList();
                setTimeout(() => {
                    resetForm();
                    setIsFormOpen(false);
                }, 1200);
            } else {
                setErrorMsg(
                    result.error || result.message || "Operation failed. Please try again."
                );
            }
        } catch (err) {
            console.error("Error saving user:", err);
            setErrorMsg("An error occurred. Please check your network connection.");
        } finally {
            setSubmitting(false);
        }
    };

    // ── Filtered list ────────────────────────────────────────────────────────
    const filteredUsers = users.filter(
        (u) =>
            u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading || !user || user.role !== "admin") {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <MainLayout>
            <div className="flex flex-col gap-5">
                {/* Page Header */}
                <div className="flex items-center justify-between border-b pb-4 border-slate-200">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                            <SettingsIcon className="h-8 w-8 text-purple-600" />
                            Settings
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Manage system user roles, page authorizations, and warehouse access.
                        </p>
                    </div>
                    <Button
                        id="create-user-btn"
                        onClick={openCreateForm}
                        className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
                    >
                        <UserPlus className="h-4 w-4" />
                        Create User
                    </Button>
                </div>

                {/* Full-width Accounts Table */}
                <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between space-y-0 py-4">
                        <div>
                            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Users className="h-5 w-5 text-purple-600" />
                                User Accounts
                            </CardTitle>
                            <CardDescription>
                                All registered system accounts — {users.length} total.
                            </CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchUsersList}
                            disabled={fetchingUsers}
                            className="h-8 gap-1.5"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${fetchingUsers ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                    </CardHeader>

                    <CardContent className="p-0">
                        {/* Search bar */}
                        <div className="p-4 border-b border-slate-100 bg-slate-50/20">
                            <div className="relative max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search by name, username or role..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-10 border-slate-200"
                                    disabled={fetchingUsers}
                                />
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                            <Table className="relative border-separate border-spacing-0">
                                <TableHeader className="sticky top-0 z-20 bg-slate-50">
                                    <TableRow className="border-b border-slate-200">
                                        <TableHead className="font-semibold text-slate-700 h-11 w-[50px]">Actions</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 w-[130px]">Username</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 w-[180px]">Full Name</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 w-[130px]">Password</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 w-[90px]">Role</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11">Warehouse Page Access</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 w-[200px]">Location</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fetchingUsers ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-36 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <RefreshCw className="h-7 w-7 animate-spin text-blue-500" />
                                                    <span className="text-xs text-slate-500 font-medium">
                                                        Fetching accounts...
                                                    </span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredUsers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-28 text-center text-slate-400 text-sm">
                                                No accounts match the search criteria.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredUsers.map((u, i) => (
                                            <TableRow
                                                key={i}
                                                className="hover:bg-slate-50/60 transition-colors border-b border-slate-100"
                                            >
                                                {/* Edit action */}
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openEditForm(u)}
                                                        className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                                        title="Edit user"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TableCell>
                                                <TableCell className="font-semibold text-slate-900">{u.username}</TableCell>
                                                <TableCell className="text-slate-700 font-medium">{u.fullName}</TableCell>
                                                <TableCell
                                                    className="text-slate-400 font-mono text-xs select-all hover:text-slate-700 transition-colors cursor-pointer"
                                                    title="Click to select"
                                                >
                                                    {u.password}
                                                </TableCell>
                                                <TableCell>
                                                    <span
                                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                            u.role === "admin"
                                                                ? "bg-purple-100 text-purple-800"
                                                                : "bg-slate-100 text-slate-700"
                                                        }`}
                                                    >
                                                        {u.role.toUpperCase()}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-slate-600 max-w-xs truncate" title={u.pageAccess}>
                                                    {u.pageAccess || <span className="text-slate-300 italic text-xs">—</span>}
                                                </TableCell>
                                                <TableCell className="text-slate-600 font-medium">
                                                    {u.location || <span className="text-slate-300 italic text-xs">—</span>}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Create / Edit User Modal ── */}
            <Dialog
                open={isFormOpen}
                onOpenChange={(open) => {
                    if (!open) resetForm();
                    setIsFormOpen(open);
                }}
            >
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
                    <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 bg-slate-50/50">
                        <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            {formMode === "create" ? (
                                <><UserPlus className="h-5 w-5 text-blue-600" /> Create User</>
                            ) : (
                                <><Pencil className="h-5 w-5 text-amber-600" /> Edit User</>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            {formMode === "create"
                                ? "Register a new system user and define their permissions."
                                : "Update the user's details and permissions."}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmitUser} className="px-6 py-5 space-y-4">
                        {/* Alerts */}
                        {errorMsg && (
                            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{errorMsg}</span>
                            </div>
                        )}
                        {successMsg && (
                            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-sm">
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                                <span>{successMsg}</span>
                            </div>
                        )}

                        {/* Full Name */}
                        <div className="space-y-1.5">
                            <Label htmlFor="dlg-fullName">Full Name</Label>
                            <Input
                                id="dlg-fullName"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Enter full name"
                                className="h-10"
                                disabled={submitting}
                            />
                        </div>

                        {/* Username */}
                        <div className="space-y-1.5">
                            <Label htmlFor="dlg-username">Username</Label>
                            <Input
                                id="dlg-username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter username"
                                className="h-10"
                                disabled={submitting}
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <Label htmlFor="dlg-password">Password</Label>
                            <div className="relative">
                                <Input
                                    id="dlg-password"
                                    type="text"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter password"
                                    className="h-10 pr-10 font-mono"
                                    disabled={submitting}
                                />
                                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Role */}
                        <div className="space-y-1.5">
                            <Label htmlFor="dlg-role">Role</Label>
                            <select
                                id="dlg-role"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={submitting}
                            >
                                <option value="user">USER</option>
                                <option value="admin">ADMIN</option>
                            </select>
                        </div>

                        {/* Permissions — only for USER role */}
                        {role === "admin" ? (
                            <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 text-sm text-blue-700 flex gap-2">
                                <Shield className="h-5 w-5 shrink-0 text-blue-500 mt-0.5" />
                                <div>
                                    <p className="font-semibold">Administrator Role Privileges</p>
                                    <p className="text-xs text-blue-600 mt-1">
                                        Admins have access to all pages and locations by default.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 pt-1">
                                {/* Page Access */}
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-1.5 font-semibold text-slate-700">
                                        <Layers className="h-4 w-4 text-slate-500" />
                                        Page Access Permissions
                                    </Label>
                                    <div className="bg-slate-50 rounded-lg border border-slate-100 overflow-hidden">
                                        {/* All toggle row */}
                                        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 bg-slate-100/60">
                                            <Checkbox
                                                id="dlg-page-all"
                                                checked={allPagesSelected}
                                                onCheckedChange={toggleAllPages}
                                                disabled={submitting}
                                            />
                                            <label
                                                htmlFor="dlg-page-all"
                                                className="text-xs font-bold text-slate-700 cursor-pointer select-none"
                                            >
                                                All
                                            </label>
                                        </div>
                                        {/* Individual options */}
                                        <div className="grid grid-cols-2 gap-2 p-3 max-h-[150px] overflow-y-auto">
                                            {AVAILABLE_PAGES.map((page) => (
                                                <div key={page.key} className="flex items-center gap-2">
                                                    <Checkbox
                                                        id={`dlg-page-${page.key}`}
                                                        checked={selectedPages.includes(page.key)}
                                                        onCheckedChange={() => togglePageAccess(page.key)}
                                                        disabled={submitting}
                                                    />
                                                    <label
                                                        htmlFor={`dlg-page-${page.key}`}
                                                        className="text-xs font-medium text-slate-600 cursor-pointer select-none leading-tight"
                                                    >
                                                        {page.label}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Location Access */}
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-1.5 font-semibold text-slate-700">
                                        <MapPin className="h-4 w-4 text-slate-500" />
                                        Location Access Permissions
                                    </Label>
                                    <div className="bg-slate-50 rounded-lg border border-slate-100 overflow-hidden">
                                        {/* All toggle row */}
                                        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 bg-slate-100/60">
                                            <Checkbox
                                                id="dlg-loc-all"
                                                checked={allLocationsSelected}
                                                onCheckedChange={toggleAllLocations}
                                                disabled={submitting}
                                            />
                                            <label
                                                htmlFor="dlg-loc-all"
                                                className="text-xs font-bold text-slate-700 cursor-pointer select-none"
                                            >
                                                All
                                            </label>
                                        </div>
                                        {/* Individual options */}
                                        <div className="grid grid-cols-2 gap-2 p-3">
                                            {AVAILABLE_LOCATIONS.map((loc) => (
                                                <div key={loc.key} className="flex items-center gap-2">
                                                    <Checkbox
                                                        id={`dlg-loc-${loc.key}`}
                                                        checked={selectedLocations.includes(loc.key)}
                                                        onCheckedChange={() => toggleLocationAccess(loc.key)}
                                                        disabled={submitting}
                                                    />
                                                    <label
                                                        htmlFor={`dlg-loc-${loc.key}`}
                                                        className="text-xs font-medium text-slate-600 cursor-pointer select-none"
                                                    >
                                                        {loc.label}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                disabled={submitting}
                                onClick={() => { resetForm(); setIsFormOpen(false); }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className={`flex-1 text-white font-semibold gap-2 ${
                                    formMode === "edit"
                                        ? "bg-amber-500 hover:bg-amber-600"
                                        : "bg-blue-600 hover:bg-blue-700"
                                }`}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                        {formMode === "edit" ? "Saving..." : "Creating..."}
                                    </>
                                ) : formMode === "edit" ? (
                                    <>
                                        <Pencil className="h-4 w-4" />
                                        Save Changes
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="h-4 w-4" />
                                        Submit
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}
