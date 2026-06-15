import { motion } from "framer-motion";
import { Globe, Layout, FileText, Briefcase, Sparkles, Upload, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface WebsiteTemplate {
  id: string;
  name: string;
  category: string;
  icon: React.ReactNode;
  preview: string;
  html: string;
}

const generateTokenSiteHtml = (tokenName: string, tokenSymbol: string, description: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${tokenName} - Official Site</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',system-ui,sans-serif;background:#0a0a12;color:#e0e0e0;min-height:100vh}
    .hero{padding:6rem 2rem;text-align:center;background:linear-gradient(180deg,#0f0f1a 0%,#1a1035 100%)}
    .hero h1{font-size:3.5rem;background:linear-gradient(135deg,#00d4ff,#7b2ff7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:1rem}
    .hero .symbol{font-size:1.2rem;color:#7b2ff7;font-weight:700;letter-spacing:2px;margin-bottom:1.5rem}
    .hero p{color:#888;max-width:500px;margin:0 auto 2rem;line-height:1.7}
    .btn{padding:.75rem 2rem;background:linear-gradient(135deg,#00d4ff,#7b2ff7);border:none;border-radius:8px;color:#fff;font-size:1rem;cursor:pointer;text-decoration:none;display:inline-block}
    .features{padding:4rem 2rem;display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1.5rem;max-width:900px;margin:0 auto}
    .card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:2rem}
    .card h3{color:#00d4ff;margin-bottom:.5rem}
    .card p{color:#777;font-size:.9rem;line-height:1.5}
    .stats{display:flex;justify-content:center;gap:3rem;padding:3rem 2rem;flex-wrap:wrap}
    .stat{text-align:center}
    .stat .val{font-size:2rem;font-weight:700;background:linear-gradient(135deg,#00d4ff,#7b2ff7);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
    .stat .lbl{color:#666;font-size:.85rem;margin-top:.25rem}
    footer{text-align:center;padding:2rem;border-top:1px solid rgba(255,255,255,.06);color:#555;font-size:.8rem}
  </style>
</head>
<body>
  <section class="hero">
    <p class="symbol">$${tokenSymbol}</p>
    <h1>${tokenName}</h1>
    <p>${description || "The next generation decentralized token on GydsChain."}</p>
    <a class="btn" href="#">Buy $${tokenSymbol}</a>
  </section>
  <div class="stats">
    <div class="stat"><div class="val">1B</div><div class="lbl">Total Supply</div></div>
    <div class="stat"><div class="val">0%</div><div class="lbl">Buy Tax</div></div>
    <div class="stat"><div class="val">GPL</div><div class="lbl">Standard</div></div>
  </div>
  <section class="features">
    <div class="card"><h3>🔒 Secure</h3><p>Built on GydsChain with GPL token standard and full authority model.</p></div>
    <div class="card"><h3>⚡ Fast</h3><p>Near-instant transactions with minimal gas fees on GydsChain.</p></div>
    <div class="card"><h3>🌐 Decentralized</h3><p>Community-driven governance with transparent on-chain operations.</p></div>
  </section>
  <footer>&copy; 2026 ${tokenName}. Powered by GydsChain.</footer>
</body>
</html>`;

export const WEBSITE_TEMPLATES: WebsiteTemplate[] = [
  {
    id: "token-landing",
    name: "Token Landing Page",
    category: "Token",
    icon: <Sparkles className="w-5 h-5" />,
    preview: "Professional token launch page with hero, stats, and features",
    html: generateTokenSiteHtml("My Token", "MTK", ""),
  },
  {
    id: "portfolio",
    name: "Portfolio",
    category: "Personal",
    icon: <Briefcase className="w-5 h-5" />,
    preview: "Clean personal portfolio with about, projects, and contact",
    html: `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Portfolio</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',system-ui,sans-serif;background:#0a0a12;color:#e0e0e0;min-height:100vh}
nav{display:flex;justify-content:space-between;align-items:center;padding:1.5rem 2rem;border-bottom:1px solid rgba(255,255,255,.06)}
nav .logo{font-size:1.2rem;font-weight:700;background:linear-gradient(135deg,#00d4ff,#7b2ff7);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
nav a{color:#888;text-decoration:none;margin-left:1.5rem;font-size:.9rem}nav a:hover{color:#00d4ff}
.hero{padding:6rem 2rem;text-align:center}
.hero h1{font-size:3rem;margin-bottom:1rem}
.hero h1 span{background:linear-gradient(135deg,#00d4ff,#7b2ff7);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hero p{color:#888;max-width:500px;margin:0 auto 2rem;line-height:1.7}
.projects{padding:4rem 2rem;max-width:900px;margin:0 auto}
.projects h2{font-size:1.8rem;margin-bottom:2rem;text-align:center}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1.5rem}
.project{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:2rem}
.project h3{color:#00d4ff;margin-bottom:.5rem}.project p{color:#777;font-size:.9rem}
footer{text-align:center;padding:2rem;border-top:1px solid rgba(255,255,255,.06);color:#555;font-size:.8rem}
</style></head><body>
<nav><div class="logo">Your Name</div><div><a href="#">About</a><a href="#">Projects</a><a href="#">Contact</a></div></nav>
<section class="hero"><h1>Hi, I'm <span>Your Name</span></h1><p>Web3 developer & designer building the decentralized future on GydsChain.</p></section>
<section class="projects"><h2>Projects</h2><div class="grid">
<div class="project"><h3>Project One</h3><p>A decentralized application built on GydsChain.</p></div>
<div class="project"><h3>Project Two</h3><p>Smart contract toolkit for GPL token management.</p></div>
<div class="project"><h3>Project Three</h3><p>Community governance platform with on-chain voting.</p></div>
</div></section>
<footer>&copy; 2026 Your Name. Built on GydsChain.</footer>
</body></html>`,
  },
  {
    id: "blog",
    name: "Blog",
    category: "Content",
    icon: <FileText className="w-5 h-5" />,
    preview: "Minimalist blog layout with posts list and reading area",
    html: `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Blog</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',system-ui,sans-serif;background:#0a0a12;color:#e0e0e0;min-height:100vh}
header{padding:2rem;text-align:center;border-bottom:1px solid rgba(255,255,255,.06)}
header h1{font-size:2rem;background:linear-gradient(135deg,#00d4ff,#7b2ff7);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
header p{color:#666;margin-top:.5rem}
.posts{max-width:700px;margin:0 auto;padding:2rem}
.post{padding:2rem 0;border-bottom:1px solid rgba(255,255,255,.06)}
.post .date{color:#555;font-size:.8rem;margin-bottom:.5rem}
.post h2{font-size:1.4rem;margin-bottom:.75rem;color:#e0e0e0}
.post h2:hover{color:#00d4ff;cursor:pointer}
.post p{color:#888;line-height:1.7;font-size:.95rem}
.tag{display:inline-block;padding:.2rem .6rem;background:rgba(0,212,255,.1);color:#00d4ff;border-radius:4px;font-size:.75rem;margin-top:.75rem;margin-right:.5rem}
footer{text-align:center;padding:2rem;color:#555;font-size:.8rem}
</style></head><body>
<header><h1>My Blog</h1><p>Thoughts on Web3, GydsChain, and decentralization</p></header>
<div class="posts">
<article class="post"><div class="date">April 5, 2026</div><h2>Getting Started with GPL Tokens</h2><p>Learn how to create and manage GPL-standard tokens on GydsChain with the full authority model...</p><span class="tag">Tutorial</span><span class="tag">GPL</span></article>
<article class="post"><div class="date">March 28, 2026</div><h2>Understanding Token Authorities</h2><p>A deep dive into mint, freeze, burn, and update authorities in the GPL token standard...</p><span class="tag">Deep Dive</span><span class="tag">Security</span></article>
<article class="post"><div class="date">March 15, 2026</div><h2>Why Decentralized Hosting Matters</h2><p>Exploring the benefits of hosting your website on IPFS through GydsChain...</p><span class="tag">Opinion</span><span class="tag">IPFS</span></article>
</div>
<footer>&copy; 2026 My Blog. Hosted on GydsChain.</footer>
</body></html>`,
  },
  {
    id: "landing",
    name: "Landing Page",
    category: "Business",
    icon: <Layout className="w-5 h-5" />,
    preview: "Conversion-focused landing page with CTA sections",
    html: `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Landing Page</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',system-ui,sans-serif;background:#0a0a12;color:#e0e0e0;min-height:100vh}
nav{display:flex;justify-content:space-between;align-items:center;padding:1.5rem 2rem}
nav .logo{font-size:1.3rem;font-weight:700;color:#00d4ff}
.btn{padding:.6rem 1.5rem;background:linear-gradient(135deg,#00d4ff,#7b2ff7);border:none;border-radius:8px;color:#fff;font-size:.9rem;cursor:pointer;text-decoration:none}
.btn-outline{background:transparent;border:1px solid rgba(255,255,255,.2);color:#e0e0e0}
.hero{padding:6rem 2rem;text-align:center;background:linear-gradient(180deg,#0a0a12,#151530)}
.hero h1{font-size:3rem;margin-bottom:1rem;line-height:1.2}
.hero h1 span{background:linear-gradient(135deg,#00d4ff,#7b2ff7);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hero p{color:#888;max-width:550px;margin:0 auto 2rem;line-height:1.7}
.hero .btns{display:flex;gap:1rem;justify-content:center}
.features{padding:5rem 2rem;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:2rem;max-width:1000px;margin:0 auto}
.feat{text-align:center;padding:2rem}.feat .ico{font-size:2.5rem;margin-bottom:1rem}
.feat h3{margin-bottom:.5rem;font-size:1.1rem}.feat p{color:#777;font-size:.9rem;line-height:1.5}
.cta{padding:5rem 2rem;text-align:center;background:linear-gradient(180deg,#151530,#0a0a12)}
.cta h2{font-size:2.2rem;margin-bottom:1rem}.cta h2 span{background:linear-gradient(135deg,#00d4ff,#7b2ff7);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.cta p{color:#888;margin-bottom:2rem;max-width:450px;margin-left:auto;margin-right:auto}
footer{text-align:center;padding:2rem;border-top:1px solid rgba(255,255,255,.06);color:#555;font-size:.8rem}
</style></head><body>
<nav><div class="logo">YourBrand</div><a class="btn" href="#">Get Started</a></nav>
<section class="hero">
<h1>Build the Future<br>with <span>GydsChain</span></h1>
<p>Launch your decentralized project with enterprise-grade infrastructure and community-first tools.</p>
<div class="btns"><a class="btn" href="#">Start Building</a><a class="btn btn-outline" href="#">Learn More</a></div>
</section>
<section class="features">
<div class="feat"><div class="ico">🚀</div><h3>Lightning Fast</h3><p>Sub-second finality with minimal transaction costs.</p></div>
<div class="feat"><div class="ico">🔐</div><h3>Enterprise Security</h3><p>GPL token standard with granular authority controls.</p></div>
<div class="feat"><div class="ico">🌍</div><h3>Global Scale</h3><p>Decentralized infrastructure serving millions worldwide.</p></div>
<div class="feat"><div class="ico">🤝</div><h3>Community First</h3><p>On-chain governance and transparent decision making.</p></div>
</section>
<section class="cta"><h2>Ready to <span>Get Started</span>?</h2><p>Join thousands of builders creating the decentralized future.</p><a class="btn" href="#">Launch Now</a></section>
<footer>&copy; 2026 YourBrand. Powered by GydsChain.</footer>
</body></html>`,
  },
];

export const generateTokenWebsite = (name: string, symbol: string, description: string): string => {
  return generateTokenSiteHtml(name, symbol, description);
};

interface WebsiteTemplateGalleryProps {
  onSelectTemplate: (html: string) => void;
  onUploadHtml: () => void;
  selectedTemplateId?: string | null;
  tokenName?: string;
  tokenSymbol?: string;
  tokenDescription?: string;
}

export const WebsiteTemplateGallery = ({
  onSelectTemplate,
  onUploadHtml,
  selectedTemplateId,
  tokenName,
  tokenSymbol,
  tokenDescription,
}: WebsiteTemplateGalleryProps) => {
  const templates = WEBSITE_TEMPLATES.map((t) => {
    if (t.id === "token-landing" && tokenName) {
      return { ...t, html: generateTokenSiteHtml(tokenName, tokenSymbol || "TKN", tokenDescription || "") };
    }
    return t;
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {templates.map((template, i) => {
          const isSelected = selectedTemplateId === template.id;
          return (
            <motion.button
              key={template.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onSelectTemplate(template.id === "token-landing" ? template.html : template.html)}
              className={`text-left p-4 rounded-xl border transition-all ${
                isSelected
                  ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                  : "border-border/50 bg-muted/30 hover:border-primary/40 hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground"}`}>
                  {template.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm flex items-center gap-1.5">
                    {template.name}
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                  </p>
                  <p className="text-[0.65rem] text-muted-foreground">{template.category}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{template.preview}</p>
            </motion.button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border/30" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="flex-1 h-px bg-border/30" />
      </div>

      <Button variant="outline" onClick={onUploadHtml} className="w-full border-dashed border-border/50 gap-2">
        <Upload className="w-4 h-4" /> Upload Your Own HTML File
      </Button>
    </div>
  );
};
