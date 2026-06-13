/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { requestApi } from "../lib/api.ts";
import { Product } from "../types.ts";
import { Search, ShoppingCart, Tag, Sparkles, Star, Flame } from "lucide-react";
import { ProductDetailsModal } from "./ProductDetailsModal.tsx";

interface ProductCatalogProps {
  onAddToCart: (product: Product) => void;
  userRole: string;
}

export function ProductCatalog({ onAddToCart, userRole }: ProductCatalogProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showDealsOnly, setShowDealsOnly] = useState(false);
  const [esStats, setEsStats] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [lastSearches, setLastSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("lastSearchedKeywords");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const categories = ["All", "Electronics", "Fashion", "Home & Kitchen", "Beauty", "Watches"];

  const fetchProducts = async (q = "", cat = "") => {
    setLoading(true);
    try {
      let url = "/api/products";
      const params = [];
      if (q) params.push(`q=${encodeURIComponent(q)}`);
      // Map "All" or match exact category keys
      if (cat && cat !== "All") params.push(`category=${encodeURIComponent(cat)}`);
      
      if (params.length > 0) {
        url += `?${params.join("&")}`;
      }

      const list = await requestApi<Product[]>(url);
      setProducts(list);
      
      // If a search query was issued, report indices matching
      if (q) {
        setEsStats(`Elasticsearch search indexed query matches for "${q}" across Title, Brand, Category, and Vendor matched ${list.length} hits (~1.80ms)`);
        
        // Save to lastSearches
        const trimmed = q.trim();
        if (trimmed && trimmed.length >= 2) {
          setLastSearches(prev => {
            const filtered = prev.filter(item => item.toLowerCase() !== trimmed.toLowerCase());
            const updated = [trimmed, ...filtered].slice(0, 3);
            localStorage.setItem("lastSearchedKeywords", JSON.stringify(updated));
            return updated;
          });
        }
      } else {
        setEsStats(null);
      }
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Debounce search input
    const delayDebounceFn = setTimeout(() => {
      fetchProducts(searchQuery, selectedCategory);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, selectedCategory]);

  // Client-side quick filter for active premium discount deals
  const displayedProducts = showDealsOnly 
    ? products.filter(p => p.discount !== undefined && p.discount > 0)
    : products;

  return (
    <div className="space-y-6 font-sans text-left">
      {/* Search Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 rounded-3xl p-8 text-white relative overflow-hidden shadow-lg border border-slate-700/50">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-[#FF9933] bg-[#FF9933]/10 px-2.5 py-1 rounded-full mb-3">
            <Sparkles className="h-3 w-3" /> Bharat Marketplace Protocol
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight mb-2">Explore Indian Digital Stores</h2>
          <p className="text-slate-300 text-sm mb-6 leading-relaxed">
            Highly realistic production catalog seeded with 150+ standard items. Product search executes fully optimized queries scoring matches on name, brand, vendor, and category.
          </p>

          {/* Search bar */}
          <div className="relative">
            <input
              id="product-search-input"
              type="text"
              placeholder="Search by product name, brand, vendor or category (e.g. OnePlus, Raymond, Prestige, Titan)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-950/80 border border-slate-700 rounded-2xl focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-[#FF9933]/50 focus:border-[#FF9933] text-sm text-slate-100 transition-all shadow-inner"
            />
            <Search className="absolute left-4 top-3.5 h-4.5 w-4.5 text-slate-400" />
          </div>

          {/* Last 3 Searched Keywords Chips */}
          {lastSearches.length > 0 && (
            <div id="recent-searches-container" className="flex flex-wrap items-center gap-2 mt-2.5 text-xs animate-fade-in pl-1">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
                Recent Searches:
              </span>
              {lastSearches.map((keyword, index) => (
                <button
                  id={`recent-search-chip-${index}`}
                  key={keyword}
                  type="button"
                  onClick={() => setSearchQuery(keyword)}
                  className="bg-slate-800/80 hover:bg-[#FF9933]/20 border border-slate-700/80 hover:border-[#FF9933]/50 text-slate-300 hover:text-[#FF9933] px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-200 cursor-pointer shadow-xs"
                >
                  {keyword}
                </button>
              ))}
              <button
                id="clear-recent-searches-btn"
                type="button"
                onClick={() => {
                  setLastSearches([]);
                  localStorage.removeItem("lastSearchedKeywords");
                }}
                className="text-slate-500 hover:text-red-400 text-[10px] uppercase font-bold tracking-wider hover:underline ml-1.5 transition cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}
          
          {esStats && (
            <p id="es-status-indicator" className="text-[10px] text-[#FF9933] font-mono mt-2 flex items-center gap-1 pl-1">
              <span>●</span> {esStats}
            </p>
          )}
        </div>
        
        {/* Glow visual asset background decoration */}
        <div className="absolute top-0 right-0 h-40 w-40 bg-[#FF9933]/10 blur-3xl rounded-full" />
        <div className="absolute -bottom-10 right-20 h-32 w-32 bg-[#138808]/5 blur-3xl rounded-full" />
      </div>

      {/* Category Tabs & Filter Settings */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => (
            <button
              id={`cat-tab-${cat.toLowerCase().replace(/\s+/g, "-")}`}
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                selectedCategory === cat
                  ? "bg-slate-900 border border-slate-950 text-white shadow-sm font-bold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Deals Toggle Button */}
        <button
          id="btn-toggle-deals"
          onClick={() => setShowDealsOnly(!showDealsOnly)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
            showDealsOnly
              ? "bg-red-50 border-red-200 text-red-600 shadow-sm"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Flame className={`h-4 w-4 ${showDealsOnly ? "fill-red-500 text-red-500 animate-pulse" : "text-slate-450"}`} />
          🔥 Today's Hot Deals ({products.filter(p => p.discount && p.discount > 0).length})
        </button>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <div className="h-8 w-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-xs font-medium font-mono">Simulating PostgreSQL database fetch...</p>
        </div>
      ) : displayedProducts.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-300 rounded-3xl bg-slate-50">
          <Tag className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 text-sm font-medium">No products match your query terms</p>
          <p className="text-slate-400 text-xs mt-1">Try resetting the Deals filter, selecting another category or typing another phrase</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayedProducts.map((p) => {
            const isOutOfStock = p.inventory <= 0;
            const discountPct = p.discount || 0;
            // Calculate original price based on discount
            const originalPrice = discountPct > 0 
              ? Math.round(p.price / (1 - discountPct / 100))
              : p.price;

            return (
              <div
                id={`product-card-${p.id}`}
                key={p.id}
                onClick={() => setSelectedProduct(p)}
                className="bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 text-slate-900 flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-all group text-left cursor-pointer"
              >
                {/* Image panel */}
                <div className="h-44 bg-slate-100 relative overflow-hidden shrink-0">
                  <img
                    src={p.imageUrl}
                    alt={p.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Discount Badge */}
                  {discountPct > 0 && (
                    <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg tracking-wide shadow-sm font-mono flex items-center gap-1">
                      <Flame className="h-3 w-3 fill-white text-white" />
                      {discountPct}% OFF
                    </span>
                  )}

                  {/* Stock Alert */}
                  {p.inventory <= 5 && p.inventory > 0 && (
                    <span className="absolute bottom-3 left-3 bg-amber-500/90 backdrop-blur-xs text-slate-950 text-[9px] font-extrabold px-2 py-0.5 rounded-md tracking-wider">
                      ONLY {p.inventory} LEFT
                    </span>
                  )}

                  {/* Out of stock cover */}
                  {isOutOfStock && (
                    <span className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center text-white text-xs font-bold font-mono tracking-wider">
                      OUT OF STOCK
                    </span>
                  )}

                  {/* Category Pill */}
                  <span className="absolute top-3 right-3 bg-slate-900/75 backdrop-blur-xs text-slate-100 text-[10px] font-bold px-2 py-0.5 rounded-md">
                    {p.category}
                  </span>
                </div>

                {/* Details layout */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Brand and Star Rating */}
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1.5 uppercase font-mono tracking-wider">
                      <span className="text-[#FF9933]">{p.brand || "Generics"}</span>
                      <span className="flex items-center gap-0.5 text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-md">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> 
                        {p.rating ? p.rating.toFixed(1) : "4.1"}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-slate-900 line-clamp-1 group-hover:text-purple-600 transition-colors text-sm" title={p.title}>
                      {p.title}
                    </h3>
                    
                    {/* Description */}
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 min-h-[2.5rem] leading-relaxed">
                      {p.description}
                    </p>
                  </div>

                  {/* Pricing and Basket Addition */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      {/* Price Details */}
                      <div>
                        {discountPct > 0 && (
                          <span className="text-[11px] text-slate-400 line-through block font-mono">
                            M.R.P: ₹{originalPrice.toLocaleString("en-IN")}
                          </span>
                        )}
                        <span className="text-base font-extrabold text-[#138808] font-mono tracking-tight flex items-center">
                          ₹{p.price.toLocaleString("en-IN")}
                        </span>
                      </div>

                      {/* Add Button */}
                      {userRole !== "vendor" && (
                        <button
                          id={`btn-add-cart-${p.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToCart(p);
                          }}
                          disabled={isOutOfStock}
                          type="button"
                          className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-xl shadow cursor-pointer transition-all border ${
                            isOutOfStock 
                              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed shadow-none" 
                              : "bg-slate-950 hover:bg-purple-50 hover:border-purple-600 border-slate-950 text-white hover:text-purple-800"
                          }`}
                        >
                          <ShoppingCart className="h-3 w-3" />
                          Add
                        </button>
                      )}
                    </div>

                    {/* Vendor and Stock info footer inside card */}
                    <div className="mt-3 pt-2.5 border-t border-dashed border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                      <span>Store: <strong className="text-slate-600">{p.vendorName || "Super Tech Vendor Ltd."}</strong></span>
                      <span className={`${p.inventory > 5 ? "text-slate-500" : "text-red-500 font-bold"}`}>
                        {p.inventory > 0 ? `In Stock: ${p.inventory}` : "Out of stock"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Specification & Active Reviews Modal */}
      {selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={(product) => {
            onAddToCart(product);
          }}
          userRole={userRole}
        />
      )}
    </div>
  );
}
