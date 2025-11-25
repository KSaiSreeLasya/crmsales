import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { getAssignedLeads } from "@/lib/auth";
import { Lead } from "@/lib/supabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function AssignedLeadsTab() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLeads = async () => {
      if (user?.name) {
        const data = await getAssignedLeads(user.name);
        setLeads(data);
      }
      setIsLoading(false);
    };

    loadLeads();
  }, [user?.name]);

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-600">
        Loading your assigned leads...
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-600">No leads assigned to you yet.</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Zipcode</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">{lead.name}</TableCell>
                <TableCell>{lead.phone}</TableCell>
                <TableCell className="text-sm">{lead.email}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {lead.status}
                  </span>
                </TableCell>
                <TableCell className="text-sm">
                  {lead.street_address || "-"}
                </TableCell>
                <TableCell>{lead.post_code || "-"}</TableCell>
                <TableCell className="text-sm">
                  {lead.note1 || lead.note2 ? (
                    <div>
                      {lead.note1 && <div>• {lead.note1}</div>}
                      {lead.note2 && <div>• {lead.note2}</div>}
                    </div>
                  ) : (
                    "-"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
