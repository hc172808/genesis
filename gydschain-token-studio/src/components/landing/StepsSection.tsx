import { motion } from "framer-motion";
import { Wallet, FileText, Rocket, LayoutDashboard } from "lucide-react";

const steps = [
  { icon: Wallet, title: "Connect Wallet", desc: "Link your GydsChain-compatible wallet securely." },
  { icon: FileText, title: "Configure Token", desc: "Set name, symbol, supply, and upload your logo." },
  { icon: Rocket, title: "Deploy", desc: "Sign the transaction and deploy your token instantly." },
  { icon: LayoutDashboard, title: "Manage", desc: "Mint, burn, and track your token from the dashboard." },
];

export const StepsSection = () => (
  <section className="py-24 relative">
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-1/2 left-0 w-full h-96 bg-primary/5 blur-[120px]" />
    </div>
    <div className="container mx-auto px-4 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <h2 className="text-4xl font-heading font-bold mb-4">
          How It <span className="gradient-text">Works</span>
        </h2>
        <p className="text-muted-foreground text-lg">Four simple steps to your own token.</p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {steps.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15 }}
            className="text-center relative"
          >
            <div className="step-indicator step-indicator-active mx-auto mb-4 text-lg">{i + 1}</div>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-primary/10 text-primary">
              <s.icon className="w-7 h-7" />
            </div>
            <h3 className="font-heading font-semibold text-lg mb-2">{s.title}</h3>
            <p className="text-sm text-muted-foreground">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);
