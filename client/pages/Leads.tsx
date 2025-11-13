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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Trash2, RefreshCw, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { fetchGoogleSheet, parseLeadRow } from "@/lib/googleSheets";

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
  source?: string;
  created_at?: string;
  updated_at?: string;
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
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<{
    leadId: string;
    field: "note1" | "note2";
  } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    street_address: "",
    post_code: "",
    lead_status: "",
    electricity_bill: "",
    note1: "",
    note2: "",
    status: "Not lifted" as LeadStatus,
    assigned_to: "",
  });

  const [salespersons, setSalespersons] = useState<string[]>([]);

  // Load leads from Supabase on component mount
  useEffect(() => {
    loadLeads();
    loadSalespersons();
    // Auto-sync from Google Sheets on page load
    syncFromGoogleSheet();
  }, []);

  const loadLeads = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading leads:", error);
        if (!error.message.includes("relation")) {
          toast.error("Failed to load leads");
        }
        setLeads([]);
      } else {
        setLeads(data || []);
      }
    } catch (error) {
      console.error("Error:", error);
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSalespersons = async () => {
    try {
      const { data, error } = await supabase
        .from("salespersons")
        .select("name")
        .order("name");

      if (!error && data) {
        setSalespersons(data.map((s) => s.name));
      }
    } catch (error) {
      console.error("Error loading salespersons:", error);
    }
  };

  const syncFromGoogleSheet = async (showNotification = false) => {
    setIsSyncing(true);
    try {
      const rows = await fetchGoogleSheet(SPREADSHEET_ID);
      console.log("Fetched rows from Google Sheet:", rows.length);

      if (rows.length === 0) {
        if (showNotification) {
          toast.error("Google Sheet is empty");
        }
        setIsSyncing(false);
        return;
      }

      const leadsToSync = rows
        .map((row) => {
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
          };
        })
        .filter((lead) => {
          const isValid = lead.name && lead.email && lead.phone;
          if (!isValid) {
            console.log("Filtering out invalid lead:", lead);
          }
          return isValid;
        });

      console.log("Valid leads after filtering:", leadsToSync.length);

      if (leadsToSync.length === 0) {
        if (showNotification) {
          toast.error(
            "No valid leads found in Google Sheet. Check browser console for details.",
          );
        }
        setIsSyncing(false);
        return;
      }

      // Sync to backend
      const response = await fetch("/api/sync-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: leadsToSync,
          source: "google_sheet",
        }),
      });

      if (!response.ok) {
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
        toast.error("Failed to sync from Google Sheet");
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
      for (let i = 0; i < unassignedLeads.length; i++) {
        const lead = unassignedLeads[i];
        const assignedTo = salespersons[i % salespersons.length];

        await supabase
          .from("leads")
          .update({ assigned_to: assignedTo })
          .eq("id", lead.id);
      }

      await loadLeads();
      toast.success(`Auto-assigned ${unassignedLeads.length} leads`);
    } catch (error) {
      console.error("Error auto-assigning leads:", error);
      toast.error("Failed to auto-assign leads");
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
            note1: formData.note1,
            note2: formData.note2,
            status: formData.status,
            assigned_to: formData.assigned_to || "Unassigned",
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

  const handleNoteUpdate = async (
    leadId: string,
    field: "note1" | "note2",
    value: string,
  ) => {
    try {
      const { error } = await supabase
        .from("leads")
        .update({ [field]: value })
        .eq("id", leadId);

      if (error) throw error;
      await loadLeads();
      setEditingNote(null);
    } catch (error) {
      console.error("Error updating note:", error);
      toast.error("Failed to update note");
    }
  };

  const filteredLeads = leads.filter((lead) => {
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
      <div className="space-y-6 p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Leads</h2>
            <p className="mt-1 text-muted-foreground">
              Manage and track all your sales leads
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              className="gap-2 bg-purple-600 hover:bg-purple-700"
              onClick={handleAutoAssign}
            >
              <Zap className="h-4 w-4" />
              Auto-assign Unassigned
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => syncFromGoogleSheet(true)}
              disabled={isSyncing}
            >
              <RefreshCw
                className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
              />
              {isSyncing ? "Syncing..." : "Sync Sheet"}
            </Button>
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4" />
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
                    <Label htmlFor="electricityBill">Monthly Electricity Bill</Label>
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

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads by name, email, phone, or company"
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48">
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
        <Card className="border border-border bg-card">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">Loading leads...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border bg-gray-50">
                    <TableHead className="whitespace-nowrap font-bold">
                      FULL NAME
                    </TableHead>
                    <TableHead className="whitespace-nowrap font-bold">
                      EMAIL
                    </TableHead>
                    <TableHead className="whitespace-nowrap font-bold">
                      PHONE
                    </TableHead>
                    <TableHead className="whitespace-nowrap font-bold">
                      PROPERTY TYPE
                    </TableHead>
                    <TableHead className="whitespace-nowrap font-bold">
                      STREET ADDRESS
                    </TableHead>
                    <TableHead className="whitespace-nowrap font-bold">
                      POST CODE
                    </TableHead>
                    <TableHead className="whitespace-nowrap font-bold">
                      ELECTRICITY BILL
                    </TableHead>
                    <TableHead className="whitespace-nowrap font-bold">
                      LEAD STATUS
                    </TableHead>
                    <TableHead className="whitespace-nowrap font-bold">
                      NOTE 1
                    </TableHead>
                    <TableHead className="whitespace-nowrap font-bold">
                      NOTE 2
                    </TableHead>
                    <TableHead className="whitespace-nowrap font-bold">
                      STATUS
                    </TableHead>
                    <TableHead className="whitespace-nowrap font-bold">
                      OWNER
                    </TableHead>
                    <TableHead className="whitespace-nowrap font-bold">
                      ACTION
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="py-8 text-center">
                        <p className="text-muted-foreground">
                          No leads found.{" "}
                          {leads.length === 0 &&
                            "Click 'Sync Sheet' to import leads from Google Sheet."}
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLeads.map((lead) => (
                      <TableRow
                        key={lead.id}
                        className="border-b border-border hover:bg-gray-50"
                      >
                        <TableCell className="font-medium text-foreground whitespace-nowrap">
                          {lead.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {lead.email}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {lead.phone}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {lead.company}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {lead.street_address || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {lead.post_code || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {lead.electricity_bill || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {lead.lead_status || "-"}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {editingNote?.leadId === lead.id &&
                          editingNote.field === "note1" ? (
                            <Input
                              autoFocus
                              value={lead.note1}
                              onChange={(e) =>
                                handleNoteUpdate(
                                  lead.id,
                                  "note1",
                                  e.target.value,
                                )
                              }
                              onBlur={() => setEditingNote(null)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") setEditingNote(null);
                              }}
                              className="text-xs"
                            />
                          ) : (
                            <div
                              onClick={() =>
                                setEditingNote({
                                  leadId: lead.id,
                                  field: "note1",
                                })
                              }
                              className="cursor-pointer hover:bg-gray-100 p-1 rounded min-h-6"
                            >
                              {lead.note1 || (
                                <span className="text-muted-foreground italic">
                                  Add note...
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {editingNote?.leadId === lead.id &&
                          editingNote.field === "note2" ? (
                            <Input
                              autoFocus
                              value={lead.note2}
                              onChange={(e) =>
                                handleNoteUpdate(
                                  lead.id,
                                  "note2",
                                  e.target.value,
                                )
                              }
                              onBlur={() => setEditingNote(null)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") setEditingNote(null);
                              }}
                              className="text-xs"
                            />
                          ) : (
                            <div
                              onClick={() =>
                                setEditingNote({
                                  leadId: lead.id,
                                  field: "note2",
                                })
                              }
                              className="cursor-pointer hover:bg-gray-100 p-1 rounded min-h-6"
                            >
                              {lead.note2 || (
                                <span className="text-muted-foreground italic">
                                  Add note...
                                </span>
                              )}
                            </div>
                          )}
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
                                  })
                                  .eq("id", lead.id);
                                await loadLeads();
                              } catch (error) {
                                console.error("Error updating status:", error);
                                toast.error("Failed to update status");
                              }
                            }}
                            className="rounded border border-border bg-background px-2 py-1 text-sm"
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
                                  .update({ assigned_to: e.target.value })
                                  .eq("id", lead.id);
                                await loadLeads();
                              } catch (error) {
                                console.error("Error updating owner:", error);
                                toast.error("Failed to update owner");
                              }
                            }}
                            className="rounded border border-border bg-background px-2 py-1 text-sm"
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
                            className="text-red-600 hover:text-red-700"
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </Card>

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
      </div>
    </CRMLayout>
  );
}
