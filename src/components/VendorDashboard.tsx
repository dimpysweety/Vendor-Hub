/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { requestApi } from "../lib/api.ts";
import { Product, Order } from "../types.ts";
import { 
  Plus, Store, TrendingUp, Boxes, Landmark, Edit, Trash2, 
  CheckCircle, ShoppingBag, Eye, RefreshCw, Star, Layers 
} from "lucide-react";

interface VendorDashboardStats {
  productCount: number;
  ordersCount: number;
  unitsSold: number;
  totalRevenue: number;
}

export function VendorDashboard() {
  const [stats, setStats] = useState<VendorDashboardStats>({
    productCount: 0,
    ordersCount: 0,
    unitsSold: 0,
    totalRevenue: 0,
  });

  const [vendorProducts, setVendorProducts] = useState<Product[]>([]);
  const [vendorOrders, setVendorOrders] = useState<Order[]>([]);
  const [currentVendorId, setCurrentVendorId] = useState<number | null>(null);
  
  const [activeTab, setActiveTab] = useState<"catalog" | "orders">("catalog");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notif, setNotif] = useState("");

  // Product edit states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCategory, setEditCategory] = useState("Electronics");
  const [editInventory, setEditInventory] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");

  // New product inputs
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Electronics");
  const [inventory, setInventory] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const loadVendorData = async () => {
    setLoading(true);
    try {
      const statsRes = await requestApi<VendorDashboardStats>("/api/vendor/stats");
      setStats(statsRes);

      // Get vendor products
      const list = await requestApi<Product[]>("/api/products");
      const me = await requestApi<{ id: number }>("/api/auth/me");
      setCurrentVendorId(me.id);
      
      const filteredProds = list.filter(p => p.vendorId === me.id);
      setVendorProducts(filteredProds);

      // Get orders
      const orderList = await requestApi<Order[]>("/api/orders");
      // Filter orders that contain this vendor's products
      const filteredOrders = orderList.filter(o => 
        o.items.some(item => filteredProds.some(fp => fp.id === item.productId))
      );
      setVendorOrders(filteredOrders.sort((a,b) => b.id - a.id));
    } catch (e) {
      console.error("Failed to load vendor data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendorData();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setNotif("");
    try {
      const payload = {
        title,
        description,
        price: Number(price),
        category,
        inventory: Number(inventory),
        imageUrl: imageUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
      };

      await requestApi<Product>("/api/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setNotif("Product successfully registered inside catalog registry.");
      setTitle("");
      setDescription("");
      setPrice("");
      setInventory("");
      setImageUrl("");

      await loadVendorData();
    } catch (err: any) {
      console.error(err);
      setNotif(`Error: ${err.message || "Failed to create product"}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditInit = (p: Product) => {
    setEditingProduct(p);
    setEditTitle(p.title);
    setEditDescription(p.description || "");
    setEditPrice(p.price.toString());
    setEditCategory(p.category);
    setEditInventory(p.inventory.toString());
    setEditImageUrl(p.imageUrl || "");
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSubmitting(true);
    setNotif("");
    try {
      const payload = {
        title: editTitle,
        description: editDescription,
        price: Number(editPrice),
        category: editCategory,
        inventory: Number(editInventory),
        imageUrl: editImageUrl
      };

      await requestApi(`/api/products/${editingProduct.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setNotif("Catalog entry updated successfully.");
      setEditingProduct(null);
      await loadVendorData();
    } catch (err: any) {
      console.error(err);
      setNotif(`Update Error: ${err.message || "Failed to edit"}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm("Are you sure you want to delete this catalog index? This action cannot be undone.")) return;
    setNotif("");
    try {
      await requestApi(`/api/products/${productId}`, {
        method: "DELETE"
      });
      setNotif("Catalog entry successfully removed.");
      await loadVendorData();
    } catch (err: any) {
      setNotif(`Deletion Error: ${err.message}`);
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    try {
      await requestApi(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      setNotif(`Status for Order #${orderId} changed to: ${status}`);
      await loadVendorData();
    } catch (err: any) {
      alert(`Could not change order status: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-800 text-left">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-4 border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-950 flex items-center gap-1.5 uppercase tracking-wider">
            <Store className="h-6 w-6 text-amber-500 animate-pulse" /> Vendor Studio Tab
          </h1>
          <p className="text-[10px] text-slate-400 font-mono">SUPPLIER CODE: AUTHENTICATED PARTNER STAGE</p>
        </div>
        <button
          onClick={loadVendorData}
          className="p-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl active:scale-95 transition flex items-center gap-1"
        >
          <RefreshCw className="h-3 w-3" /> Sync Stats
        </button>
      </div>

      {notif && (
        <div className={`p-3 rounded-2xl text-xs font-medium flex items-center gap-2 ${
          notif.includes("Error") 
            ? "bg-rose-50 border border-rose-200 text-rose-800" 
            : "bg-emerald-50 border border-emerald-250 text-emerald-800"
        }`}>
          <Layers className="h-4 w-4 text-emerald-600" />
          <span>{notif}</span>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-tr from-amber-600 to-amber-500 rounded-3xl p-5 text-white shadow-sm hover:translate-y-[-1px] transition">
          <span className="text-[10px] uppercase font-bold tracking-widest text-amber-100 block">Total Revenue</span>
          <span className="text-2xl font-black mt-1.5 block font-mono">₹{stats.totalRevenue.toLocaleString("en-IN")}</span>
        </div>

        <div className="bg-slate-900 rounded-3xl p-5 text-slate-100 shadow-sm hover:translate-y-[-1px] transition">
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Supply Items Sold</span>
          <span className="text-2xl font-black mt-1.5 block font-mono">{stats.unitsSold} units</span>
        </div>

        <div className="bg-white rounded-3xl p-5 text-slate-800 border shadow-sm hover:translate-y-[-1px] transition">
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">Unique Products</span>
          <span className="text-2xl font-black mt-1.5 block font-mono">{stats.productCount} SKUs</span>
        </div>

        <div className="bg-white rounded-3xl p-5 text-slate-800 border shadow-sm hover:translate-y-[-1px] transition">
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">Order Count</span>
          <span className="text-2xl font-black mt-1.5 block font-mono">{stats.ordersCount} orders</span>
        </div>
      </div>

      {/* Internal Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab("catalog")}
          className={`py-2 px-4 text-xs font-bold transition ${activeTab === "catalog" ? "border-b-2 border-amber-500 text-amber-600 font-black" : "text-slate-500 hover:text-slate-800"}`}
        >
          📦 Catalog Listing
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`py-2 px-4 text-xs font-bold transition ${activeTab === "orders" ? "border-b-2 border-amber-500 text-amber-600 font-black" : "text-slate-500 hover:text-slate-800"}`}
        >
          🏪 Product Sales & Orders ({vendorOrders.length})
        </button>
      </div>

      {/* CATALOG VIEW */}
      {activeTab === "catalog" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* List of currently active vendor product items */}
          <div className="lg:col-span-2 space-y-4">
            
            {editingProduct && (
              <form onSubmit={handleUpdateProduct} className="p-4 bg-amber-50/40 border border-amber-300 rounded-2xl text-xs space-y-3.5 text-left animate-fade-in mb-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="font-bold text-amber-900 block uppercase text-[10px]">Editing Product Entry ID #{editingProduct.id}</span>
                  <button type="button" onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-slate-600 font-bold font-mono">Cancel</button>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-slate-600 font-bold mb-0.5">Product Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      required
                      className="w-full px-3 py-1.5 border bg-white rounded-lg text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-600 font-bold mb-0.5">Price (Rupees)</label>
                      <input
                        type="number"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        required
                        className="w-full px-3 py-1.5 border bg-white rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-0.5">Inventory</label>
                      <input
                        type="number"
                        value={editInventory}
                        onChange={(e) => setEditInventory(e.target.value)}
                        required
                        className="w-full px-3 py-1.5 border bg-white rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-0.5">Public Image URL</label>
                    <input
                      type="text"
                      value={editImageUrl}
                      onChange={(e) => setEditImageUrl(e.target.value)}
                      className="w-full px-3 py-1.5 border bg-white rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-0.5">Specifications</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      required
                      rows={2}
                      className="w-full px-3 py-1.5 border bg-white rounded-lg text-xs resize-none"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl cursor-pointer"
                >
                  Save Modifications
                </button>
              </form>
            )}

            {loading ? (
              <div className="py-20 text-center font-mono text-xs text-slate-450 animate-pulse">Synchronizing SQL records...</div>
            ) : vendorProducts.length === 0 ? (
              <div className="p-12 text-center bg-slate-50 border border-dashed rounded-3xl text-slate-400 text-xs">
                No currently active catalog indexed. Create your first marketplace product listing.
              </div>
            ) : (
              <div className="space-y-3">
                {vendorProducts.map((p) => (
                  <div key={p.id} className="bg-white border rounded-2xl p-4 shadow-sm hover:shadow transition text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex gap-3 items-center min-w-0 flex-1">
                      <img src={p.imageUrl} className="h-12 w-12 rounded-xl object-cover shrink-0" referrerPolicy="no-referrer" />
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 block text-xs truncate">{p.title}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5 uppercase tracking-wide">{p.category}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 font-mono text-xs text-right">
                      <div>
                        <span className="text-[9px] text-slate-400 font-sans block">Db Stock</span>
                        <span className={`font-bold ${p.inventory === 0 ? "text-rose-600 animate-pulse" : "text-slate-800"}`}>
                          {p.inventory === 0 ? "OUT OF STOCK" : `${p.inventory} Units`}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-sans block">Sale Price</span>
                        <span className="font-extrabold text-[#138808]">₹{p.price.toLocaleString("en-IN")}</span>
                      </div>
                    </div>

                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => handleEditInit(p)}
                        className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 border text-slate-700 rounded-xl text-[10px] font-bold cursor-pointer flex items-center gap-1"
                      >
                        <Edit className="h-3 w-3" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        className="p-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-250 rounded-xl text-[10px] font-bold cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Creation card */}
          <div>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-3">Product Entry Panel</h2>
            <form onSubmit={handleCreateProduct} className="bg-white border rounded-2xl p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 text-[10px] font-bold uppercase mb-0.5">Title Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Realme Narzo 60"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 text-[10px] font-bold uppercase mb-0.5">Price (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 17999"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] font-bold uppercase mb-0.5">Stock Level</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 25"
                    value={inventory}
                    onChange={(e) => setInventory(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 text-[10px] font-bold uppercase mb-0.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg cursor-pointer"
                >
                  <option value="Electronics">Electronics</option>
                  <option value="Fashion">Fashion</option>
                  <option value="Home & Kitchen">Home & Kitchen</option>
                  <option value="Watches">Watches</option>
                  <option value="Beauty">Beauty</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 text-[10px] font-bold uppercase mb-0.5">Feature details</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Warranty terms, accessories included, storage sizes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg resize-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-[10px] font-bold uppercase mb-0.5">Image URL</label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl cursor-pointer shadow transition active:scale-95 text-[10px] uppercase tracking-wide"
              >
                {submitting ? "Publishing..." : "Add to Indian Catalog"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SALES ORDERS VIEW */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Products Purchased from Your Store (Orders: {vendorOrders.length})</h2>
          {vendorOrders.length === 0 ? (
            <p className="text-xs text-slate-450 text-center py-10 bg-slate-50 border rounded-3xl font-medium">No sales orders currently recorded on your store products.</p>
          ) : (
            <div className="space-y-4">
              {vendorOrders.map(o => {
                // Find products owned by this vendor inside this order
                const myPurchasedItems = o.items.filter(item => 
                  vendorProducts.some(fp => fp.id === item.productId)
                );
                const computedSubtotal = myPurchasedItems.reduce((acc, mi) => acc + (mi.price * mi.quantity), 0);

                return (
                  <div key={o.id} className="bg-white border rounded-3xl p-5 shadow-sm space-y-4 text-left font-sans text-xs">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-slate-50 p-3 rounded-xl border font-mono text-[10px] gap-2">
                      <div>
                        <span className="text-slate-400">ORDER:</span> <span className="text-slate-850 font-bold">#{o.id}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">YOUR EARNINGS:</span> <span className="font-sans font-bold text-sm text-green-700 font-bold">₹{computedSubtotal.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 font-sans mr-1">Status Progression:</span>
                        <select
                          value={o.status || "Order Placed"}
                          onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                          className="px-2 py-0.5 border bg-white rounded font-bold font-sans text-[10px] uppercase text-slate-800 cursor-pointer"
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

                    <div className="space-y-1.5 pl-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Items Purchased</span>
                      {myPurchasedItems.map((mi, idx) => (
                        <p key={idx} className="text-slate-700">
                          ✓ {mi.title} x{mi.quantity} - <span className="font-mono text-[11px] font-bold text-slate-850">₹{(mi.price * mi.quantity).toLocaleString("en-IN")}</span>
                        </p>
                      ))}
                    </div>

                    <div className="border-t pt-2 border-slate-100 flex flex-col gap-1 pl-1.5 text-[10px] font-mono leading-relaxed text-slate-500">
                      <p><span className="text-slate-400">Recipient Address:</span> <span className="text-slate-650">{o.shippingAddressText || "N/A"}</span></p>
                      <p><span className="text-slate-400">Checkout Channel:</span> <span className="text-slate-650">{o.paymentMethod || "COD"}</span></p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
