/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { requestApi } from "../lib/api.ts";
import { Address, PaymentMethod, Order } from "../types.ts";
import { 
  User, MapPin, CreditCard, History, Sparkles, Phone, 
  ArrowLeft, CheckCircle2, Clock, Truck, Home, Package, ShieldCheck,
  Search, Filter, ShoppingBag, FileText
} from "lucide-react";

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80", // Female tech
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80", // Male professional
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80", // Female creative
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80", // Male youth
];

export function ProfilePanel() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [payments, setPayments] = useState<PaymentMethod[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notif, setNotif] = useState("");
  const [loading, setLoading] = useState(true);

  // Selected Order for tracking view
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Sub tab navigation inside profile panel
  const [activeSubTab, setActiveSubTab] = useState<"profile" | "orders">(() => {
    const saved = localStorage.getItem("profileActiveSubTab");
    if (saved === "orders" || saved === "profile") {
      localStorage.removeItem("profileActiveSubTab");
      return saved;
    }
    return "profile";
  });
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("All");

  // Address Form states
  const [addStreet, setAddStreet] = useState("");
  const [addCity, setAddCity] = useState("");
  const [addState, setAddState] = useState("");
  const [addZip, setAddZip] = useState("");

  // Payment Form states
  const [addCardHolder, setAddCardHolder] = useState("");
  const [addCardNum, setAddCardNum] = useState("");
  const [addExpiry, setAddExpiry] = useState("");

  const loadProfileStructures = async () => {
    try {
      setLoading(true);
      const prof = await requestApi<{ 
        fullName: string; 
        phone: string; 
        email: string; 
        profilePicture?: string; 
        shippingAddress?: string; 
      }>("/api/profile");
      
      setFullName(prof.fullName || "");
      setPhone(prof.phone || "");
      setEmail(prof.email || "");
      setProfilePicture(prof.profilePicture || AVATAR_PRESETS[0]);
      setShippingAddress(prof.shippingAddress || "");

      const addrList = await requestApi<Address[]>("/api/addresses");
      setAddresses(addrList);

      const payList = await requestApi<PaymentMethod[]>("/api/payment-methods");
      setPayments(payList);

      const ordList = await requestApi<Order[]>("/api/orders");
      // Sort orders descending by date
      setOrders(ordList.sort((a,b) => b.id - a.id));
    } catch (e) {
      console.error("Error fetching credentials databases:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileStructures();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotif("");
    try {
      await requestApi("/api/profile", {
        method: "POST",
        body: JSON.stringify({ 
          fullName, 
          phone, 
          profilePicture, 
          shippingAddress 
        }),
      });
      setNotif("Profile fields updated successfully!");
      setTimeout(() => setNotif(""), 4000);
    } catch (err: any) {
      setNotif(`Error: ${err.message || "Failed to update profile"}`);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await requestApi<Address>("/api/addresses", {
        method: "POST",
        body: JSON.stringify({
          street: addStreet,
          city: addCity,
          state: addState,
          zipCode: addZip,
          country: "India",
          isDefault: addresses.length === 0,
        }),
      });
      setAddresses(prev => [...prev, res]);
      
      // Auto update profile shipping address with this standard address
      const formattedAddr = `${addStreet}, ${addCity}, ${addState} - ${addZip}`;
      setShippingAddress(formattedAddr);
      await requestApi("/api/profile", {
        method: "POST",
        body: JSON.stringify({ 
          fullName, 
          phone, 
          profilePicture, 
          shippingAddress: formattedAddr 
        }),
      });

      setAddStreet("");
      setAddCity("");
      setAddState("");
      setAddZip("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await requestApi<PaymentMethod>("/api/payment-methods", {
        method: "POST",
        body: JSON.stringify({
          cardHolder: addCardHolder,
          cardNumber: addCardNum,
          expiry: addExpiry,
          isDefault: payments.length === 0,
        }),
      });
      setPayments(prev => [...prev, res]);
      setAddCardHolder("");
      setAddCardNum("");
      setAddExpiry("");
    } catch (err) {
      console.error(err);
    }
  };

  // Helper helper to format dates beautifully
  const formatNiceDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch(e) {
      return isoString;
    }
  };

  // Tracking Progress calculation helper
  const getProgressState = (status: string) => {
    const states = ["Order Placed", "Processing", "Shipped", "Out for Delivery", "Delivered"];
    const index = states.indexOf(status);
    if (index === -1) return { percent: 10, stepIndex: 0 };
    return {
      percent: Math.min(100, Math.floor((index / (states.length - 1)) * 100)),
      stepIndex: index
    };
  };

  if (loading) {
    return <div className="text-center py-20 font-mono text-sm text-slate-500">Retrieving secure user databases...</div>;
  }

  // Render tracking details view
  if (selectedOrder) {
    const progress = getProgressState(selectedOrder.status);
    const steps = [
      { name: "Order Placed", desc: "Waiting for dispatch", icon: Clock },
      { name: "Processing", desc: "Packed in vendor warehouse", icon: Package },
      { name: "Shipped", desc: "In transit with logistics", icon: Truck },
      { name: "Out for Delivery", desc: "Local courier out now", icon: ShieldCheck },
      { name: "Delivered", desc: "Arrived at destination", icon: Home }
    ];

    return (
      <div className="space-y-6 text-left font-sans text-slate-800">
        <button
          onClick={() => setSelectedOrder(null)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Profile Panel
        </button>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">Tracking Reference</span>
              <h2 className="text-lg font-bold text-slate-900 font-mono mt-0.5">#{selectedOrder.id}</h2>
            </div>
            <div className="text-left md:text-right">
              <span className="text-xs text-slate-400 font-mono uppercase tracking-wider block">Estimated Handover</span>
              <span className="text-sm font-bold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-lg inline-block mt-0.5">{selectedOrder.estimatedDeliveryDate || "3 to 5 Days"}</span>
            </div>
          </div>

          {/* Graphical timeline */}
          <div className="space-y-8 py-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status Progression</h3>
            
            {/* Simple Horizontal Progress Bar for Desktop / Vertical for Mobile */}
            <div className="relative">
              {/* Desktop Bar */}
              <div className="hidden md:block absolute top-5 left-5 right-5 h-1 bg-slate-100 rounded-full">
                <div 
                  className="h-full bg-teal-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative z-10">
                {steps.map((s, idx) => {
                  const IconComponent = s.icon;
                  const isCurrent = idx === progress.stepIndex;
                  const isDone = idx < progress.stepIndex;
                  
                  return (
                    <div key={idx} className="flex md:flex-col items-start md:items-center text-left md:text-center gap-4 md:gap-2">
                      <div className={`p-3 rounded-full shrink-0 flex items-center justify-center transition-all ${
                        isCurrent 
                          ? "bg-teal-500 text-white ring-4 ring-teal-100" 
                          : isDone 
                            ? "bg-teal-50 text-teal-600 border border-teal-200" 
                            : "bg-slate-50 text-slate-400 border border-slate-200"
                      }`}>
                        {isDone ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <IconComponent className="h-5 w-5" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <p className={`text-xs font-bold ${isCurrent ? "text-teal-600" : "text-slate-900"}`}>{s.name}</p>
                        <p className="text-[10px] text-slate-400 max-w-[150px] leading-tight">{s.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Details list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 border-t border-slate-100">
            {/* Products order block */}
            <div className="space-y-3 bg-slate-50 rounded-2xl p-4 border text-xs">
              <h4 className="font-bold text-slate-900 border-b border-slate-200/60 pb-1.5 uppercase tracking-wide text-[10px]">Purchase Composition</h4>
              <div className="space-y-2.5">
                {selectedOrder.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-slate-800">{item.title}</p>
                      <p className="text-[10px] text-slate-400">Qty: {item.quantity} • ₹{item.price.toLocaleString("en-IN")} each</p>
                    </div>
                    <span className="font-mono text-slate-700 font-bold">₹{(item.price * item.quantity).toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-200/60 pt-2 flex justify-between items-center font-bold text-sm text-[13-88-08]">
                <span className="text-slate-500 font-semibold text-xs">Grand Total paid:</span>
                <span className="font-mono text-[#138808] font-black">₹{selectedOrder.totalAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Logistics address block */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Deliver Recipient & Address</span>
                <p className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                  <User className="h-3 w-3 text-slate-400" /> {fullName || "Standard Client"}
                </p>
                <div className="text-xs bg-slate-50 ring-1 ring-slate-200/50 rounded-xl p-3 text-slate-600 leading-relaxed font-mono">
                  {selectedOrder.shippingAddressText || shippingAddress || "No custom delivery address configured."}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Payment Method</span>
                  <span className="font-bold text-slate-700 mt-0.5 inline-block">{selectedOrder.paymentMethod || "Cash on Delivery"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Order Placed On</span>
                  <span className="text-slate-500 mt-0.5 inline-block">{formatNiceDate(selectedOrder.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = orderStatusFilter === "All" || o.status === orderStatusFilter;
    const matchesSearch = orderSearchQuery === "" || 
      o.id.toString().includes(orderSearchQuery) ||
      o.items.some(item => item.title.toLowerCase().includes(orderSearchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-8 font-sans text-slate-800 text-left animate-fade-in">
      
      {/* Title block & Tab Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 pl-1 text-left">
          <Sparkles className="h-5 w-5 text-teal-500" />
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider">Account Workspace</h2>
        </div>

        {/* Workspace tabs */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
          <button
            onClick={() => {
              setSelectedOrder(null);
              setActiveSubTab("profile");
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              activeSubTab === "profile"
                ? "bg-white text-teal-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <User className="h-3.5 w-3.5" />
            My Profile & Settings
          </button>
          <button
            onClick={() => {
              setSelectedOrder(null);
              setActiveSubTab("orders");
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer relative ${
              activeSubTab === "orders" || selectedOrder
                ? "bg-white text-teal-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <History className="h-3.5 w-3.5" />
            Order Ledger & Tracker
            {orders.length > 0 && (
              <span className="px-1.5 py-0.5 text-[9px] bg-teal-100 text-teal-800 rounded-full font-black ml-1">
                {orders.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeSubTab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left column: profile parameters */}
          <div className="space-y-6 lg:col-span-2 text-left">
            
            {/* Main profile form */}
            <form onSubmit={handleUpdateProfile} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 text-left">
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <User className="h-4 w-4 text-teal-600" /> Human Contact Credentials
                </h3>
                <span className="text-[10px] bg-slate-100 px-2.5 py-0.5 font-bold rounded-full font-mono text-slate-550">{email}</span>
              </div>
              
              {notif && (
                <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-medium rounded-xl border border-emerald-300">
                  {notif}
                </div>
              )}

              {/* Profile Picture Select Group */}
              <div className="space-y-2 pt-2">
                <label className="block text-slate-700 text-xs font-semibold uppercase tracking-wide">Select Profile Avatar</label>
                <div className="flex flex-wrap items-center gap-3">
                  <img 
                    src={profilePicture || AVATAR_PRESETS[0]} 
                    alt="avatar preview" 
                    referrerPolicy="no-referrer"
                    className="h-14 w-14 rounded-full object-cover ring-2 ring-teal-500 ring-offset-2 shrink-0 bg-slate-100"
                  />
                  <div className="flex gap-2">
                    {AVATAR_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setProfilePicture(preset)}
                        className={`h-10 w-10 rounded-full overflow-hidden border-2 transition ${
                          profilePicture === preset ? "border-teal-500 scale-105" : "border-slate-200 hover:border-slate-350"
                        }`}
                      >
                        <img src={preset} alt="preset avatar" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-2">
                  <label className="block text-slate-500 text-[10px] font-semibold mb-1 uppercase tracking-wide">Or Input Image Link URL</label>
                  <input
                    type="text"
                    placeholder="https://example.com/photo.jpg"
                    value={profilePicture}
                    onChange={(e) => setProfilePicture(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-slate-700 text-xs font-semibold mb-1 uppercase tracking-wide">Recipient Full Name</label>
                  <input
                    id="profile-fullname-input"
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2 border rounded-xl text-xs text-slate-800 focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 text-xs font-semibold mb-1 uppercase tracking-wide">Mobile Number</label>
                  <div className="relative">
                    <input
                      id="profile-phone-input"
                      type="text"
                      required
                      placeholder="e.g. 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-xl text-xs font-mono text-slate-800"
                    />
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 text-xs font-semibold mb-1 uppercase tracking-wide">Custom Default Delivery Address text</label>
                <textarea
                  placeholder="Fill in full delivery address details (Street, Landmarks, PIN Code, State)"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="w-full px-3.5 py-2 border rounded-xl text-xs text-slate-800 h-16 resize-none font-mono"
                />
              </div>

              <button
                id="profile-submit-btn"
                type="submit"
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-teal-400 font-bold text-xs rounded-xl cursor-pointer"
              >
                Commit Profile Changes
              </button>
            </form>
          </div>

          {/* Right column: Addresses & Payments list + mini form */}
          <div className="space-y-6 text-left">
            
            {/* Stored Addresses Section */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <MapPin className="h-4 w-4 text-teal-600" /> Stored Delivery Locations
              </h3>

              {addresses.length === 0 ? (
                <p className="text-xs text-slate-400 font-medium">No locations registered.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {addresses.map((a) => (
                    <div key={a.id} className="p-3 border rounded-2xl bg-slate-50/50 text-xs text-left hover:border-slate-350 transition">
                      <span className="font-bold block text-slate-800">{a.street}</span>
                      <span className="text-slate-400 text-[10px] block mt-0.5 font-mono">{a.city}, {a.state} - {a.zipCode}</span>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleAddAddress} className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Register Destination</span>
                <input
                  type="text"
                  required
                  placeholder="Street address"
                  value={addStreet}
                  onChange={(e) => setAddStreet(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-250 rounded-xl text-slate-800"
                />
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    required
                    placeholder="City"
                    value={addCity}
                    onChange={(e) => setAddCity(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-250 rounded-xl text-slate-800"
                  />
                  <input
                    type="text"
                    required
                    placeholder="State"
                    value={addState}
                    onChange={(e) => setAddState(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-250 rounded-xl text-slate-800"
                  />
                </div>
                <input
                  type="text"
                  required
                  placeholder="PIN Code"
                  value={addZip}
                  onChange={(e) => setAddZip(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-250 rounded-xl font-mono text-slate-800"
                />
                <button
                  type="submit"
                  className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl cursor-pointer text-xs"
                >
                  + Record Address
                </button>
              </form>
            </div>

            {/* Stored Credit Cards Section */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <CreditCard className="h-4 w-4 text-teal-600" /> Stored Credit & Payment Preferences
              </h3>

              {payments.length === 0 ? (
                <p className="text-xs text-slate-400 font-medium">No custom credit cards registered.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-left">
                  {payments.map((p) => (
                    <div key={p.id} className="p-3 border rounded-2xl bg-slate-50/50 text-xs">
                      <span className="font-bold block text-slate-800 uppercase">{p.cardHolder}</span>
                      <span className="text-slate-400 text-[10px] block mt-0.5 font-mono">{p.cardNumberMasked} ({p.expiry})</span>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleAddPayment} className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Register Credit Card</span>
                <input
                  type="text"
                  required
                  placeholder="Holder Name"
                  value={addCardHolder}
                  onChange={(e) => setAddCardHolder(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-250 rounded-xl uppercase text-slate-800"
                />
                <input
                  type="text"
                  required
                  placeholder="Card Number"
                  value={addCardNum}
                  onChange={(e) => setAddCardNum(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-250 rounded-xl font-mono text-slate-800"
                />
                <input
                  type="text"
                  required
                  placeholder="Expiry MM/YY"
                  value={addExpiry}
                  onChange={(e) => setAddExpiry(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-250 rounded-xl font-mono text-slate-850"
                />
                <button
                  type="submit"
                  className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl cursor-pointer text-xs"
                >
                  + Record Credit Card
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

      {activeSubTab === "orders" && (
        <div className="space-y-6">
          {/* Ledger filters & header */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-150 pb-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <ShoppingBag className="h-4 w-4 text-teal-600" />
                  Your Order & Transaction Ledger
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Look up dispatch tracking milestones, verify receipts, and checkestimated handover dates in real-time.
                </p>
              </div>

              {/* Statistics block */}
              <div className="flex gap-2.5 shrink-0">
                <div className="bg-slate-50 border border-slate-150 rounded-2xl px-3.5 py-1.5 text-center">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Checkout count</span>
                  <span className="text-sm font-black text-slate-800 font-mono">{orders.length}</span>
                </div>
                <div className="bg-teal-50 border border-teal-150 rounded-2xl px-3.5 py-1.5 text-center">
                  <span className="text-[9px] uppercase font-bold text-teal-600 block tracking-wider font-sans">Active Shipments</span>
                  <span className="text-sm font-black text-teal-700 font-mono">
                    {orders.filter(o => o.status !== "Delivered" && o.status !== "cancelled").length}
                  </span>
                </div>
              </div>
            </div>

            {/* Inputs & Filters */}
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
              {/* Search bar */}
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search by Order ID reference or product title..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-xl text-xs text-slate-800 bg-slate-50/50 hover:bg-slate-50 transition font-mono placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-450" />
              </div>

              {/* Status Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none font-mono text-[10px]">
                <span className="text-slate-400 font-sans font-bold uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
                  <Filter className="h-3 w-3" /> Status:
                </span>
                {["All", "Order Placed", "Processing", "Shipped", "Out for Delivery", "Delivered"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setOrderStatusFilter(status)}
                    className={`px-3 py-1.5 font-bold rounded-xl border transition cursor-pointer whitespace-nowrap ${
                      orderStatusFilter === status
                        ? "bg-teal-600 text-white border-teal-600 font-black shadow-xs"
                        : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Orders Listing Grid */}
          {filteredOrders.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-xs space-y-3">
              <div className="h-12 w-12 bg-slate-50 border border-dashed rounded-full flex items-center justify-center text-slate-400 mx-auto">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-slate-700">No transactions recorded</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                {orders.length === 0
                  ? "You haven't completed any checkouts yet on this accounts session."
                  : "We couldn't find any orders matching your criteria. Try adjusting your search query or status filters."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredOrders.map((o) => {
                const isDelivered = o.status === "Delivered";
                const isShipped = o.status === "Shipped";
                const isOut = o.status === "Out for Delivery";
                const isProcessing = o.status === "Processing";

                let badgeClass = "bg-slate-100 text-slate-755 border-slate-250";
                if (isDelivered) badgeClass = "bg-emerald-50 text-emerald-800 border-emerald-250/60";
                else if (isShipped) badgeClass = "bg-violet-50 text-violet-800 border-violet-250/60";
                else if (isOut) badgeClass = "bg-fuchsia-50 text-fuchsia-800 border-fuchsia-250/60";
                else if (isProcessing) badgeClass = "bg-amber-50 text-amber-850 border-amber-250/60";
                else if (o.status === "Order Placed") badgeClass = "bg-teal-50 text-teal-800 border-teal-200";

                return (
                  <div
                    key={o.id}
                    onClick={() => setSelectedOrder(o)}
                    className="bg-white border border-slate-200 hover:border-teal-300 rounded-3xl p-5 shadow-xs hover:shadow-md transition duration-200 flex flex-col justify-between space-y-4 cursor-pointer text-xs group"
                  >
                    <div>
                      {/* Order top bar info */}
                      <div className="flex justify-between items-center bg-slate-50 border rounded-xl p-2.5 font-mono text-[10px] mb-2 gap-2">
                        <div>
                          <span className="text-slate-400">ID:</span> <span className="font-extrabold text-slate-800">#{o.id}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Date:</span> <span className="text-slate-700">{formatNiceDate(o.createdAt)}</span>
                        </div>
                        <div className={`px-2 py-0.5 border text-[9px] font-black rounded uppercase tracking-wide shrink-0 ${badgeClass}`}>
                          {o.status || "Order Placed"}
                        </div>
                      </div>

                      {/* Items summary */}
                      <div className="space-y-1.5 pl-1.5 pt-1">
                        {o.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-start gap-4 text-[11px]">
                            <span className="font-semibold text-slate-650 truncate max-w-[280px]">
                              {item.title} <span className="text-slate-400 font-normal">x{item.quantity}</span>
                            </span>
                            <span className="font-mono text-slate-600 shrink-0">
                              ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Order bottom details and actions */}
                    <div className="pt-3 border-t border-slate-100 space-y-3">
                      <div className="flex justify-between items-baseline pl-1">
                        <div className="text-slate-400 text-[10px] font-mono">
                          EST. HANDOVER: <span className="font-bold text-slate-600 font-sans">{o.estimatedDeliveryDate || "3 to 5 Days"}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 font-bold block leading-none pb-0.5">Grand Total</span>
                          <span className="font-mono text-[#138808] font-black text-base">
                            ₹{o.totalAmount.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(o);
                        }}
                        className="w-full py-2.5 bg-slate-900 group-hover:bg-teal-600 hover:!bg-teal-700 text-teal-400 group-hover:text-white font-extrabold rounded-xl transition text-center uppercase tracking-wider text-[10px]"
                      >
                        📊 View Progress Timeline & Invoice Reciept
                      </button>
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
