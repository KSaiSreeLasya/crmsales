import { CRMLayout } from "@/components/CRMLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle } from "lucide-react";
import { useState } from "react";

export default function Settings() {
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const [supabaseStatus, setSupabaseStatus] = useState("connected");
  const [savedSettings, setSavedSettings] = useState(false);

  const handleSaveSettings = () => {
    // TODO: Save settings to backend
    setSavedSettings(true);
    setTimeout(() => setSavedSettings(false), 3000);
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
                {/* Google Sheets */}
                <div className="border-b border-border pb-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        Google Sheets
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Connect your Google Sheet to automatically sync leads
                      </p>
                    </div>
                    <div className="text-yellow-600">
                      <AlertCircle className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4 space-y-4">
                    <div>
                      <Label htmlFor="sheet-url">Google Sheet URL</Label>
                      <Input
                        id="sheet-url"
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        value={googleSheetUrl}
                        onChange={(e) => setGoogleSheetUrl(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <Button onClick={handleSaveSettings}>Connect Sheet</Button>
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
                        Database connection for storing leads and data
                      </p>
                    </div>
                    <div className="text-green-600">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="rounded-lg bg-success/10 p-4">
                      <p className="text-sm font-medium text-success">
                        ✓ Connected
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
                <Button onClick={handleSaveSettings}>Save Settings</Button>
                {savedSettings && (
                  <div className="rounded-lg bg-success/10 p-4">
                    <p className="text-sm font-medium text-success">
                      ✓ Settings saved successfully
                    </p>
                  </div>
                )}
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
