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
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Edit2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getAllUsers, updateUser } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "admin" | "salesperson";
  created_at?: string;
  updated_at?: string;
}

export default function Team() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  // Load users from Supabase on component mount
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Failed to load users");
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (person) =>
      person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.phone.includes(searchTerm),
  );

  const handleOpenDialog = (person: User) => {
    // Only allow editing own details for salespersons
    if (currentUser?.role === "salesperson" && person.id !== currentUser.id) {
      toast.error("You can only edit your own details");
      return;
    }

    setFormData({
      name: person.name,
      email: person.email,
      phone: person.phone,
    });
    setEditingId(person.id);
    setOpenDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email || !formData.phone) {
      toast.error("Name, Email, and Phone are required");
      return;
    }

    if (!editingId) {
      toast.error("No user selected");
      return;
    }

    // Prevent salespersons from editing other users
    if (currentUser?.role === "salesperson" && editingId !== currentUser.id) {
      toast.error("You can only edit your own details");
      return;
    }

    setIsSaving(true);
    try {
      await updateUser(editingId, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
      });
      toast.success("Details updated successfully");
      await loadUsers();
      setOpenDialog(false);
      setEditingId(null);
      setFormData({
        name: "",
        email: "",
        phone: "",
      });
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update details",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const canEditUser = (userId: string): boolean => {
    // Admins can edit all users
    if (currentUser?.role === "admin") {
      return true;
    }
    // Salespersons can only edit themselves
    if (currentUser?.role === "salesperson") {
      return userId === currentUser.id;
    }
    return false;
  };

  return (
    <CRMLayout>
      <div className="space-y-6 p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">
              {currentUser?.role === "admin" ? "Team Management" : "View Team"}
            </h2>
            <p className="mt-1 text-muted-foreground">
              {currentUser?.role === "admin"
                ? "Manage users and assign roles"
                : "View and manage your team details"}
            </p>
          </div>
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

        {/* Info Alert for Salespersons */}
        {currentUser?.role === "salesperson" && (
          <Card className="border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> You can edit your own details by clicking
              the edit button on your row. Other team members' details are
              read-only.
            </p>
          </Card>
        )}

        {/* Table */}
        <Card className="border border-border bg-card">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">Loading team members...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border bg-gray-50">
                    <TableHead className="font-bold">Name</TableHead>
                    <TableHead className="font-bold">Email</TableHead>
                    <TableHead className="font-bold">Phone</TableHead>
                    <TableHead className="font-bold">Role</TableHead>
                    <TableHead className="font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center">
                        <p className="text-muted-foreground">
                          No team members found
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((person) => (
                      <TableRow
                        key={person.id}
                        className={`border-b border-border hover:bg-gray-50 ${
                          person.id === currentUser?.id ? "bg-blue-50" : ""
                        }`}
                      >
                        <TableCell className="font-medium text-foreground">
                          {person.name}
                          {person.id === currentUser?.id && (
                            <span className="ml-2 inline-block px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 font-semibold">
                              You
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {person.email}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {person.phone}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {person.role}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {canEditUser(person.id) ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(person)}
                                title={
                                  person.id === currentUser?.id
                                    ? "Edit your details"
                                    : "Edit user details"
                                }
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled
                                title="Read-only"
                              >
                                <Edit2 className="h-4 w-4 text-gray-300" />
                              </Button>
                            )}
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

        {/* Edit Dialog */}
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Details</DialogTitle>
              <DialogDescription>
                {currentUser?.id === editingId
                  ? "Update your personal details"
                  : "Update team member details"}
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
                  disabled={isSaving}
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  disabled={isSaving}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  placeholder="Phone number"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  disabled={isSaving}
                />
              </div>
              <Button
                onClick={handleSave}
                className="w-full"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </CRMLayout>
  );
}
