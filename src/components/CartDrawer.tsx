/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { requestApi, ApiErrorResponse } from "../lib/api.ts";
import { Product, Address, PaymentMethod, Order } from "../types.ts";
import { X, Trash2, Plus, Minus, CreditCard, MapPin, CheckCircle, AlertTriangle, Sparkles } from "lucide-react";

interface CartDrawerProps {
  cartItems: { product: Product; quantity: number }[];
  onUpdateQuantity: (productId: number, qty: number) => void;
  onRemoveItem: (productId: number) => void;
  onClearCart: () => void;
  onClose: () => void;
  onOrderSuccess?: () => void;
}

export function CartDrawer({ cartItems, onUpdateQuantity, onRemoveItem, onClearCart, onClose, onOrderSuccess }: CartDrawerProps) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddrId, setSelectedAddrId] = useState<number | undefined>(undefined);
  
  const [payments, setPayments] = useState<PaymentMethod[]>([]);
  const [selectedPayId, setSelectedPayId] = useState<number | undefined>(undefined);

  // New state for realistic Indian payments
  const [paymentMode, setPaymentMode] = useState<"cod" | "upi" | "card">("cod");
  const [upiId, setUpiId] = useState("yasaswini@okaxis");

  // Address create form
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("India");

  // Payment create form
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);
  const [dbError, setDbError] = useState<ApiErrorResponse | null>(null);
  const [showPaymentSuccessOverlay, setShowPaymentSuccessOverlay] = useState(false);

  const fetchAddressAndPayments = async () => {
    try {
      const addrList = await requestApi<Address[]>("/api/addresses");
      setAddresses(addrList);
      if (addrList.length > 0) {
        const defAddr = addrList.find(a => a.isDefault) || addrList[0];
        setSelectedAddrId(defAddr.id);
      }

      const payList = await requestApi<PaymentMethod[]>("/api/payment-methods");
      setPayments(payList);
      if (payList.length > 0) {
        const defPay = payList.find(p => p.isDefault) || payList[0];
        setSelectedPayId(defPay.id);
      }
    } catch (e) {
      console.warn("Unauthorized or error loading addresses/payments:", e);
    }
  };

  useEffect(() => {
    fetchAddressAndPayments();
    setSuccessOrder(null);
    setDbError(null);
    setShowPaymentSuccessOverlay(false);
  }, [cartItems]);

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await requestApi<Address>("/api/addresses", {
        method: "POST",
        body: JSON.stringify({ street, city, state, zipCode, country, isDefault: true }),
      });
      setAddresses(prev => [...prev, res]);
      setSelectedAddrId(res.id);
      setShowAddAddress(false);
      setStreet("");
      setCity("");
      setState("");
      setZipCode("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await requestApi<PaymentMethod>("/api/payment-methods", {
        method: "POST",
        body: JSON.stringify({ cardHolder, cardNumber, expiry, isDefault: true }),
      });
      setPayments(prev => [...prev, res]);
      setSelectedPayId(res.id);
      setShowAddPayment(false);
      setCardHolder("");
      setCardNumber("");
      setExpiry("");
    } catch (err) {
      console.error(err);
    }
  };

  const totalAmount = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  const handleCheckoutSubmit = async () => {
    setCheckoutLoading(true);
    setDbError(null);
    try {
      const itemsPayload = cartItems.map(item => ({
        productId: item.product.id,
        title: item.product.title,
        price: item.product.price,
        quantity: item.quantity,
      }));

      // Gather human readable address
      const activeAddr = addresses.find(a => a.id === selectedAddrId);
      const shippingAddressText = activeAddr 
        ? `${activeAddr.street}, ${activeAddr.city}, ${activeAddr.state} - ${activeAddr.zipCode}, ${activeAddr.country}`
        : "Standard Address Location";

      // Formulate payment details string
      let paymentMethodString = "Cash on Delivery";
      if (paymentMode === "upi") {
        paymentMethodString = `UPI (Demo): ${upiId || "UPI User Id"}`;
      } else if (paymentMode === "card") {
        const activeCard = payments.find(p => p.id === selectedPayId);
        paymentMethodString = activeCard 
          ? `Card (Demo): ${activeCard.cardNumberMasked} (${activeCard.cardHolder})`
          : "Card (Demo)";
      }

      // Generate Est Delivery Date (+ 3 to 7 Days, e.g. 5 days from now)
      const estDate = new Date();
      estDate.setDate(estDate.getDate() + 5);
      const estDeliveryDateString = estDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });

      const payload = {
        totalAmount,
        items: itemsPayload,
        addressId: selectedAddrId,
        paymentMethodId: paymentMode === "card" ? selectedPayId : undefined,
        paymentMethod: paymentMethodString,
        shippingAddressText,
        estimatedDeliveryDate: estDeliveryDateString
      };

      const orderResult = await requestApi<Order>("/api/orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSuccessOrder(orderResult);
      setShowPaymentSuccessOverlay(true);
      onClearCart();
    } catch (err: any) {
      console.error("[Checkout Failure Exception Caller Logger]:", err);
      setDbError(err);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const isCheckoutDisabled = () => {
    if (checkoutLoading) return true;
    if (!selectedAddrId) return true;
    if (paymentMode === "card" && !selectedPayId) return true;
    if (paymentMode === "upi" && !upiId.trim()) return true;
    return false;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-end font-sans">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-slide-left text-slate-800 text-left relative">
        
        {/* Payment successes popup */}
        {showPaymentSuccessOverlay && successOrder && (
          <div className="absolute inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-center p-6 text-center text-white space-y-6">
            <div className="p-4 bg-emerald-500/10 rounded-full animate-pulse">
              <CheckCircle className="h-20 w-20 text-emerald-400" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white tracking-tight">Payment Successful!</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Your transaction has been securely processed with Indian banking networks and committed to PostgreSQL.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl w-full max-w-sm text-left space-y-2 font-mono text-[11px] text-slate-300">
              <p className="flex justify-between">
                <span className="text-slate-500">Order ID:</span> 
                <span className="font-bold text-white">#{successOrder.id}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span> 
                <span className="font-bold text-emerald-400">₹{successOrder.totalAmount.toLocaleString("en-IN")}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-500 font-sans">Option Chosen:</span> 
                <span className="text-white">{successOrder.paymentMethod}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-500 font-sans">Estimated Delivery:</span> 
                <span className="text-teal-400 font-bold">{successOrder.estimatedDeliveryDate}</span>
              </p>
              <hr className="border-slate-800 my-1" />
              <p className="text-[10px] text-slate-500 leading-normal font-sans">
                ✓ SQL statements executed successfully on PostgreSQL database. Redirection begins shortly.
              </p>
            </div>

            <button
              onClick={() => {
                setShowPaymentSuccessOverlay(false);
                if (onOrderSuccess) onOrderSuccess();
                onClose();
              }}
              className="w-full max-w-sm py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl cursor-pointer tracking-wider uppercase transition shadow-lg shadow-emerald-500/20"
            >
              Track Your Order Now
            </button>
          </div>
        )}

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-teal-400" />
            <h2 className="text-lg font-bold">Shopping Basket</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 px-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {cartItems.length === 0 ? (
            /* Empty state */
            <div className="py-24 text-center text-slate-400 space-y-3">
              <span className="text-6xl">🛒</span>
              <p className="text-sm font-semibold">Your shopping basket is empty</p>
              <p className="text-xs max-w-xs mx-auto">Browse the catalog to add high quality products at incredible prices.</p>
            </div>
          ) : (
            /* Drawer Cart List */
            <>
              {/* Database constraint validation warnings inside checkout */}
              {dbError && (
                <div id="checkout-err-display" className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-left">
                  <div className="flex gap-2 items-center text-rose-700 font-bold mb-1.5 text-xs uppercase tracking-wider font-mono">
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                    <span>Postgres Transaction Aborted</span>
                  </div>
                  <p className="text-xs font-mono text-rose-900 bg-rose-100/30 p-2.5 rounded-lg border border-rose-200/80 leading-relaxed">
                    {dbError.message || "Query rolled back due to serialized stock shortage."}
                  </p>
                </div>
              )}

              <div id="cart-items-wrapper" className="space-y-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Selected Gear Items</h3>
                {cartItems.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex justify-between items-center gap-4 bg-slate-50 p-4 border border-slate-200/80 rounded-2xl"
                  >
                    <div className="flex gap-3 items-center min-w-0 flex-1 text-left">
                      <img src={item.product.imageUrl} className="h-12 w-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 block text-xs truncate">{item.product.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">₹{item.product.price.toLocaleString("en-IN")} / item</span>
                      </div>
                    </div>

                    {/* Adjusters */}
                    <div className="flex items-center gap-1.5 shrink-0 bg-white border border-slate-200 p-0.5 rounded-lg">
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                        className="p-1 hover:bg-slate-100 text-slate-600 rounded cursor-pointer"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-xs font-bold font-mono px-1 w-5 text-center">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                        className="p-1 hover:bg-slate-100 text-slate-600 rounded cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => onRemoveItem(item.product.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* SECTION: Address Management */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center text-xs">
                  <h3 className="font-bold text-slate-500 uppercase tracking-widest pl-1">1. Delivery Destination</h3>
                  <button
                    onClick={() => setShowAddAddress(!showAddAddress)}
                    className="text-teal-600 hover:text-teal-700 font-bold cursor-pointer"
                  >
                    {showAddAddress ? "Cancel" : "+ New"}
                  </button>
                </div>

                {showAddAddress ? (
                  <form onSubmit={handleAddAddress} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Set Address</span>
                    <input
                      type="text"
                      required
                      placeholder="Street address / House number"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl focus:border-teal-500 text-xs text-slate-800"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        placeholder="City"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl text-xs text-slate-800"
                      />
                      <input
                        type="text"
                        placeholder="State"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl text-xs text-slate-800"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        placeholder="PIN Code"
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl text-xs text-slate-800"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl text-xs text-slate-800"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-teal-400 font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Save to Address Store
                    </button>
                  </form>
                ) : addresses.length === 0 ? (
                  <div className="p-3 text-center border rounded-xl text-slate-400 text-xs bg-slate-50">
                    No delivery destination stored. Please add an address to ship.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {addresses.map((a) => (
                      <label
                        key={a.id}
                        className={`flex gap-3 items-start p-3 border rounded-2xl cursor-pointer transition-all ${
                          selectedAddrId === a.id 
                            ? "border-amber-500 bg-amber-50/20" 
                            : "border-slate-200 bg-slate-50/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="shipping_addr"
                          checked={selectedAddrId === a.id}
                          onChange={() => setSelectedAddrId(a.id)}
                          className="mt-1 cursor-pointer"
                        />
                        <div className="text-xs text-left">
                          <span className="font-bold flex items-center gap-1 text-slate-800">
                            <MapPin className="h-3 w-3 text-[#FF9933]" />
                            {a.street}
                          </span>
                          <span className="text-slate-500 font-mono text-[10px] pl-4 block mt-0.5">
                            {a.city}, {a.state} - {a.zipCode}, {a.country}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION: Payment Modes selector */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="font-bold text-slate-500 uppercase tracking-widest pl-1 text-xs">2. Choose Payment Channel</h3>
                
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMode("cod")}
                    className={`p-3 text-xs font-bold rounded-xl border text-center transition ${
                      paymentMode === "cod" ? "border-teal-500 bg-teal-50/30 text-teal-700" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    💵 Cash on Delivery
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode("upi")}
                    className={`p-3 text-xs font-bold rounded-xl border text-center transition ${
                      paymentMode === "upi" ? "border-teal-500 bg-teal-50/30 text-teal-700" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    📱 UPI (Demo)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode("card")}
                    className={`p-3 text-xs font-bold rounded-xl border text-center transition ${
                      paymentMode === "card" ? "border-teal-500 bg-teal-50/30 text-teal-700" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    💳 Card (Demo)
                  </button>
                </div>

                {paymentMode === "upi" && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 animate-fade-in text-xs">
                    <label className="block text-slate-400 text-[10px] uppercase font-bold">Bharat Virtual Payment Address (UPI ID)</label>
                    <input
                      type="text"
                      placeholder="yasaswini@okaxis"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-xs tracking-wide"
                    />
                    <p className="text-[10px] text-slate-450 leading-relaxed font-sans mt-1">
                      * Enter any standard UPI ID. No actual payment request is dispatched.
                    </p>
                  </div>
                )}

                {paymentMode === "card" && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Debit or Credit Card Preferences</span>
                      <button
                        onClick={() => setShowAddPayment(!showAddPayment)}
                        className="text-teal-600 hover:text-teal-700 font-bold font-mono cursor-pointer"
                      >
                        {showAddPayment ? "Cancel" : "+ Register"}
                      </button>
                    </div>

                    {showAddPayment ? (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-left">
                        <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Store card</span>
                        <input
                          type="text"
                          required
                          placeholder="Cardholder Name"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          className="w-full px-3 py-1.5 border rounded-lg text-xs uppercase"
                        />
                        <input
                          type="text"
                          required
                          placeholder="Card Number"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className="w-full px-3 py-1.5 border rounded-lg text-xs"
                        />
                        <input
                          type="text"
                          required
                          placeholder="Expiry MM/YY"
                          value={expiry}
                          onChange={(e) => setExpiry(e.target.value)}
                          className="w-full px-3 py-1.5 border rounded-lg text-xs font-mono"
                        />
                        <button
                          type="button"
                          onClick={handleAddPayment}
                          className="w-full py-1.5 bg-slate-900 text-teal-400 font-bold rounded-lg text-xs cursor-pointer"
                        >
                          Record Card
                        </button>
                      </div>
                    ) : payments.length === 0 ? (
                      <div className="p-3 text-center border rounded-xl text-slate-400 text-xs bg-slate-50">
                        No credit card stored. Please register a mock card.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {payments.map((p) => (
                          <label
                            key={p.id}
                            className={`flex gap-3 items-start p-3 border rounded-2xl cursor-pointer transition-all ${
                              selectedPayId === p.id 
                                ? "border-amber-500 bg-amber-50/20" 
                                : "border-slate-200 bg-slate-50/50"
                            }`}
                          >
                            <input
                              type="radio"
                              name="payment_instr"
                              checked={selectedPayId === p.id}
                              onChange={() => setSelectedPayId(p.id)}
                              className="mt-1 cursor-pointer"
                            />
                            <div className="text-xs text-left">
                              <span className="font-bold flex items-center gap-1 text-slate-800">
                                <CreditCard className="h-3 w-3 text-[#FF9933]" />
                                {p.cardHolder}
                              </span>
                              <span className="text-slate-500 font-mono text-[10px] pl-4 block mt-0.5">
                                {p.cardNumberMasked} ({p.expiry})
                              </span>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Billing Actions */}
        {cartItems.length > 0 && (
          <div className="p-6 border-t border-slate-250 bg-slate-50 relative bottom-0">
            <div className="space-y-2 mb-4 font-mono text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Database Subtotal:</span>
                <span>₹{totalAmount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping & Delivery Fee:</span>
                <span className="text-[#138808] font-bold">FREE (Bharat Promo)</span>
              </div>
              <div className="flex justify-between pt-3.5 border-t border-slate-200 text-slate-900 font-extrabold text-sm uppercase">
                <span>Total Charge:</span>
                <span className="text-[#138808] font-black">₹{totalAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <button
              id="checkout-finalize-btn"
              onClick={handleCheckoutSubmit}
              disabled={isCheckoutDisabled()}
              type="button"
              className="w-full py-4 bg-slate-910 bg-slate-900 hover:bg-slate-800 text-teal-400 font-black rounded-2xl transition-all cursor-pointer shadow flex items-center justify-center gap-2 text-xs uppercase tracking-wider disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {checkoutLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                  <span>Processing Postgres Transaction...</span>
                </>
              ) : !selectedAddrId ? (
                "Please configure Shipping Address"
              ) : (
                <>
                  <Sparkles className="h-4.5 w-4.5" />
                  Pay Now
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
