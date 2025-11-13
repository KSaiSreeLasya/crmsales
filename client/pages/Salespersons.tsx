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
import { useState } from "react";

interface Salesperson {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  region: string;
}

const MOCK_SALESPERSONS: Salesperson[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah@example.com",
    phone: "+1-234-567-8910",
    department: "Sales",
    region: "North",
  },
  {
    id: "2",
    name: "Mike Chen",
    email: "mike@example.com",
    phone: "+1-234-567-8911",
    department: "Sales",
    region: "South",
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    email: "emily@example.com",
    phone: "+1-234-567-8912",
    department: "Sales",
    region: "East",
  },
  {
    id: "4",
    name: "David Lee",
    email: "david@example.com",
    phone: "+1-234-567-8913",
    department: "Sales Manager",
    region: "West",
  },
];

export default function Salespersons() {
  const [salespersons, setSalespersons] =
    useState<Salesperson[]>(MOCK_SALESPERSONS);
  const [searchTerm, setSearchTerm] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    region: "",
  });

  const filteredSalespersons = salespersons.filter(
    (person) =>
      person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenDialog = (person?: Salesperson) => {
    if (person) {
      setFormData({
        name: person.name,
        email: person.email,
        phone: person.phone,
        department: person.department,
        region: person.region,
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

  const handleSave = () => {
    if (
      !formData.name ||
      !formData.email ||
      !formData.phone ||
      !formData.department ||
      !formData.region
    ) {
      alert("All fields are required");
      return;
    }

    if (editingId) {
      // Update existing
      setSalespersons(
        salespersons.map((person) =>
          person.id === editingId ? { ...person, ...formData } : person
        )
      );
    } else {
      // Create new
      const newPerson: Salesperson = {
        id: Date.now().toString(),
        ...formData,
      };
      setSalespersons([...salespersons, newPerson]);
    }

    setOpenDialog(false);
    setFormData({
      name: "",
      email: "",
      phone: "",
      department: "",
      region: "",
    });
  };

  const handleDelete = (id: string) => {
    setSalespersons(salespersons.filter((person) => person.id !== id));
    setDeleteId(null);
  };

  const regions = [...new Set(salespersons.map((p) => p.region))];

  return (
    <CRMLayout>
      <div className="space-y-6 p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">
              Sales Team
            </h2>
            <p className="mt-1 text-muted-foreground">
              Manage your sales team members and assignments
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
                <div>
                  <Label htmlFor="department">Department *</Label>
                  <Input
                    id="department"
                    placeholder="e.g., Sales, Sales Manager"
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="region">Region *</Label>
                  <Input
                    id="region"
                    placeholder="e.g., North, South, East, West"
                    value={formData.region}
                    onChange={(e) =>
                      setFormData({ ...formData, region: e.target.value })
                    }
                  />
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
              placeholder="Search by name, email, or department..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <Card className="border border-border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Actions</TableHead>
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
                    <TableRow key={person.id} className="border-b border-border">
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
                        {person.department}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {person.region}
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
