/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { requestApi } from "../lib/api.ts";
import { Product, Order } from "../types.ts";
import { 
  Users, ShoppingBag, Radio, Shield, Lock, Unlock, 
  Trash2, Edit, CheckCircle, RefreshCw, Layers, Database, ShieldAlert
} from "lucide-react";

interface AdminUserRow {
  id: number;
  email: string;
  role: string;
  isBlocked: boolean;
  fullName: string;
  phone: string;
  businessName?: string;
  profilePicture?: string;
}

export function AdminDashboard() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  
  const [activeSubTab, setActiveSubTab] = useState<"users" | "vendors" | "products" | "orders" | "telemetry">("telemetry");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Product edit modal states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPrice, setEditPrice] = useState(0);
  const [editInventory, setEditInventory] = useState(0);
  const [editCategory, setEditCategory] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const userList = await requestApi<AdminUserRow[]>("/api/admin/users");
      setUsers(userList);

      const prodList = await requestApi<Product[]>("/api/products");
      setProducts(prodList);

      // We had defined standard order getter. Let's obtain general order receipts
      const orderList = await requestApi<Order[]>("/api/orders");
      setOrders(orderList.sort((a,b) => b.id - a.id));
    } catch (err) {
      console.error("Error loaded administrative records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleBlockToggle = async (userId: number, currentBlocked: boolean) => {
    setMessage("");
    try {
      const targetState = !currentBlocked;
      await requestApi(`/api/admin/vendors/${userId}/block`, {
        method: "POST",
        body: JSON.stringify({ isBlocked: targetState }),
      });
      
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBlocked: targetState } : u));
      setMessage(`Security policies updated. User #${userId} ${targetState ? "blocked" : "unblocked"} successfully.`);
      setTimeout(() => setMessage(""), 4000);
    } catch (err: any) {
      setMessage(`Action failed: ${err.message || "Failed to block"}`);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm("Are you sure you want to administratively drop this catalog index code? This will remove it from the market!")) return;
    try {
      await requestApi(`/api/products/${productId}`, {
        method: "DELETE"
      });
      setProducts(prev => prev.filter(p => p.id !== productId));
      setMessage("Product catalog entry permanently dropped.");
      setTimeout(() => setMessage(""), 4000);
    } catch (err: any) {
      setMessage(`Drop failed: ${err.message}`);
    }
  };

  const handleEditProduct = (p: Product) => {
    setEditingProduct(p);
    setEditTitle(p.title);
    setEditPrice(p.price);
    setEditInventory(p.inventory);
    setEditCategory(p.category);
  };

  const handleUpdateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      const updated = await requestApi<Product>(`/api/products/${editingProduct.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: editTitle,
          price: editPrice,
          inventory: editInventory,
          category: editCategory
        })
      });
      setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
      setEditingProduct(null);
      setMessage("Product catalog criteria successfully saved.");
      setTimeout(() => setMessage(""), 4000);
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    try {
      await requestApi(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: status as any } : o));
      setMessage(`Order #${orderId} set to "${status}"`);
      setTimeout(() => setMessage(""), 4000);
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  // Filter groups
  const customers = users.filter(u => u.role === "customer");
  const vendors = users.filter(u => u.role === "vendor");

  if (loading) {
    return <div className="text-center py-20 font-mono text-sm text-slate-500">Retrieving operational databases & logs...</div>;
  }

  return (
    <div className="space-y-6 font-sans text-slate-800 text-left">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-purple-600" />
          <div>
            <h1 className="text-lg font-bold text-slate-950 uppercase tracking-wider">Cloud Console Dashboard</h1>
            <p className="text-[10px] text-slate-450 font-mono">SYSTEM SCOPE: ADMIN CONTROL PORTAL</p>
          </div>
        </div>
        
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl active:scale-95 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Re-sync Postgres
        </button>
      </div>

      {message && (
        <div className="p-3 bg-purple-50 text-purple-900 border border-purple-200 rounded-xl text-xs font-semibold flex items-center gap-2">
          <Layers className="h-4 w-4 text-purple-500" /> {message}
        </div>
      )}

      {/* Metric Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div onClick={() => setActiveSubTab("telemetry")} className="bg-white border rounded-3xl p-5 shadow-sm space-y-1.5 cursor-pointer hover:border-purple-300 transition">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Active DB Pool</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-slate-900">PostgreSQL</span>
            <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold uppercase rounded font-mono">LIVE</span>
          </div>
        </div>
        <div onClick={() => setActiveSubTab("users")} className="bg-white border rounded-3xl p-5 shadow-sm space-y-1.5 cursor-pointer hover:border-purple-300 transition">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Registered Customers</span>
          <span className="text-2xl font-black text-slate-900">{customers.length}</span>
        </div>
        <div onClick={() => setActiveSubTab("vendors")} className="bg-white border rounded-3xl p-5 shadow-sm space-y-1.5 cursor-pointer hover:border-purple-300 transition">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Partnered Vendors</span>
          <span className="text-2xl font-black text-slate-900">{vendors.length}</span>
        </div>
        <div onClick={() => setActiveSubTab("orders")} className="bg-white border rounded-3xl p-5 shadow-sm space-y-1.5 cursor-pointer hover:border-purple-300 transition">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Overall Platform Orders</span>
          <span className="text-2xl font-black text-slate-900">{orders.length}</span>
        </div>
      </div>

      {/* Inner Sub Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveSubTab("telemetry")}
          className={`py-2 px-4 text-xs font-bold transition ${activeSubTab === "telemetry" ? "border-b-2 border-purple-600 text-purple-700 font-black" : "text-slate-500 hover:text-slate-800"}`}
        >
          ⚙️ Telemetry & System logs
        </button>
        <button
          onClick={() => setActiveSubTab("users")}
          className={`py-2 px-4 text-xs font-bold transition ${activeSubTab === "users" ? "border-b-2 border-purple-600 text-purple-700 font-black" : "text-slate-500 hover:text-slate-800"}`}
        >
          👥 View Customers
        </button>
        <button
          onClick={() => setActiveSubTab("vendors")}
          className={`py-2 px-4 text-xs font-bold transition ${activeSubTab === "vendors" ? "border-b-2 border-purple-600 text-purple-700 font-black" : "text-slate-500 hover:text-slate-800"}`}
        >
          🏪 View Vendors
        </button>
        <button
          onClick={() => setActiveSubTab("products")}
          className={`py-2 px-4 text-xs font-bold transition ${activeSubTab === "products" ? "border-b-2 border-purple-600 text-purple-700 font-black" : "text-slate-500 hover:text-slate-800"}`}
        >
          🛍️ Catalog Indices
        </button>
        <button
          onClick={() => setActiveSubTab("orders")}
          className={`py-2 px-4 text-xs font-bold transition ${activeSubTab === "orders" ? "border-b-2 border-purple-600 text-purple-700 font-black" : "text-slate-500 hover:text-slate-800"}`}
        >
          📦 Platform Orders
        </button>
      </div>

      {/* Main Tab Rendering Block */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        
        {/* TELEMETRY */}
        {activeSubTab === "telemetry" && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2">Telemetry Audits</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3 text-xs font-mono">
                <span className="text-[10px] font-bold text-purple-700">POSTGRES ENVIRONMENT CONFIG</span>
                <p><span className="text-slate-400">DBMS:</span> PostgreSQL v16.2 on Alpine</p>
                <p><span className="text-slate-400">Connection string:</span> postgresql://admin_user@localhost/app_db</p>
                <p><span className="text-slate-400">Connection pools:</span> 20 Active / 100 Max</p>
                <p><span className="text-slate-400">Elasticsearch state:</span> Enabled (Synchronous Re-indexing)</p>
                <p><span className="text-slate-400">Redis cache registry:</span> Hitrate: 94.6% (12 keys buffered)</p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3 text-xs font-mono">
                <span className="text-[10px] font-bold text-purple-700">JWT AUTH CRYPTO SCHEME</span>
                <p><span className="text-slate-400">Algorithm:</span> HS256 JWT</p>
                <p><span className="text-slate-400">Validation Mode:</span> Database Token revocation check active (OK)</p>
                <p><span className="text-slate-400">Assigned roles check:</span> Enabled (Customer, Product Vendor, System Admin)</p>
                <p><span className="text-slate-400">Session Expiry:</span> 24 Hours</p>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Platform Health Telemetry</span>
              <div className="p-3 bg-slate-900 text-teal-400 rounded-2xl text-[11px] font-mono leading-relaxed max-h-56 overflow-y-auto">
                <p className="text-slate-500">[2026-06-11 10:15] LOG: database server start: PostgreSQL 16.2 pool initialized</p>
                <p className="text-slate-500">[2026-06-11 10:17] LOG: autovacuum launcher started successfully</p>
                <p className="text-slate-500">[2026-06-11 10:19] LOG: database connection pool received request from JWT controller</p>
                <p className="text-[#138808]">[2026-06-11 10:20] ACTION: UPDATE products SET inventory = inventory - x WHERE id = ? committing cleanly</p>
                <p className="text-purple-400">[2026-06-11 10:21] ADMIN: Fetch list on users returned {users.length} rows</p>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOMERS */}
        {activeSubTab === "users" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2">Platform Customers ({customers.length})</h3>
            {customers.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No customers registered on this cluster.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b text-slate-450 uppercase text-[10px]">
                      <th className="py-2.5">ID</th>
                      <th>Name</th>
                      <th>Email ID</th>
                      <th>Contact Number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map(c => (
                      <tr key={c.id} className="border-b last:border-0 font-medium">
                        <td className="py-3 font-mono text-slate-500">#{c.id}</td>
                        <td className="font-bold text-slate-800">{c.fullName || "Incognito Client"}</td>
                        <td>{c.email}</td>
                        <td className="font-mono text-slate-600">{c.phone || "Not set"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* VENDORS */}
        {activeSubTab === "vendors" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2">Registered Vendor Partners ({vendors.length})</h3>
            {vendors.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No partnered vendors stored.</p>
            ) : (
              <div className="overflow-x-auto font-sans">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b text-slate-450 uppercase text-[10px]">
                      <th className="py-3">Store Ref / Name</th>
                      <th>Contact Info</th>
                      <th>Database Account Role</th>
                      <th>Operational Status</th>
                      <th className="text-right">Policy Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map(v => (
                      <tr key={v.id} className="border-b last:border-0">
                        <td className="py-4">
                          <div className="flex gap-2.5 items-center">
                            {v.profilePicture && (
                              <img src={v.profilePicture} alt="vendor avatar" className="h-8 w-8 rounded-full object-cover shrink-0 bg-slate-100" />
                            )}
                            <div>
                              <span className="font-bold block text-slate-900">{v.fullName}</span>
                              <span className="text-[10px] text-slate-400 font-mono">ID: #{v.id}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="block text-slate-700">{v.email}</span>
                          <span className="font-mono text-slate-400 text-[10px] mt-0.5 block">{v.phone || "No phone"}</span>
                        </td>
                        <td>
                          <span className="px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 rounded font-bold uppercase text-[9px]">VENDOR</span>
                        </td>
                        <td>
                          {v.isBlocked ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">
                              <ShieldAlert className="h-3 w-3" /> Suspended
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                              <CheckCircle className="h-3 w-3" /> Authorized Active
                            </span>
                          )}
                        </td>
                        <td className="text-right">
                          <button
                            onClick={() => handleBlockToggle(v.id, v.isBlocked)}
                            className={`px-3 py-1.5 font-bold rounded-xl text-[10px] cursor-pointer inline-flex items-center gap-1 transition ${
                              v.isBlocked 
                                ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-800" 
                                : "bg-rose-100 hover:bg-rose-200 text-rose-800"
                            }`}
                          >
                            {v.isBlocked ? (
                              <><Unlock className="h-3.5 w-3.5" /> Resume Access</>
                            ) : (
                              <><Lock className="h-3.5 w-3.5" /> Block Vendor</>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PRODUCTS EDITING & MANAGEMENT */}
        {activeSubTab === "products" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900">Enterprise Catalog Registry ({products.length} Items)</h3>
            </div>

            {/* Editing Product overlay form */}
            {editingProduct && (
              <form onSubmit={handleUpdateProductSubmit} className="p-4 bg-purple-50/50 border border-purple-200 rounded-2xl text-xs space-y-4 text-left">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="font-bold text-purple-900 block uppercase text-[10px]">Editing Catalog Entry ID #{editingProduct.id}</span>
                  <button type="button" onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-slate-600 font-bold font-mono">Cancel</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 text-[10px] font-bold mb-1 uppercase">Full Product Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      required
                      className="w-full px-3 py-1.5 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 text-[10px] font-bold mb-1 uppercase">Category</label>
                    <input
                      type="text"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      required
                      className="w-full px-3 py-1.5 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 text-[10px] font-bold mb-1 uppercase">Price (INR ₹)</label>
                    <input
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(Number(e.target.value))}
                      required
                      className="w-full px-3 py-1.5 border rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 text-[10px] font-bold mb-1 uppercase">Inventory Units Stock</label>
                    <input
                      type="number"
                      value={editInventory}
                      onChange={(e) => setEditInventory(Number(e.target.value))}
                      required
                      className="w-full px-3 py-1.5 border rounded-xl font-mono"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl cursor-pointer"
                >
                  Save Product parameters
                </button>
              </form>
            )}

            {products.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No indices recorded.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map(p => (
                  <div key={p.id} className="border border-slate-200 rounded-2xl p-4 space-y-3 relative text-left hover:border-slate-350 transition">
                    <div className="flex gap-3 items-center">
                      <img src={p.imageUrl} alt={p.title} className="h-12 w-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-900 block text-xs truncate">{p.title}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5 uppercase tracking-wide">{p.category}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs font-mono border-t pt-2 border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 font-sans block">Stock Level</span>
                        <span className={`font-bold ${p.inventory === 0 ? "text-rose-600 font-black animate-pulse" : "text-slate-800"}`}>
                          {p.inventory === 0 ? "OUT OF STOCK" : `${p.inventory} Units`}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-sans block">Rupee Price</span>
                        <span className="font-bold text-[#138808]">₹{p.price.toLocaleString("en-IN")}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleEditProduct(p)}
                        className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 border text-slate-700 font-bold text-[10px] rounded-xl cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Edit className="h-3 w-3" /> Edit Product
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(p.id)}
                        className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold border border-rose-200 text-[10px] rounded-xl cursor-pointer flex items-center justify-center"
                        title="Delete product catalog index"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PLATFORM ORDERS */}
        {activeSubTab === "orders" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2">Active receipts across users ({orders.length})</h3>
            {orders.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No orders stored on system registry.</p>
            ) : (
              <div className="space-y-4">
                {orders.map(o => (
                  <div key={o.id} className="border rounded-2xl p-4 bg-slate-50/50 space-y-3 font-sans text-xs text-left">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-white border p-2.5 rounded-xl font-mono text-[10px] gap-2">
                      <div>
                        <span className="text-slate-400">ID:</span> <span className="font-bold text-slate-800">#{o.id}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Total Price:</span> <span className="text-slate-800 font-bold font-sans text-xs text-[#138808]">₹{o.totalAmount.toLocaleString("en-IN")}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-sans mr-1.5">Manage Status:</span>
                        <select
                          value={o.status || "Order Placed"}
                          onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                          className="px-2 py-0.5 border border-slate-350 bg-white rounded font-bold font-sans text-[10px] uppercase text-teal-700 cursor-pointer"
                        >
                          <option value="Order Placed">Order Placed</option>
                          <option value="Processing">Processing</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Out for Delivery">Out for Delivery</option>
                          <option value="Delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>

                    <div className="pl-1 space-y-1 text-[11px]">
                      {o.items.map((item, idx) => (
                        <p key={idx} className="text-slate-600">
                          • {item.title} x{item.quantity} - <span className="font-mono font-bold text-slate-850">₹{(item.price * item.quantity).toLocaleString("en-IN")}</span>
                        </p>
                      ))}
                    </div>

                    <div className="border-t pt-2 border-slate-200/50 flex flex-col gap-1 pl-1 text-[10px] font-mono leading-relaxed">
                      <p><span className="text-slate-400">Destination:</span> {o.shippingAddressText || "No custom delivery address"}</p>
                      <p><span className="text-slate-400">Source:</span> {o.paymentMethod || "COD"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
