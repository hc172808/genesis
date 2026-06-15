import { useRef } from "react";
import { motion } from "framer-motion";
import { TOKEN_CATEGORIES, type TokenCategory } from "@/lib/token-categories";

interface CategoryTabsProps {
  active: TokenCategory;
  onChange: (cat: TokenCategory) => void;
}

const CategoryTabs = ({ active, onChange }: CategoryTabsProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4"
    >
      {TOKEN_CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
            active === cat.id
              ? "text-primary-foreground"
              : "bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          {active === cat.id && (
            <motion.div
              layoutId="cat-pill"
              className="absolute inset-0 gradient-primary rounded-xl"
              transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            />
          )}
          <span className="relative z-10">{cat.icon}</span>
          <span className="relative z-10">{cat.label}</span>
        </button>
      ))}
    </div>
  );
};

export default CategoryTabs;
