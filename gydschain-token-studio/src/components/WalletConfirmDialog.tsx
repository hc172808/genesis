import { AlertTriangle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface WalletConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  details?: { label: string; value: string }[];
  fee?: string;
  isLoading?: boolean;
  variant?: "default" | "destructive";
}

export const WalletConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  details,
  fee,
  isLoading,
  variant = "default",
}: WalletConfirmDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/50 max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            {variant === "destructive" ? (
              <AlertTriangle className="w-6 h-6 text-destructive" />
            ) : (
              <Shield className="w-6 h-6 text-primary" />
            )}
            <DialogTitle className="font-heading">{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {(details || fee) && (
          <div className="space-y-2 py-3 px-4 bg-muted/30 rounded-lg border border-border/30">
            {details?.map((d) => (
              <div key={d.label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{d.label}</span>
                <span className="font-mono text-foreground">{d.value}</span>
              </div>
            ))}
            {fee && (
              <div className="flex justify-between text-sm border-t border-border/30 pt-2 mt-2">
                <span className="text-muted-foreground">Network Fee</span>
                <span className="font-mono text-foreground">{fee} GYDS</span>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Your wallet will prompt you to confirm this transaction.
        </p>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className={variant === "destructive" ? "bg-destructive hover:bg-destructive/90" : "btn-gradient"}
          >
            {isLoading ? "Waiting for wallet..." : "Confirm & Sign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
