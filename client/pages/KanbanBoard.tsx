import { CRMLayout } from "@/components/CRMLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { LeadDetailsModal } from "@/components/LeadDetailsModal";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Search, TrendingUp, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type KanbanStatus = "Quotation sent" | "Site visit" | "Advance payment";

const KANBAN_STATUSES: KanbanStatus[] = [
  "Quotation sent",
  "Site visit",
  "Advance payment",
];

function generateReceiptHTML(lead: Lead): string {
  const receiptDate = new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const receiptTime = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const receiptId = `RCP-${lead.id.substring(0, 8).toUpperCase()}-${Date.now().toString().slice(-6)}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Advance Payment Receipt</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background-color: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px solid #8b5cf6;
      padding-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      color: #8b5cf6;
      font-size: 28px;
    }
    .header p {
      margin: 5px 0;
      color: #666;
      font-size: 14px;
    }
    .receipt-id {
      background-color: #f9fafb;
      padding: 10px 15px;
      border-radius: 4px;
      font-weight: bold;
      color: #1f2937;
      text-align: center;
      margin: 15px 0;
    }
    .section {
      margin: 20px 0;
    }
    .section-title {
      font-weight: bold;
      color: #1f2937;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 8px;
      margin-bottom: 12px;
      font-size: 14px;
      text-transform: uppercase;
    }
    .field {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f3f4f6;
      font-size: 14px;
    }
    .field-label {
      font-weight: 600;
      color: #374151;
      width: 40%;
    }
    .field-value {
      color: #6b7280;
      word-break: break-word;
      width: 60%;
      text-align: right;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
    }
    .status-badge {
      display: inline-block;
      background-color: #a855f7;
      color: white;
      padding: 6px 12px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚡ AXIS GREEN</h1>
      <p>Advance Payment Receipt</p>
    </div>

    <div class="receipt-id">
      Receipt ID: ${receiptId}
    </div>

    <div class="section">
      <div class="section-title">Receipt Information</div>
      <div class="field">
        <span class="field-label">Receipt Date</span>
        <span class="field-value">${receiptDate}</span>
      </div>
      <div class="field">
        <span class="field-label">Receipt Time</span>
        <span class="field-value">${receiptTime} IST</span>
      </div>
      <div class="field">
        <span class="field-label">Status</span>
        <span class="field-value"><span class="status-badge">Advance Payment</span></span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Customer Information</div>
      <div class="field">
        <span class="field-label">Name</span>
        <span class="field-value">${lead.name}</span>
      </div>
      <div class="field">
        <span class="field-label">Email</span>
        <span class="field-value">${lead.email}</span>
      </div>
      <div class="field">
        <span class="field-label">Phone</span>
        <span class="field-value">${lead.phone}</span>
      </div>
      <div class="field">
        <span class="field-label">Company</span>
        <span class="field-value">${lead.company || "-"}</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Property Details</div>
      <div class="field">
        <span class="field-label">Street Address</span>
        <span class="field-value">${lead.street_address || "-"}</span>
      </div>
      <div class="field">
        <span class="field-label">Post Code</span>
        <span class="field-value">${lead.post_code || "-"}</span>
      </div>
      <div class="field">
        <span class="field-label">Type of Property</span>
        <span class="field-value">${lead.type_of_property || "-"}</span>
      </div>
      <div class="field">
        <span class="field-label">Average Monthly Bill</span>
        <span class="field-value">₹${lead.avg_monthly_bill || "-"}</span>
      </div>
    </div>

    <div class="footer">
      <p>This is an electronically generated receipt. For any queries, please contact support.</p>
      <p>Generated on ${receiptDate} at ${receiptTime} IST</p>
    </div>
  </div>
</body>
</html>
  `;
}

function navigateToProjects(): void {
  const link = document.createElement("a");
  link.href = "https://crm.axisogreen.in/#/projects";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: KanbanStatus;
  assigned_to: string;
  note1: string;
  note2: string;
  street_address?: string;
  post_code?: string;
  electricity_bill?: string;
  type_of_property?: string;
  avg_monthly_bill?: string;
  sheet_id?: string;
  source?: string;
  created_at?: string;
  updated_at?: string;
}

function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (!isDragging) {
      onClick();
    }
  };

  const handleDownloadReceipt = () => {
    navigateToProjects();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleCardClick}
      className="bg-white rounded-lg border border-gray-200 p-4 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-sm text-foreground line-clamp-2">
            {lead.name}
          </h4>
          {lead.assigned_to && (
            <Badge variant="secondary" className="text-xs whitespace-nowrap">
              {lead.assigned_to}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {lead.company}
        </p>
        <p className="text-xs text-muted-foreground">{lead.phone}</p>
        {lead.note1 && (
          <p className="text-xs text-muted-foreground line-clamp-2 italic">
            {lead.note1}
          </p>
        )}
        {lead.status === "Advance payment" && (
          <Button
            onClick={handleDownloadReceipt}
            variant="outline"
            size="sm"
            className="w-full mt-2 text-xs"
          >
            <Download className="w-3 h-3 mr-1" />
            Download Receipt
          </Button>
        )}
      </div>
    </div>
  );
}

interface KanbanColumnProps {
  status: KanbanStatus;
  leads: Lead[];
  count: number;
  onLeadClick: (lead: Lead) => void;
}

function KanbanColumn({
  status,
  leads,
  count,
  onLeadClick,
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: status,
  });

  const statusColors: Record<KanbanStatus, string> = {
    "Quotation sent": "from-blue-500 to-blue-600",
    "Site visit": "from-green-500 to-green-600",
    "Advance payment": "from-purple-500 to-purple-600",
  };

  const statusIcons: Record<KanbanStatus, string> = {
    "Quotation sent": "📄",
    "Site visit": "📍",
    "Advance payment": "💰",
  };

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col bg-gray-50 rounded-lg p-4 flex-1 min-w-[350px] h-full max-h-[600px]"
    >
      {/* Column Header */}
      <div
        className={`bg-gradient-to-r ${statusColors[status]} rounded-lg p-4 mb-4 text-white`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{statusIcons[status]}</span>
            <div>
              <h3 className="font-bold text-lg">{status}</h3>
              <p className="text-sm opacity-90">{count} leads</p>
            </div>
          </div>
          <div className="bg-white bg-opacity-20 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
            {count}
          </div>
        </div>
      </div>

      {/* Cards Container */}
      <SortableContext
        items={leads.map((l) => l.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3 flex-1 overflow-y-auto">
          {leads.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              <p>No leads in this status</p>
            </div>
          ) : (
            leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onClick={() => onLeadClick(lead)}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

interface KanbanBoardInnerProps {
  leads: Lead[];
  leadsByStatus: Record<KanbanStatus, Lead[]>;
  activeId: string | null;
  onDragStart: (event: any) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onLeadClick: (lead: Lead) => void;
}

function KanbanBoardInner({
  leads,
  leadsByStatus,
  activeId,
  onDragStart,
  onDragEnd,
  onLeadClick,
}: KanbanBoardInnerProps) {
  const activeLead = leads.find((l) => l.id === activeId);

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-8 px-8">
        {KANBAN_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            leads={leadsByStatus[status]}
            count={leadsByStatus[status].length}
            onLeadClick={onLeadClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLead ? (
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-lg max-w-sm">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-foreground">
                {activeLead.name}
              </h4>
              <p className="text-xs text-muted-foreground">
                {activeLead.company}
              </p>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </>
  );
}

interface KanbanBoardContentProps {
  leads: Lead[];
  isLoading: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onLeadsUpdate: (leads: Lead[]) => void;
}

function KanbanBoardContent({
  leads,
  isLoading,
  searchTerm,
  onSearchChange,
  onLeadsUpdate,
}: KanbanBoardContentProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [openDetailsModal, setOpenDetailsModal] = useState(false);
  const [salespersons, setSalespersons] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      distance: 8,
    }),
  );

  useEffect(() => {
    const loadSalespersons = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("name")
          .eq("role", "salesperson")
          .order("name");

        if (!error && data) {
          setSalespersons(data.map((s) => s.name));
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error("Error loading salespersons:", errorMessage);
      }
    };

    loadSalespersons();
  }, []);

  const filteredLeads = useMemo(() => {
    return leads.filter(
      (lead) =>
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone.includes(searchTerm) ||
        lead.company.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [leads, searchTerm]);

  const leadsByStatus = useMemo(() => {
    const grouped: Record<KanbanStatus, Lead[]> = {
      "Quotation sent": [],
      "Site visit": [],
      "Advance payment": [],
    };

    filteredLeads.forEach((lead) => {
      if (lead.status in grouped) {
        grouped[lead.status as KanbanStatus].push(lead);
      }
    });

    return grouped;
  }, [filteredLeads]);

  const analyticsData = useMemo(() => {
    return [
      {
        status: "Quotation sent",
        count: leadsByStatus["Quotation sent"].length,
        fill: "#3b82f6",
      },
      {
        status: "Site visit",
        count: leadsByStatus["Site visit"].length,
        fill: "#10b981",
      },
      {
        status: "Advance payment",
        count: leadsByStatus["Advance payment"].length,
        fill: "#a855f7",
      },
    ];
  }, [leadsByStatus]);

  const handleDragStart = useCallback((event: any) => {
    setActiveId(event.active.id);
  }, []);

  const handleLeadClick = useCallback((lead: Lead) => {
    setSelectedLead(lead);
    setOpenDetailsModal(true);
  }, []);

  const handleLeadUpdate = useCallback(
    (updatedLead: Lead) => {
      onLeadsUpdate(
        leads.map((l) => (l.id === updatedLead.id ? updatedLead : l)),
      );
      setSelectedLead(updatedLead);
    },
    [leads, onLeadsUpdate],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over) return;

      const leadId = active.id as string;
      const lead = leads.find((l) => l.id === leadId);
      const newStatus = over.id as KanbanStatus;

      if (!lead || !KANBAN_STATUSES.includes(newStatus as any)) return;
      if (lead.status === newStatus) return;

      try {
        const { error } = await supabase
          .from("leads")
          .update({ status: newStatus })
          .eq("id", leadId);

        if (error) throw error;

        onLeadsUpdate(
          leads.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)),
        );

        toast.success(`Lead moved to ${newStatus}`);
      } catch (error) {
        console.error("Error updating lead status:", error);
        toast.error("Failed to update lead status");
      }
    },
    [leads, onLeadsUpdate],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading Kanban board...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">
            Lead Management Dashboard
          </h2>
          <p className="mt-1 text-muted-foreground">
            Track and manage leads with drag-and-drop kanban board
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone, or company..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {analyticsData.map((item) => (
          <Card key={item.status} className="p-6 border border-gray-200">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{item.status}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {item.count}
                  </p>
                </div>
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${item.fill}20` }}
                >
                  <TrendingUp
                    style={{ color: item.fill }}
                    className="w-6 h-6"
                  />
                </div>
              </div>
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-muted-foreground">
                  {Math.round((item.count / (filteredLeads.length || 1)) * 100)}
                  % of total
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Chart */}
      {filteredLeads.length > 0 && (
        <Card className="p-6 border border-gray-200">
          <h3 className="text-lg font-bold mb-4 text-foreground">
            Lead Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="status"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <KanbanBoardInner
          leads={leads}
          leadsByStatus={leadsByStatus}
          activeId={activeId}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onLeadClick={handleLeadClick}
        />
      </DndContext>

      {/* Lead Details Modal */}
      <LeadDetailsModal
        open={openDetailsModal}
        onOpenChange={setOpenDetailsModal}
        lead={selectedLead}
        onLeadUpdate={handleLeadUpdate}
        salespersons={salespersons}
      />

      {filteredLeads.length === 0 && searchTerm && (
        <Card className="p-8 text-center border border-gray-200">
          <p className="text-muted-foreground">
            No leads found matching "{searchTerm}"
          </p>
        </Card>
      )}

      {leads.length === 0 && !searchTerm && (
        <Card className="p-8 text-center border border-gray-200 bg-blue-50">
          <p className="text-muted-foreground mb-4">
            No leads in Quotation sent, Site visit, or Advance payment statuses
            yet.
          </p>
          <p className="text-sm text-muted-foreground">
            Leads will appear here once you move them to these stages.
          </p>
        </Card>
      )}
    </div>
  );
}

export default function KanbanBoard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const loadLeads = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("leads")
          .select("*")
          .in("status", KANBAN_STATUSES);

        if (error) throw error;
        setLeads(data || []);
      } catch (error) {
        console.error("Error loading leads:", error);
        toast.error("Failed to load leads");
      } finally {
        setIsLoading(false);
      }
    };

    loadLeads();
  }, []);

  return (
    <CRMLayout>
      <div className="space-y-6 p-8">
        <KanbanBoardContent
          leads={leads}
          isLoading={isLoading}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onLeadsUpdate={setLeads}
        />
      </div>
    </CRMLayout>
  );
}
