'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Film,
  Tv,
  Tags,
  Globe,
  Mic2,
  Sparkles,
  TrendingUp,
  Users,
  ShieldCheck,
  ReceiptText,
  CreditCard,
  Coins,
  Crown,
  BarChart3,
  LineChart,
  Settings,
  ShieldAlert,
  X,
} from "lucide-react";
import { catalogApi } from "@/lib/api/catalogApi";

interface AdminSidebarProps {
  onCloseMobileMenu?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ onCloseMobileMenu }) => {
  const pathname = usePathname();
  const [counts, setCounts] = useState<{
    movies: number | null;
    categories: number | null;
    countries: number | null;
    djs: number | null;
  }>({
    movies: null,
    categories: null,
    countries: null,
    djs: null,
  });

  useEffect(() => {
    let isMounted = true;
    const fetchCounts = async () => {
      try {
        const [titlesRes, taxRes] = await Promise.all([
          catalogApi.listTitles({ limit: 100 }),
          catalogApi.getTaxonomies(),
        ]);
        if (isMounted) {
          setCounts({
            movies: titlesRes?.items ? titlesRes.items.length : 0,
            categories: taxRes?.categories ? taxRes.categories.length : 0,
            countries: taxRes?.countries ? taxRes.countries.length : 0,
            djs: taxRes?.voiceArtists ? taxRes.voiceArtists.length : 0,
          });
        }
      } catch {
        // Silently preserve clean states without falling back to mock counts
      }
    };
    fetchCounts();
    return () => {
      isMounted = false;
    };
  }, []);

  const navGroups = [
    {
      group: "Overview",
      items: [
        {
          label: "Dashboard",
          href: "/admin",
          icon: LayoutDashboard,
          exact: true,
        },
      ],
    },
    {
      group: "Content",
      items: [
        {
          label: "Movies",
          href: "/admin/movies",
          icon: Film,
          badge: counts.movies !== null ? String(counts.movies) : undefined,
          badgeColor: "bg-[#111318] text-[#F5F5F5] border-[#262932]",
        },
        {
          label: "Series",
          href: "/admin/series",
          icon: Tv,
        },
        {
          label: "Categories",
          href: "/admin/categories",
          icon: Tags,
          badge: counts.categories !== null ? String(counts.categories) : undefined,
          badgeColor: "bg-[#111318] text-[#A6A8B0] border-[#262932]",
        },
        {
          label: "Countries",
          href: "/admin/countries",
          icon: Globe,
          badge: counts.countries !== null ? String(counts.countries) : undefined,
          badgeColor: "bg-[#111318] text-[#A6A8B0] border-[#262932]",
        },
        {
          label: "DJs & Translators",
          href: "/admin/djs",
          icon: Mic2,
          badge: counts.djs !== null ? `${counts.djs} Active` : undefined,
          badgeColor: "bg-[#D6A84F]/15 text-[#D6A84F] border-[#D6A84F]/30",
        },
      ],
    },
    {
      group: "Discovery",
      items: [
        {
          label: "Hero Billboard",
          href: "/admin/featured",
          icon: Sparkles,
        },
        {
          label: "Trending Content",
          href: "/admin/trending",
          icon: TrendingUp,
        },
      ],
    },
    {
      group: "User Management",
      items: [
        {
          label: "Customers",
          href: "/admin/users",
          icon: Users,
        },
        {
          label: "Media Team Staff",
          href: "/admin/media-team",
          icon: ShieldCheck,
        },
      ],
    },
    {
      group: "Commerce",
      items: [
        {
          label: "Orders Feed",
          href: "/admin/orders",
          icon: ReceiptText,
        },
        {
          label: "Payments Ledger",
          href: "/admin/payments",
          icon: CreditCard,
        },
        {
          label: "Pricing (PPV)",
          href: "/admin/pricing",
          icon: Coins,
        },
        {
          label: "Subscriptions",
          href: "/admin/subscriptions",
          icon: Crown,
          badge: "VIP",
          badgeColor: "bg-[#D6A84F]/15 text-[#D6A84F] border-[#D6A84F]/30",
        },
      ],
    },
    {
      group: "Analytics",
      items: [
        {
          label: "Sales Trends",
          href: "/admin/sales",
          icon: BarChart3,
        },
        {
          label: "Content Performance",
          href: "/admin/content-performance",
          icon: LineChart,
        },
      ],
    },
    {
      group: "System",
      items: [
        {
          label: "Audit Trail",
          href: "/admin/audit",
          icon: ShieldAlert,
        },
        {
          label: "Platform Settings",
          href: "/admin/settings",
          icon: Settings,
        },
      ],
    },
  ];

  return (
    <aside className="w-full lg:w-64 shrink-0 border-r border-[#262932] bg-[#08090C] flex flex-col justify-between h-full lg:h-[calc(100vh-57px)] lg:sticky lg:top-[57px] overflow-y-auto scrollbar-thin">
      {/* Mobile Drawer Header with Close Button */}
      {onCloseMobileMenu && (
        <div className="lg:hidden p-4 border-b border-[#262932] flex items-center justify-between bg-[#111318]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black tracking-tight text-white">GIFTEDproMovies</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#D6A84F]/15 text-[#D6A84F] border border-[#D6A84F]/30 font-bold">
              WORKSPACE
            </span>
          </div>
          <button
            type="button"
            onClick={onCloseMobileMenu}
            className="p-1.5 rounded-lg bg-[#181A21] border border-[#262932] text-[#A6A8B0] hover:text-white"
            aria-label="Close navigation menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation list */}
      <div className="p-3.5 space-y-5">
        {navGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            <h5 className="px-2.5 text-[10px] font-mono uppercase tracking-widest text-[#70737C] font-semibold">
              {group.group}
            </h5>

            <div className="space-y-0.5">
              {group.items.map((item, itemIdx) => {
                const Icon = item.icon;
                const isActive =
                  'exact' in item && item.exact
                    ? pathname === item.href
                    : pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/admin");

                return (
                  <Link
                    key={itemIdx}
                    href={item.href}
                    onClick={onCloseMobileMenu}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all group ${
                      isActive
                        ? "bg-[#B11226] text-white shadow-md shadow-[#B11226]/20 font-semibold"
                        : "text-[#A6A8B0] hover:bg-[#111318] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? "text-white" : "text-[#70737C] group-hover:text-[#F5F5F5]"
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {"badge" in item && item.badge && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                          isActive
                            ? "bg-white/20 text-white border-white/30"
                            : item.badgeColor
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Branding Info */}
      <div className="p-3 border-t border-[#262932] bg-[#08090C]/80">
        <div className="p-2.5 rounded-xl bg-[#111318] border border-[#262932]/70 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A6A8B0]">
              GIFTEDproMovies
            </span>
            <span className="text-[9px] font-mono text-[#10B981] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              v3.2
            </span>
          </div>
          <p className="text-[10px] text-[#70737C] leading-tight">
            Commercial Workspace • English (Admin)
          </p>
        </div>
      </div>
    </aside>
  );
};
