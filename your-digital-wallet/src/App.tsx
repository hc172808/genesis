import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { hasWallet } from "@/lib/wallet-core";
import { injectWeb3Provider } from "@/lib/web3-provider";
import SessionLockGuard from "@/components/wallet/SessionLockGuard";

injectWeb3Provider();
import Index from "./pages/Index";
import Send from "./pages/Send";
import Swap from "./pages/Swap";
import Receive from "./pages/Receive";
import History from "./pages/History";
import Settings from "./pages/Settings";
import Network from "./pages/Network";
import Admin from "./pages/Admin";
import TokenDetail from "./pages/TokenDetail";
import WalletSetup from "./pages/WalletSetup";
import WalletExport from "./pages/WalletExport";
import NFTGallery from "./pages/NFTGallery";
import ConnectedApps from "./pages/ConnectedApps";
import Earn from "./pages/Earn";
import Buy from "./pages/Buy";
import Perps from "./pages/Perps";
import Prediction from "./pages/Prediction";
import Approvals from "./pages/Approvals";
import Following from "./pages/Following";
import HardwareWallet from "./pages/HardwareWallet";
import MemeRush from "./pages/MemeRush";
import AlphaToken from "./pages/AlphaToken";
import PriceAlerts from "./pages/PriceAlerts";
import NotFound from "./pages/NotFound";
import { usePriceAlertMonitor } from "@/hooks/use-price-alert-monitor";

const queryClient = new QueryClient();

const PriceAlertMonitor = () => {
  usePriceAlertMonitor();
  return null;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  if (!hasWallet()) return <Navigate to="/setup" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SessionLockGuard>
          <PriceAlertMonitor />
          <Routes>
            <Route path="/setup" element={<WalletSetup />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/send" element={<ProtectedRoute><Send /></ProtectedRoute>} />
            <Route path="/swap" element={<ProtectedRoute><Swap /></ProtectedRoute>} />
            <Route path="/receive" element={<ProtectedRoute><Receive /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/wallet-export" element={<ProtectedRoute><WalletExport /></ProtectedRoute>} />
            <Route path="/network" element={<ProtectedRoute><Network /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/nfts" element={<ProtectedRoute><NFTGallery /></ProtectedRoute>} />
            <Route path="/connected-apps" element={<ProtectedRoute><ConnectedApps /></ProtectedRoute>} />
            <Route path="/token/:symbol" element={<ProtectedRoute><TokenDetail /></ProtectedRoute>} />
            <Route path="/earn" element={<ProtectedRoute><Earn /></ProtectedRoute>} />
            <Route path="/buy" element={<ProtectedRoute><Buy /></ProtectedRoute>} />
            <Route path="/perps" element={<ProtectedRoute><Perps /></ProtectedRoute>} />
            <Route path="/prediction" element={<ProtectedRoute><Prediction /></ProtectedRoute>} />
            <Route path="/approvals" element={<ProtectedRoute><Approvals /></ProtectedRoute>} />
            <Route path="/following" element={<ProtectedRoute><Following /></ProtectedRoute>} />
            <Route path="/hardware-wallet" element={<ProtectedRoute><HardwareWallet /></ProtectedRoute>} />
            <Route path="/meme-rush" element={<ProtectedRoute><MemeRush /></ProtectedRoute>} />
            <Route path="/alpha" element={<ProtectedRoute><AlphaToken /></ProtectedRoute>} />
            <Route path="/alerts" element={<ProtectedRoute><PriceAlerts /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SessionLockGuard>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
