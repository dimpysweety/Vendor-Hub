/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserRole } from "../types.ts";
import { LogOut, ShoppingCart, User as UserIcon, Store, Shield, ShoppingBag } from "lucide-react";

interface NavbarProps {
  user: { id: number; email: string; role: UserRole; fullName: string };
  currentTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  cartCount: number;
  onOpenCart: () => void;
}

export function Navbar({ user, currentTab, onTabChange, onLogout, cartCount, onOpenCart }: NavbarProps) {
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "admin":
        return (
          <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-800 border border-purple-200 px-2.5 py-1 rounded-full font-bold">
            <Shield className="h-3 w-3" /> System Admin
          </span>
        );
      case "vendor":
        return (
          <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full font-bold">
            <Store className="h-3 w-3" /> Vendor Partner
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-xs bg-teal-100 text-teal-800 border border-teal-200 px-2.5 py-1 rounded-full font-bold">
            <ShoppingBag className="h-3 w-3" /> Customer
          </span>
        );
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 font-sans shadow-md">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-teal-500 to-emerald-400 p-2 rounded-xl text-slate-900 shadow">
            <ShoppingBag className="h-6 w-6 font-extrabold" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">Enterprise Shop</h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-wide">POSTGRESQL + JWT ENGINE</p>
          </div>
        </div>

        {/* Tab Controls */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            id="nav-store-btn"
            onClick={() => onTabChange("store")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              currentTab === "store" ? "bg-slate-800 text-teal-400 font-bold" : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            Marketplace
          </button>

          {user.role === "vendor" && (
            <button
              id="nav-vendor-btn"
              onClick={() => onTabChange("vendor")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                currentTab === "vendor" ? "bg-slate-800 text-amber-400 font-bold" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              Vendor Studio
            </button>
          )}

          {user.role === "admin" && (
            <button
              id="nav-admin-btn"
              onClick={() => onTabChange("admin")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                currentTab === "admin" ? "bg-slate-800 text-purple-400 font-bold" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              Admin Panel
            </button>
          )}

          <button
            id="nav-profile-btn"
            onClick={() => onTabChange("profile")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              currentTab === "profile" ? "bg-slate-800 text-teal-400 font-bold" : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            My Settings
          </button>
        </nav>

        {/* User Badge, Cart and Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs text-slate-300 font-medium">{user.fullName}</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {getRoleBadge(user.role)}
            </div>
          </div>

          {/* Cart Icon (only for Customer / Admin) */}
          {user.role !== "vendor" && (
            <button
              id="cart-float-btn"
              onClick={onOpenCart}
              className="relative p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full text-[10px] w-5 h-5 flex items-center justify-center font-bold font-mono shadow-md">
                  {cartCount}
                </span>
              )}
            </button>
          )}

          <button
            id="nav-logout-btn"
            onClick={onLogout}
            className="p-2 text-rose-400 hover:text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition-all cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Mobile nav indicator bar */}
      <div className="flex md:hidden bg-slate-950 px-4 py-2 border-t border-slate-800 justify-around text-xs">
        <button
          onClick={() => onTabChange("store")}
          className={`font-semibold py-1 px-2.5 rounded ${currentTab === "store" ? "text-teal-400 bg-slate-850" : "text-slate-400"}`}
        >
          Market
        </button>
        {user.role === "vendor" && (
          <button
            onClick={() => onTabChange("vendor")}
            className={`font-semibold py-1 px-2.5 rounded ${currentTab === "vendor" ? "text-amber-400 bg-slate-850" : "text-slate-400"}`}
          >
            Vendor Panel
          </button>
        )}
        {user.role === "admin" && (
          <button
            onClick={() => onTabChange("admin")}
            className={`font-semibold py-1 px-2.5 rounded ${currentTab === "admin" ? "text-purple-400 bg-slate-850" : "text-slate-400"}`}
          >
            Admin Panel
          </button>
        )}
        <button
          onClick={() => onTabChange("profile")}
          className={`font-semibold py-1 px-2.5 rounded ${currentTab === "profile" ? "text-teal-400 bg-slate-850" : "text-slate-400"}`}
        >
          Settings
        </button>
      </div>
    </header>
  );
}
