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
import { X } from "lucide-react";

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
      console.error("Error adding note:", error);
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

      const { error: logError } = await supabase
        .from("activity_logs")
        .insert([
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
      console.error(`Error updating ${field}:`, error);
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
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
                <Label className="text-xs font-semibold">Type of Property</Label>
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
                onBlur={() =>
                  handleSaveField("note1", formData.note1 || "")
                }
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
                onBlur={() =>
                  handleSaveField("note2", formData.note2 || "")
                }
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
                <p className="text-xs text-muted-foreground">Loading notes...</p>
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

          {/* Activity Log Tab */}
          <TabsContent value="activity" className="space-y-4">
            {isLoadingActivityLogs ? (
              <p className="text-xs text-muted-foreground">
                Loading activity...
              </p>
            ) : activityLogs.length === 0 ? (
              <Card className="p-4 text-center border">
                <p className="text-xs text-muted-foreground italic">
                  No activity recorded yet
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {activityLogs.map((log) => (
                  <Card key={log.id} className="p-3 border">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold capitalize">
                          {log.action.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateIST(log.created_at)}
                        </p>
                      </div>
                      {log.old_value && log.new_value && (
                        <p className="text-xs text-foreground">
                          <span className="text-red-600 line-through">
                            {log.old_value}
                          </span>
                          {" → "}
                          <span className="text-green-600 font-semibold">
                            {log.new_value}
                          </span>
                        </p>
                      )}
                      {log.new_value && !log.old_value && (
                        <p className="text-xs text-foreground">
                          <span className="text-green-600 font-semibold">
                            {log.new_value}
                          </span>
                        </p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
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
                    variant={
                      formData.status === status ? "default" : "outline"
                    }
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
