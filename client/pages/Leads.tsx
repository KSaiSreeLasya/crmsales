import { CRMLayout } from "@/components/CRMLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Trash2, RefreshCw, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { parseLeadRow } from "@shared/googleSheets";
import { useAuth } from "@/context/AuthContext";
import { getAssignedLeads } from "@/lib/auth";
import { LeadDetailsModal } from "@/components/LeadDetailsModal";

type LeadStatus =
  | "New"
  | "Not lifted"
  | "Not connected"
  | "Voice Message"
  | "Quotation sent"
  | "Site visit"
  | "Advance payment"
  | "Lead finished"
  | "Contacted";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: LeadStatus;
  assigned_to: string;
  note1: string;
  note2: string;
  street_address?: string;
  post_code?: string;
  lead_status?: string;
  electricity_bill?: string;
  type_of_property?: string;
  avg_monthly_bill?: string;
  sheet_id?: string;
  source?: string;
  created_at?: string;
  updated_at?: string;
}

interface DateRowMarker {
  _isDateRow: true;
  _dateValue: string;
}

type DisplayRow = Lead | DateRowMarker;

function isDateRow(row: any): row is DateRowMarker {
  return row && (row._isDateRow === true || row._isDateRow === "true");
}

const STATUS_OPTIONS: LeadStatus[] = [
  "Not lifted",
  "Not connected",
  "Voice Message",
  "Quotation sent",
  "Site visit",
  "Advance payment",
  "Lead finished",
  "Contacted",
];

const SPREADSHEET_ID = "1QY8_Q8-ybLKNVs4hynPZslZDwUfC-PIJrViJfL0-tpM";

export default function Leads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [assignedLeads, setAssignedLeads] = useState<Lead[]>([]);
  const [dateRows, setDateRows] = useState<DateRowMarker[]>([]);
  const [displayRows, setDisplayRows] = useState<DisplayRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "assigned">(
    user?.role === "salesperson" ? "assigned" : "all",
  );
  const [editingNote, setEditingNote] = useState<{
    leadId: string;
    field: "note1" | "note2";
  } | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState<string>("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [openDetailsModal, setOpenDetailsModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    street_address: "",
    post_code: "",
    lead_status: "",
    electricity_bill: "",
    type_of_property: "",
    avg_monthly_bill: "",
    note1: "",
    note2: "",
    status: "Not lifted" as LeadStatus,
    assigned_to: "",
  });

  const [salespersons, setSalespersons] = useState<string[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState("0");
  const [availableSheets, setAvailableSheets] = useState<
    Array<{ id: string; name: string }>
  >([
    { id: "0", name: "Hyderabad Leads" },
    { id: "1892152973", name: "November" },
  ]);
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);

  // Load available sheets from Google Sheets on component mount
  useEffect(() => {
    loadAvailableSheets();
  }, []);

  // Load leads from Supabase on component mount and when sheet changes
  useEffect(() => {
    loadLeads();
    loadSalespersons();
    if (user?.name && user?.role === "salesperson") {
      loadAssignedLeads();
    }
  }, [selectedSheetId, user?.name, user?.role]);

  // Combine leads and date rows for display
  useEffect(() => {
    const combined: DisplayRow[] = [];

    if (dateRows.length === 0) {
      // No date rows, just use leads
      setDisplayRows(leads);
    } else {
      // Need to interleave date rows with leads based on original order
      // For now, we'll append date rows info to the display
      // In a more sophisticated approach, we'd track the original row indices
      setDisplayRows([...leads, ...dateRows]);
    }
  }, [leads, dateRows]);

  const loadLeads = async () => {
    setIsLoading(true);
    try {
      console.log(
        `Loading leads for sheet_id: "${selectedSheetId}" (type: ${typeof selectedSheetId})`,
      );

      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("sheet_id", selectedSheetId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });

      if (error) {
        const errorMsg = error.message || JSON.stringify(error);
        console.error("Error loading leads with sheet_id filter:", errorMsg);
        console.error("Full error:", error);

        // Only fall back if sheet_id column truly doesn't exist
        if (
          errorMsg.includes("sheet_id") &&
          (errorMsg.includes("column") || errorMsg.includes("does not exist"))
        ) {
          console.log(
            "Falling back to loading all leads (sheet_id column may not exist yet)",
          );
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("leads")
            .select("*")
            .order("created_at", { ascending: false })
            .order("id", { ascending: false });

          if (fallbackError) {
            console.error("Error in fallback load:", fallbackError.message);
            toast.error("Failed to load leads");
            setLeads([]);
          } else {
            console.log(`Loaded ${fallbackData?.length || 0} leads (fallback)`);
            setLeads(fallbackData || []);
          }
        } else {
          console.error("Cannot filter by sheet_id:", errorMsg);
          toast.error("Failed to load leads for selected sheet");
          setLeads([]);
        }
      } else {
        console.log(
          `✓ Successfully loaded ${data?.length || 0} leads for sheet ${selectedSheetId}`,
        );
        if (data && data.length > 0) {
          console.log("Sample lead:", data[0]);
          console.log(
            "Sample lead sheet_id:",
            data[0].sheet_id,
            "type:",
            typeof data[0].sheet_id,
          );
        }
        setLeads(data || []);
      }
    } catch (error) {
      console.error(
        "Error loading leads:",
        error instanceof Error ? error.message : String(error),
      );
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSalespersons = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("name")
        .eq("role", "salesperson")
        .order("name");

      if (!error && data) {
        setSalespersons(data.map((s) => s.name));
      }
    } catch (error) {
      console.error("Error loading salespersons:", error);
    }
  };

  const loadAssignedLeads = async () => {
    if (!user?.name) return;

    try {
      const data = await getAssignedLeads(user.name);
      setAssignedLeads(data);
    } catch (error) {
      console.error("Error loading assigned leads:", error);
    }
  };

  const loadAvailableSheets = async () => {
    setIsLoadingSheets(true);
    try {
      console.log("Fetching available sheets from Google Sheet...");

      const response = await fetch(
        `/api/fetch-google-sheets-metadata?spreadsheetId=${SPREADSHEET_ID}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch sheet metadata");
      }

      const data = await response.json();

      if (data.sheets && data.sheets.length > 0) {
        console.log(`✓ Loaded ${data.sheets.length} sheets:`, data.sheets);
        setAvailableSheets(data.sheets);

        // If currently selected sheet is not in the list, select the first one
        const sheetIds = data.sheets.map((s: any) => s.id);
        if (!sheetIds.includes(selectedSheetId) && sheetIds.length > 0) {
          console.log(
            `Currently selected sheet ${selectedSheetId} not found, selecting ${sheetIds[0]}`,
          );
          setSelectedSheetId(sheetIds[0]);
        }

        if (data.warning) {
          console.warn(data.warning);
        }
      }
    } catch (error) {
      console.error("Error loading available sheets:", error);
      // Keep using the default sheets if fetching fails
      toast.error("Failed to load available sheets from Google Sheet");
    } finally {
      setIsLoadingSheets(false);
    }
  };

  const syncFromGoogleSheet = async (showNotification = false) => {
    if (isSyncing) {
      if (showNotification) {
        toast.info("Sync already in progress...");
      }
      return;
    }

    setIsSyncing(true);
    try {
      // Fetch from server endpoint (avoids CORS issues) with 2 minute timeout for fetching sheet
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const fetchResponse = await fetch(
        `/api/fetch-google-sheet?spreadsheetId=${SPREADSHEET_ID}&sheetId=0`,
        { signal: controller.signal },
      );
      clearTimeout(timeoutId);

      if (!fetchResponse.ok) {
        throw new Error("Failed to fetch from Google Sheet");
      }

      const fetchData = await fetchResponse.json();
      const rows = fetchData.rows;

      console.log("Fetched rows from Google Sheet:", rows.length);

      if (rows.length === 0) {
        if (showNotification) {
          toast.error("Google Sheet is empty");
        }
        setIsSyncing(false);
        return;
      }

      const leadsToSync = rows
        .map((row: any) => {
          const parsed = parseLeadRow(row);
          return {
            name: parsed.name,
            email: parsed.email,
            phone: parsed.phone,
            company: parsed.company,
            status: parsed.status || ("Not lifted" as LeadStatus),
            assigned_to: parsed.assignedTo || "Unassigned",
            note1: parsed.note1 || "",
            note2: parsed.note2 || "",
            type_of_property: parsed.type_of_property || "",
            avg_monthly_bill: parsed.avg_monthly_bill || "",
            street_address: parsed.street_address || "",
            post_code: parsed.post_code || "",
            lead_status: parsed.lead_status || "",
            electricity_bill: parsed.electricity_bill || "",
          };
        })
        .filter((lead) => {
          const isValid = lead.name && lead.email;
          if (!isValid) {
            console.log(
              "Filtering out invalid lead (missing name or email):",
              lead,
            );
          }
          return isValid;
        });

      console.log("Valid leads after filtering:", leadsToSync.length);

      if (leadsToSync.length === 0) {
        const totalRows = rows.length;
        const invalidLeads = rows
          .map((row: any) => {
            const parsed = parseLeadRow(row);
            return {
              name: parsed.name,
              email: parsed.email,
            };
          })
          .filter((lead) => !lead.name || !lead.email);

        const errorMsg = `No valid leads found. Of ${totalRows} rows, ${invalidLeads.length} are missing required fields (Name and Email). Check browser console for details.`;

        console.error("Sync failure details:", {
          totalRows,
          invalidRowsCount: invalidLeads.length,
          sampleInvalidRows: invalidLeads.slice(0, 5),
        });

        if (showNotification) {
          toast.error(errorMsg);
        }
        setIsSyncing(false);
        return;
      }

      // Sync to backend with 5 minute timeout for processing and uploading
      const syncController = new AbortController();
      const syncTimeoutId = setTimeout(() => syncController.abort(), 300000);

      const syncResponse = await fetch("/api/sync-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: leadsToSync,
          source: "google_sheet",
        }),
        signal: syncController.signal,
      });
      clearTimeout(syncTimeoutId);

      if (!syncResponse.ok) {
        throw new Error("Failed to sync leads");
      }

      // Reload leads from Supabase
      await loadLeads();
      if (showNotification) {
        toast.success(`Synced ${leadsToSync.length} leads from Google Sheet`);
      }
    } catch (error) {
      console.error("Error syncing from Google Sheet:", error);
      if (showNotification) {
        if (error instanceof Error && error.name === "AbortError") {
          toast.error(
            "Sync timed out. Large spreadsheets may take longer. Please wait and try again.",
          );
        } else {
          toast.error("Failed to sync from Google Sheet");
        }
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const syncFromGoogleSheetDynamic = async (
    sheetId: string,
    showNotification = false,
  ) => {
    if (isSyncing) {
      if (showNotification) {
        toast.info("Sync already in progress...");
      }
      return;
    }

    setIsSyncing(true);
    if (showNotification) {
      toast.loading(
        "Syncing leads... This may take a few minutes for large sheets.",
      );
    }

    try {
      // 2 minute timeout for fetching from Google Sheets
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const fetchResponse = await fetch(
        `/api/fetch-google-sheet?spreadsheetId=${SPREADSHEET_ID}&sheetId=${sheetId}`,
        { signal: controller.signal },
      );
      clearTimeout(timeoutId);

      if (!fetchResponse.ok) {
        throw new Error("Failed to fetch from Google Sheet");
      }

      const fetchData = await fetchResponse.json();
      const rows = fetchData.rows;

      console.log(`Fetched ${rows.length} rows from sheet ${sheetId}`);

      if (rows.length === 0) {
        if (showNotification) {
          toast.error("Selected sheet is empty");
        }
        setIsSyncing(false);
        return;
      }

      // Extract date rows and regular rows
      const extractedDateRows: DateRowMarker[] = [];
      const dataRows = rows.filter((row: any) => {
        if (row._isDateRow === "true" || row._isDateRow === true) {
          extractedDateRows.push(row as DateRowMarker);
          return false;
        }
        return true;
      });

      console.log(`Extracted ${extractedDateRows.length} date rows`);

      // 5 minute timeout for processing and uploading to Supabase
      const syncController = new AbortController();
      const syncTimeoutId = setTimeout(() => syncController.abort(), 300000);

      try {
        const syncResponse = await fetch("/api/sync-leads-dynamic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leads: dataRows,
            source: "google_sheet",
            sheetId: sheetId,
          }),
          signal: syncController.signal,
        });
        clearTimeout(syncTimeoutId);

        const statusOk = syncResponse.ok;
        let syncData: any = null;
        let responseText = "";

        // Read response body only once
        try {
          responseText = await syncResponse.text();
          if (responseText) {
            try {
              syncData = JSON.parse(responseText);
            } catch (jsonError) {
              console.error("Failed to parse JSON:", jsonError);
              console.error("Response text was:", responseText);
              syncData = { error: "Invalid JSON response from server" };
            }
          }
        } catch (textError) {
          console.error("Failed to read response body:", textError);
          syncData = { error: "Failed to read response" };
        }

        // Check response status after reading body
        if (!statusOk) {
          const errorMessage =
            syncData?.message || syncData?.error || "Failed to sync leads";
          const fullError = [
            errorMessage,
            syncData?.hint && `Hint: ${syncData.hint}`,
            syncData?.troubleshooting &&
              `Troubleshooting: Check /api/test-supabase`,
          ]
            .filter(Boolean)
            .join("\n");

          console.error(
            "Sync API returned error:",
            errorMessage,
            "Full response:",
            syncData,
            "Status:",
            syncResponse.status,
          );
          throw new Error(fullError);
        }

        if (!syncData) {
          throw new Error("No response data received from sync");
        }

        console.log(
          "Sync response:",
          syncData.message,
          "Columns:",
          syncData.columnsIncluded,
        );

        // Store date rows for display
        setDateRows(extractedDateRows);

        console.log(`About to reload leads for sheet_id: ${sheetId}`);
        await loadLeads();
        console.log("Leads reloaded after sync");

        if (showNotification) {
          const emptyRowsMsg =
            syncData.emptyRowsRemoved > 0
              ? ` (${syncData.emptyRowsRemoved} empty rows removed)`
              : "";
          const dateRowsMsg =
            extractedDateRows.length > 0
              ? ` (${extractedDateRows.length} date separators)`
              : "";
          toast.success(
            `Synced ${syncData.synced} leads${emptyRowsMsg}${dateRowsMsg} with all columns`,
          );
        }
      } catch (fetchError) {
        clearTimeout(syncTimeoutId);
        throw fetchError;
      }
    } catch (error) {
      console.error("Error syncing dynamically from Google Sheet:", error);
      if (showNotification) {
        if (error instanceof Error && error.name === "AbortError") {
          toast.error(
            "Sync timed out after 5 minutes. Very large sheets may need multiple sync attempts.",
          );
        } else {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to sync from sheet",
          );
        }
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const syncFromGoogleSheetApiV4 = async (
    sheetId: string,
    sheetName: string,
    showNotification = false,
  ) => {
    if (isSyncing) {
      if (showNotification) {
        toast.info("Sync already in progress...");
      }
      return;
    }

    setIsSyncing(true);
    if (showNotification) {
      toast.loading(
        "Syncing leads using Google Sheets API... This works for 500+ leads.",
      );
    }

    try {
      // 3 minute timeout for fetching from Google Sheets API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000);

      const fetchResponse = await fetch(
        `/api/fetch-google-sheet-api?spreadsheetId=${SPREADSHEET_ID}&sheetName=${encodeURIComponent(
          sheetName,
        )}`,
        { signal: controller.signal },
      );
      clearTimeout(timeoutId);

      if (!fetchResponse.ok) {
        throw new Error("Failed to fetch from Google Sheet API");
      }

      const fetchData = await fetchResponse.json();
      const rows = fetchData.rows;

      console.log(
        `Fetched ${rows.length} rows from sheet ${sheetName} via API`,
      );

      if (rows.length === 0) {
        if (showNotification) {
          toast.error("Selected sheet is empty");
        }
        setIsSyncing(false);
        return;
      }

      // Extract date rows and regular rows
      const extractedDateRows: DateRowMarker[] = [];
      const dataRows = rows.filter((row: any) => {
        if (row._isDateRow === "true" || row._isDateRow === true) {
          extractedDateRows.push(row as DateRowMarker);
          return false;
        }
        return true;
      });

      console.log(`Extracted ${extractedDateRows.length} date rows`);

      // 5 minute timeout for processing and uploading to Supabase
      const syncController = new AbortController();
      const syncTimeoutId = setTimeout(() => syncController.abort(), 300000);

      try {
        const syncResponse = await fetch("/api/sync-leads-dynamic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leads: dataRows,
            source: "google_sheet_api",
            sheetId: sheetId,
          }),
          signal: syncController.signal,
        });
        clearTimeout(syncTimeoutId);

        const statusOk = syncResponse.ok;
        let syncData: any = null;
        let responseText = "";

        // Read response body only once
        try {
          responseText = await syncResponse.text();
          if (responseText) {
            try {
              syncData = JSON.parse(responseText);
            } catch (jsonError) {
              console.error("Failed to parse JSON:", jsonError);
              console.error("Response text was:", responseText);
              syncData = { error: "Invalid JSON response from server" };
            }
          }
        } catch (textError) {
          console.error("Failed to read response body:", textError);
          syncData = { error: "Failed to read response" };
        }

        // Check response status after reading body
        if (!statusOk) {
          const errorMessage =
            syncData?.message || syncData?.error || "Failed to sync leads";
          const fullError = [
            errorMessage,
            syncData?.hint && `Hint: ${syncData.hint}`,
            syncData?.troubleshooting &&
              `Troubleshooting: Check /api/test-supabase`,
          ]
            .filter(Boolean)
            .join("\n");

          console.error(
            "Sync API returned error:",
            errorMessage,
            "Full response:",
            syncData,
            "Status:",
            syncResponse.status,
          );
          throw new Error(fullError);
        }

        if (!syncData) {
          throw new Error("No response data received from sync");
        }

        console.log(
          "Sync response:",
          syncData.message,
          "Columns:",
          syncData.columnsIncluded,
        );

        // Store date rows for display
        setDateRows(extractedDateRows);

        console.log(`About to reload leads for sheet_id: ${sheetId}`);
        await loadLeads();
        console.log("Leads reloaded after sync");

        if (showNotification) {
          const emptyRowsMsg =
            syncData.emptyRowsRemoved > 0
              ? ` (${syncData.emptyRowsRemoved} empty rows removed)`
              : "";
          const dateRowsMsg =
            extractedDateRows.length > 0
              ? ` (${extractedDateRows.length} date separators)`
              : "";
          toast.success(
            `Synced ${syncData.synced} leads from Google Sheets API${emptyRowsMsg}${dateRowsMsg}`,
          );
        }
      } catch (fetchError) {
        clearTimeout(syncTimeoutId);
        throw fetchError;
      }
    } catch (error) {
      console.error("Error syncing via Google Sheets API:", error);
      if (showNotification) {
        if (error instanceof Error && error.name === "AbortError") {
          toast.error(
            "Sync timed out after 5 minutes. Please try again or check sheet size.",
          );
        } else {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to sync from sheet",
          );
        }
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAutoAssign = async () => {
    if (salespersons.length === 0) {
      toast.error("No salespersons available for assignment");
      return;
    }

    const unassignedLeads = leads.filter(
      (lead) => !lead.assigned_to || lead.assigned_to === "Unassigned",
    );

    if (unassignedLeads.length === 0) {
      toast.info("No unassigned leads found");
      return;
    }

    try {
      // Prepare batch updates using the backend API to handle them efficiently
      const updates = unassignedLeads.map((lead, index) => ({
        id: lead.id,
        assigned_to: salespersons[index % salespersons.length],
      }));

      // Send batch update request to backend
      const response = await fetch("/api/batch-update-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `Server error: ${response.status}`,
        );
      }

      await loadLeads();
      toast.success(`Auto-assigned ${unassignedLeads.length} leads`);
    } catch (error) {
      console.error("Error auto-assigning leads:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to auto-assign leads",
      );
    }
  };

  const handleAddLead = async () => {
    if (!formData.name || !formData.email || !formData.phone) {
      toast.error("Name, Email, and Phone are required");
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from("leads")
          .update({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            company: formData.company,
            street_address: formData.street_address || null,
            post_code: formData.post_code || null,
            lead_status: formData.lead_status || null,
            electricity_bill: formData.electricity_bill || null,
            type_of_property: formData.type_of_property || null,
            avg_monthly_bill: formData.avg_monthly_bill || null,
            note1: formData.note1,
            note2: formData.note2,
            status: formData.status,
            assigned_to: formData.assigned_to || "Unassigned",
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Lead updated successfully");
      } else {
        const { error } = await supabase.from("leads").insert([
          {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            company: formData.company,
            street_address: formData.street_address || null,
            post_code: formData.post_code || null,
            lead_status: formData.lead_status || null,
            electricity_bill: formData.electricity_bill || null,
            type_of_property: formData.type_of_property || null,
            avg_monthly_bill: formData.avg_monthly_bill || null,
            note1: formData.note1,
            note2: formData.note2,
            status: formData.status || "Not lifted",
            assigned_to: formData.assigned_to || "Unassigned",
            source: "manual",
          },
        ]);

        if (error) throw error;
        toast.success("Lead added successfully");
      }

      await loadLeads();
      setOpenDialog(false);
      resetForm();
    } catch (error) {
      console.error("Error saving lead:", error);
      toast.error("Failed to save lead");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      company: "",
      street_address: "",
      post_code: "",
      lead_status: "",
      electricity_bill: "",
      type_of_property: "",
      avg_monthly_bill: "",
      note1: "",
      note2: "",
      status: "Not lifted",
      assigned_to: "",
    });
    setEditingId(null);
  };

  const handleOpenDialog = (lead?: Lead) => {
    if (lead) {
      setFormData({
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        street_address: lead.street_address || "",
        post_code: lead.post_code || "",
        lead_status: lead.lead_status || "",
        electricity_bill: (lead as any).electricity_bill || "",
        type_of_property: lead.type_of_property || "",
        avg_monthly_bill: lead.avg_monthly_bill || "",
        note1: lead.note1,
        note2: lead.note2,
        status: lead.status,
        assigned_to: lead.assigned_to,
      });
      setEditingId(lead.id);
    } else {
      resetForm();
    }
    setOpenDialog(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
      await loadLeads();
      setDeleteId(null);
      toast.success("Lead deleted successfully");
    } catch (error) {
      console.error("Error deleting lead:", error);
      toast.error("Failed to delete lead");
    }
  };

  const handleOpenLeadDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setOpenDetailsModal(true);
  };

  const handleLeadUpdate = (updatedLead: Lead) => {
    setSelectedLead(updatedLead);
    const updatedLeads = leads.map((l) =>
      l.id === updatedLead.id ? updatedLead : l,
    );
    setLeads(updatedLeads);
  };

  const saveNoteUpdate = async (
    leadId: string,
    field: "note1" | "note2",
    value: string,
  ) => {
    try {
      const { error } = await supabase
        .from("leads")
        .update({
          [field]: value,
          updated_at: new Date().toISOString(),
        })
        .eq("id", leadId);

      if (error) throw error;
      await loadLeads();
      setEditingNote(null);
      setEditingNoteContent("");
    } catch (error) {
      console.error("Error updating note:", error);
      toast.error("Failed to update note");
    }
  };

  const handleNoteClickEdit = (
    leadId: string,
    field: "note1" | "note2",
    currentValue: string,
  ) => {
    setEditingNote({ leadId, field });
    setEditingNoteContent(currentValue || "");
  };

  const handleNoteSave = async () => {
    if (editingNote) {
      await saveNoteUpdate(
        editingNote.leadId,
        editingNote.field,
        editingNoteContent,
      );
      // Reload assigned leads to ensure consistency
      await loadAssignedLeads();
    }
  };

  const isToday = (dateString?: string) => {
    if (!dateString) return false;
    try {
      const date = new Date(dateString);
      const today = new Date();

      // Use UTC dates to avoid timezone issues
      const dateUTC = new Date(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
      );
      const todayUTC = new Date(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate(),
      );

      return dateUTC.getTime() === todayUTC.getTime();
    } catch (e) {
      return false;
    }
  };

  const isZipcodeInRange = (zipcode?: string) => {
    if (!zipcode) return false;
    const zip = parseInt(zipcode, 10);
    return zip >= 500000 && zip <= 509999;
  };

  const getRowHighlightClass = (lead: Lead) => {
    const createdToday = isToday(lead.created_at);
    const updatedToday = isToday(lead.updated_at);
    const isTargetZipcode = isZipcodeInRange(lead.post_code);

    // Priority: zipcode range (blue) > updated today (green) > created today (yellow) > default
    if (isTargetZipcode) {
      return "bg-blue-50 hover:bg-blue-100";
    }
    if (updatedToday) {
      return "bg-green-50 hover:bg-green-100";
    }
    if (createdToday) {
      return "bg-yellow-50 hover:bg-yellow-100";
    }
    return "hover:bg-gray-50";
  };

  const filteredLeads = displayRows.filter((row) => {
    // Always show date rows
    if (isDateRow(row)) {
      return true;
    }

    const lead = row as Lead;
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm) ||
      lead.company.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" || lead.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <CRMLayout>
      <div className="space-y-3 p-4">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Leads</h2>
            <p className="text-xs text-muted-foreground">
              Manage and track all your sales leads
            </p>
          </div>
          <div className="flex gap-0.5 flex-wrap items-center text-xs">
            <div className="flex gap-1 items-center">
              <Label htmlFor="sheet-select" className="whitespace-nowrap">
                Sheet:
              </Label>
              <Select
                value={selectedSheetId}
                onValueChange={setSelectedSheetId}
              >
                <SelectTrigger id="sheet-select" className="w-28 h-8 text-xs">
                  <SelectValue placeholder="Select sheet" />
                </SelectTrigger>
                <SelectContent>
                  {availableSheets.map((sheet) => (
                    <SelectItem key={sheet.id} value={sheet.id}>
                      {sheet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              className="gap-1 h-8 text-xs px-2"
              onClick={loadAvailableSheets}
              disabled={isLoadingSheets}
              title="Refresh available sheets from Google Sheet"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isLoadingSheets ? "animate-spin" : ""}`}
              />
              {isLoadingSheets ? "Loading..." : "Refresh"}
            </Button>
            <Button
              className="gap-1 h-8 text-xs px-2 bg-purple-600 hover:bg-purple-700"
              onClick={handleAutoAssign}
            >
              <Zap className="h-3.5 w-3.5" />
              Auto-assign
            </Button>
            <Button
              variant="outline"
              className="gap-1 h-8 text-xs px-2"
              onClick={() => {
                const selectedSheet = availableSheets.find(
                  (s) => s.id === selectedSheetId,
                );
                const sheetName = selectedSheet?.name || "Sheet1";
                // Use API v4 for better handling of large sheets (500+ leads)
                syncFromGoogleSheetApiV4(selectedSheetId, sheetName, true);
              }}
              disabled={isSyncing}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`}
              />
              {isSyncing ? "Syncing..." : "Sync"}
            </Button>
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
              <DialogTrigger asChild>
                <Button
                  className="gap-1 h-8 text-xs px-2"
                  onClick={() => handleOpenDialog()}
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Lead
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Edit" : "Add"} Lead</DialogTitle>
                  <DialogDescription>
                    {editingId
                      ? "Update lead information"
                      : "Add a new sales lead"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      placeholder="Full Name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        placeholder="Phone"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      placeholder="Company Name"
                      value={formData.company}
                      onChange={(e) =>
                        setFormData({ ...formData, company: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="streetAddress">Street Address</Label>
                      <Input
                        id="streetAddress"
                        placeholder="Street Address"
                        value={formData.street_address}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            street_address: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="postCode">Post Code</Label>
                      <Input
                        id="postCode"
                        placeholder="Post Code"
                        value={formData.post_code}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            post_code: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="leadStatus">Lead Status</Label>
                    <Input
                      id="leadStatus"
                      placeholder="Lead Status"
                      value={formData.lead_status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          lead_status: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="typeOfProperty">Type of Property</Label>
                    <Input
                      id="typeOfProperty"
                      placeholder="Type of Property"
                      value={formData.type_of_property}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          type_of_property: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="avgMonthlyBill">Average Monthly Bill</Label>
                    <Input
                      id="avgMonthlyBill"
                      placeholder="Average Monthly Bill"
                      value={formData.avg_monthly_bill}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          avg_monthly_bill: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="electricityBill">
                      Monthly Electricity Bill
                    </Label>
                    <Input
                      id="electricityBill"
                      placeholder="Average Monthly Electricity Bill"
                      value={formData.electricity_bill}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          electricity_bill: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            status: value as LeadStatus,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="assigned_to">Assigned To</Label>
                      <Select
                        value={formData.assigned_to}
                        onValueChange={(value) =>
                          setFormData({ ...formData, assigned_to: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select salesperson" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Unassigned">Unassigned</SelectItem>
                          {salespersons.map((person) => (
                            <SelectItem key={person} value={person}>
                              {person}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="note1">Note 1</Label>
                    <Textarea
                      id="note1"
                      placeholder="Note 1"
                      value={formData.note1}
                      onChange={(e) =>
                        setFormData({ ...formData, note1: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="note2">Note 2</Label>
                    <Textarea
                      id="note2"
                      placeholder="Note 2"
                      value={formData.note2}
                      onChange={(e) =>
                        setFormData({ ...formData, note2: e.target.value })
                      }
                    />
                  </div>

                  <Button onClick={handleAddLead} className="w-full">
                    {editingId ? "Update" : "Add"} Lead
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tabs for All Leads and Assigned Leads */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "all" | "assigned")}
          className="w-full"
        >
          <TabsList>
            <TabsTrigger value="all">All Leads ({leads.length})</TabsTrigger>
            {user?.role === "salesperson" && (
              <TabsTrigger value="assigned">
                My Leads ({assignedLeads.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="all" className="space-y-3">
            {/* Filters */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, phone, company..."
                  className="pl-9 py-1.5 text-xs h-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <Card className="border border-border bg-card p-2">
              <div className="overflow-x-auto">
                {isLoading ? (
                  <div className="p-4 text-center">
                    <p className="text-muted-foreground">Loading leads...</p>
                  </div>
                ) : (
                  <Table className="[&_th]:h-4 [&_th]:px-1 [&_td]:px-0.5 [&_td]:py-0.5 text-[9px] leading-tight">
                    <TableHeader>
                      <TableRow className="border-b border-border bg-gray-50">
                        <TableHead
                          className="whitespace-nowrap font-bold text-[11px]"
                          title="Type of Property"
                        >
                          TYPE
                        </TableHead>
                        <TableHead
                          className="whitespace-nowrap font-bold text-[11px]"
                          title="Average Monthly Bill"
                        >
                          AVG
                        </TableHead>
                        <TableHead className="whitespace-nowrap font-bold text-[11px]">
                          NAME
                        </TableHead>
                        <TableHead className="whitespace-nowrap font-bold text-[11px]">
                          PHONE
                        </TableHead>
                        <TableHead className="whitespace-nowrap font-bold text-[11px]">
                          EMAIL
                        </TableHead>
                        <TableHead className="whitespace-nowrap font-bold text-[11px]">
                          ADDR
                        </TableHead>
                        <TableHead
                          className="whitespace-nowrap font-bold text-[11px]"
                          title="Postal Code"
                        >
                          ZIP
                        </TableHead>
                        <TableHead
                          className="whitespace-nowrap font-bold text-[11px]"
                          title="Lead Status"
                        >
                          L.STS
                        </TableHead>
                        <TableHead className="whitespace-nowrap font-bold text-[11px]">
                          NOTE1
                        </TableHead>
                        <TableHead className="whitespace-nowrap font-bold text-[11px]">
                          NOTE2
                        </TableHead>
                        <TableHead className="whitespace-nowrap font-bold text-[11px]">
                          NEXT REMINDER
                        </TableHead>
                        <TableHead className="whitespace-nowrap font-bold text-[11px]">
                          STATUS
                        </TableHead>
                        <TableHead className="whitespace-nowrap font-bold text-[11px]">
                          ASSIGN
                        </TableHead>
                        <TableHead className="whitespace-nowrap font-bold text-[11px]">
                          ACT
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeads.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={15} className="py-8 text-center">
                            <p className="text-muted-foreground">
                              No leads found.{" "}
                              {displayRows.length === 0 &&
                                "Click 'Sync All Columns' to import leads from Google Sheet."}
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredLeads.map((row) => {
                          if (isDateRow(row)) {
                            return (
                              <TableRow
                                key={`date-${row._dateValue}`}
                                className="border-b border-border bg-blue-50 hover:bg-blue-100"
                              >
                                <TableCell
                                  colSpan={15}
                                  className="py-3 text-center font-semibold text-blue-700"
                                >
                                  📅 {row._dateValue}
                                </TableCell>
                              </TableRow>
                            );
                          }
                          const lead = row as Lead;
                          return (
                            <TableRow
                              key={lead.id}
                              className={`border-b border-border ${getRowHighlightClass(lead)}`}
                            >
                              <TableCell
                                className="text-muted-foreground text-xs whitespace-nowrap cursor-pointer hover:bg-blue-100"
                                onClick={() => handleOpenLeadDetails(lead)}
                              >
                                {lead.type_of_property || "-"}
                              </TableCell>
                              <TableCell
                                className="text-muted-foreground text-xs whitespace-nowrap cursor-pointer hover:bg-blue-100"
                                onClick={() => handleOpenLeadDetails(lead)}
                              >
                                {lead.avg_monthly_bill || "-"}
                              </TableCell>
                              <TableCell
                                className="font-medium text-foreground whitespace-nowrap text-xs cursor-pointer hover:bg-blue-100"
                                onClick={() => handleOpenLeadDetails(lead)}
                              >
                                {lead.name}
                              </TableCell>
                              <TableCell
                                className="text-muted-foreground text-xs whitespace-nowrap cursor-pointer hover:bg-blue-100"
                                onClick={() => handleOpenLeadDetails(lead)}
                              >
                                {lead.phone}
                              </TableCell>
                              <TableCell
                                className="text-muted-foreground truncate max-w-[120px] cursor-pointer hover:bg-blue-100"
                                onClick={() => handleOpenLeadDetails(lead)}
                              >
                                {lead.email}
                              </TableCell>
                              <TableCell
                                className="text-muted-foreground truncate max-w-[100px] cursor-pointer hover:bg-blue-100"
                                onClick={() => handleOpenLeadDetails(lead)}
                              >
                                {lead.street_address || "-"}
                              </TableCell>
                              <TableCell
                                className="text-muted-foreground text-xs whitespace-nowrap cursor-pointer hover:bg-blue-100"
                                onClick={() => handleOpenLeadDetails(lead)}
                              >
                                {lead.post_code || "-"}
                              </TableCell>
                              <TableCell
                                className="text-muted-foreground text-xs whitespace-nowrap cursor-pointer hover:bg-blue-100"
                                onClick={() => handleOpenLeadDetails(lead)}
                              >
                                {lead.lead_status || "-"}
                              </TableCell>
                              <TableCell className="text-xs whitespace-nowrap">
                                {editingNote?.leadId === lead.id &&
                                editingNote.field === "note1" ? (
                                  <Input
                                    autoFocus
                                    value={editingNoteContent}
                                    onChange={(e) =>
                                      setEditingNoteContent(e.target.value)
                                    }
                                    onBlur={handleNoteSave}
                                    onKeyDown={async (e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        await handleNoteSave();
                                      }
                                    }}
                                    className="text-xs"
                                  />
                                ) : (
                                  <div
                                    onClick={() =>
                                      handleNoteClickEdit(
                                        lead.id,
                                        "note1",
                                        lead.note1,
                                      )
                                    }
                                    className="cursor-pointer hover:bg-gray-100 p-0.5 rounded min-h-6 text-xs"
                                  >
                                    {lead.note1 || (
                                      <span className="text-muted-foreground italic text-xs">
                                        Add...
                                      </span>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-xs whitespace-nowrap">
                                {editingNote?.leadId === lead.id &&
                                editingNote.field === "note2" ? (
                                  <Input
                                    autoFocus
                                    value={editingNoteContent}
                                    onChange={(e) =>
                                      setEditingNoteContent(e.target.value)
                                    }
                                    onBlur={handleNoteSave}
                                    onKeyDown={async (e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        await handleNoteSave();
                                      }
                                    }}
                                    className="text-xs"
                                  />
                                ) : (
                                  <div
                                    onClick={() =>
                                      handleNoteClickEdit(
                                        lead.id,
                                        "note2",
                                        lead.note2,
                                      )
                                    }
                                    className="cursor-pointer hover:bg-gray-100 p-0.5 rounded min-h-6 text-xs"
                                  >
                                    {lead.note2 || (
                                      <span className="text-muted-foreground italic text-xs">
                                        Add...
                                      </span>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell
                                className="text-muted-foreground text-xs whitespace-nowrap cursor-pointer hover:bg-blue-100"
                                onClick={() => handleOpenLeadDetails(lead)}
                              >
                                {lead.next_reminder
                                  ? new Date(
                                      lead.next_reminder,
                                    ).toLocaleDateString("en-IN", {
                                      year: "numeric",
                                      month: "2-digit",
                                      day: "2-digit",
                                    })
                                  : "-"}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                <select
                                  value={lead.status}
                                  onChange={async (e) => {
                                    try {
                                      await supabase
                                        .from("leads")
                                        .update({
                                          status: e.target.value as LeadStatus,
                                          updated_at: new Date().toISOString(),
                                        })
                                        .eq("id", lead.id);
                                      await loadLeads();
                                    } catch (error) {
                                      console.error(
                                        "Error updating status:",
                                        error,
                                      );
                                      toast.error("Failed to update status");
                                    }
                                  }}
                                  className="rounded border border-border bg-background px-1.5 py-0.5 text-xs"
                                >
                                  {STATUS_OPTIONS.map((status) => (
                                    <option key={status} value={status}>
                                      {status}
                                    </option>
                                  ))}
                                </select>
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                <select
                                  value={lead.assigned_to || "Unassigned"}
                                  onChange={async (e) => {
                                    try {
                                      await supabase
                                        .from("leads")
                                        .update({
                                          assigned_to: e.target.value,
                                          updated_at: new Date().toISOString(),
                                        })
                                        .eq("id", lead.id);
                                      await loadLeads();
                                    } catch (error) {
                                      console.error(
                                        "Error updating owner:",
                                        error,
                                      );
                                      toast.error("Failed to update owner");
                                    }
                                  }}
                                  className="rounded border border-border bg-background px-1.5 py-0.5 text-xs"
                                >
                                  <option value="Unassigned">Unassigned</option>
                                  {salespersons.map((person) => (
                                    <option key={person} value={person}>
                                      {person}
                                    </option>
                                  ))}
                                </select>
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteId(lead.id)}
                                  className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="assigned" className="space-y-3">
            {isLoading ? (
              <Card className="border border-border bg-card p-8 text-center">
                <p className="text-muted-foreground">
                  Loading your assigned leads...
                </p>
              </Card>
            ) : assignedLeads.length === 0 ? (
              <Card className="border border-border bg-card p-8 text-center">
                <p className="text-muted-foreground">
                  No leads assigned to you yet.
                </p>
              </Card>
            ) : (
              <Card className="border border-border bg-card p-2">
                <div className="overflow-x-auto">
                  <Table className="[&_th]:h-4 [&_th]:px-1 [&_td]:px-0.5 [&_td]:py-0.5 text-[9px] leading-tight">
                    <TableHeader>
                      <TableRow className="border-b border-border bg-gray-50">
                        <TableHead
                          className="whitespace-nowrap font-bold text-[11px]"
                          title="Type of Property"
                        >
                          TYPE
                        </TableHead>
                        <TableHead
                          className="whitespace-nowrap font-bold text-[11px]"
                          title="Average Monthly Bill"
                        >
                          AVG
                        </TableHead>
                        <TableHead className="whitespace-nowrap font-bold text-[11px]">
                          NAME
                        </TableHead>
                        <TableHead className="whitespace-nowrap font-bold text-[11px]">
                          PHONE
                        </TableHead>
                        <TableHead className="whitespace-nowrap font-bold text-[11px]">
                          EMAIL
                        </TableHead>
                        <TableHead className="whitespace-nowrap font-bold text-[11px]">
                          ADDR
                        </TableHead>
                        <TableHead
                          className="whitespace-nowrap font-bold text-[11px]"
                          title="Postal Code"
                        >
                          ZIP
                        </TableHead>
                        <TableHead
                          className="whitespace-nowrap font-bold text-[11px]"
                          title="Lead Status"
                        >
                          L.STS
                        </TableHead>
                        <TableHead className="whitespace-nowrap font-bold text-[11px]">
                          NOTE1
                        </TableHead>
                        <TableHead className="whitespace-nowrap font-bold text-[11px]">
                          NOTE2
                        </TableHead>
                        <TableHead className="whitespace-nowrap font-bold text-[11px]">
                          STATUS
                        </TableHead>
                        <TableHead className="whitespace-nowrap font-bold text-[11px]">
                          ACT
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignedLeads.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={12} className="py-8 text-center">
                            <p className="text-muted-foreground">
                              No leads assigned to you yet.
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        assignedLeads.map((lead) => (
                          <TableRow
                            key={lead.id}
                            className={`border-b border-border ${getRowHighlightClass(lead)}`}
                          >
                            <TableCell
                              className="text-muted-foreground text-xs whitespace-nowrap cursor-pointer hover:bg-blue-100"
                              onClick={() => handleOpenLeadDetails(lead)}
                            >
                              {lead.type_of_property || "-"}
                            </TableCell>
                            <TableCell
                              className="text-muted-foreground text-xs whitespace-nowrap cursor-pointer hover:bg-blue-100"
                              onClick={() => handleOpenLeadDetails(lead)}
                            >
                              {lead.avg_monthly_bill || "-"}
                            </TableCell>
                            <TableCell
                              className="font-medium text-foreground whitespace-nowrap text-xs cursor-pointer hover:bg-blue-100"
                              onClick={() => handleOpenLeadDetails(lead)}
                            >
                              {lead.name}
                            </TableCell>
                            <TableCell
                              className="text-muted-foreground text-xs whitespace-nowrap cursor-pointer hover:bg-blue-100"
                              onClick={() => handleOpenLeadDetails(lead)}
                            >
                              {lead.phone}
                            </TableCell>
                            <TableCell
                              className="text-muted-foreground truncate max-w-[120px] cursor-pointer hover:bg-blue-100"
                              onClick={() => handleOpenLeadDetails(lead)}
                            >
                              {lead.email}
                            </TableCell>
                            <TableCell
                              className="text-muted-foreground truncate max-w-[100px] cursor-pointer hover:bg-blue-100"
                              onClick={() => handleOpenLeadDetails(lead)}
                            >
                              {lead.street_address || "-"}
                            </TableCell>
                            <TableCell
                              className="text-muted-foreground text-xs whitespace-nowrap cursor-pointer hover:bg-blue-100"
                              onClick={() => handleOpenLeadDetails(lead)}
                            >
                              {lead.post_code || "-"}
                            </TableCell>
                            <TableCell
                              className="text-muted-foreground text-xs whitespace-nowrap cursor-pointer hover:bg-blue-100"
                              onClick={() => handleOpenLeadDetails(lead)}
                            >
                              {lead.lead_status || "-"}
                            </TableCell>
                            <TableCell className="text-xs whitespace-nowrap">
                              {editingNote?.leadId === lead.id &&
                              editingNote.field === "note1" ? (
                                <Input
                                  autoFocus
                                  value={editingNoteContent}
                                  onChange={(e) =>
                                    setEditingNoteContent(e.target.value)
                                  }
                                  onBlur={handleNoteSave}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleNoteSave();
                                    }
                                  }}
                                  className="text-xs"
                                />
                              ) : (
                                <div
                                  onClick={() =>
                                    handleNoteClickEdit(
                                      lead.id,
                                      "note1",
                                      lead.note1,
                                    )
                                  }
                                  className="cursor-pointer hover:bg-gray-100 p-0.5 rounded min-h-6 text-xs"
                                >
                                  {lead.note1 || (
                                    <span className="text-muted-foreground italic text-xs">
                                      Add...
                                    </span>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-xs whitespace-nowrap">
                              {editingNote?.leadId === lead.id &&
                              editingNote.field === "note2" ? (
                                <Input
                                  autoFocus
                                  value={editingNoteContent}
                                  onChange={(e) =>
                                    setEditingNoteContent(e.target.value)
                                  }
                                  onBlur={handleNoteSave}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleNoteSave();
                                    }
                                  }}
                                  className="text-xs"
                                />
                              ) : (
                                <div
                                  onClick={() =>
                                    handleNoteClickEdit(
                                      lead.id,
                                      "note2",
                                      lead.note2,
                                    )
                                  }
                                  className="cursor-pointer hover:bg-gray-100 p-0.5 rounded min-h-6 text-xs"
                                >
                                  {lead.note2 || (
                                    <span className="text-muted-foreground italic text-xs">
                                      Add...
                                    </span>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell
                              className="text-muted-foreground text-xs whitespace-nowrap cursor-pointer hover:bg-blue-100"
                              onClick={() => handleOpenLeadDetails(lead)}
                            >
                              {lead.next_reminder
                                ? new Date(
                                    lead.next_reminder,
                                  ).toLocaleDateString("en-IN", {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                  })
                                : "-"}
                            </TableCell>
                            <TableCell className="text-xs whitespace-nowrap">
                              <select
                                value={lead.status}
                                onChange={async (e) => {
                                  try {
                                    await supabase
                                      .from("leads")
                                      .update({
                                        status: e.target.value as LeadStatus,
                                        updated_at: new Date().toISOString(),
                                      })
                                      .eq("id", lead.id);
                                    await loadAssignedLeads();
                                  } catch (error) {
                                    console.error(
                                      "Error updating status:",
                                      error,
                                    );
                                    toast.error("Failed to update status");
                                  }
                                }}
                                className="rounded border border-border bg-background px-1.5 py-0.5 text-xs"
                              >
                                {STATUS_OPTIONS.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteId(lead.id)}
                                className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!deleteId}
          onOpenChange={(open) => !open && setDeleteId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Lead</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this lead? This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-4">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteId && handleDelete(deleteId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        <LeadDetailsModal
          open={openDetailsModal}
          onOpenChange={setOpenDetailsModal}
          lead={selectedLead}
          onLeadUpdate={handleLeadUpdate}
          salespersons={salespersons}
        />
      </div>
    </CRMLayout>
  );
}
