import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import {
  QrCode,
  Link2,
  Copy,
  Download,
  CheckCircle2,
  ExternalLink,
  Zap,
  Shield,
  Sparkles,
  ArrowRight,
  Mail,
  Menu,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { AdPlacement } from "@shared/schema";

function AdSlot({ position }: { position: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: ads } = useQuery<AdPlacement[]>({
    queryKey: ["/api/tools/ads"],
  });

  const slot = ads?.find((a) => a.position === position || a.position === "all");

  const rehydrateScripts = useCallback((container: HTMLDivElement) => {
    Array.from(container.querySelectorAll("script")).forEach((oldScript) => {
      const newScript = document.createElement("script");
      Array.from(oldScript.attributes).forEach((attr) =>
        newScript.setAttribute(attr.name, attr.value)
      );
      if (oldScript.textContent) newScript.textContent = oldScript.textContent;
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });
  }, []);

  useEffect(() => {
    if (!slot?.adCode || !containerRef.current) return;
    containerRef.current.innerHTML = slot.adCode;
    rehydrateScripts(containerRef.current);
  }, [slot?.adCode, rehydrateScripts]);

  if (!slot) return null;

  return <div ref={containerRef} className="ad-slot overflow-hidden" />;
}

function Trophy({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="8 17 12 21 16 17" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" />
    </svg>
  );
}

export default function FreeTools() {
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // QR code state
  const [qrValue, setQrValue] = useState("");
  const [qrReady, setQrReady] = useState(false);
  const [qrEmail, setQrEmail] = useState("");
  const [qrEmailSubmitted, setQrEmailSubmitted] = useState(false);
  const [qrEmailLoading, setQrEmailLoading] = useState(false);

  // URL shortener state
  const [longUrl, setLongUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [shortening, setShortening] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleQrGenerate = () => {
    if (!qrValue.trim()) {
      toast({ title: "Enter a URL or text first", variant: "destructive" });
      return;
    }
    setQrReady(true);
    setQrEmailSubmitted(false);
  };

  const handleQrDownload = async () => {
    if (!qrEmail.trim() || !qrEmail.includes("@")) {
      toast({ title: "Please enter a valid email", variant: "destructive" });
      return;
    }
    setQrEmailLoading(true);
    try {
      const res = await fetch("/api/tools/qr-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: qrEmail, originalUrl: qrValue }),
      });
      if (!res.ok) throw new Error("Failed to save lead");
      setQrEmailSubmitted(true);
      const canvas = document.querySelector<HTMLCanvasElement>("#qr-canvas canvas");
      if (canvas) {
        const link = document.createElement("a");
        link.download = "qrcode.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
        toast({ title: "QR code downloaded!" });
      }
    } catch {
      toast({ title: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setQrEmailLoading(false);
    }
  };

  const handleShorten = async () => {
    if (!longUrl.trim()) {
      toast({ title: "Enter a URL first", variant: "destructive" });
      return;
    }
    setShortening(true);
    try {
      const res = await fetch("/api/tools/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalUrl: longUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      setShortUrl(data.shortUrl);
      toast({ title: "Short link created!" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to shorten URL";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setShortening(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard!" });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <SEO
        title="Free Tools: QR Code Generator & URL Shortener | 4LO4LO"
        description="Free creator tools from 4LO4LO: generate QR codes for any URL and shorten long links instantly. No login required. Join to earn points."
        keywords="qr code generator, url shortener, free qr code, free link shortener, 4lo4lo tools"
        url="/free-tools"
      />

      {/* Standalone Nav */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-purple-600 dark:text-purple-400">
            <img src="/4lo4lo-logo.png" alt="4LO4LO" className="w-8 h-8 rounded-lg" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            4LO4LO
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-3">
            <Link href="/auth">
              <Button variant="ghost" size="sm">Log In</Button>
            </Link>
            <Link href="/auth">
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                Join Free
              </Button>
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button className="sm:hidden p-2" onClick={() => setMobileMenuOpen((o) => !o)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 flex flex-col gap-2">
            <Link href="/auth">
              <Button variant="ghost" className="w-full justify-start">Log In</Button>
            </Link>
            <Link href="/auth">
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">Join Free</Button>
            </Link>
          </div>
        )}
      </header>

      {/* Top Ad */}
      <div className="max-w-6xl mx-auto w-full px-4 mt-4">
        <AdSlot position="top" />
      </div>

      {/* Hero */}
      <section className="px-6 pt-10 pb-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/50 rounded-full text-purple-700 dark:text-purple-300 text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            <span>100% Free No Login Required</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            Free Creator <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Tools</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-xl mx-auto">
            Generate QR codes and shorten links instantly. Built for creators and influencers by 4LO4LO.
          </p>
        </motion.div>
      </section>

      {/* Main content */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 pb-16">
        <div className="grid lg:grid-cols-4 gap-8">

          {/* Left Ad + Join CTA */}
          <div className="hidden lg:block lg:col-span-1 space-y-4">
            <AdSlot position="left" />
            <Card className="bg-gradient-to-br from-purple-600 to-pink-600 border-0 text-white">
              <CardContent className="p-6 text-center">
                <Trophy className="w-10 h-10 mx-auto mb-3 opacity-80" />
                <h3 className="font-bold text-lg mb-2">Earn While You Create</h3>
                <p className="text-purple-100 text-sm mb-4">
                  Join 4LO4LO to complete tasks, earn points, and get paid.
                </p>
                <Link href="/auth">
                  <Button className="w-full bg-white text-purple-700 hover:bg-gray-100 font-semibold">
                    Join Free <ArrowRight className="ml-1 w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Main Tools */}
          <div className="lg:col-span-2 space-y-8">
            {/* Middle Ad */}
            <AdSlot position="middle" />

            {/* QR Code Generator */}
            <motion.div
              id="qr"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="shadow-lg border-0 bg-white dark:bg-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                      <QrCode className="w-5 h-5 text-white" />
                    </div>
                    QR Code Generator
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Generate a QR code for any URL, text, or contact info.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter URL or text..."
                      value={qrValue}
                      onChange={(e) => { setQrValue(e.target.value); setQrReady(false); }}
                    />
                    <Button
                      onClick={handleQrGenerate}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shrink-0"
                    >
                      <Zap className="w-4 h-4 mr-1" /> Generate
                    </Button>
                  </div>

                  {qrReady && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-4"
                    >
                      <div id="qr-canvas" className="flex justify-center p-4 bg-white rounded-xl border">
                        <QRCodeCanvas
                          value={qrValue}
                          size={200}
                          level="H"
                          includeMargin
                          imageSettings={{
                            src: "/4lo4lo-logo.png",
                            width: 36,
                            height: 36,
                            excavate: true,
                          }}
                        />
                      </div>

                      {!qrEmailSubmitted ? (
                        <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-4 space-y-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-purple-800 dark:text-purple-200">
                            <Mail className="w-4 h-4" />
                            Enter your email to download the PNG
                          </div>
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            value={qrEmail}
                            onChange={(e) => setQrEmail(e.target.value)}
                            className="bg-white dark:bg-gray-700"
                          />
                          <Button
                            onClick={handleQrDownload}
                            disabled={qrEmailLoading}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            {qrEmailLoading ? "Saving..." : "Download QR Code (PNG)"}
                          </Button>
                          <p className="text-xs text-muted-foreground">
                            We respect your privacy. No spam, ever.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300 font-medium">
                            <CheckCircle2 className="w-4 h-4" />
                            Downloaded successfully!
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleQrDownload}
                            disabled={qrEmailLoading}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Again
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* URL Shortener */}
            <motion.div
              id="shortener"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="shadow-lg border-0 bg-white dark:bg-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                      <Link2 className="w-5 h-5 text-white" />
                    </div>
                    URL Shortener
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Turn any long link into a clean, shareable short URL.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://your-long-url.com/..."
                      value={longUrl}
                      onChange={(e) => { setLongUrl(e.target.value); setShortUrl(""); }}
                    />
                    <Button
                      onClick={handleShorten}
                      disabled={shortening}
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shrink-0"
                    >
                      {shortening ? "..." : <><Zap className="w-4 h-4 mr-1" />Shorten</>}
                    </Button>
                  </div>

                  {shortUrl && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium text-blue-800 dark:text-blue-200">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Your short link is ready!
                      </div>
                      <div className="flex items-center gap-2 bg-white dark:bg-gray-700 rounded-lg border px-3 py-2">
                        <span className="flex-1 text-sm font-mono text-gray-800 dark:text-gray-200 truncate">
                          {shortUrl}
                        </span>
                        <Button size="sm" variant="ghost" onClick={handleCopy} className="shrink-0 h-7">
                          {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                        <a href={shortUrl} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="ghost" className="shrink-0 h-7">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </a>
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-6 text-sm text-gray-500 dark:text-gray-400 justify-center">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500" />
                <span>Privacy Focused</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span>Instant Results</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-500" />
                <span>No Login Required</span>
              </div>
            </div>
          </div>

          {/* Right Ad */}
          <div className="hidden lg:block lg:col-span-1 space-y-4">
            <AdSlot position="right" />
          </div>
        </div>

        {/* Bottom Ad */}
        <div className="mt-8">
          <AdSlot position="bottom" />
        </div>

        {/* Bio Link / Linktree Section */}
        <div className="mt-12 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-200 dark:border-purple-800 rounded-2xl p-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-14 h-14 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center mx-auto mb-4">
              <Link2 className="w-7 h-7 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Your Free Bio Link Page Like Linktree
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
              Every 4LO4LO account comes with a <strong>free public profile page</strong> you can use as your social media bio link.
              Add any links you want: your YouTube, Instagram, website, store, or anything else, and share one link everywhere.
            </p>
            <div className="bg-white dark:bg-gray-900 border rounded-xl p-4 mb-6 text-left space-y-3">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">How to set it up:</p>
              <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs flex items-center justify-center font-bold flex-shrink-0">1</span>Sign in and go to <strong>My Profile</strong> in the menu</li>
                <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs flex items-center justify-center font-bold flex-shrink-0">2</span>Click <strong>Add Link</strong> to add your URLs (YouTube, Instagram, website, etc.)</li>
                <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs flex items-center justify-center font-bold flex-shrink-0">3</span>Copy your profile link, it looks like <code className="bg-muted px-1 rounded text-xs">4lo4lo.site/profile/yourname</code></li>
                <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs flex items-center justify-center font-bold flex-shrink-0">4</span>Paste it in your <strong>Instagram bio, TikTok bio, Twitter/X bio, or YouTube About</strong></li>
              </ol>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/auth">
                <Button className="bg-purple-600 hover:bg-purple-700 text-white gap-2 px-6">
                  Create Your Free Profile <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/auth">
                <Button variant="outline" className="gap-2 px-6">
                  Sign In to Manage Links
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile CTA */}
        <div className="mt-10 lg:hidden">
          <Card className="bg-gradient-to-br from-purple-600 to-pink-600 border-0 text-white">
            <CardContent className="p-6 text-center">
              <h3 className="font-bold text-xl mb-2">Want to earn money online?</h3>
              <p className="text-purple-100 mb-4">
                Join 4LO4LO, complete social tasks, earn points, and cash out.
              </p>
              <Link href="/auth">
                <Button className="bg-white text-purple-700 hover:bg-gray-100 font-semibold px-8">
                  Join Free <ArrowRight className="ml-1 w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Standalone Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500 dark:text-gray-400">
          <Link href="/" className="font-bold text-purple-600 dark:text-purple-400">
            4LO4LO
          </Link>
          <div className="flex flex-wrap gap-6 justify-center">
            <Link href="/terms" className="hover:text-purple-600 transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-purple-600 transition-colors">Privacy Policy</Link>
            <Link href="/free-tools" className="hover:text-purple-600 transition-colors">Free Tools</Link>
            <Link href="/auth" className="hover:text-purple-600 transition-colors">Join Free</Link>
          </div>
          <p>© {new Date().getFullYear()} 4LO4LO.</p>
        </div>
      </footer>
    </div>
  );
}
