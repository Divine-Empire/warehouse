"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/components/auth-provider";

interface Counts {
  dispatch: number;
  transporting: number;
  packaging: number;
  bilty: number;
  purchase: number;
  purchaseUpdate: number;
}

interface CountsContextType {
  counts: Counts;
  loading: boolean;
  refreshCounts: () => Promise<void>;
}

const CountsContext = createContext<CountsContextType | undefined>(undefined);

// Using the established Apps Script URLs to bypass CORS issues with private sheets
const DISPATCH_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyzW8-RldYx917QpAfO4kY-T8_ntg__T0sbr7Yup2ZTVb1FC5H1g6TYuJgAU6wTquVM/exec";
const PURCHASE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyCik-SO0JHWnTfyeltKDx3i7LI0Ppt3lBw59tQy1ymiiQb8ai3D9FA540Pw65Jzq58Lg/exec";

export function CountsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Counts>({
    dispatch: 0,
    transporting: 0,
    packaging: 0,
    bilty: 0,
    purchase: 0,
    purchaseUpdate: 0,
  });
  const [loading, setLoading] = useState(false);
  const isFetching = useRef(false);

  const normalizeLoc = (loc: any) => String(loc || "").toLowerCase().replace(/^by\s*/i, "").replace(/[^a-z0-9]/g, "").trim();

  const fetchFromScript = async (scriptUrl: string, sheetName: string) => {
    try {
      const response = await fetch(`${scriptUrl}?sheet=${encodeURIComponent(sheetName)}&action=fetch`);
      const result = await response.json();
      return result.success ? result.data : [];
    } catch (error) {
      console.error(`Error fetching from script for sheet ${sheetName}:`, error);
      return [];
    }
  };

  const refreshCounts = useCallback(async () => {
    if (!user || isFetching.current) return;
    isFetching.current = true;
    setLoading(true);

    try {
      const userLocations = user.location || [];
      const isAllLocations = userLocations.some((l: string) => l.toLowerCase() === "all");
      const userFullName = user.fullName?.toLowerCase().trim();

      // 1. Fetch DISPATCH-DELIVERY related counts via the Dispatch Script
      const dispatchRows = await fetchFromScript(DISPATCH_SCRIPT_URL, "DISPATCH-DELIVERY");
      
      let dispatchCount = 0;
      let transportingCount = 0;
      let packagingCount = 0;
      let biltyCount = 0;

      if (dispatchRows && dispatchRows.length > 0) {
        // Skip header rows (slice 6 as used in dispatch page logic)
        dispatchRows.slice(6).forEach((row: any[]) => {
          if (!row || row.length === 0) return;

          const bk = row[62]; // planned5 (Dispatch)
          const bt = row[71]; // actual6 / btColumn (Transporting)
          const by = row[76]; // byColumn (Packaging / Transporter)
          const bv = row[73]; // bvColumn (Packaging Attachment 1)
          const bw = row[74]; // bwColumn (Packaging Attachment 2)
          const bx = row[75]; // bxColumn (Bilty Upload)
          const loc = row[103]; // warehouseLocation (CZ)

          // Filter by user location
          let locationMatch = isAllLocations;
          if (!locationMatch) {
            const normalizedRowLoc = normalizeLoc(loc);
            locationMatch = userLocations.some((l: string) => normalizeLoc(l) === normalizedRowLoc);
          }

          if (!locationMatch) return;

          // Dispatch Pending: planned5 && !actual6
          const hasPlanned5 = !!bk && String(bk).trim() !== "" && String(bk).trim() !== "-";
          const noActual6 = !bt || String(bt).trim() === "" || String(bt).trim() === "-" || String(bt).trim().toLowerCase() === "n/a";
          if (hasPlanned5 && noActual6) dispatchCount++;

          // Transporting Pending: btColumn && !byColumn
          const hasBt = !!bt && String(bt).trim() !== "" && String(bt).trim() !== "-";
          const noBy = !by || String(by).trim() === "" || String(by).trim() === "-" || String(by).trim().toLowerCase() === "n/a";
          if (hasBt && noBy) transportingCount++;

          // Packaging Pending: byColumn && (!bv || !bw)
          const hasBy = !!by && String(by).trim() !== "" && String(by).trim() !== "-";
          const noBvBw = !bv || String(bv).trim() === "" || !bw || String(bw).trim() === "";
          if (hasBy && noBvBw) packagingCount++;

          // Bilty Upload Pending: !bx
          const noBx = !bx || String(bx).trim() === "" || String(bx).trim() === "-";
          let canUploadBilty = true;
          if (user.role === "user") {
            canUploadBilty = String(by || "").toLowerCase().trim() === userFullName;
          }
          if (noBx && canUploadBilty) biltyCount++;
        });
      }

      // 2. Fetch PURCHASE related counts via the Purchase Script
      const [recAccRows, partialQCRows, indentRows] = await Promise.all([
        fetchFromScript(PURCHASE_SCRIPT_URL, "RECEIVING-ACCOUNTS"),
        fetchFromScript(PURCHASE_SCRIPT_URL, "Partial QC"),
        fetchFromScript(PURCHASE_SCRIPT_URL, "INDENT-LIFT")
      ]);

      // Build Indent No -> Warehouse Map
      const indentMap = new Map();
      if (indentRows && indentRows.length > 0) {
        indentRows.forEach((row: any[]) => {
          if (row && row[1] && row[6]) {
            indentMap.set(String(row[1]).trim(), String(row[6]).trim());
          }
        });
      }

      let purchaseCount = 0;
      let purchaseUpdateCount = 0;

      // Process RECEIVING-ACCOUNTS (Skip 7 header rows as per page logic)
      if (recAccRows && recAccRows.length > 7) {
        recAccRows.slice(7).forEach((row: any[]) => {
          if (!row || row.length === 0) return;
          const indentNo = String(row[1] || "").trim();
          const colT = row[19];
          const colU = row[20];
          const planned = row[111]; // DH 
          const actual = row[112];  // DI
          const loc = indentMap.get(indentNo) || "";

          // Filter by user location
          let locationMatch = isAllLocations;
          if (!locationMatch) {
            const normalizedRowLoc = normalizeLoc(loc);
            locationMatch = userLocations.some((l: string) => normalizeLoc(l) === normalizedRowLoc);
          }
          if (!locationMatch) return;

          // Purchase Pending: colT && !colU
          const hasColT = !!colT && String(colT).trim() !== "" && String(colT).trim() !== "-";
          const noColU = !colU || String(colU).trim() === "" || String(colU).trim() === "-" || String(colU).trim().toLowerCase() === "n/a";
          if (hasColT && noColU) purchaseCount++;

          // Purchase Update Pending: planned && (!actual || n/a)
          const hasPlanned = !!planned && String(planned).trim() !== "" && String(planned).trim() !== "-";
          const noActual = !actual || String(actual).trim() === "" || String(actual).trim() === "-" || String(actual).trim().toLowerCase() === "n/a";
          if (hasPlanned && noActual) purchaseUpdateCount++;
        });
      }

      // Process Partial QC (Skip 7 header rows)
      if (partialQCRows && partialQCRows.length > 7) {
        partialQCRows.slice(7).forEach((row: any[]) => {
          if (!row || row.length === 0) return;
          const indentNo = String(row[1] || "").trim();
          const planned = row[29]; // AD
          const actual = row[30];  // AE
          const loc = indentMap.get(indentNo) || "";

          // Filter by user location
          let locationMatch = isAllLocations;
          if (!locationMatch) {
            const normalizedRowLoc = normalizeLoc(loc);
            locationMatch = userLocations.some((l: string) => normalizeLoc(l) === normalizedRowLoc);
          }
          if (!locationMatch) return;

          const hasPlanned = !!planned && String(planned).trim() !== "" && String(planned).trim() !== "-";
          const noActual = !actual || String(actual).trim() === "" || String(actual).trim() === "-" || String(actual).trim().toLowerCase() === "n/a";
          if (hasPlanned && noActual) purchaseUpdateCount++;
        });
      }

      setCounts({
        dispatch: dispatchCount,
        transporting: transportingCount,
        packaging: packagingCount,
        bilty: biltyCount,
        purchase: purchaseCount,
        purchaseUpdate: purchaseUpdateCount,
      });

    } catch (error) {
      console.error("Error refreshing sidebar counts:", error);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [user]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    if (user) {
      refreshCounts();
      const interval = setInterval(refreshCounts, 300000); // 5 minutes
      return () => clearInterval(interval);
    }
  }, [user, refreshCounts]);

  return (
    <CountsContext.Provider value={{ counts, loading, refreshCounts }}>
      {children}
    </CountsContext.Provider>
  );
}

export const useCounts = () => {
  const context = useContext(CountsContext);
  if (context === undefined) {
    throw new Error("useCounts must be used within a CountsProvider");
  }
  return context;
}
