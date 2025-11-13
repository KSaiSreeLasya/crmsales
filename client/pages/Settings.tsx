import { CRMLayout } from "@/components/CRMLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { syncLeadsFromGoogleSheet, syncSalespersonsFromGoogleSheet, extractSpreadsheetId } from "@/lib/googleSheets";

export default function Settings() {
  const [leadsSheetUrl, setLeadsSheetUrl] = useState("");
  const [salespersonsSheetUrl, setSalespersonsSheetUrl] = useState("");
  const [supabaseStatus, setSupabaseStatus] = useState("connected");
  const [isSyncingLeads, setIsSyncingLeads] = useState(false);
  const [isSyncingSalespersons, setIsSyncingSalespersons] = useState(false);

  const handleSyncLeads = async () => {
    if (!leadsSheetUrl.trim()) {
      toast.error("Please enter a Google Sheets URL");
      return;
    }

    const spreadsheetId = extractSpreadsheetId(leadsSheetUrl);
    if (!spreadsheetId) {
      toast.error("Invalid Google Sheets URL");
      return;
    }

    setIsSyncingLeads(true);
    try {
      const result = await syncLeadsFromGoogleSheet(spreadsheetId, "0");
      if (result.success) {
        toast.success(`Successfully synced ${result.synced} leads from Google Sheet`);
      } else {
        toast.error("Failed to sync leads");
      }
    } catch (error) {
      console.error("Error syncing leads:", error);
      toast.error("Failed to sync leads from Google Sheet");
    } finally {
      setIsSyncingLeads(false);
    }
  };

  const handleSyncSalespersons = async () => {
    if (!salespersonsSheetUrl.trim()) {
      toast.error("Please enter a Google Sheets URL");
      return;
    }

    const spreadsheetId = extractSpreadsheetId(salespersonsSheetUrl);
    if (!spreadsheetId) {
      toast.error("Invalid Google Sheets URL");
      return;
    }

    setIsSyncingSalespersons(true);
    try {
      const result = await syncSalespersonsFromGoogleSheet(spreadsheetId, "0");
      if (result.success) {
        toast.success(`Successfully synced ${result.synced} salespersons from Google Sheet`);
      } else {
        toast.error("Failed to sync salespersons");
      }
    } catch (error) {
      console.error("Error syncing salespersons:", error);
      toast.error("Failed to sync salespersons from Google Sheet");
    } finally {
      setIsSyncingSalespersons(false);
    }
  };

  return (
    <CRMLayout>
      <div className="space-y-6 p-8">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold text-foreground">Settings</h2>
          <p className="mt-1 text-muted-foreground">
            Configure integrations and manage your CRM
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="integrations" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6">
            <Card className="border border-border bg-card p-6">
              <div className="space-y-6">
                {/* Google Sheets - Leads */}
                <div className="border-b border-border pb-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        Google Sheets - Leads
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Sync leads from your Google Sheet. Sheet must be publicly shared.
                      </p>
                    </div>
                    <div className="text-blue-600">
                      <AlertCircle className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4 space-y-4">
                    <div>
                      <Label htmlFor="leads-sheet-url">Google Sheet URL</Label>
                      <Input
                        id="leads-sheet-url"
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        value={leadsSheetUrl}
                        onChange={(e) => setLeadsSheetUrl(e.target.value)}
                        className="mt-2"
                      />
                      <p className="mt-2 text-xs text-muted-foreground">
                        Required columns: Name, Email, Phone, Company, Assigned to, Status, Note1, Note2
                      </p>
                    </div>
                    <Button
                      onClick={handleSyncLeads}
                      disabled={isSyncingLeads}
                      className="gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${isSyncingLeads ? "animate-spin" : ""}`} />
                      {isSyncingLeads ? "Syncing Leads..." : "Sync Leads"}
                    </Button>
                  </div>
                </div>

                {/* Google Sheets - Salespersons */}
                <div className="border-b border-border pb-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        Google Sheets - Salespersons
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Sync your sales team from Google Sheet. Sheet must be publicly shared.
                      </p>
                    </div>
                    <div className="text-blue-600">
                      <AlertCircle className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4 space-y-4">
                    <div>
                      <Label htmlFor="salespersons-sheet-url">Google Sheet URL</Label>
                      <Input
                        id="salespersons-sheet-url"
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        value={salespersonsSheetUrl}
                        onChange={(e) => setSalespersonsSheetUrl(e.target.value)}
                        className="mt-2"
                      />
                      <p className="mt-2 text-xs text-muted-foreground">
                        Required columns: Name, Email, Phone, Department, Region
                      </p>
                    </div>
                    <Button
                      onClick={handleSyncSalespersons}
                      disabled={isSyncingSalespersons}
                      className="gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${isSyncingSalespersons ? "animate-spin" : ""}`} />
                      {isSyncingSalespersons ? "Syncing Salespersons..." : "Sync Salespersons"}
                    </Button>
                  </div>
                </div>

                {/* Supabase */}
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        Supabase
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Database connection for storing leads and salespersons
                      </p>
                    </div>
                    <div className="text-green-600">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="rounded-lg bg-success/10 p-4">
                      <p className="text-sm font-medium text-success">
                        ✓ Connected and configured
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* General Tab */}
          <TabsContent value="general">
            <Card className="border border-border bg-card p-6">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="org-name">Organization Name</Label>
                  <Input
                    id="org-name"
                    placeholder="Your Organization"
                    defaultValue="SalesHub"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <select className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2">
                    <option>UTC</option>
                    <option>EST</option>
                    <option>CST</option>
                    <option>MST</option>
                    <option>PST</option>
                  </select>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team">
            <Card className="border border-border bg-card p-6">
              <p className="text-muted-foreground">
                Manage team permissions and roles here. Go to the Team Members
                page to add new team members.
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </CRMLayout>
  );
}
