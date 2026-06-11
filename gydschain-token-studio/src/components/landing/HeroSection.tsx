import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

export const HeroSection = () => (
  <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-16">
    {/* Background image */}
    <div className="absolute inset-0 pointer-events-none">
      <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
    </div>

    {/* Glow effects */}
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[120px]" />
    </div>

    <div className="container mx-auto px-4 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center max-w-4xl mx-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 glass-card px-4 py-2 mb-8 text-sm text-muted-foreground"
        >
          <Sparkles className="w-4 h-4 text-primary" />
          Powered by GydsChain · No Code Required
        </motion.div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-heading font-bold leading-tight mb-6">
          Launch Your Token on{" "}
          <span className="gradient-text">GydsChain</span>{" "}
          in Minutes
        </h1>

        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Create, deploy, and manage custom tokens with a powerful no-code interface.
          Fast deployment, secure wallet transactions, and IPFS metadata — all in one place.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/create" className="btn-gradient rounded-xl text-lg px-8 py-4 flex items-center gap-2 glow-effect">
            Create Token <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/gallery"
            className="glass-card px-8 py-4 rounded-xl text-lg font-medium text-foreground hover:bg-muted/50 transition-all"
          >
            Explore Gallery
          </Link>
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex flex-wrap justify-center gap-8 mt-20"
      >
        {[
          { value: "2,400+", label: "Tokens Created" },
          { value: "12K+", label: "Active Holders" },
          { value: "<30s", label: "Deploy Time" },
          { value: "0.5 GYDS", label: "Creation Fee" },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="text-3xl font-heading font-bold gradient-text">{stat.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
          </div>
        ))}
      </motion.div>
    </div>
  </section>
);
