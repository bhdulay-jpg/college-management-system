"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../../ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Badge } from "../../ui/badge";
import { Plus, Search, Edit, Trash2, Mail, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { collection, query, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { db, auth } from "../../../lib/firebase";
import { createManagedUser, type UserRole } from "../../../lib/firebase-auth";
import { toast } from "sonner@2.0.3";
import { LoadingState } from "../../loading-state";
import { EmptyState } from "../../empty-state";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  createdAt: any;
  studentId?: string;
}

interface UserForm {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  status: string;
}

const USER_ROLES: UserRole[] = ["Admin", "Registrar", "Teacher", "Student", "Parent", "Business Office"];

function isUserRole(role: string): role is UserRole {
  return USER_ROLES.some((userRole) => userRole === role);
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  
  const [formData, setFormData] = useState<UserForm>({
    name: "",
    email: "",
    password: "",
    role: "Student",
    status: "active",
  });

  // Real-time users listener
  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const usersData = snapshot.docs.map((userDoc) => {
          const data = userDoc.data();
          return {
            id: userDoc.id,
            email: typeof data.email === "string" ? data.email : "",
            name: typeof data.name === "string" ? data.name : "",
            role: typeof data.role === "string" ? data.role : "",
            status: typeof data.status === "string" ? data.status : "",
            createdAt: data.createdAt,
            studentId: typeof data.studentId === "string" ? data.studentId : undefined,
          };
        });
        setUsers(usersData);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading users:", error);
        toast.error("Failed to load user accounts. Check your Firestore permissions.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleCreateUser = async () => {
    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();

    if (!name || !email || !formData.password) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email address.");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setCreating(true);
    try {
      await createManagedUser({
        name,
        email,
        role: formData.role,
        status: formData.status,
      }, formData.password);
      toast.success("User account created successfully.");
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error creating user:", error);
      const errorCode = typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : "";
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      if (errorCode === "auth/email-already-in-use") {
        toast.error("This email is already registered. Please use a different email.");
      } else if (errorCode === "auth/invalid-email") {
        toast.error("Invalid email address. Please check and try again.");
      } else if (errorCode === "auth/weak-password") {
        toast.error("Password is too weak. Please use a stronger password.");
      } else if (errorCode === "auth/operation-not-allowed") {
        toast.error("Email/password accounts are not enabled. Please contact support.");
      } else if (errorCode === "auth/network-request-failed") {
        toast.error("Network error. Please check your connection and try again.");
      } else if (errorCode === "auth/too-many-requests") {
        toast.error("Too many attempts. Please wait a moment and try again.");
      } else if (errorCode === "permission-denied") {
        toast.error("User profile could not be saved. Check that Admin user-creation permissions are deployed.");
      } else {
        toast.error(`Failed to create user: ${errorMessage}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();
    if (!name || !email) {
      toast.error("Please fill in all required fields");
      return;
    }

    setCreating(true);
    
    try {
      const emailChanged = editingUser.email.trim().toLowerCase() !== email;
      
      if (emailChanged) {
        toast.error("Email cannot be changed from admin dashboard. User must update their own email from their account settings.", {
          duration: 5000,
        });
        setCreating(false);
        return;
      }
      
      // Update user document in Firestore
      await updateDoc(doc(db, "users", editingUser.id), {
        name,
        role: formData.role,
        status: formData.status,
        updatedAt: serverTimestamp(),
      });
      
      toast.success("User updated successfully!");
      setDialogOpen(false);
      resetForm();
      setEditingUser(null);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(`Failed to update user: ${error?.message || "Unknown error"}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      await deleteDoc(doc(db, "users", userId));
      toast.success("User deleted successfully");
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    }
  };

  const resetForm = () => {
    setShowPassword(false);
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "Student",
      status: "active",
    });
  };

  const openCreateDialog = () => {
    setEditingUser(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name || "",
      email: user.email || "",
      password: "", // Clear password for editing
      role: isUserRole(user.role) ? user.role : "Student",
      status: user.status || "active",
    });
    setDialogOpen(true);
  };

  const openResetPasswordDialog = (user: User) => {
    setResetPasswordUser(user);
    setResetPasswordDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser) return;
    if (!resetPasswordUser.email) {
      toast.error("This user profile does not have an email address.");
      return;
    }
    
    setResettingPassword(true);
    
    try {
      // Send password reset email to the user
      await sendPasswordResetEmail(auth, resetPasswordUser.email);
      
      toast.success("Password reset email sent successfully!", {
        description: `The user can reset their password by following the instructions in the email.`,
        duration: 10000,
      });
      
      setResetPasswordDialogOpen(false);
      setResetPasswordUser(null);
    } catch (error: any) {
      console.error("Error resetting user password:", error);
      toast.error(`Failed to reset user password: ${error?.message || "Unknown error"}`);
    } finally {
      setResettingPassword(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const search = searchTerm.trim().toLowerCase();
    const matchesSearch = user.name.toLowerCase().includes(search) ||
                          user.email.toLowerCase().includes(search);
    const matchesRole = filterRole === "all" || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return <LoadingState message="Loading users..." />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl">User Management</h1>
          <p className="text-muted-foreground">Create and manage user accounts</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100%-2rem)] max-h-[90vh] gap-0 overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingUser ? "Edit User" : "Create New User"}</DialogTitle>
              <DialogDescription>
                {editingUser
                  ? "Update this user's profile and access role."
                  : "Create a login account and matching profile. Share the temporary password securely."}
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-0"
              onSubmit={(event) => {
                event.preventDefault();
                void (editingUser ? handleUpdateUser() : handleCreateUser());
              }}
            >
              <div className="space-y-5 px-6 py-5">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    className="h-11"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Juan dela Cruz"
                    autoComplete="name"
                    required
                    disabled={creating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    className="h-11"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="juan@example.com"
                    autoComplete="email"
                    required
                    disabled={creating}
                  />
                </div>
                {!editingUser && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        className="h-11 pr-10"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Enter password"
                        autoComplete="new-password"
                        minLength={6}
                        required
                        disabled={creating}
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        disabled={creating}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => {
                      if (isUserRole(value)) setFormData({ ...formData, role: value });
                    }}
                    disabled={creating}
                  >
                    <SelectTrigger id="role" className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {USER_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                    disabled={creating}
                  >
                    <SelectTrigger id="status" className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={creating}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingUser ? "Saving..." : "Creating account..."}
                    </>
                  ) : editingUser ? "Save Changes" : "Create User"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Reset Password Dialog (separate, not in header) */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Password Reset Email</DialogTitle>
            <DialogDescription>
              {resetPasswordUser && (
                <>
                  Send a password reset email to <strong>{resetPasswordUser.name}</strong> ({resetPasswordUser.email})?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                The user will receive an email with a secure link to reset their password. The link expires after 1 hour.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleResetPassword} disabled={resettingPassword}>
              {resettingPassword ? "Sending..." : "Send Reset Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Registrar">Registrar</SelectItem>
                <SelectItem value="Teacher">Teacher</SelectItem>
                <SelectItem value="Student">Student</SelectItem>
                <SelectItem value="Parent">Parent</SelectItem>
                <SelectItem value="Business Office">Business Office</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
          <CardDescription>Manage system users and their roles</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No users found"
              description={searchTerm || filterRole !== "all" ? "Try adjusting your filters" : "Create your first user to get started"}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {user.email || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role || "Unassigned"}</Badge>
                      </TableCell>
                      <TableCell>
                        {user.studentId ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{user.studentId}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === "active" ? "default" : "secondary"}>
                          {user.status || "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openResetPasswordDialog(user)}
                            disabled={!user.email}
                            title="Reset Password"
                          >
                            <KeyRound className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(user)}
                            title="Edit User"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUser(user.id)}
                            title="Delete User"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}