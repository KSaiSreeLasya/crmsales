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
export type LeadStatus =
  | "Not lifted"
  | "Not connected"
  | "Voice Message"
  | "Quotation sent"
  | "Site visit"
  | "Advance payment"
  | "Lead finished"
  | "Contacted";

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: LeadStatus;
  assignedTo: string;
  note1: string;
  note2: string;
  source?: "google_sheet" | "manual" | "api";
  createdAt: string;
  updatedAt: string;
}

export interface Salesperson {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  region: string;
  createdAt: string;
  updatedAt: string;
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
export async function addLead(
  lead: Omit<Lead, "id" | "createdAt" | "updatedAt">
) {
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
        note1: lead.note1,
        note2: lead.note2,
        source: lead.source || "manual",
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
export async function updateLead(leadId: string, updates: Partial<Lead>) {
  const { data, error } = await supabase
    .from("leads")
    .update({
      name: updates.name,
      email: updates.email,
      phone: updates.phone,
      company: updates.company,
      status: updates.status,
      assigned_to: updates.assignedTo,
      note1: updates.note1,
      note2: updates.note2,
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
 * Helper function to delete a lead
 */
export async function deleteLead(leadId: string) {
  const { error } = await supabase.from("leads").delete().eq("id", leadId);

  if (error) {
    console.error("Error deleting lead:", error);
    return false;
  }

  return true;
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
 * Helper function to update a salesperson
 */
export async function updateSalesperson(
  salespersonId: string,
  updates: Partial<Salesperson>
) {
  const { data, error } = await supabase
    .from("salespersons")
    .update({
      name: updates.name,
      email: updates.email,
      phone: updates.phone,
      department: updates.department,
      region: updates.region,
    })
    .eq("id", salespersonId)
    .select()
    .single();

  if (error) {
    console.error("Error updating salesperson:", error);
    return null;
  }

  return data;
}

/**
 * Helper function to delete a salesperson
 */
export async function deleteSalesperson(salespersonId: string) {
  const { error } = await supabase
    .from("salespersons")
    .delete()
    .eq("id", salespersonId);

  if (error) {
    console.error("Error deleting salesperson:", error);
    return false;
  }

  return true;
}

/**
 * Helper function to subscribe to real-time lead updates
 */
export function subscribeToLeadUpdates(callback: (lead: Lead) => void) {
  const subscription = supabase
    .from("leads")
    .on("*", (payload) => {
      callback(payload.new as Lead);
    })
    .subscribe();

  return subscription;
}
