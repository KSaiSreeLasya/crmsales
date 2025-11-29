import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { X, Download } from "lucide-react";

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
  next_reminder?: string;
  created_at?: string;
  updated_at?: string;
}

interface ActivityLog {
  id: string;
  lead_id: string;
  action: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
  created_by?: string;
}

interface ActivityNote {
  id: string;
  lead_id: string;
  content: string;
  created_at: string;
  created_by?: string;
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

function formatDateIST(dateString?: string): string {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    const istOptions: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Asia/Kolkata",
      hour12: true,
    };
    return new Intl.DateTimeFormat("en-IN", istOptions).format(date);
  } catch {
    return "-";
  }
}

function generateReceiptHTML(lead: Lead): string {
  const receiptDate = new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const receiptTime = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const receiptId = `RCP-${lead.id.substring(0, 8).toUpperCase()}-${Date.now().toString().slice(-6)}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Advance Payment Receipt</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background-color: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px solid #8b5cf6;
      padding-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      color: #8b5cf6;
      font-size: 28px;
    }
    .header p {
      margin: 5px 0;
      color: #666;
      font-size: 14px;
    }
    .receipt-id {
      background-color: #f9fafb;
      padding: 10px 15px;
      border-radius: 4px;
      font-weight: bold;
      color: #1f2937;
      text-align: center;
      margin: 15px 0;
    }
    .section {
      margin: 20px 0;
    }
    .section-title {
      font-weight: bold;
      color: #1f2937;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 8px;
      margin-bottom: 12px;
      font-size: 14px;
      text-transform: uppercase;
    }
    .field {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f3f4f6;
      font-size: 14px;
    }
    .field-label {
      font-weight: 600;
      color: #374151;
      width: 40%;
    }
    .field-value {
      color: #6b7280;
      word-break: break-word;
      width: 60%;
      text-align: right;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
    }
    .status-badge {
      display: inline-block;
      background-color: #a855f7;
      color: white;
      padding: 6px 12px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚡ AXIS GREEN</h1>
      <p>Advance Payment Receipt</p>
    </div>

    <div class="receipt-id">
      Receipt ID: ${receiptId}
    </div>

    <div class="section">
      <div class="section-title">Receipt Information</div>
      <div class="field">
        <span class="field-label">Receipt Date</span>
        <span class="field-value">${receiptDate}</span>
      </div>
      <div class="field">
        <span class="field-label">Receipt Time</span>
        <span class="field-value">${receiptTime} IST</span>
      </div>
      <div class="field">
        <span class="field-label">Status</span>
        <span class="field-value"><span class="status-badge">Advance Payment</span></span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Customer Information</div>
      <div class="field">
        <span class="field-label">Name</span>
        <span class="field-value">${lead.name}</span>
      </div>
      <div class="field">
        <span class="field-label">Email</span>
        <span class="field-value">${lead.email}</span>
      </div>
      <div class="field">
        <span class="field-label">Phone</span>
        <span class="field-value">${lead.phone}</span>
      </div>
      <div class="field">
        <span class="field-label">Company</span>
        <span class="field-value">${lead.company || "-"}</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Property Details</div>
      <div class="field">
        <span class="field-label">Street Address</span>
        <span class="field-value">${lead.street_address || "-"}</span>
      </div>
      <div class="field">
        <span class="field-label">Post Code</span>
        <span class="field-value">${lead.post_code || "-"}</span>
      </div>
      <div class="field">
        <span class="field-label">Type of Property</span>
        <span class="field-value">${lead.type_of_property || "-"}</span>
      </div>
      <div class="field">
        <span class="field-label">Average Monthly Bill</span>
        <span class="field-value">₹${lead.avg_monthly_bill || "-"}</span>
      </div>
    </div>

    <div class="footer">
      <p>This is an electronically generated receipt. For any queries, please contact support.</p>
      <p>Generated on ${receiptDate} at ${receiptTime} IST</p>
    </div>
  </div>
</body>
</html>
  `;
}

function downloadReceipt(lead: Lead): void {
  const htmlContent = generateReceiptHTML(lead);
  const blob = new Blob([htmlContent], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Receipt-${lead.name.replace(/\s+/g, "-")}-${new Date().getTime()}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

interface LeadDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  onLeadUpdate: (lead: Lead) => void;
  salespersons: string[];
}

export function LeadDetailsModal({
  open,
  onOpenChange,
  lead,
  onLeadUpdate,
  salespersons,
}: LeadDetailsModalProps) {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityNotes, setActivityNotes] = useState<ActivityNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [isLoadingActivityLogs, setIsLoadingActivityLogs] = useState(false);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [formData, setFormData] = useState<Lead | null>(null);

  useEffect(() => {
    if (lead && open) {
      setFormData({ ...lead });
      loadActivityLogs();
      loadActivityNotes();
    }
  }, [lead, open]);

  const loadActivityLogs = async () => {
    if (!lead) return;
    setIsLoadingActivityLogs(true);
    try {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false });

      if (error && error.code !== "PGRST116") {
        console.warn("Activity logs not available:", error);
      } else {
        setActivityLogs(data || []);
      }
    } catch (error) {
      console.warn("Failed to load activity logs:", error);
    } finally {
      setIsLoadingActivityLogs(false);
    }
  };

  const loadActivityNotes = async () => {
    if (!lead) return;
    setIsLoadingNotes(true);
    try {
      const { data, error } = await supabase
        .from("activity_notes")
        .select("*")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false });

      if (error && error.code !== "PGRST116") {
        console.warn("Activity notes not available:", error);
      } else {
        setActivityNotes(data || []);
      }
    } catch (error) {
      console.warn("Failed to load activity notes:", error);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !lead) {
      toast.error("Note cannot be empty");
      return;
    }

    setIsAddingNote(true);
    try {
      const { error: insertError } = await supabase
        .from("activity_notes")
        .insert([
          {
            lead_id: lead.id,
            content: newNote,
            created_at: new Date().toISOString(),
          },
        ]);

      if (insertError) {
        if (insertError.code === "PGRST116") {
          toast.info("Activity notes feature not yet available");
          setNewNote("");
        } else {
          throw insertError;
        }
      } else {
        toast.success("Note added successfully");
        setNewNote("");
        await loadActivityNotes();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error adding note:", errorMessage);
      toast.error("Failed to add note");
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (!formData) return;

    try {
      const oldStatus = formData.status;

      const { error: updateError } = await supabase
        .from("leads")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", formData.id);

      if (updateError) throw updateError;

      const { error: logError } = await supabase.from("activity_logs").insert([
        {
          lead_id: formData.id,
          action: "status_change",
          old_value: oldStatus,
          new_value: newStatus,
          created_at: new Date().toISOString(),
        },
      ]);

      if (logError && logError.code !== "PGRST116") {
        console.warn("Could not log activity:", logError);
      }

      setFormData({ ...formData, status: newStatus });
      onLeadUpdate({ ...formData, status: newStatus });
      toast.success(`Status changed to ${newStatus}`);
      await loadActivityLogs();
    } catch (error) {
      console.error("Error changing status:", error);
      toast.error("Failed to change status");
    }
  };

  const handleSaveField = async (field: string, value: string) => {
    if (!formData) return;

    try {
      const updateData: any = {
        [field]: value,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("leads")
        .update(updateData)
        .eq("id", formData.id);

      if (error) throw error;

      const updatedLead = { ...formData, [field]: value } as Lead;
      setFormData(updatedLead);
      onLeadUpdate(updatedLead);
      toast.success("Updated successfully");

      if (field === "note1" || field === "note2") {
        const { error: logError } = await supabase
          .from("activity_logs")
          .insert([
            {
              lead_id: formData.id,
              action: `${field}_updated`,
              new_value: value,
              created_at: new Date().toISOString(),
            },
          ]);

        if (logError && logError.code !== "PGRST116") {
          console.warn("Could not log activity:", logError);
        }
        await loadActivityLogs();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error updating ${field}:`, errorMessage);
      toast.error(`Failed to update ${field}`);
    }
  };

  if (!formData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>{formData.name}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {formData.company} • {formData.phone} • {formData.email}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold">Name</Label>
                <p className="text-sm text-foreground">{formData.name}</p>
              </div>
              <div>
                <Label className="text-xs font-semibold">Email</Label>
                <p className="text-sm text-foreground">{formData.email}</p>
              </div>
              <div>
                <Label className="text-xs font-semibold">Phone</Label>
                <p className="text-sm text-foreground">{formData.phone}</p>
              </div>
              <div>
                <Label className="text-xs font-semibold">Company</Label>
                <p className="text-sm text-foreground">
                  {formData.company || "-"}
                </p>
              </div>
              <div>
                <Label className="text-xs font-semibold">Street Address</Label>
                <p className="text-sm text-foreground">
                  {formData.street_address || "-"}
                </p>
              </div>
              <div>
                <Label className="text-xs font-semibold">Post Code</Label>
                <p className="text-sm text-foreground">
                  {formData.post_code || "-"}
                </p>
              </div>
              <div>
                <Label className="text-xs font-semibold">
                  Type of Property
                </Label>
                <p className="text-sm text-foreground">
                  {formData.type_of_property || "-"}
                </p>
              </div>
              <div>
                <Label className="text-xs font-semibold">
                  Avg Monthly Bill
                </Label>
                <p className="text-sm text-foreground">
                  {formData.avg_monthly_bill || "-"}
                </p>
              </div>
              <div>
                <Label className="text-xs font-semibold">
                  Electricity Bill
                </Label>
                <p className="text-sm text-foreground">
                  {formData.electricity_bill || "-"}
                </p>
              </div>
              <div>
                <Label className="text-xs font-semibold">Lead Status</Label>
                <p className="text-sm text-foreground">
                  {formData.lead_status || "-"}
                </p>
              </div>
              <div>
                <Label className="text-xs font-semibold">Assigned To</Label>
                <p className="text-sm text-foreground">
                  {formData.assigned_to || "-"}
                </p>
              </div>
              <div>
                <Label className="text-xs font-semibold">Current Status</Label>
                <p className="text-sm text-foreground">{formData.status}</p>
              </div>
            </div>

            {/* Note 1 */}
            <Card className="p-3 border">
              <Label className="text-xs font-semibold">Note 1</Label>
              <Textarea
                value={formData.note1 || ""}
                onChange={(e) =>
                  setFormData({ ...formData, note1: e.target.value })
                }
                onBlur={() => handleSaveField("note1", formData.note1 || "")}
                placeholder="Add or edit note 1..."
                className="mt-2 min-h-[80px] text-xs"
              />
            </Card>

            {/* Note 2 */}
            <Card className="p-3 border">
              <Label className="text-xs font-semibold">Note 2</Label>
              <Textarea
                value={formData.note2 || ""}
                onChange={(e) =>
                  setFormData({ ...formData, note2: e.target.value })
                }
                onBlur={() => handleSaveField("note2", formData.note2 || "")}
                placeholder="Add or edit note 2..."
                className="mt-2 min-h-[80px] text-xs"
              />
            </Card>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-4">
            <div className="space-y-3">
              <Label className="text-xs font-semibold">Add New Note</Label>
              <div className="space-y-2">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Write a note..."
                  className="min-h-[100px] text-xs"
                />
                <Button
                  onClick={handleAddNote}
                  disabled={isAddingNote || !newNote.trim()}
                  className="w-full text-xs"
                >
                  {isAddingNote ? "Adding..." : "Add Note"}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-semibold">
                Notes ({activityNotes.length})
              </Label>
              {isLoadingNotes ? (
                <p className="text-xs text-muted-foreground">
                  Loading notes...
                </p>
              ) : activityNotes.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No notes yet. Add one above to get started.
                </p>
              ) : (
                <div className="space-y-2">
                  {activityNotes.map((note) => (
                    <Card key={note.id} className="p-3 border bg-muted/30">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <p className="text-xs text-foreground leading-relaxed">
                            {note.content}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateIST(note.created_at)}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Status Tab */}
          <TabsContent value="status" className="space-y-4">
            <Card className="p-4 border bg-muted/30">
              <Label className="text-xs font-semibold">Current Status</Label>
              <p className="text-sm font-bold text-foreground mt-2">
                {formData.status}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Last updated: {formatDateIST(formData.updated_at)}
              </p>
            </Card>

            <Card className="p-4 border">
              <Label className="text-xs font-semibold mb-3 block">
                Change Status To
              </Label>
              <div className="space-y-2">
                {STATUS_OPTIONS.map((status) => (
                  <Button
                    key={status}
                    variant={formData.status === status ? "default" : "outline"}
                    className="w-full justify-start text-xs h-8"
                    onClick={() => {
                      if (formData.status !== status) {
                        handleStatusChange(status);
                      }
                    }}
                    disabled={formData.status === status}
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
