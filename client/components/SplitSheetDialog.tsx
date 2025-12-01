import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Split, Loader2 } from "lucide-react";

interface SplitSheetDialogProps {
  sheetName: string;
  totalLeads: number;
  spreadsheetId: string;
  sheetId: string;
  onSplitComplete?: () => void;
}

export function SplitSheetDialog({
  sheetName,
  totalLeads,
  spreadsheetId,
  sheetId,
  onSplitComplete,
}: SplitSheetDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSplitting, setIsSplitting] = useState(false);
  const [isLoadingCount, setIsLoadingCount] = useState(false);
  const [actualLeadCount, setActualLeadCount] = useState(totalLeads);
  const [splitPoint, setSplitPoint] = useState(Math.ceil(totalLeads / 2));

  // Fetch actual lead count from sheet when dialog opens
  useEffect(() => {
    if (open && spreadsheetId && sheetName && actualLeadCount === totalLeads) {
      fetchActualLeadCount();
    }
  }, [open]);

  const fetchActualLeadCount = async () => {
    setIsLoadingCount(true);
    try {
      const response = await fetch(
        `/api/fetch-google-sheet-api?spreadsheetId=${encodeURIComponent(
          spreadsheetId,
        )}&sheetName=${encodeURIComponent(sheetName)}`,
      );
      const data = await response.json();

      if (response.ok && data.success) {
        const count = data.count || 0;
        console.log(`Sheet "${sheetName}" has ${count} leads total`);
        setActualLeadCount(count);
        setSplitPoint(Math.ceil(count / 2));
      }
    } catch (error) {
      console.error("Error fetching lead count:", error);
      // Fall back to totalLeads
      setActualLeadCount(totalLeads);
      setSplitPoint(Math.ceil(totalLeads / 2));
    } finally {
      setIsLoadingCount(false);
    }
  };

  const handleSplit = async () => {
    if (splitPoint <= 0 || splitPoint >= actualLeadCount) {
      toast.error(`Split point must be between 1 and ${actualLeadCount - 1} leads`);
      return;
    }

    setIsSplitting(true);
    try {
      const response = await fetch("/api/split-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadsheetId,
          sheetId,
          sheetName,
          splitPoint,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error);
      }

      toast.success(
        `Sheet split successfully!\n\nPart 1: ${data.firstSheet.rowCount} leads\nPart 2: ${data.secondSheet.rowCount} leads`,
      );

      setOpen(false);
      setConfirmOpen(false);

      if (onSplitComplete) {
        // Give Google Sheets API time to process
        setTimeout(() => {
          onSplitComplete();
        }, 2000);
      }
    } catch (error) {
      console.error("Error splitting sheet:", error);
      const errorMsg =
        error instanceof Error ? error.message : "Failed to split sheet";
      toast.error(errorMsg);
    } finally {
      setIsSplitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="gap-1 h-8 text-xs px-2"
            title="Split this sheet into two sheets for better performance"
            disabled={actualLeadCount < 2}
          >
            <Split className="h-3.5 w-3.5" />
            Split Sheet
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Split Sheet</DialogTitle>
            <DialogDescription>
              Split "{sheetName}" into two sheets for better performance and
              easier management
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                Sheet: {sheetName}
              </p>
              <p className="text-xs text-muted-foreground">
                Total leads: {isLoadingCount ? "Loading..." : actualLeadCount}
              </p>
            </div>

            <div>
              <Label htmlFor="split-point">
                First sheet will have (leads): {splitPoint}
              </Label>
              <Input
                id="split-point"
                type="number"
                min="1"
                max={actualLeadCount - 1}
                value={splitPoint}
                onChange={(e) => setSplitPoint(parseInt(e.target.value) || 1)}
                className="mt-2"
                disabled={isLoadingCount}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Second sheet will have: {actualLeadCount - splitPoint} leads
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-xs text-blue-900">
                <strong>Info:</strong> This will create two new sheets in your
                Google Sheet with the data split equally (or as specified). The
                original sheet will remain unchanged.
              </p>
            </div>

            <Button
              onClick={() => setConfirmOpen(true)}
              className="w-full"
              disabled={isSplitting}
            >
              {isSplitting ? "Splitting..." : "Continue"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Split</AlertDialogTitle>
            <AlertDialogDescription>
              This will create two new sheets:
              <br />
              <br />
              <strong>Part 1:</strong> {splitPoint} leads
              <br />
              <strong>Part 2:</strong> {actualLeadCount - splitPoint} leads
              <br />
              <br />
              The original sheet "{sheetName}" will remain unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel disabled={isSplitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSplit}
              disabled={isSplitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSplitting ? "Splitting..." : "Split Sheet"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
