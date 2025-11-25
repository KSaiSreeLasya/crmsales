import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { signUp } from "@/lib/auth";

interface SalespersonFormProps {
  onSuccess: () => void;
}

export function SalespersonForm({ onSuccess }: SalespersonFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate inputs
      if (!formData.name || !formData.email || !formData.phone || !formData.password) {
        throw new Error("All fields are required");
      }

      // Create user with auth
      await signUp(formData.email, formData.password, {
        name: formData.name,
        phone: formData.phone,
        role: "salesperson",
      });

      toast.success(`Salesperson ${formData.name} added successfully!`);
      setFormData({ name: "", email: "", phone: "", password: "" });
      onSuccess();
    } catch (error) {
      console.error("Error adding salesperson:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add salesperson"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6">Add New Salesperson</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="9876543210"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              disabled={isLoading}
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? "Adding..." : "Add Salesperson"}
        </Button>
      </form>
    </Card>
  );
}
