import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Hexagon,
  Sword,
  Flame,
  Trophy,
  Brain,
  Star,
  ArrowRight,
  ChevronDown,
  Target,
  TrendingUp,
  Shield,
  Sparkles,
  Menu,
  X,
  Github,
  Twitter,
  type LucideIcon,
} from 'lucide-react';
import { mockTestimonials, mockFeatures, mockLeaderboard, RANKS } from '@/data/mockData';
import { cn } from '@/lib/utils';

export default function Landing() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, -50]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top, behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <motion.button
              onClick={() => scrollToSection('hero')}
              className="flex items-center gap-3"
              whileHover={{ scale: 1.02 }}
            >
              <div className="relative">
                <Hexagon className="w-7 h-7 text-blue-500" />
                <div className="absolute inset-0 w-7 h-7 bg-blue-500/20 blur-lg rounded-full" />
              </div>
              <div>
                <span className="text-sm font-bold tracking-[0.15em]">SOLO</span>
                <span className="text-[10px] font-semibold tracking-[0.25em] text-blue-400 block -mt-0.5">LEVELING</span>
              </div>
            </motion.button>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {['Features', 'How It Works', 'Rankings', 'Testimonials'].map((item) => (
                <motion.button
                  key={item}
                  onClick={() => scrollToSection(item.toLowerCase().replace(/\s+/g, '-'))}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                  whileHover={{ y: -1 }}
                >
                  {item}
                </motion.button>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              <motion.button
                onClick={() => navigate('/login')}
                className="text-sm text-gray-400 hover:text-white transition-colors px-4 py-2"
                whileHover={{ scale: 1.02 }}
              >
                Sign In
              </motion.button>
              <motion.button
                onClick={() => navigate('/onboarding')}
                className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-xl transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Get Started
              </motion.button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-400"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <motion.div
          initial={false}
          animate={{ height: mobileMenuOpen ? 'auto' : 0 }}
          className="md:hidden overflow-hidden border-t border-white/5"
        >
          <div className="px-4 py-4 space-y-3">
            {['Features', 'How It Works', 'Rankings', 'Testimonials'].map((item) => (
              <button
                key={item}
                onClick={() => scrollToSection(item.toLowerCase().replace(/\s+/g, '-'))}
                className="block w-full text-left text-sm text-gray-400 hover:text-white py-2"
              >
                {item}
              </button>
            ))}
            <div className="pt-3 border-t border-white/5 space-y-2">
              <button
                onClick={() => navigate('/login')}
                className="block w-full text-left text-sm text-gray-400 py-2"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/onboarding')}
                className="block w-full text-sm bg-blue-500 text-white py-2.5 rounded-xl text-center"
              >
                Get Started
              </button>
            </div>
          </div>
        </motion.div>
      </nav>

      {/* Hero Section */}
      <motion.section
        id="hero"
        style={{ opacity: heroOpacity, y: heroY }}
        className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden"
      >
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[150px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[150px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/5 rounded-full blur-[200px]" />
        </div>

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-blue-400">The System has awakened</span>
            </motion.div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black mb-6 leading-tight">
              Level Up Your{' '}
              <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">Real Life</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Transform your daily routines into epic quests. Track habits, earn XP, climb the ranks, 
              and become the strongest version of yourself.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.button
                onClick={() => navigate('/onboarding')}
                className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium text-lg hover:opacity-90 transition-opacity"
                whileHover={{ scale: 1.03, boxShadow: '0 0 40px rgba(59,130,246,0.3)' }}
                whileTap={{ scale: 0.97 }}
              >
                Start Your Journey
                <ArrowRight className="w-5 h-5" />
              </motion.button>
              <motion.button
                onClick={() => scrollToSection('features')}
                className="flex items-center gap-2 px-8 py-4 bg-white/5 border border-white/10 text-white rounded-xl font-medium text-lg hover:bg-white/10 transition-colors"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Learn More
              </motion.button>
            </div>
          </motion.div>

          {/* Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6"
          >
            {[
              { value: '50K+', label: 'Active Hunters' },
              { value: '2M+', label: 'Quests Completed' },
              { value: '99%', label: 'Habit Success' },
              { value: '4.9', label: 'App Rating' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="w-6 h-6 text-gray-600" />
        </motion.div>
      </motion.section>

      {/* Features Section */}
      <section id="features" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">System Features</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Everything you need to transform your life into an RPG experience
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockFeatures.map((feature, index) => (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="glass-card rounded-2xl p-6 glass-card-hover group"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${feature.color}15` }}
                >
                  <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Four simple steps to begin your leveling journey
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {([
              { step: '01', title: 'Set Goals', description: 'Define what you want to achieve in different areas of your life', icon: Target, color: '#3b82f6' },
              { step: '02', title: 'Complete Quests', description: 'Turn daily tasks into quests with XP rewards and difficulty ratings', icon: Sword, color: '#8b5cf6' },
              { step: '03', title: 'Build Habits', description: 'Track streaks and maintain consistency with visual heatmaps', icon: Flame, color: '#f59e0b' },
              { step: '04', title: 'Level Up', description: 'Earn XP, climb ranks from E to S, and unlock achievements', icon: Trophy, color: '#10b981' },
            ] as { step: string; title: string; description: string; icon: LucideIcon; color: string }[]).map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="text-center"
              >
                <div className="relative inline-block mb-6">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                    style={{ backgroundColor: `${item.color}15`, border: `1px solid ${item.color}20` }}
                  >
                    <item.icon className="w-7 h-7" style={{ color: item.color }} />
                  </div>
                  <span
                    className="absolute -top-2 -right-2 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: item.color, color: '#fff' }}
                  >
                    {item.step}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Coach Showcase */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute top-1/2 left-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[200px] -translate-y-1/2" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
                <Brain className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-purple-400">AI Shadow Monarch</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Your Personal <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">AI Coach</span>
              </h2>
              <p className="text-gray-400 mb-8 leading-relaxed">
                Our AI analyzes your patterns, identifies optimal quest times, suggests habits based on your goals, 
                and provides personalized insights to accelerate your growth.
              </p>

              <div className="space-y-4">
                {([
                  { icon: Sparkles, text: 'Smart quest suggestions based on your schedule', color: '#8b5cf6' },
                  { icon: TrendingUp, text: 'Predictive streak analysis and risk warnings', color: '#3b82f6' },
                  { icon: Target, text: 'Adaptive difficulty that grows with you', color: '#06b6d4' },
                  { icon: Shield, text: 'Personalized recovery plans when you fall behind', color: '#10b981' },
                ] as { icon: LucideIcon; text: string; color: string }[]).map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${item.color}15` }}
                    >
                      <item.icon className="w-4 h-4" style={{ color: item.color }} />
                    </div>
                    <span className="text-sm text-gray-300">{item.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="glass-card rounded-3xl p-6 relative">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">AI Insight</p>
                    <p className="text-xs text-gray-500">Just now</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
                    <p className="text-sm text-gray-300 italic">
                      "Your consistency in morning workouts has improved your discipline score by 12% this week. 
                      Consider adding a stretching quest to optimize recovery."
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium text-white">Optimal Quest Time</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Based on your patterns, you perform best on coding challenges between 6-8 PM.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Flame className="w-4 h-4 text-orange-400" />
                      <span className="text-sm font-medium text-white">Streak Alert</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Your meditation streak expires in 4 hours. Take 10 minutes now!
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Rankings Showcase */}
      <section id="rankings" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Climb the Ranks</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Progress from E-Rank novice to S-Rank legend. Every quest completed brings you closer to the top.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
            {Object.entries(RANKS).map(([rank, info], index) => (
              <motion.div
                key={rank}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="text-center"
              >
                <motion.div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{
                    backgroundColor: `${info.color}15`,
                    border: `2px solid ${info.color}30`,
                  }}
                  whileHover={{ scale: 1.1, boxShadow: `0 0 30px ${info.color}20` }}
                >
                  <span
                    className="text-2xl font-black"
                    style={{ color: info.color }}
                  >
                    {rank}
                  </span>
                </motion.div>
                <p className="text-xs text-gray-400">{info.label}</p>
                <p className="text-[10px] text-gray-600">Lv.{info.minLevel}+</p>
              </motion.div>
            ))}
          </div>

          {/* Leaderboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card rounded-2xl p-6 max-w-2xl mx-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Global Leaderboard
              </h3>
              <span className="text-xs text-gray-500">Top Hunters</span>
            </div>

            <div className="space-y-3">
              {mockLeaderboard.slice(0, 5).map((entry, index) => {
                const entryRankInfo = RANKS[entry.rank];
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.08 }}
                    className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] hover:bg-white/5 transition-colors"
                  >
                    <span className={cn(
                      'text-sm font-bold w-6 text-center',
                      index === 0 ? 'text-yellow-400' :
                      index === 1 ? 'text-gray-300' :
                      index === 2 ? 'text-amber-600' : 'text-gray-600'
                    )}>
                      {index + 1}
                    </span>
                    <img src={entry.avatar} alt={entry.name} className="w-9 h-9 rounded-full object-cover" />
                    <div className="flex-1">
                      <p className="text-sm text-white">{entry.name}</p>
                    </div>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded"
                      style={{ backgroundColor: `${entryRankInfo.color}20`, color: entryRankInfo.color }}
                    >
                      {entry.rank}
                    </span>
                    <span className="text-sm text-gray-400">Lv.{entry.level}</span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 relative">
        <div className="absolute bottom-0 left-1/2 w-[800px] h-[400px] bg-blue-500/5 rounded-full blur-[200px] -translate-x-1/2" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Hunter Testimonials</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              See what fellow hunters are saying about their transformation
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {mockTestimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="glass-card rounded-2xl p-6 glass-card-hover"
              >
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-300 leading-relaxed mb-6">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center gap-3">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm font-medium text-white">{testimonial.name}</p>
                    <p className="text-xs text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card rounded-3xl p-12 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-transparent" />
            <div className="relative z-10">
              <motion.div
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 mb-6"
                animate={{ boxShadow: ['0 0 0px rgba(59,130,246,0.0)', '0 0 40px rgba(59,130,246,0.2)', '0 0 0px rgba(59,130,246,0.0)'] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Hexagon className="w-8 h-8 text-blue-400" />
              </motion.div>

              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Ready to <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">Level Up</span>?
              </h2>
              <p className="text-gray-400 max-w-lg mx-auto mb-8">
                Join thousands of hunters who have transformed their lives. 
                The System is waiting for you.
              </p>

              <motion.button
                onClick={() => navigate('/onboarding')}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium text-lg hover:opacity-90 transition-opacity"
                whileHover={{ scale: 1.03, boxShadow: '0 0 50px rgba(59,130,246,0.4)' }}
                whileTap={{ scale: 0.97 }}
              >
                Begin Your Journey
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Hexagon className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-bold tracking-wider">SOLO LEVELING</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Transform your life into an epic RPG experience. Level up every day.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-white mb-3">Product</h4>
              <ul className="space-y-2">
                {['Features', 'Pricing', 'Changelog', 'Roadmap'].map((item) => (
                  <li key={item}>
                    <button className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-white mb-3">Community</h4>
              <ul className="space-y-2">
                {['Discord', 'Leaderboard', 'Challenges', 'Blog'].map((item) => (
                  <li key={item}>
                    <button className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-white mb-3">Support</h4>
              <ul className="space-y-2">
                {['Help Center', 'Contact', 'Privacy', 'Terms'].map((item) => (
                  <li key={item}>
                    <button className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/5">
            <p className="text-xs text-gray-700">
              2026 Solo Leveling. All rights reserved.
            </p>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <button className="text-gray-600 hover:text-gray-400 transition-colors">
                <Github className="w-4 h-4" />
              </button>
              <button className="text-gray-600 hover:text-gray-400 transition-colors">
                <Twitter className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
