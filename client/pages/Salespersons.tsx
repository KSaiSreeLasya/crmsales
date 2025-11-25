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
import { Plus, Search, Edit2, Trash2, Key } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { createUser, deleteUser, getAllUsers, updateUser } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "admin" | "salesperson";
  created_at?: string;
  updated_at?: string;
}

export default function Salespersons() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [passwordUserId, setPasswordUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "salesperson" as "admin" | "salesperson",
  });
  const [newPassword, setNewPassword] = useState("");

  // Redirect non-admin users
  if (currentUser && currentUser.role !== "admin") {
    return <Navigate to="/" replace />;
  }

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

  const handleOpenDialog = (person?: User) => {
    if (person) {
      setFormData({
        name: person.name,
        email: person.email,
        phone: person.phone,
        password: "",
        role: person.role,
      });
      setEditingId(person.id);
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        password: "",
        role: "salesperson",
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

    if (!editingId && !formData.password) {
      toast.error("Password is required for new users");
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        // Update existing user
        await updateUser(editingId, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
        });
        toast.success("User updated successfully");
      } else {
        // Create new user
        await createUser(formData.email, formData.password, {
          name: formData.name,
          phone: formData.phone,
          role: formData.role,
        });
        toast.success("User created successfully");
      }

      await loadUsers();
      setOpenDialog(false);
      setFormData({
        name: "",
        email: "",
        phone: "",
        password: "",
        role: "salesperson",
      });
    } catch (error) {
      console.error("Error saving user:", error);
      const errorMsg = error instanceof Error ? error.message : "";
      if (errorMsg.includes("duplicate") || errorMsg.includes("unique")) {
        toast.error("A user with this email already exists");
      } else {
        toast.error(errorMsg || "Failed to save user");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!passwordUserId || !newPassword) {
      toast.error("Please enter a new password");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: passwordUserId,
          newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update password");
      }

      toast.success("Password updated successfully");
      setOpenPasswordDialog(false);
      setPasswordUserId(null);
      setNewPassword("");
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update password",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteUser(id);
      await loadUsers();
      setDeleteId(null);
      toast.success("User deleted successfully");
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete user",
      );
    }
  };

  return (
    <CRMLayout>
      <div className="space-y-6 p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">
              Team Management
            </h2>
            <p className="mt-1 text-muted-foreground">
              Manage users and assign roles
            </p>
          </div>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit" : "Add"} User</DialogTitle>
                <DialogDescription>
                  {editingId
                    ? "Update user details"
                    : "Add a new team member with authentication"}
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
                    disabled={isSaving || !!editingId}
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
                <div>
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        role: value as "admin" | "salesperson",
                      })
                    }
                    disabled={isSaving}
                  >
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="salesperson">Salesperson</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!editingId && (
                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Initial password (min 6 characters)"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      disabled={isSaving}
                    />
                  </div>
                )}
                <Button
                  onClick={handleSave}
                  className="w-full"
                  disabled={isSaving}
                >
                  {isSaving
                    ? "Saving..."
                    : editingId
                      ? "Update User"
                      : "Create User"}
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
                <p className="text-muted-foreground">Loading users...</p>
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
                        <p className="text-muted-foreground">No users found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((person) => (
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
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {person.role}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(person)}
                              title="Edit user"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setPasswordUserId(person.id);
                                setOpenPasswordDialog(true);
                              }}
                              title="Change password"
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteId(person.id)}
                              title="Delete user"
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
              <AlertDialogTitle>Delete User</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this user? This action cannot be
                undone and will also delete their authentication account.
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

        {/* Change Password Dialog */}
        <Dialog open={openPasswordDialog} onOpenChange={setOpenPasswordDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>
                Enter a new password for this user
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="newPassword">New Password *</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="New password (min 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isSaving}
                />
              </div>
              <Button
                onClick={handleUpdatePassword}
                className="w-full"
                disabled={isSaving}
              >
                {isSaving ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </CRMLayout>
  );
}
