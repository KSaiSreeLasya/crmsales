/**
 * Supabase Client Setup
 * Configure and export Supabase client for database and real-time operations
 * 
 * TODO: Set up environment variables:
 * - VITE_SUPABASE_URL: Your Supabase project URL
 * - VITE_SUPABASE_ANON_KEY: Your Supabase anonymous key
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase credentials not configured. Some features may not work."
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key"
);

/**
 * Database Types for TypeScript support
 */
export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: "new" | "contacted" | "qualified" | "converted" | "lost";
  assignedTo?: string;
  source?: "google_sheet" | "manual" | "api";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Salesperson {
  id: string;
  name: string;
  email: string;
  phone: string;
  department?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadAssignment {
  id: string;
  leadId: string;
  salespersonId: string;
  assignedAt: string;
  status: "active" | "completed" | "transferred";
}

/**
 * Helper function to get all leads from Supabase
 */
export async function getLeads() {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching leads:", error);
    return [];
  }

  return data || [];
}

/**
 * Helper function to add a new lead
 */
export async function addLead(lead: Omit<Lead, "id" | "createdAt" | "updatedAt">) {
  const { data, error } = await supabase
    .from("leads")
    .insert([
      {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        status: lead.status,
        assigned_to: lead.assignedTo,
        source: lead.source || "manual",
        notes: lead.notes,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error adding lead:", error);
    return null;
  }

  return data;
}

/**
 * Helper function to update a lead
 */
export async function updateLead(
  leadId: string,
  updates: Partial<Lead>
) {
  const { data, error } = await supabase
    .from("leads")
    .update({
      name: updates.name,
      email: updates.email,
      phone: updates.phone,
      company: updates.company,
      status: updates.status,
      assigned_to: updates.assignedTo,
      notes: updates.notes,
    })
    .eq("id", leadId)
    .select()
    .single();

  if (error) {
    console.error("Error updating lead:", error);
    return null;
  }

  return data;
}

/**
 * Helper function to get all salespersons
 */
export async function getSalespersons() {
  const { data, error } = await supabase
    .from("salespersons")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching salespersons:", error);
    return [];
  }

  return data || [];
}

/**
 * Helper function to add a new salesperson
 */
export async function addSalesperson(
  salesperson: Omit<Salesperson, "id" | "createdAt" | "updatedAt">
) {
  const { data, error } = await supabase
    .from("salespersons")
    .insert([salesperson])
    .select()
    .single();

  if (error) {
    console.error("Error adding salesperson:", error);
    return null;
  }

  return data;
}

/**
 * Helper function to subscribe to real-time lead updates
 */
export function subscribeToLeadUpdates(
  callback: (lead: Lead) => void
) {
  const subscription = supabase
    .from("leads")
    .on("*", (payload) => {
      callback(payload.new as Lead);
    })
    .subscribe();

  return subscription;
}
