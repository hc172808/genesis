import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Code, Eye, Save, ArrowLeft, Download, Upload, Undo2, Redo2, Palette, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useParams, useNavigate } from "react-router-dom";
import { WalletConfirmDialog } from "@/components/WalletConfirmDialog";
import { uploadToIPFS, generateWebsiteTemplate } from "@/lib/hostingService";
import { WebsiteTemplateGallery, WEBSITE_TEMPLATES } from "@/components/WebsiteTemplateGallery";

interface SiteEditorProps {
  wallet: { address: string | null; balance: string; isConnected: boolean };
  onConnectWallet: () => void;
}

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Site</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: linear-gradient(135deg, #0a0a0f, #1a1a2e);
      color: #e0e0e0; min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
    }
    .container { text-align: center; padding: 2rem; max-width: 600px; }
    h1 { font-size: 2.5rem; background: linear-gradient(135deg, #00d4ff, #7b2ff7);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 1rem; }
    p { color: #888; line-height: 1.6; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Welcome to My Site</h1>
    <p>Edit this HTML to build your decentralized website.</p>
  </div>
</body>
</html>`;

const DEFAULT_CSS = `/* Add custom CSS here — it will be injected into your HTML */
body {
  font-family: 'Segoe UI', system-ui, sans-serif;
}

h1 {
  font-size: 2.5rem;
}`;

const SiteEditorPage = ({ wallet, onConnectWallet }: SiteEditorProps) => {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [htmlCode, setHtmlCode] = useState(DEFAULT_HTML);
  const [cssCode, setCssCode] = useState(DEFAULT_CSS);
  const [activeTab, setActiveTab] = useState<"html" | "css">("html");
  const [viewMode, setViewMode] = useState<"split" | "code" | "preview">("split");
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);

  useEffect(() => {
    if (siteId && siteId !== "new") {
      const template = generateWebsiteTemplate(
        `Site ${siteId.slice(0, 8)}`,
        wallet.address || "0x0000"
      );
      setHtmlCode(template);
      setHistory([template]);
      setHistoryIndex(0);
    } else {
      setHistory([DEFAULT_HTML]);
      setHistoryIndex(0);
    }
  }, [siteId, wallet.address]);

  const getPreviewContent = useCallback(() => {
    if (!cssCode.trim()) return htmlCode;
    const styleTag = `<style>${cssCode}</style>`;
    if (htmlCode.includes("</head>")) {
      return htmlCode.replace("</head>", `${styleTag}\n</head>`);
    }
    return `${styleTag}\n${htmlCode}`;
  }, [htmlCode, cssCode]);

  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(getPreviewContent());
        doc.close();
      }
    }
  }, [getPreviewContent]);

  const pushHistory = (code: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(code);
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleHtmlChange = (value: string) => {
    setHtmlCode(value);
    pushHistory(value);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setHtmlCode(history[newIndex]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setHtmlCode(history[newIndex]);
    }
  };

  const handleSave = () => {
    if (!wallet.isConnected) { onConnectWallet(); return; }
    setShowSaveConfirm(true);
  };

  const confirmSave = async () => {
    setShowSaveConfirm(false);
    setIsSaving(true);
    try {
      const content = getPreviewContent();
      const cid = await uploadToIPFS(content, "index.html");
      toast.success("Website saved to IPFS!", {
        description: `New CID: ${cid.slice(0, 20)}...`,
      });
    } catch {
      toast.error("Failed to save website");
    }
    setIsSaving(false);
  };

  const handleDownload = () => {
    const content = getPreviewContent();
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "index.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadHtml = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".html,.htm";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const { scanFile } = await import("@/lib/virusScanner");
      const scan = await scanFile(file, { category: "html" });
      if (!scan.safe) {
        toast.error(`Upload blocked: ${scan.threats.join("; ")}`);
        return;
      }
      if (scan.warnings.length) toast.warning(scan.warnings.join("; "));
      const text = await file.text();
      setHtmlCode(text);
      pushHistory(text);
      toast.success(`Loaded ${file.name}`);
    };
    input.click();
  };

  const handleSelectTemplate = (html: string) => {
    setHtmlCode(html);
    pushHistory(html);
    setShowTemplateGallery(false);
    toast.success("Template applied!");
  };

  const insertTemplate = (type: string) => {
    const templates: Record<string, string> = {
      hero: `
    <section style="padding:4rem 2rem;text-align:center;background:linear-gradient(135deg,#0a0a1a,#1a1a3e);">
      <h1 style="font-size:3rem;background:linear-gradient(135deg,#00d4ff,#7b2ff7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Your Title Here</h1>
      <p style="color:#888;margin-top:1rem;max-width:500px;margin-inline:auto;">Your subtitle goes here.</p>
      <button style="margin-top:2rem;padding:0.75rem 2rem;background:linear-gradient(135deg,#00d4ff,#7b2ff7);border:none;border-radius:8px;color:white;font-size:1rem;cursor:pointer;">Get Started</button>
    </section>`,
      cards: `
    <section style="padding:3rem 2rem;display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1.5rem;max-width:900px;margin:auto;">
      <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:2rem;">
        <h3 style="color:#00d4ff;">Feature 1</h3><p style="color:#888;margin-top:0.5rem;">Description</p>
      </div>
      <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:2rem;">
        <h3 style="color:#00d4ff;">Feature 2</h3><p style="color:#888;margin-top:0.5rem;">Description</p>
      </div>
      <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:2rem;">
        <h3 style="color:#00d4ff;">Feature 3</h3><p style="color:#888;margin-top:0.5rem;">Description</p>
      </div>
    </section>`,
      footer: `
    <footer style="padding:2rem;text-align:center;border-top:1px solid rgba(255,255,255,0.1);color:#666;font-size:0.85rem;">
      <p>&copy; 2026 Your Name. Powered by GydsChain.</p>
    </footer>`,
    };
    if (templates[type]) {
      const insertion = templates[type];
      const newHtml = htmlCode.includes("</body>")
        ? htmlCode.replace("</body>", `${insertion}\n</body>`)
        : htmlCode + insertion;
      setHtmlCode(newHtml);
      pushHistory(newHtml);
      toast.success(`${type} template inserted`);
    }
  };

  if (!wallet.isConnected) {
    return (
      <div className="min-h-screen bg-background pt-24 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-10 text-center max-w-md">
          <Code className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-heading font-bold mb-3">Website Editor</h2>
          <p className="text-muted-foreground mb-6">Connect your wallet to edit your website.</p>
          <Button onClick={onConnectWallet} className="btn-gradient">Connect Wallet</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-16 flex flex-col">
      {/* Toolbar */}
      <div className="border-b border-border/30 bg-card/50 backdrop-blur-sm px-4 py-2 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/hosting")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-heading font-semibold hidden sm:inline">
            {siteId === "new" ? "New Site" : `Editing: ${siteId?.slice(0, 8)}...`}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={undo} disabled={historyIndex <= 0} title="Undo">
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo">
            <Redo2 className="w-4 h-4" />
          </Button>
          <div className="w-px h-5 bg-border/30 mx-1" />
          <Button variant="ghost" size="sm" onClick={() => setShowTemplateGallery(true)} title="Template Gallery">
            <LayoutTemplate className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleUploadHtml} title="Upload HTML">
            <Upload className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownload} title="Download">
            <Download className="w-4 h-4" />
          </Button>
          <div className="w-px h-5 bg-border/30 mx-1" />
          <Button
            variant={viewMode === "code" ? "secondary" : "ghost"} size="sm"
            onClick={() => setViewMode("code")}
          >
            <Code className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "split" ? "secondary" : "ghost"} size="sm"
            onClick={() => setViewMode("split")}
          >
            <span className="text-xs">Split</span>
          </Button>
          <Button
            variant={viewMode === "preview" ? "secondary" : "ghost"} size="sm"
            onClick={() => setViewMode("preview")}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <div className="w-px h-5 bg-border/30 mx-1" />
          <Button size="sm" className="btn-gradient" onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-1" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Template Snippets */}
      <div className="border-b border-border/20 bg-card/30 px-4 py-1.5 flex items-center gap-2 overflow-x-auto">
        <Palette className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-xs text-muted-foreground flex-shrink-0">Insert:</span>
        {["hero", "cards", "footer"].map((t) => (
          <Button key={t} variant="outline" size="sm" className="text-xs h-6 px-2 capitalize" onClick={() => insertTemplate(t)}>
            {t}
          </Button>
        ))}
      </div>

      {/* Editor + Preview */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {viewMode !== "preview" && (
          <div className={`${viewMode === "split" ? "md:w-1/2" : "w-full"} flex flex-col border-r border-border/20`}>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "html" | "css")} className="flex flex-col flex-1">
              <TabsList className="w-full justify-start rounded-none bg-muted/20 h-8">
                <TabsTrigger value="html" className="text-xs h-7">index.html</TabsTrigger>
                <TabsTrigger value="css" className="text-xs h-7">style.css</TabsTrigger>
              </TabsList>
              <TabsContent value="html" className="flex-1 m-0">
                <textarea
                  value={htmlCode}
                  onChange={(e) => handleHtmlChange(e.target.value)}
                  className="w-full h-full min-h-[300px] bg-[hsl(var(--background))] text-foreground font-mono text-sm p-4 resize-none focus:outline-none border-none"
                  spellCheck={false}
                  placeholder="Write your HTML here..."
                />
              </TabsContent>
              <TabsContent value="css" className="flex-1 m-0">
                <textarea
                  value={cssCode}
                  onChange={(e) => setCssCode(e.target.value)}
                  className="w-full h-full min-h-[300px] bg-[hsl(var(--background))] text-foreground font-mono text-sm p-4 resize-none focus:outline-none border-none"
                  spellCheck={false}
                  placeholder="Write custom CSS here..."
                />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {viewMode !== "code" && (
          <div className={`${viewMode === "split" ? "md:w-1/2" : "w-full"} flex flex-col`}>
            <div className="h-8 bg-muted/20 flex items-center px-3 text-xs text-muted-foreground">
              <Eye className="w-3 h-3 mr-1.5" /> Live Preview
            </div>
            <iframe
              ref={iframeRef}
              className="flex-1 w-full min-h-[300px] bg-white"
              sandbox="allow-scripts"
              title="Site Preview"
            />
          </div>
        )}
      </div>

      {/* Template Gallery Dialog */}
      <Dialog open={showTemplateGallery} onOpenChange={setShowTemplateGallery}>
        <DialogContent className="glass-card-strong border-border/50 max-w-lg p-0 overflow-hidden">
          <div className="p-6 pb-3">
            <DialogHeader>
              <DialogTitle className="text-lg font-heading font-bold flex items-center gap-2">
                <LayoutTemplate className="w-5 h-5 text-primary" />
                Template Gallery
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="px-6 pb-6">
            <WebsiteTemplateGallery
              onSelectTemplate={handleSelectTemplate}
              onUploadHtml={() => { setShowTemplateGallery(false); handleUploadHtml(); }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <WalletConfirmDialog
        open={showSaveConfirm}
        onOpenChange={setShowSaveConfirm}
        title="Save Website Changes"
        description="Saving deploys updated content to IPFS and updates your site's CID."
        details={[
          { label: "Action", value: "Update Website" },
          { label: "Content Size", value: `${(new TextEncoder().encode(getPreviewContent()).length / 1024).toFixed(1)} KB` },
          { label: "Storage", value: "IPFS (Decentralized)" },
        ]}
        fee="0.1 GYDS"
        onConfirm={confirmSave}
      />
    </div>
  );
};

export default SiteEditorPage;
