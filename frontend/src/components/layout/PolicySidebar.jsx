import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { policyService } from '../../services/domainServices';
import { DEFAULT_POLICIES, getPolicyMeta } from '../../constants/defaultPolicies';
import { Shield, ChevronRight } from 'lucide-react';

export function PolicySidebar() {
  const { pathname } = useLocation();

  const { data: response, isLoading } = useQuery({
    queryKey: ['public-policies'],
    queryFn: () => policyService.getPublicPolicies(),
    staleTime: 5 * 60 * 1000,
  });

  // Merge live policies with default policies fallback
  const livePolicies = response?.data || [];
  const policies =
    livePolicies.length > 0
      ? livePolicies.map((p) => {
          const meta = getPolicyMeta(p.slug, p.title);
          return {
            title: p.title,
            slug: p.slug,
            path: `/policy/${p.slug}`,
            icon: meta.icon,
            badge: meta.badge,
          };
        })
      : DEFAULT_POLICIES.map((p) => {
          const meta = getPolicyMeta(p.slug, p.title);
          return {
            title: p.title,
            slug: p.slug,
            path: `/policy/${p.slug}`,
            icon: meta.icon,
            badge: meta.badge,
          };
        });

  return (
    <aside className="lg:col-span-4 xl:col-span-3.5 space-y-6 sticky top-44 lg:top-48 h-fit hidden lg:block">
      {/* Navigation Card */}
      <div className="bg-[#fdfbf7] border border-[#283618]/12 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 mb-3 border-b border-[#283618]/10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#283618]" />
            <h2 className="font-display font-bold text-xs uppercase tracking-wider text-[#283618]">
              Legal & Help Center
            </h2>
          </div>
        </div>

        <nav className="flex flex-col space-y-1.5" aria-label="Policy Navigation">
          {policies.map((policy) => {
            const isActive = pathname === policy.path;
            const IconComponent = policy.icon || Shield;

            return (
              <Link
                key={policy.path}
                to={policy.path}
                className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-[13px] transition-all duration-200 select-none ${
                  isActive
                    ? 'bg-[#283618] text-white shadow-sm font-semibold'
                    : 'text-[#4b5563] hover:text-[#283618] hover:bg-white/80'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-white/15 text-[#f7bb0e]'
                        : 'bg-white text-[#283618]/70 border border-[#283618]/10 group-hover:text-[#283618] group-hover:border-[#283618]/25'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate">{policy.title}</span>
                </div>

                {isActive ? (
                  <div className="w-1.5 h-1.5 rounded-full bg-[#f7bb0e]" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-stone-300 opacity-0 group-hover:opacity-100 group-hover:text-[#283618]/60 transition-all -translate-x-1 group-hover:translate-x-0" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

export function MobilePolicyNav() {
  const { pathname } = useLocation();
  const { data: response } = useQuery({
    queryKey: ['public-policies'],
    queryFn: () => policyService.getPublicPolicies(),
    staleTime: 5 * 60 * 1000,
  });

  const livePolicies = response?.data || [];
  const policies =
    livePolicies.length > 0
      ? livePolicies.map((p) => {
          const meta = getPolicyMeta(p.slug, p.title);
          return {
            title: meta.shortTitle || p.title,
            fullTitle: p.title,
            slug: p.slug,
            path: `/policy/${p.slug}`,
            icon: meta.icon,
          };
        })
      : DEFAULT_POLICIES.map((p) => {
          const meta = getPolicyMeta(p.slug, p.title);
          return {
            title: meta.shortTitle || p.title,
            fullTitle: p.title,
            slug: p.slug,
            path: `/policy/${p.slug}`,
            icon: meta.icon,
          };
        });

  return (
    <div className="lg:hidden mb-8 policy-mobile-nav">
      <div className="flex items-center gap-1.5 mb-2.5 px-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[#283618]" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#283618]">
          Select Policy
        </span>
      </div>

      <div className="relative">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-1 -mx-1 scroll-smooth">
          {policies.map((policy) => {
            const isActive = pathname === policy.path;
            const IconComponent = policy.icon || Shield;

            return (
              <Link
                key={policy.path}
                to={policy.path}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0 ${
                  isActive
                    ? 'bg-[#283618] text-white shadow-sm ring-2 ring-[#283618]/20'
                    : 'bg-[#fdfbf7] text-[#4b5563] border border-[#283618]/10 hover:border-[#283618]/30 hover:bg-white'
                }`}
              >
                <IconComponent
                  className={`w-3.5 h-3.5 ${isActive ? 'text-[#f7bb0e]' : 'text-[#283618]/70'}`}
                />
                <span>{policy.title}</span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#f7bb0e]" />}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
