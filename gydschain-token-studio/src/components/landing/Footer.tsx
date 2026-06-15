import { Zap } from "lucide-react";

export const Footer = () => (
  <footer className="border-t border-border/30 py-12">
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center btn-gradient p-0">
            <Zap className="w-4 h-4" />
          </div>
          <span className="font-heading font-bold gradient-text">Netlify Coin Tools</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors">Terms</a>
          <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
          <a href="#" className="hover:text-foreground transition-colors">Docs</a>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Twitter</a>
          <a href="https://t.me" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Telegram</a>
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground mt-8">
        © 2026 NetlifyGY. Netlify Coin Tools is not affiliated with Netlify Inc. Use at your own risk.
      </p>
    </div>
  </footer>
);
