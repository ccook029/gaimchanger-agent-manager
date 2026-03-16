import Link from 'next/link';
import { getAllAgentConfigs } from '@/agents';
import { GaimchangerLogoStacked } from '@/components/gaimchanger-logo';

const leadership = [
  {
    name: 'Chris Cook',
    role: 'Co-Founder',
    initials: 'CC',
    color: '#e4002b',
  },
  {
    name: 'Steve Bennedetti',
    role: 'Co-Founder',
    initials: 'SB',
    color: '#1a3a5c',
  },
];

const departmentColors: Record<string, string> = {
  'Business Intelligence': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Operations: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Finance: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Marketing: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Strategy: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

export default function HomePage() {
  const agents = getAllAgentConfigs();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#B5A36B]/8 via-[#B5A36B]/3 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#B5A36B]/5 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex justify-center mb-10">
              <GaimchangerLogoStacked height={160} />
            </div>
            <p className="text-[#B5A36B] text-lg font-medium tracking-widest uppercase mb-6">Corporate Headquarters</p>
            <p className="text-lg text-neutral-400 leading-relaxed">
              The team behind Gaimchanger Golf. Each department is powered by an AI agent
              that works autonomously — delivering analytics, monitoring inventory,
              tracking competitors, and growing the brand.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-[#B5A36B] hover:bg-[#C9BA88] text-black font-semibold rounded-lg transition-colors"
              >
                Operations Dashboard
              </Link>
              <a
                href="https://gaimchangergolf.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 border border-neutral-700 hover:border-[#B5A36B]/50 text-neutral-300 hover:text-white rounded-lg transition-all"
              >
                Visit Store
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Leadership */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-white mb-8">Leadership</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
          {leadership.map((leader) => (
            <div
              key={leader.name}
              className="flex items-center gap-4 p-5 bg-neutral-900/50 border border-neutral-800 rounded-xl"
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                style={{ backgroundColor: leader.color }}
              >
                {leader.initials}
              </div>
              <div>
                <h3 className="font-semibold text-white text-lg">{leader.name}</h3>
                <p className="text-neutral-400 text-sm">{leader.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* AI Agent Team */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-white mb-2">AI Agent Team</h2>
        <p className="text-neutral-400 mb-8">
          5 autonomous AI agents running your golf business operations.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <Link
              key={agent.id}
              href={`/dashboard/${agent.id}`}
              className="group block p-6 bg-neutral-900/50 border border-neutral-800 rounded-xl hover:border-[#B5A36B]/50 hover:bg-neutral-900 transition-all"
            >
              <div className="flex items-start gap-4 mb-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ backgroundColor: agent.avatar.color }}
                >
                  {agent.avatar.initials}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-white group-hover:text-[#B5A36B] transition-colors">
                    {agent.name}
                  </h3>
                  <p className="text-neutral-400 text-sm">{agent.title}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    departmentColors[agent.department] || 'bg-neutral-800 text-neutral-400 border-neutral-700'
                  }`}
                >
                  {agent.department}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    agent.status === 'active'
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : 'bg-neutral-800 text-neutral-500 border border-neutral-700'
                  }`}
                >
                  {agent.status === 'active' ? '● Active' : '○ Standby'}
                </span>
              </div>

              <p className="text-neutral-500 text-sm leading-relaxed mb-4">
                {agent.bio}
              </p>

              <div className="flex items-center gap-2 text-xs text-neutral-600">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {agent.schedule}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick Links */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-white mb-8">Quick Links</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
          <Link
            href="/dashboard"
            className="flex items-center gap-4 p-5 bg-neutral-900/50 border border-neutral-800 rounded-xl hover:border-[#B5A36B]/50 transition-all group"
          >
            <div className="w-10 h-10 bg-[#B5A36B]/10 border border-[#B5A36B]/20 rounded-lg flex items-center justify-center text-[#B5A36B]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white group-hover:text-[#B5A36B] transition-colors">
                Operations Dashboard
              </h3>
              <p className="text-sm text-neutral-500">Monitor all agents and run reports</p>
            </div>
          </Link>

          <div className="flex items-center gap-4 p-5 bg-neutral-900/50 border border-neutral-800 rounded-xl">
            <div className="w-10 h-10 bg-[#B5A36B]/10 border border-[#B5A36B]/20 rounded-lg flex items-center justify-center text-[#B5A36B]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white">API Access</h3>
              <p className="text-sm text-neutral-500">
                POST /api/agents/run or /api/[agent]/run
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between text-sm text-neutral-500">
            <span>Gaimchanger Golf — Corporate HQ</span>
            <span>Powered by Anthropic Claude</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
