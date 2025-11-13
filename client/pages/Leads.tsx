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
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
import { useState } from "react";

type LeadStatus =
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
  assignedTo: string;
  note1: string;
  note2: string;
  createdAt: string;
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

const MOCK_LEADS: Lead[] = [
  {
    id: "1",
    name: "John Smith",
    email: "john@example.com",
    phone: "+1-234-567-8900",
    company: "Tech Corp",
    status: "Contacted",
    assignedTo: "Sarah Johnson",
    note1: "Interested in Q2",
    note2: "Follow up next week",
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "+1-234-567-8901",
    company: "Business Inc",
    status: "Quotation sent",
    assignedTo: "Mike Chen",
    note1: "Requested 3 units",
    note2: "",
    createdAt: "2024-01-14",
  },
];

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    status: "Not lifted" as LeadStatus,
    assignedTo: "",
    note1: "",
    note2: "",
  });

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" || lead.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const handleOpenDialog = (lead?: Lead) => {
    if (lead) {
      setFormData({
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        status: lead.status,
        assignedTo: lead.assignedTo,
        note1: lead.note1,
        note2: lead.note2,
      });
      setEditingId(lead.id);
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        company: "",
        status: "Not lifted",
        assignedTo: "",
        note1: "",
        note2: "",
      });
      setEditingId(null);
    }
    setOpenDialog(true);
  };

  const handleSave = () => {
    if (
      !formData.name ||
      !formData.email ||
      !formData.phone ||
      !formData.company ||
      !formData.assignedTo
    ) {
      alert("Name, Email, Phone, Company, and Assigned To are required");
      return;
    }

    if (editingId) {
      // Update existing
      setLeads(
        leads.map((lead) =>
          lead.id === editingId
            ? {
                ...lead,
                ...formData,
                status: formData.status as LeadStatus,
              }
            : lead
        )
      );
    } else {
      // Create new
      const newLead: Lead = {
        id: Date.now().toString(),
        ...formData,
        status: formData.status as LeadStatus,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setLeads([newLead, ...leads]);
    }

    setOpenDialog(false);
    setFormData({
      name: "",
      email: "",
      phone: "",
      company: "",
      status: "Not lifted",
      assignedTo: "",
      note1: "",
      note2: "",
    });
  };

  const handleDelete = (id: string) => {
    setLeads(leads.filter((lead) => lead.id !== id));
    setDeleteId(null);
  };

  const salespersons = [
    ...new Set(leads.map((lead) => lead.assignedTo).filter(Boolean)),
  ];

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
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4" />
                Add Lead
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
                <div className="grid grid-cols-2 gap-4">
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
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                  <div>
                    <Label htmlFor="company">Company *</Label>
                    <Input
                      id="company"
                      placeholder="Company Name"
                      value={formData.company}
                      onChange={(e) =>
                        setFormData({ ...formData, company: e.target.value })
                      }
                    />
                  </div>
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
                    <Label htmlFor="assignedTo">Assigned To *</Label>
                    <Input
                      id="assignedTo"
                      placeholder="Salesperson Name"
                      value={formData.assignedTo}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          assignedTo: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="note1">Note 1</Label>
                  <Textarea
                    id="note1"
                    placeholder="Additional notes"
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
                    placeholder="More notes"
                    value={formData.note2}
                    onChange={(e) =>
                      setFormData({ ...formData, note2: e.target.value })
                    }
                  />
                </div>

                <Button onClick={handleSave} className="w-full">
                  {editingId ? "Update" : "Add"} Lead
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or company..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
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
                <TableRow className="border-b border-border">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Note 1</TableHead>
                  <TableHead>Note 2</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center">
                      <p className="text-muted-foreground">
                        No leads found matching your criteria
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead) => (
                    <TableRow key={lead.id} className="border-b border-border">
                      <TableCell className="font-medium text-foreground">
                        {lead.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {lead.email}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.company}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {lead.phone}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="inline-block rounded-full bg-primary/10 px-2 py-1 text-primary">
                          {lead.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.assignedTo}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                        {lead.note1}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                        {lead.note2}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(lead)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(lead.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
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
                Are you sure you want to delete this lead? This action cannot
                be undone.
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
