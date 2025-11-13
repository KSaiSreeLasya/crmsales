import { CRMLayout } from "@/components/CRMLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Mail, Phone, Target } from "lucide-react";
import { useState } from "react";

interface Salesperson {
  id: string;
  name: string;
  email: string;
  phone: string;
  leadsAssigned: number;
  leadsConverted: number;
  conversionRate: number;
}

const MOCK_SALESPERSONS: Salesperson[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah@example.com",
    phone: "+1-234-567-8910",
    leadsAssigned: 24,
    leadsConverted: 8,
    conversionRate: 33.3,
  },
  {
    id: "2",
    name: "Mike Chen",
    email: "mike@example.com",
    phone: "+1-234-567-8911",
    leadsAssigned: 19,
    leadsConverted: 5,
    conversionRate: 26.3,
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    email: "emily@example.com",
    phone: "+1-234-567-8912",
    leadsAssigned: 15,
    leadsConverted: 6,
    conversionRate: 40.0,
  },
  {
    id: "4",
    name: "David Lee",
    email: "david@example.com",
    phone: "+1-234-567-8913",
    leadsAssigned: 18,
    leadsConverted: 4,
    conversionRate: 22.2,
  },
];

export default function Salespersons() {
  const [salespersons, setSalespersons] =
    useState<Salesperson[]>(MOCK_SALESPERSONS);
  const [openDialog, setOpenDialog] = useState(false);
  const [newPerson, setNewPerson] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const handleAddSalesperson = () => {
    if (newPerson.name && newPerson.email && newPerson.phone) {
      const person: Salesperson = {
        id: (salespersons.length + 1).toString(),
        ...newPerson,
        leadsAssigned: 0,
        leadsConverted: 0,
        conversionRate: 0,
      };
      setSalespersons([...salespersons, person]);
      setNewPerson({ name: "", email: "", phone: "" });
      setOpenDialog(false);
    }
  };

  return (
    <CRMLayout>
      <div className="space-y-6 p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Team Members</h2>
            <p className="mt-1 text-muted-foreground">
              Manage your sales team and track their performance
            </p>
          </div>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Salesperson
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Salesperson</DialogTitle>
                <DialogDescription>
                  Add a new team member to your sales organization
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Full Name"
                  value={newPerson.name}
                  onChange={(e) =>
                    setNewPerson({ ...newPerson, name: e.target.value })
                  }
                />
                <Input
                  type="email"
                  placeholder="Email"
                  value={newPerson.email}
                  onChange={(e) =>
                    setNewPerson({ ...newPerson, email: e.target.value })
                  }
                />
                <Input
                  placeholder="Phone"
                  value={newPerson.phone}
                  onChange={(e) =>
                    setNewPerson({ ...newPerson, phone: e.target.value })
                  }
                />
                <Button onClick={handleAddSalesperson} className="w-full">
                  Add Salesperson
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Team Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {salespersons.map((person) => (
            <Card
              key={person.id}
              className="border border-border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">
                    {person.name}
                  </h3>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {person.email}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {person.phone}
                    </div>
                  </div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                  {person.name.charAt(0)}
                </div>
              </div>

              <div className="mt-6 border-t border-border pt-6">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Assigned
                    </p>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                      {person.leadsAssigned}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Converted
                    </p>
                    <p className="mt-1 text-2xl font-bold text-success">
                      {person.leadsConverted}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Rate
                    </p>
                    <p className="mt-1 text-2xl font-bold text-primary">
                      {person.conversionRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              <Button variant="outline" className="mt-6 w-full gap-2">
                <Target className="h-4 w-4" />
                View Details
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </CRMLayout>
  );
}
