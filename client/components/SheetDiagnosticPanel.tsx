import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface DiagnosticResult {
  status: string;
  totalRows: number;
  columnCount: number;
  columnNames: string[];
  sampleRows: Array<{
    rowNum: number;
    columns: { [key: string]: { value: string; type: string; fullLength: number } };
  }>;
  issues: string[];
  recommendation: string;
}

interface Props {
  spreadsheetId: string;
  sheetId: string;
  sheetName: string;
}

export function SheetDiagnosticPanel({ spreadsheetId, sheetId, sheetName }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(
        `/api/diagnose-sheet-columns?spreadsheetId=${spreadsheetId}&sheetId=${sheetId}`,
      );

      if (!response.ok) {
        throw new Error("Failed to run diagnostics");
      }

      const data = await response.json();
      setResult(data);

      if (data.issues && data.issues.length > 0) {
        toast.warning(`Found ${data.issues.length} potential issue(s)`);
      } else {
        toast.success("Sheet structure looks correct!");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      toast.error("Failed to run diagnostics: " + message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Sheet Column Diagnostic
        </CardTitle>
        <CardDescription>
          Diagnose column alignment issues in {sheetName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={runDiagnostics}
          disabled={isLoading}
          className="w-full"
          variant="outline"
        >
          {isLoading ? "Running Diagnostics..." : "Run Diagnostics"}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-4">
            {result.issues.length > 0 ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <strong>Issues found:</strong>
                    <ul className="list-disc pl-5 mt-2">
                      {result.issues.map((issue, idx) => (
                        <li key={idx} className="text-sm">
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Sheet structure looks correct!
                </AlertDescription>
              </Alert>
            )}

            <div className="bg-slate-50 p-3 rounded-lg space-y-2">
              <p className="text-sm font-semibold">Sheet Info:</p>
              <div className="text-sm text-slate-600 space-y-1">
                <p>Total Rows: {result.totalRows}</p>
                <p>Columns: {result.columnCount}</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg space-y-2">
              <p className="text-sm font-semibold">Column Names:</p>
              <div className="text-sm text-slate-600 space-y-1 max-h-[200px] overflow-y-auto">
                {result.columnNames.map((col, idx) => (
                  <div key={idx} className="font-mono text-xs">
                    {idx + 1}. {col}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg space-y-2">
              <p className="text-sm font-semibold">Sample Data (First Row):</p>
              <div className="text-sm text-slate-600 space-y-2 max-h-[300px] overflow-y-auto">
                {result.sampleRows[0] ? (
                  Object.entries(result.sampleRows[0].columns).map(([colName, colData]: [string, any]) => (
                    <div key={colName} className="border-l-2 border-slate-300 pl-2">
                      <div className="font-mono text-xs font-semibold">{colName}</div>
                      <div className="text-xs">
                        Value: {colData.value || "(empty)"}
                      </div>
                      <div className="text-xs text-slate-500">
                        Type: {colData.type} | Length: {colData.fullLength}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500">No data available</p>
                )}
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-sm font-semibold text-blue-900 mb-2">Recommendation:</p>
              <p className="text-sm text-blue-800">{result.recommendation}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
