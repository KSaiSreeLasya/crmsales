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
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface Salesperson {
  id: string;
  name: string;
  email: string;
  phone: string;
  department?: string;
  region?: string;
  created_at?: string;
  updated_at?: string;
}

export default function Salespersons() {
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    region: "",
  });

  // Load salespersons from Supabase on component mount
  useEffect(() => {
    loadSalespersons();
  }, []);

  const loadSalespersons = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("salespersons")
        .select("*")
        .order("name");

      if (error) {
        console.error("Error loading salespersons:", error);
        toast.error("Failed to load salespersons");
        setSalespersons([]);
      } else {
        setSalespersons(data || []);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load salespersons");
      setSalespersons([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSalespersons = salespersons.filter(
    (person) =>
      person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.phone.includes(searchTerm),
  );

  const handleOpenDialog = (person?: Salesperson) => {
    if (person) {
      setFormData({
        name: person.name,
        email: person.email,
        phone: person.phone,
        department: person.department || "",
        region: person.region || "",
      });
      setEditingId(person.id);
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        department: "",
        region: "",
      });
      setEditingId(null);
    }
    setOpenDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email || !formData.phone) {
      toast.error("Name, Email, and Phone are required");
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from("salespersons")
          .update({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            department: formData.department || null,
            region: formData.region || null,
          })
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Salesperson updated successfully");
      } else {
        const { error } = await supabase.from("salespersons").insert([
          {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            department: formData.department || null,
            region: formData.region || null,
          },
        ]);

        if (error) throw error;
        toast.success("Salesperson added successfully");
      }

      await loadSalespersons();
      setOpenDialog(false);
      setFormData({
        name: "",
        email: "",
        phone: "",
        department: "",
        region: "",
      });
    } catch (error) {
      console.error("Error saving salesperson:", error);
      toast.error("Failed to save salesperson");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("salespersons")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await loadSalespersons();
      setDeleteId(null);
      toast.success("Salesperson deleted successfully");
    } catch (error) {
      console.error("Error deleting salesperson:", error);
      toast.error("Failed to delete salesperson");
    }
  };

  return (
    <CRMLayout>
      <div className="space-y-6 p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Sales Team</h2>
            <p className="mt-1 text-muted-foreground">
              Manage your sales team members
            </p>
          </div>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4" />
                Add Salesperson
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit" : "Add"} Salesperson
                </DialogTitle>
                <DialogDescription>
                  {editingId
                    ? "Update salesperson details"
                    : "Add a new sales team member"}
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      placeholder="Department"
                      value={formData.department}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          department: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="region">Region</Label>
                    <Input
                      id="region"
                      placeholder="Region"
                      value={formData.region}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          region: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <Button onClick={handleSave} className="w-full">
                  {editingId ? "Update" : "Add"} Salesperson
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <Card className="border border-border bg-card">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">
                  Loading salespersons...
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border bg-gray-50">
                    <TableHead className="font-bold">Name</TableHead>
                    <TableHead className="font-bold">Email</TableHead>
                    <TableHead className="font-bold">Phone</TableHead>
                    <TableHead className="font-bold">Department</TableHead>
                    <TableHead className="font-bold">Region</TableHead>
                    <TableHead className="font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSalespersons.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center">
                        <p className="text-muted-foreground">
                          No salespersons found
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSalespersons.map((person) => (
                      <TableRow
                        key={person.id}
                        className="border-b border-border hover:bg-gray-50"
                      >
                        <TableCell className="font-medium text-foreground">
                          {person.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {person.email}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {person.phone}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {person.department || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {person.region || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(person)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteId(person.id)}
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
              <AlertDialogTitle>Delete Salesperson</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this salesperson? This action
                cannot be undone.
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
