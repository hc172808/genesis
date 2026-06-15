import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { WalletModal } from "@/components/WalletModal";
import { useWallet } from "@/hooks/useWallet";
import { useTokens } from "@/hooks/useTokens";
import Index from "./pages/Index";
import CreateTokenPage from "./pages/CreateToken";
import DashboardPage from "./pages/Dashboard";
import GalleryPage from "./pages/Gallery";
import AnalyticsPage from "./pages/Analytics";
import CreateLiquidityPage from "./pages/CreateLiquidity";
import SwapTokenPage from "./pages/SwapToken";
import RemoveLiquidityPage from "./pages/RemoveLiquidity";
import BurnTokenPage from "./pages/BurnToken";
import BurnAndEarnPage from "./pages/BurnAndEarn";
import LeaderboardPage from "./pages/Leaderboard";
import TokenDetailPage from "./pages/TokenDetail";
import ProfilePage from "./pages/Profile";
import AdminPage from "./pages/Admin";
import HostingPage from "./pages/Hosting";
import SiteEditorPage from "./pages/SiteEditor";
import PoolTestPage from "./pages/PoolTest";
import NotificationsPage from "./pages/Notifications";
import StakingPage from "./pages/Staking";
import GovernancePage from "./pages/Governance";
import ProposalDetail from "./pages/ProposalDetail";
import LaunchpadPage from "./pages/Launchpad";
import LaunchpadCreate from "./pages/LaunchpadCreate";
import PresaleDetail from "./pages/PresaleDetail";
import OfflinePage from "./pages/Offline";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const { wallet, connect, disconnect, isConnecting, getRawProvider, getFullAddress } = useWallet();
  const { tokens, transactions, deployToken, burnTokens, swapTokens, addLiquidity, removeLiquidity, transferTokens, updateTokenMetadata, isDeploying } = useTokens({
    provider: getRawProvider(),
    walletAddress: getFullAddress(),
  });
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);

  const handleOpenWalletModal = () => setWalletModalOpen(true);

  const handleConnectWallet = async (walletType: string) => {
    setConnectingWallet(walletType);
    await connect(walletType);
    setConnectingWallet(null);
    setWalletModalOpen(false);
  };

  return (
    <>
      <Navbar
        wallet={wallet}
        onConnect={handleOpenWalletModal}
        onDisconnect={disconnect}
        isConnecting={isConnecting}
      />
      <WalletModal
        open={walletModalOpen}
        onOpenChange={setWalletModalOpen}
        onConnect={handleConnectWallet}
        isConnecting={isConnecting}
        connectingWallet={connectingWallet}
      />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route
          path="/create"
          element={
            <CreateTokenPage
              isWalletConnected={wallet.isConnected}
              walletAddress={wallet.address}
              walletBalance={wallet.balance}
              onDeploy={deployToken}
              isDeploying={isDeploying}
              onConnectWallet={handleOpenWalletModal}
            />
          }
        />
        <Route
          path="/dashboard"
          element={<DashboardPage tokens={tokens} transactions={transactions} isWalletConnected={wallet.isConnected} walletAddress={wallet.address} walletBalance={wallet.balance} onTransferTokens={transferTokens} onConnectWallet={handleOpenWalletModal} />}
        />
        <Route path="/gallery" element={<GalleryPage tokens={tokens} />} />
        <Route
          path="/analytics"
          element={<AnalyticsPage tokens={tokens} transactions={transactions} isWalletConnected={wallet.isConnected} />}
        />
        <Route
          path="/liquidity"
          element={<CreateLiquidityPage tokens={tokens} isWalletConnected={wallet.isConnected} onConnectWallet={handleOpenWalletModal} onAddLiquidity={addLiquidity} />}
        />
        <Route
          path="/swap"
          element={
            <SwapTokenPage
              tokens={tokens}
              isWalletConnected={wallet.isConnected}
              onConnectWallet={handleOpenWalletModal}
              onSwapTokens={swapTokens}
            />
          }
        />
        <Route
          path="/remove-liquidity"
          element={<RemoveLiquidityPage isWalletConnected={wallet.isConnected} onConnectWallet={handleOpenWalletModal} onRemoveLiquidity={removeLiquidity} />}
        />
        <Route
          path="/burn"
          element={
            <BurnTokenPage
              tokens={tokens}
              isWalletConnected={wallet.isConnected}
              onConnectWallet={handleOpenWalletModal}
              onBurnTokens={burnTokens}
            />
          }
        />
        <Route
          path="/burn-and-earn"
          element={<BurnAndEarnPage tokens={tokens} isWalletConnected={wallet.isConnected} onConnectWallet={handleOpenWalletModal} />}
        />
        <Route path="/token/:address" element={<TokenDetailPage tokens={tokens} transactions={transactions} />} />
        <Route
          path="/profile"
          element={
            <ProfilePage
              tokens={tokens}
              transactions={transactions}
              wallet={wallet}
              onConnectWallet={handleOpenWalletModal}
            />
          }
        />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route
          path="/admin"
          element={
            <AdminPage
              tokens={tokens}
              transactions={transactions}
              wallet={wallet}
              onConnectWallet={handleOpenWalletModal}
            />
          }
        />
        <Route
          path="/hosting"
          element={
            <HostingPage
              wallet={wallet}
              onConnectWallet={handleOpenWalletModal}
            />
          }
        />
        <Route
          path="/hosting/edit/:siteId"
          element={
            <SiteEditorPage
              wallet={wallet}
              onConnectWallet={handleOpenWalletModal}
            />
          }
        />
        <Route
          path="/pool-test"
          element={<PoolTestPage wallet={wallet} onConnectWallet={handleOpenWalletModal} />}
        />
        <Route path="/notifications" element={<NotificationsPage wallet={wallet} onConnectWallet={handleOpenWalletModal} />} />
        <Route path="/staking" element={<StakingPage wallet={wallet} onConnectWallet={handleOpenWalletModal} />} />
        <Route path="/governance" element={<GovernancePage wallet={wallet} onConnectWallet={handleOpenWalletModal} />} />
        <Route path="/governance/:proposalId" element={<ProposalDetail wallet={wallet} onConnectWallet={handleOpenWalletModal} />} />
        <Route path="/launchpad" element={<LaunchpadPage wallet={wallet} onConnectWallet={handleOpenWalletModal} />} />
        <Route path="/launchpad/create" element={<LaunchpadCreate wallet={wallet} />} />
        <Route path="/launchpad/:id" element={<PresaleDetail wallet={wallet} onConnectWallet={handleOpenWalletModal} />} />
        <Route path="/offline" element={<OfflinePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
