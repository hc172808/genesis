import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, Crown, Flame, TrendingUp, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchLeaderboard, isDbConfigured, type DbLeaderboardEntry } from "@/lib/dbService";
import { getActiveConfig } from "@/lib/blockchain/config";

const MOCK_LEADERBOARD = [
  { rank: 1, address: "0x7a3B...9f4E", tokens: 12, totalBurned: "2,500,000", totalLiquidity: "1,250 GYDS" },
  { rank: 2, address: "0xBc4D...eF1A", tokens: 8, totalBurned: "1,800,000", totalLiquidity: "980 GYDS" },
  { rank: 3, address: "0x1234...5678", tokens: 6, totalBurned: "1,200,000", totalLiquidity: "750 GYDS" },
  { rank: 4, address: "0xAbCd...EfGh", tokens: 5, totalBurned: "900,000", totalLiquidity: "500 GYDS" },
  { rank: 5, address: "0x9876...5432", tokens: 4, totalBurned: "600,000", totalLiquidity: "350 GYDS" },
  { rank: 6, address: "0xFeDc...BaAb", tokens: 3, totalBurned: "450,000", totalLiquidity: "200 GYDS" },
  { rank: 7, address: "0x2468...1357", tokens: 2, totalBurned: "300,000", totalLiquidity: "150 GYDS" },
  { rank: 8, address: "0xAcEd...FaCe", tokens: 2, totalBurned: "200,000", totalLiquidity: "100 GYDS" },
];

const rankIcons: Record<number, React.ReactNode> = {
  1: <Crown className="w-5 h-5 text-[hsl(38,92%,50%)]" />,
  2: <Medal className="w-5 h-5 text-muted-foreground" />,
  3: <Medal className="w-5 h-5 text-[hsl(25,60%,45%)]" />,
};

const LeaderboardPage = () => {
  const [creators, setCreators] = useState<DbLeaderboardEntry[]>([]);
  const [burners, setBurners] = useState<DbLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadLeaderboard = async () => {
      if (!isDbConfigured()) return;
      
      setIsLoading(true);
      const config = getActiveConfig();
      const network = config.networkName.toLowerCase();
      
      const [creatorsData, burnersData] = await Promise.all([
        fetchLeaderboard("creators", network, 20),
        fetchLeaderboard("burners", network, 20),
      ]);
      
      if (creatorsData.length > 0) setCreators(creatorsData);
      if (burnersData.length > 0) setBurners(burnersData);
      setIsLoading(false);
    };

    loadLeaderboard();
  }, []);

  // Use DB data if available, otherwise mock
  const leaderboardData = creators.length > 0
    ? creators.map((c) => ({
        rank: c.rank,
        address: c.wallet_address.slice(0, 6) + "..." + c.wallet_address.slice(-4),
        tokens: c.tokens_created,
        totalBurned: Number(c.total_burned).toLocaleString(),
        totalLiquidity: `${Number(c.rewards_earned).toFixed(0)} GYDS`,
      }))
    : MOCK_LEADERBOARD;

  const burnersData = burners.length > 0
    ? burners.map((b) => ({
        rank: b.rank,
        address: b.wallet_address.slice(0, 6) + "..." + b.wallet_address.slice(-4),
        tokens: b.tokens_created,
        totalBurned: Number(b.total_burned).toLocaleString(),
        totalLiquidity: `${Number(b.rewards_earned).toFixed(0)} GYDS`,
      }))
    : MOCK_LEADERBOARD;

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-heading font-bold">
              <span className="gradient-text">Leaderboard</span>
            </h1>
            {isLoading && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
          </div>
          <p className="text-muted-foreground mb-8">Top creators and burners on GydsChain</p>

          {/* Top 3 */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {leaderboardData.slice(0, 3).map((user, i) => (
              <motion.div
                key={user.rank}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`glass-card p-5 text-center ${i === 0 ? "glow-effect ring-1 ring-primary/30" : ""}`}
              >
                <div className="flex justify-center mb-3">{rankIcons[user.rank]}</div>
                <p className="font-mono text-sm text-primary mb-1">{user.address}</p>
                <p className="text-2xl font-heading font-bold">{user.tokens}</p>
                <p className="text-xs text-muted-foreground">Tokens Created</p>
              </motion.div>
            ))}
          </div>

          <Tabs defaultValue="creators">
            <TabsList className="w-full bg-muted/30 mb-4">
              <TabsTrigger value="creators" className="flex-1 gap-1.5"><TrendingUp className="w-3.5 h-3.5" />Top Creators</TabsTrigger>
              <TabsTrigger value="burners" className="flex-1 gap-1.5"><Flame className="w-3.5 h-3.5" />Top Burners</TabsTrigger>
            </TabsList>

            <TabsContent value="creators">
              <div className="glass-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left p-4 text-muted-foreground font-medium w-16">Rank</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Address</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Tokens</th>
                      <th className="text-left p-4 text-muted-foreground font-medium hidden sm:table-cell">Total Liquidity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardData.map((user) => (
                      <tr key={user.rank} className="border-b border-border/20 hover:bg-muted/20">
                        <td className="p-4">{rankIcons[user.rank] || <span className="text-muted-foreground">#{user.rank}</span>}</td>
                        <td className="p-4 font-mono text-primary">{user.address}</td>
                        <td className="p-4 font-bold">{user.tokens}</td>
                        <td className="p-4 text-muted-foreground hidden sm:table-cell">{user.totalLiquidity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="burners">
              <div className="glass-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left p-4 text-muted-foreground font-medium w-16">Rank</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Address</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Burned</th>
                      <th className="text-left p-4 text-muted-foreground font-medium hidden sm:table-cell">GYDS Earned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {burnersData.map((user) => (
                      <tr key={user.rank} className="border-b border-border/20 hover:bg-muted/20">
                        <td className="p-4">{rankIcons[user.rank] || <span className="text-muted-foreground">#{user.rank}</span>}</td>
                        <td className="p-4 font-mono text-primary">{user.address}</td>
                        <td className="p-4 font-bold">{user.totalBurned}</td>
                        <td className="p-4 text-[hsl(var(--success))] hidden sm:table-cell">{(Number(user.totalBurned.replace(/,/g, "")) * 0.00005).toFixed(2)} GYDS</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default LeaderboardPage;
