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

type LeadStatus =
  | "Not lifted"
  | "Not connected"
  | "Voice Message"
  | "Quotation sent"
  | "Site visit"
  | "Advance payment"
  | "Lead finished"
  | "Contacted"
  | "New";

interface Lead {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  streetAddress: string;
  postCode: string;
  leadStatus: string;
  note1: string;
  note2: string;
  status: LeadStatus;
  owner: string;
  createdAt: number;
}

const STATUS_OPTIONS: LeadStatus[] = [
  "New",
  "Not lifted",
  "Not connected",
  "Voice Message",
  "Quotation sent",
  "Site visit",
  "Advance payment",
  "Lead finished",
  "Contacted",
];

const SALESPERSONS = [
  "Sarah Johnson",
  "Mike Chen",
  "Emily Rodriguez",
  "David Lee",
];

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingNote, setEditingNote] = useState<{
    leadId: string;
    field: "note1" | "note2";
  } | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    streetAddress: "",
    postCode: "",
    leadStatus: "",
    note1: "",
    note2: "",
    status: "New" as LeadStatus,
    owner: "",
  });

  // Auto-sync on page load
  useEffect(() => {
    syncFromGoogleSheet();
  }, []);

  const syncFromGoogleSheet = async () => {
    setIsSyncing(true);
    try {
      const spreadsheetId = "1QY8_Q8-ybLKNVs4hynPZslZDwUfC-PIJrViJfL0-tpM";
      const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;

      const response = await fetch(csvUrl);
      const csv = await response.text();

      // Parse CSV
      const lines = csv.trim().split("\n");
      if (lines.length < 2) {
        toast.error("Google Sheet is empty");
        setIsSyncing(false);
        return;
      }

      // Get headers
      const headers = parseCSVLine(lines[0]).map((h) =>
        h.trim().toLowerCase().replace(/\s+/g, "_")
      );

      // Find column indices
      const fullNameIdx = headers.findIndex((h) =>
        h.includes("full_name") || h.includes("name")
      );
      const emailIdx = headers.findIndex((h) => h.includes("email"));
      const phoneIdx = headers.findIndex((h) => h.includes("phone"));
      const streetIdx = headers.findIndex((h) =>
        h.includes("street") || h.includes("address")
      );
      const postCodeIdx = headers.findIndex((h) =>
        h.includes("post_code") || h.includes("post") || h.includes("code")
      );
      const leadStatusIdx = headers.findIndex((h) =>
        h.includes("lead_status")
      );
      const note1Idx = headers.findIndex((h) =>
        h.includes("note_1") || h.includes("note1")
      );
      const note2Idx = headers.findIndex((h) =>
        h.includes("note_2") || h.includes("note2")
      );
      const statusIdx = headers.findIndex((h) => h === "status");
      const ownerIdx = headers.findIndex(
        (h) => h.includes("owner") || h.includes("assigned")
      );

      const parsedLeads: Lead[] = [];

      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === "") continue;

        const values = parseCSVLine(lines[i]);

        // Skip if no name
        if (!values[fullNameIdx] || values[fullNameIdx].trim() === "") continue;

        const lead: Lead = {
          id: `${Date.now()}-${i}`,
          fullName: values[fullNameIdx]?.trim() || "",
          email: values[emailIdx]?.trim() || "",
          phone: values[phoneIdx]?.trim() || "",
          streetAddress: values[streetIdx]?.trim() || "",
          postCode: values[postCodeIdx]?.trim() || "",
          leadStatus: values[leadStatusIdx]?.trim() || "",
          note1: values[note1Idx]?.trim() || "",
          note2: values[note2Idx]?.trim() || "",
          status: (values[statusIdx]?.trim() || "New") as LeadStatus,
          owner: values[ownerIdx]?.trim() || "Unassigned",
          createdAt: Date.now() - i * 1000, // Stagger timestamps for reverse order
        };

        parsedLeads.push(lead);
      }

      // Sort by newest first
      parsedLeads.sort((a, b) => b.createdAt - a.createdAt);
      setLeads(parsedLeads);
      toast.success(`Synced ${parsedLeads.length} leads from Google Sheet`);
    } catch (error) {
      console.error("Error syncing from Google Sheet:", error);
      toast.error("Failed to sync from Google Sheet");
    } finally {
      setIsSyncing(false);
    }
  };

  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm);

    const matchesStatus =
      filterStatus === "all" || lead.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const handleAutoAssign = () => {
    const unassignedLeads = leads.filter((lead) => lead.owner === "Unassigned");

    if (unassignedLeads.length === 0) {
      toast.info("No unassigned leads found");
      return;
    }

    let assignmentIndex = 0;
    const updatedLeads = leads.map((lead) => {
      if (lead.owner === "Unassigned") {
        const assignedTo =
          SALESPERSONS[assignmentIndex % SALESPERSONS.length];
        assignmentIndex++;
        return { ...lead, owner: assignedTo };
      }
      return lead;
    });

    setLeads(updatedLeads);
    toast.success(`Auto-assigned ${unassignedLeads.length} leads`);
  };

  const handleAddLead = () => {
    if (!formData.fullName || !formData.email || !formData.phone) {
      toast.error("Full Name, Email, and Phone are required");
      return;
    }

    if (editingId) {
      setLeads(
        leads.map((lead) =>
          lead.id === editingId
            ? {
                ...lead,
                ...formData,
              }
            : lead
        )
      );
      toast.success("Lead updated successfully");
    } else {
      const newLead: Lead = {
        id: Date.now().toString(),
        ...formData,
        createdAt: Date.now(),
      };
      setLeads([newLead, ...leads]);
      toast.success("Lead added successfully");
    }

    setOpenDialog(false);
    setFormData({
      fullName: "",
      email: "",
      phone: "",
      streetAddress: "",
      postCode: "",
      leadStatus: "",
      note1: "",
      note2: "",
      status: "New",
      owner: "",
    });
  };

  const handleOpenDialog = (lead?: Lead) => {
    if (lead) {
      setFormData({
        fullName: lead.fullName,
        email: lead.email,
        phone: lead.phone,
        streetAddress: lead.streetAddress,
        postCode: lead.postCode,
        leadStatus: lead.leadStatus,
        note1: lead.note1,
        note2: lead.note2,
        status: lead.status,
        owner: lead.owner,
      });
      setEditingId(lead.id);
    } else {
      setFormData({
        fullName: "",
        email: "",
        phone: "",
        streetAddress: "",
        postCode: "",
        leadStatus: "",
        note1: "",
        note2: "",
        status: "New",
        owner: "",
      });
      setEditingId(null);
    }
    setOpenDialog(true);
  };

  const handleDelete = (id: string) => {
    setLeads(leads.filter((lead) => lead.id !== id));
    setDeleteId(null);
    toast.success("Lead deleted successfully");
  };

  const handleNoteUpdate = (leadId: string, field: "note1" | "note2", value: string) => {
    setLeads(
      leads.map((lead) =>
        lead.id === leadId ? { ...lead, [field]: value } : lead
      )
    );
    setEditingNote(null);
  };

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
          <div className="flex gap-2">
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
              onClick={syncFromGoogleSheet}
              disabled={isSyncing}
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
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
                    {editingId ? "Update lead information" : "Add a new sales lead"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      placeholder="Full Name"
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="streetAddress">Street Address</Label>
                      <Input
                        id="streetAddress"
                        placeholder="Street Address"
                        value={formData.streetAddress}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            streetAddress: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="postCode">Post Code</Label>
                      <Input
                        id="postCode"
                        placeholder="Post Code"
                        value={formData.postCode}
                        onChange={(e) =>
                          setFormData({ ...formData, postCode: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="leadStatus">Lead Status</Label>
                    <Input
                      id="leadStatus"
                      placeholder="Lead Status"
                      value={formData.leadStatus}
                      onChange={(e) =>
                        setFormData({ ...formData, leadStatus: e.target.value })
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
                      <Label htmlFor="owner">Owner</Label>
                      <Input
                        id="owner"
                        placeholder="Owner/Assigned To"
                        value={formData.owner}
                        onChange={(e) =>
                          setFormData({ ...formData, owner: e.target.value })
                        }
                      />
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
              placeholder="Search leads"
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
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-gray-50">
                  <TableHead className="whitespace-nowrap font-bold">FULL NAME</TableHead>
                  <TableHead className="whitespace-nowrap font-bold">PHONE</TableHead>
                  <TableHead className="whitespace-nowrap font-bold">EMAIL</TableHead>
                  <TableHead className="whitespace-nowrap font-bold">STREET ADDRESS</TableHead>
                  <TableHead className="whitespace-nowrap font-bold">POST CODE</TableHead>
                  <TableHead className="whitespace-nowrap font-bold">LEAD STATUS</TableHead>
                  <TableHead className="whitespace-nowrap font-bold">NOTE 1</TableHead>
                  <TableHead className="whitespace-nowrap font-bold">NOTE 2</TableHead>
                  <TableHead className="whitespace-nowrap font-bold">STATUS</TableHead>
                  <TableHead className="whitespace-nowrap font-bold">OWNER</TableHead>
                  <TableHead className="whitespace-nowrap font-bold">ACTION</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="py-8 text-center">
                      <p className="text-muted-foreground">
                        No leads found. {leads.length === 0 && "Click 'Sync Sheet' to import leads from Google Sheet."}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead) => (
                    <TableRow key={lead.id} className="border-b border-border hover:bg-gray-50">
                      <TableCell className="font-medium text-foreground whitespace-nowrap">
                        {lead.fullName}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {lead.phone}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {lead.email}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {lead.streetAddress}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {lead.postCode}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {lead.leadStatus}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {editingNote?.leadId === lead.id && editingNote.field === "note1" ? (
                          <Input
                            autoFocus
                            value={lead.note1}
                            onChange={(e) => handleNoteUpdate(lead.id, "note1", e.target.value)}
                            onBlur={() => setEditingNote(null)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") setEditingNote(null);
                            }}
                            className="text-xs"
                          />
                        ) : (
                          <div
                            onClick={() => setEditingNote({ leadId: lead.id, field: "note1" })}
                            className="cursor-pointer hover:bg-gray-100 p-1 rounded min-h-6"
                          >
                            {lead.note1 || <span className="text-muted-foreground italic">Add note...</span>}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {editingNote?.leadId === lead.id && editingNote.field === "note2" ? (
                          <Input
                            autoFocus
                            value={lead.note2}
                            onChange={(e) => handleNoteUpdate(lead.id, "note2", e.target.value)}
                            onBlur={() => setEditingNote(null)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") setEditingNote(null);
                            }}
                            className="text-xs"
                          />
                        ) : (
                          <div
                            onClick={() => setEditingNote({ leadId: lead.id, field: "note2" })}
                            className="cursor-pointer hover:bg-gray-100 p-1 rounded min-h-6"
                          >
                            {lead.note2 || <span className="text-muted-foreground italic">Add note...</span>}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <select
                          value={lead.status}
                          onChange={(e) => {
                            setLeads(
                              leads.map((l) =>
                                l.id === lead.id
                                  ? { ...l, status: e.target.value as LeadStatus }
                                  : l
                              )
                            );
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
                          value={lead.owner}
                          onChange={(e) => {
                            setLeads(
                              leads.map((l) =>
                                l.id === lead.id
                                  ? { ...l, owner: e.target.value }
                                  : l
                              )
                            );
                          }}
                          className="rounded border border-border bg-background px-2 py-1 text-sm"
                        >
                          <option value="Unassigned">Unassigned</option>
                          {SALESPERSONS.map((person) => (
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
                Are you sure you want to delete this lead? This action cannot be undone.
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
