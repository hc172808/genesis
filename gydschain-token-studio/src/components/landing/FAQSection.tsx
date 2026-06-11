import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from "framer-motion";

const faqs = [
  { q: "What is GydsChain?", a: "GydsChain is a fast, low-cost blockchain optimized for token creation and DeFi applications." },
  { q: "Do I need coding skills?", a: "Not at all. Netlify Coin Tools provides a complete no-code interface for creating and managing tokens." },
  { q: "What wallets are supported?", a: "We support Phantom, Solflare, Backpack, and custom GydsChain-compatible wallets." },
  { q: "How much does it cost?", a: "Token creation costs 0.5 GYDS on Devnet. Mainnet fees may vary." },
  { q: "Is my token metadata permanent?", a: "Yes. All metadata and logos are stored on IPFS for permanent decentralized storage." },
  { q: "Can I manage my token after creation?", a: "Absolutely. You can mint, burn, pause, and transfer ownership from your dashboard." },
];

export const FAQSection = () => (
  <section className="py-24">
    <div className="container mx-auto px-4 max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <h2 className="text-4xl font-heading font-bold mb-4">
          Frequently Asked <span className="gradient-text">Questions</span>
        </h2>
      </motion.div>

      <Accordion type="single" collapsible className="space-y-3">
        {faqs.map((faq, i) => (
          <AccordionItem key={i} value={`faq-${i}`} className="glass-card px-6 border-border/30">
            <AccordionTrigger className="text-left font-medium hover:no-underline py-4">{faq.q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-4">{faq.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </section>
);
