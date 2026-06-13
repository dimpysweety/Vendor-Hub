/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { requestApi, removeToken } from "./lib/api.ts";
import { UserRole, Product } from "./types.ts";
import { AuthScreen } from "./components/AuthScreen.tsx";
import { Navbar } from "./components/Navbar.tsx";
import { ProductCatalog } from "./components/ProductCatalog.tsx";
import { CartDrawer } from "./components/CartDrawer.tsx";
import { VendorDashboard } from "./components/VendorDashboard.tsx";
import { ProfilePanel } from "./components/ProfilePanel.tsx";
import { AdminDashboard } from "./components/AdminDashboard.tsx";
import { Sparkles, Shield, AlertTriangle, RefreshCw } from "lucide-react";

interface UserSession {
  id: number;
  email: string;
  role: UserRole;
  fullName: string;
}

export default function App() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [booting, setBooting] = useState(true);
  const [currentTab, setCurrentTab] = useState<string>("store");
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [sqlLogs, setSqlLogs] = useState<string[]>([]);

  // Authenticate current session on boot and register unauthorized triggers
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await requestApi<UserSession>("/api/auth/me");
        setUser(res);
        // Default vendors straight to Vendor Studio
        if (res.role === "vendor") {
          setCurrentTab("vendor");
        } else {
          setCurrentTab("store");
        }
      } catch (err) {
        console.log("[App Boot] No active verified session found");
        removeToken();
        setUser(null);
      } finally {
        setBooting(false);
      }
    };
    checkSession();

    const handleUnauthorized = () => {
      console.log("[Session expired] Logging out...");
      handleLogout();
    };

    window.addEventListener("unauthorized-session", handleUnauthorized);
    return () => {
      window.removeEventListener("unauthorized-session", handleUnauthorized);
    };
  }, []);

  const handleAuthSuccess = (session: UserSession) => {
    setUser(session);
    if (session.role === "vendor") {
      setCurrentTab("vendor");
    } else {
      setCurrentTab("store");
    }
  };

  const handleLogout = () => {
    removeToken();
    setUser(null);
    setCart([]);
    setCartOpen(false);
  };

  // --- CART MANAGEMENT ---
  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === product.id);
      if (idx > -1) {
        const item = prev[idx];
        const newQty = item.quantity + 1;
        if (newQty > product.inventory) {
          alert(`Cannot purchase more than available inventory (${product.inventory} units in stock)`);
          return prev;
        }
        const updated = [...prev];
        updated[idx] = { ...item, quantity: newQty };
        return updated;
      } else {
        return [...prev, { product, quantity: 1 }];
      }
    });
    setCartOpen(true);
  };

  const handleUpdateQuantity = (productId: number, qty: number) => {
    if (qty <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === productId);
      if (idx > -1) {
        const item = prev[idx];
        if (qty > item.product.inventory) {
          alert(`Only ${item.product.inventory} units are available in database inventory`);
          return prev;
        }
        const updated = [...prev];
        updated[idx] = { ...item, quantity: qty };
        return updated;
      }
      return prev;
    });
  };

  const handleRemoveItem = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const cartTotalCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  if (booting) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center font-sans">
        <div className="space-y-4 text-center">
          <div className="h-10 w-10 border-4 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-teal-400 text-xs font-bold font-mono tracking-widest uppercase">Initializing PostgreSQL pool connections...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans text-slate-800">
      
      {/* Navigation Headers */}
      <Navbar
        user={user}
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onLogout={handleLogout}
        cartCount={cartTotalCount}
        onOpenCart={() => setCartOpen(true)}
      />

      {/* Main Sandbox Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        
        {/* Administrator Quick Controls Panel (If role === admin) */}
        {user.role === "admin" && (
          <div id="admin-telemetry-panel" className="mb-8 p-5 bg-purple-50 border border-purple-200 rounded-3xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-purple-950 flex items-center gap-1.5 font-mono">
                <Shield className="h-4 w-4 text-purple-700 animate-pulse" /> System Admin Control Hub
              </h3>
              <span className="text-[10px] bg-purple-600 text-white font-bold font-mono px-2 py-0.5 rounded">
                Superuser Active
              </span>
            </div>
            
            <p className="text-xs text-purple-900 leading-relaxed max-w-4xl">
              You are logged in with role <strong>"admin"</strong>. As an admin, you have access to read across all user collections, audit orders, manage inventory limits, and bypass normal scope checks on REST controllers.
            </p>
            
            <div className="mt-4 pt-4 border-t border-purple-200/60 flex flex-wrap gap-2">
              <span className="text-[10px] bg-slate-900 text-emerald-400 font-mono px-3 py-1.5 rounded-lg border border-slate-800">
                Connection URL: postgresql://admin_user@localhost/app_db
              </span>
              <span className="text-[10px] bg-slate-900 text-purple-300 font-mono px-3 py-1.5 rounded-lg border border-slate-800">
                JWT Auth: RSA256 Verified
              </span>
            </div>
          </div>
        )}

        {/* Dynamic Route/Tab Display Container */}
        <div className="animate-fade-in">
          {currentTab === "store" && (
            <ProductCatalog
              onAddToCart={handleAddToCart}
              userRole={user.role}
            />
          )}

          {currentTab === "vendor" && user.role === "vendor" && (
            <VendorDashboard />
          )}

          {currentTab === "admin" && user.role === "admin" && (
            <AdminDashboard />
          )}

          {currentTab === "profile" && (
            <ProfilePanel />
          )}
        </div>
      </main>

      {/* Persistence and Infrastructure status footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 font-mono">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p>© 2026 Enterprise Full-Stack Workspace. All rights reserved.</p>
          {user && user.role === "admin" && (
            <div className="flex gap-4 items-center">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                PostgreSQL Service: Live Pool
              </span>
              <span>•</span>
              <span>JWT Status: Authenticated</span>
            </div>
          )}
        </div>
      </footer>

      {/* Right Drawer Sliding Cart */}
      {cartOpen && (
        <CartDrawer
          cartItems={cart}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onClearCart={handleClearCart}
          onClose={() => setCartOpen(false)}
          onOrderSuccess={() => {
            localStorage.setItem("profileActiveSubTab", "orders");
            setCurrentTab("profile");
            setCartOpen(false);
          }}
        />
      )}
    </div>
  );
}
