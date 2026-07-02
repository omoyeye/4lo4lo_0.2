import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SEO from "@/components/SEO";
import {
  Coins,
  Users,
  Gift,
  Star,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Shield,
  Zap,
  Heart,
  Trophy,
  Target,
  Sparkles,
  Play,
  Instagram,
  Twitter,
  Youtube,
  Facebook,
  GraduationCap,
  QrCode,
  Link2
} from "lucide-react";
import { SiTiktok, SiTelegram } from "react-icons/si";

const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const floatingAnimation = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const pulseAnimation = {
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 overflow-hidden">
      <SEO 
        title="4LO4LO Earn Points, Free QR Code Generator & URL Shortener"
        description="4LO4LO is a global community for creators and influencers to earn money completing social tasks, explore the Marketplace, learn from the Classroom, generate free QR codes, shorten links, and grow together."
      />
      {/* Floating Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          className="absolute top-20 left-10 w-72 h-72 bg-purple-300/30 rounded-full blur-3xl"
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div 
          className="absolute top-40 right-20 w-96 h-96 bg-pink-300/20 rounded-full blur-3xl"
          animate={{ x: [0, -40, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-20 left-1/3 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"
          animate={{ x: [0, 20, 0], y: [0, -30, 0] }}
          transition={{ duration: 12, repeat: Infinity }}
        />
      </div>
      {/* Navigation */}
      <nav className="relative z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <img 
              src="/4lo4lo-logo.png" 
              alt="4LO4LO Logo" 
              className="w-10 h-10 rounded-xl object-contain"
            />
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              4LO4LO
            </span>
          </motion.div>
          
          <motion.div 
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Link href="/auth">
              <Button variant="ghost" className="hidden sm:flex" data-testid="nav-login-btn">
                Login
              </Button>
            </Link>
            <Link href="/auth">
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/25" data-testid="nav-join-btn">
                Join Now
              </Button>
            </Link>
          </motion.div>
        </div>
      </nav>
      {/* Hero Section */}
      <section className="relative z-10 px-6 pt-12 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.div 
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/50 rounded-full text-purple-700 dark:text-purple-300 text-sm font-medium mb-6"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Sparkles className="w-4 h-4" />
                <span>Join thousands of users earning daily</span>
              </motion.div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                <span className="text-gray-900 dark:text-white">A Global </span>
                <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
                  Planned Community
                </span>
                <br />
                <span className="text-gray-900 dark:text-white">for </span>
                <span className="bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
                  Creators & Influencers
                </span>
              </h1>
              
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-xl text-balance">
                Where content creators come for knowledge, friendship, and a community that pushes each other to grow and make money together.
                Complete social tasks, learn from the Classroom, refer friends, and cash out, all in one place.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <Link href="/auth">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      size="lg" 
                      className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg px-8 py-6 shadow-xl shadow-purple-500/30"
                      data-testid="hero-join-btn"
                    >
                      Start Earning Now
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </motion.div>
                </Link>
                <Link href="/auth">
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="w-full sm:w-auto text-lg px-8 py-6 border-2 border-purple-300 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/30"
                    data-testid="hero-login-btn"
                  >
                    I Have an Account
                  </Button>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap gap-6 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>Free to Join</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-500" />
                  <span>Secure & Safe</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <span>Instant Payouts</span>
                </div>
              </div>
            </motion.div>

            {/* Hero Right — Free Creator Tools */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-col gap-5"
            >
              <div className="mb-1">
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 dark:bg-purple-900/50 rounded-full text-purple-700 dark:text-purple-300 text-xs font-medium">
                  <Sparkles className="w-3 h-3" /> Free No Login Needed
                </span>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  Free <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Creator Tools</span>
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Generate QR codes and shorten links instantly, built for creators.
                </p>
              </div>

              {[
                {
                  icon: QrCode,
                  title: "QR Code Generator",
                  description: "Turn any URL or text into a downloadable QR code. Email capture included.",
                  color: "from-purple-500 to-pink-500",
                  bgColor: "bg-purple-50 dark:bg-purple-900/20",
                  href: "/free-tools#qr",
                },
                {
                  icon: Link2,
                  title: "URL Shortener",
                  description: "Shorten any long link into a clean, shareable short URL instantly.",
                  color: "from-blue-500 to-cyan-500",
                  bgColor: "bg-blue-50 dark:bg-blue-900/20",
                  href: "/free-tools#shortener",
                },
              ].map((tool, i) => (
                <motion.div
                  key={tool.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 + i * 0.15 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                >
                  <Link href={tool.href}>
                    <Card className={`${tool.bgColor} border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer`}>
                      <CardContent className="p-5 flex items-start gap-4">
                        <div className={`w-11 h-11 bg-gradient-to-br ${tool.color} rounded-2xl flex items-center justify-center shadow-md shrink-0`}>
                          <tool.icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-0.5">{tool.title}</h3>
                          <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">{tool.description}</p>
                          <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400 text-sm font-medium">
                            Try it free <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>
      {/* Social Platforms */}
      <section className="relative z-10 py-12 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <motion.p 
            className="text-center text-gray-500 dark:text-gray-400 mb-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Complete tasks on all major platforms
          </motion.p>
          <motion.div 
            className="flex flex-wrap justify-center items-center gap-8 md:gap-16"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              { icon: Instagram, color: "from-pink-500 to-purple-500", name: "Instagram" },
              { icon: Twitter, color: "from-blue-400 to-blue-600", name: "Twitter" },
              { icon: Youtube, color: "from-red-500 to-red-600", name: "YouTube" },
              { icon: Facebook, color: "from-blue-600 to-blue-700", name: "Facebook" },
              { icon: SiTiktok, color: "from-gray-800 to-gray-900", name: "TikTok" },
              { icon: SiTelegram, color: "from-blue-400 to-cyan-500", name: "Telegram" },
            ].map((platform, index) => (
              <motion.div
                key={platform.name}
                className="flex flex-col items-center gap-2"
                variants={fadeInUp}
                whileHover={{ scale: 1.1, y: -5 }}
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${platform.color} rounded-2xl flex items-center justify-center shadow-lg`}>
                  <platform.icon className="w-7 h-7 text-white" />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">{platform.name}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
      {/* Benefits Section */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">4LO4LO?</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Join thousands of users who are already turning their social media time into real income
            </p>
          </motion.div>

          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              {
                icon: Coins,
                title: "Earn Real Money",
                description: "Convert your points to cash and withdraw to your bank account or mobile wallet. No minimum earning required to start.",
                color: "from-yellow-400 to-orange-500",
                bgColor: "bg-orange-50 dark:bg-orange-900/20"
              },
              {
                icon: Target,
                title: "Simple Tasks",
                description: "Follow accounts, like posts, share content, and watch videos. Tasks take just seconds to complete.",
                color: "from-blue-400 to-blue-600",
                bgColor: "bg-blue-50 dark:bg-blue-900/20"
              },
              {
                icon: Users,
                title: "Referral Bonuses",
                description: "Invite friends and earn bonus points for every person who joins through your unique referral link.",
                color: "from-purple-500 to-pink-500",
                bgColor: "bg-purple-50 dark:bg-purple-900/20"
              },
              {
                icon: Trophy,
                title: "Level Up & Earn More",
                description: "Complete tasks to level up and unlock higher-paying opportunities. The more you do, the more you earn.",
                color: "from-green-400 to-emerald-600",
                bgColor: "bg-green-50 dark:bg-green-900/20"
              },
              {
                icon: GraduationCap,
                title: "Learn & Earn",
                description: "The 4LO4LO Classroom has free video lessons to sharpen your creator skills. Watch videos and earn bonus points.",
                color: "from-violet-500 to-purple-600",
                bgColor: "bg-violet-50 dark:bg-violet-900/20"
              },
              {
                icon: Shield,
                title: "Safe & Secure",
                description: "Your data is protected with industry-standard encryption. We never share your personal information.",
                color: "from-cyan-400 to-blue-500",
                bgColor: "bg-cyan-50 dark:bg-cyan-900/20"
              },
            ].map((benefit, index) => (
              <motion.div
                key={benefit.title}
                variants={fadeInUp}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
              >
                <Card className={`h-full ${benefit.bgColor} border-0 shadow-lg hover:shadow-xl transition-shadow`}>
                  <CardContent className="p-6">
                    <div className={`w-14 h-14 bg-gradient-to-br ${benefit.color} rounded-2xl flex items-center justify-center mb-4 shadow-lg`}>
                      <benefit.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{benefit.title}</h3>
                    <p className="text-gray-600 dark:text-gray-300">{benefit.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
      {/* How It Works */}
      <section className="relative z-10 py-24 px-6 bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-lg text-purple-100 max-w-2xl mx-auto">
              Start earning in just 3 simple steps
            </p>
          </motion.div>

          <motion.div 
            className="grid md:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              {
                step: "01",
                title: "Create Account",
                description: "Sign up for free in seconds. No credit card required, just your email and you're in.",
                icon: Users
              },
              {
                step: "02",
                title: "Complete Tasks & Learn",
                description: "Do social media tasks across all platforms, and watch Classroom videos to sharpen your skills and earn bonus points.",
                icon: GraduationCap
              },
              {
                step: "03",
                title: "Get Paid",
                description: "Refer friends, accumulate points, and withdraw your earnings. Fast and hassle-free payouts.",
                icon: Gift
              }
            ].map((step, index) => (
              <motion.div
                key={step.step}
                variants={fadeInUp}
                className="relative"
              >
                <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 hover:bg-white/20 transition-colors">
                  <div className="text-6xl font-bold text-white/20 mb-4">{step.step}</div>
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                    <step.icon className="w-7 h-7 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-purple-100">{step.description}</p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="w-8 h-8 text-white/40" />
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
      {/* Stats Section */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              { value: "50K+", label: "Active Users", color: "text-purple-600" },
              { value: "$100K+", label: "Paid Out", color: "text-green-600" },
              { value: "500K+", label: "Tasks Completed", color: "text-pink-600" },
              { value: "4.9/5", label: "User Rating", color: "text-orange-600" }
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                variants={fadeInUp}
                className="text-center"
              >
                <motion.div 
                  className={`text-4xl sm:text-5xl font-bold ${stat.color} mb-2`}
                  {...pulseAnimation}
                >
                  {stat.value}
                </motion.div>
                <div className="text-gray-600 dark:text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
      {/* Final CTA */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div 
            className="bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600 rounded-3xl p-8 sm:p-12 text-center shadow-2xl"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <Heart className="w-16 h-16 text-white/80 mx-auto mb-6" />
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Ready to Start Earning?
              </h2>
              <p className="text-lg text-purple-100 mb-8 max-w-xl mx-auto">
                Join 4LO4LO today and turn your scrolling time into real income. 
                It's free to join and takes less than a minute to get started.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      size="lg" 
                      className="w-full sm:w-auto bg-white text-purple-700 hover:bg-gray-100 text-lg px-8 py-6 shadow-xl"
                      data-testid="cta-join-btn"
                    >
                      <Sparkles className="mr-2 w-5 h-5" />
                      Join Now - It's Free!
                    </Button>
                  </motion.div>
                </Link>
                <Link href="/auth">
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="w-full sm:w-auto text-lg px-8 py-6 border-2 border-white/30 text-white hover:bg-white/10"
                    data-testid="cta-login-btn"
                  >
                    Already a Member? Login
                  </Button>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
      {/* Footer */}
      <footer className="relative z-10 py-12 px-6 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <img 
                src="/4lo4lo-logo.png" 
                alt="4LO4LO Logo" 
                className="w-8 h-8 rounded-lg object-contain"
              />
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                4LO4LO
              </span>
            </div>
            
            <div className="flex flex-wrap gap-6 text-sm text-gray-600 dark:text-gray-400">
              <Link href="/terms" className="hover:text-purple-600 transition-colors">Terms of Service</Link>
              <Link href="/privacy" className="hover:text-purple-600 transition-colors">Privacy Policy</Link>
              <Link href="/free-tools" className="hover:text-purple-600 transition-colors">Free Tools</Link>
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-400">
              © {new Date().getFullYear()} 4LO4LO. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
