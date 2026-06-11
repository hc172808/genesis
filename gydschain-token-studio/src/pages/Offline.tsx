import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const OfflinePage = () => (
  <div className="min-h-screen bg-background flex items-center justify-center p-4">
    <div className="glass-card p-10 text-center max-w-md">
      <WifiOff className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
      <h1 className="text-2xl font-heading font-bold mb-2">You're offline</h1>
      <p className="text-muted-foreground mb-6">Reconnect to GydsChain to continue.</p>
      <Button onClick={() => location.reload()} className="btn-gradient">Try again</Button>
    </div>
  </div>
);

export default OfflinePage;
