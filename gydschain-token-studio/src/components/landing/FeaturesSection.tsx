import { motion } from "framer-motion";
import { Shield, Zap, Globe, Layers, BarChart3, Coins } from "lucide-react";

const features = [
  { icon: Zap, title: "Instant Deployment", desc: "Deploy tokens on GydsChain in seconds with our streamlined wizard." },
  { icon: Shield, title: "Secure by Design", desc: "Wallet-signed transactions only. No private keys ever stored or requested." },
  { icon: Globe, title: "IPFS Metadata", desc: "Token metadata and logos stored permanently on decentralized IPFS." },
  { icon: Layers, title: "Full Management", desc: "Mint, burn, pause, and transfer ownership from your dashboard." },
  { icon: BarChart3, title: "Analytics", desc: "Track your tokens, holders, and transaction history in real time." },
  { icon: Coins, title: "Token Gallery", desc: "Browse all tokens deployed on GydsChain with search and filters." },
];

export const FeaturesSection = () => (
  <section className="py-24 relative">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <h2 className="text-4xl font-heading font-bold mb-4">
          Everything You Need to <span className="gradient-text">Launch</span>
        </h2>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          A complete toolkit for creating and managing tokens on GydsChain.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 glow-effect group hover:border-primary/30 transition-all"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
              <f.icon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-heading font-semibold mb-2">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);
