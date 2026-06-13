/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { requestApi, setToken, ApiErrorResponse } from "../lib/api.ts";
import { UserRole } from "../types.ts";
import { 
  LogIn, 
  UserPlus, 
  KeyRound, 
  AlertTriangle, 
  HelpCircle, 
  Shield, 
  Store, 
  ShoppingBag, 
  Smartphone, 
  MapPin, 
  Building, 
  Percent, 
  Check, 
  X, 
  Plus,
  Compass
} from "lucide-react";

interface AuthScreenProps {
  onAuthSuccess: (session: { id: number; email: string; role: UserRole; fullName: string }) => void;
}

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<UserRole>("customer");
  
  // Generic login values
  const [loginEmailOrPhone, setLoginEmailOrPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginAdminPasscode, setLoginAdminPasscode] = useState("");
  const [loginIsAdmin, setLoginIsAdmin] = useState(false);

  // Customer signup values
  const [custEmail, setCustEmail] = useState("");
  const [custFullName, setCustFullName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custAddress, setCustAddress] = useState("");
  const [custPassword, setCustPassword] = useState("");
  const [custConfirmPassword, setCustConfirmPassword] = useState("");

  // Vendor signup values
  const [vendEmail, setVendEmail] = useState("");
  const [vendName, setVendName] = useState("");
  const [vendBusName, setVendBusName] = useState("");
  const [vendPhone, setVendPhone] = useState("");
  const [vendDesc, setVendDesc] = useState("");
  const [vendWhatSell, setVendWhatSell] = useState("Smartphones");
  const [vendGst, setVendGst] = useState("");
  const [vendShopAddr, setVendShopAddr] = useState("");
  const [vendBranches, setVendBranches] = useState<string[]>([]);
  const [branchInput, setBranchInput] = useState("");
  const [vendPassword, setVendPassword] = useState("");
  const [vendConfirmPassword, setVendConfirmPassword] = useState("");

  // Admin signup values
  const [adminEmail, setAdminEmail] = useState("");
  const [adminIdVal, setAdminIdVal] = useState("");
  const [adminPasscodeVal, setAdminPasscodeVal] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminConfirmPassword, setAdminConfirmPassword] = useState("");

  // OTP State Engine
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpStatus, setOtpStatus] = useState<{ type: "idle" | "sent" | "success" | "error"; text: string }>({ type: "idle", text: "" });

  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState<ApiErrorResponse | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  // Clean form resets when switching tabs or roles
  const resetFormStates = () => {
    setDbError(null);
    setSuccessMsg("");
    setGeneratedOtp(null);
    setOtpInput("");
    setOtpVerified(false);
    setOtpStatus({ type: "idle", text: "" });
  };

  // Password rules check (On-the-fly indicator)
  const getPasswordStrength = (pass: string) => {
    const rules = {
      minLength: pass.length >= 8,
      hasUpper: /[A-Z]/.test(pass),
      hasLower: /[a-z]/.test(pass),
      hasDigit: /\d/.test(pass),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass),
    };
    
    const count = Object.values(rules).filter(Boolean).length;
    let rank = "Weak";
    let color = "bg-red-500";
    if (count === 5) {
      rank = "Very Strong";
      color = "bg-emerald-600";
    } else if (count >= 3) {
      rank = "Moderate";
      color = "bg-amber-500";
    }
    return { rules, score: count, rank, color };
  };

  const getActivePassword = () => {
    if (role === "customer") return custPassword;
    if (role === "vendor") return vendPassword;
    return adminPassword;
  };

  const activePassStrength = getPasswordStrength(getActivePassword());

  // Branch management for vendors
  const handleAddBranch = () => {
    const trimmed = branchInput.trim();
    if (trimmed && !vendBranches.includes(trimmed)) {
      setVendBranches([...vendBranches, trimmed]);
      setBranchInput("");
    }
  };

  const handleRemoveBranch = (idx: number) => {
    setVendBranches(vendBranches.filter((_, i) => i !== idx));
  };

  // OTP actions
  const handleGenerateOtp = () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);
    setOtpVerified(false);
    setOtpStatus({
      type: "sent",
      text: "OTP generated and transmitted. Please view browser alert for simulation."
    });
    // Trigger required browser alert for demo
    window.alert(`[DEMO TESTING OTP SERVICE]\nYour 6-digit Indian verification code is: ${otp}\n\nInput this code into the Verification field to authentic your phone number.`);
  };

  const handleVerifyOtp = () => {
    if (!generatedOtp) {
      setOtpStatus({ type: "error", text: "Please generate an OTP first." });
      return;
    }
    if (otpInput === generatedOtp) {
      setOtpVerified(true);
      setOtpStatus({ type: "success", text: "User Verified Successfully" });
      window.alert("User Verified Successfully");
    } else {
      setOtpVerified(false);
      setOtpStatus({ type: "error", text: "Invalid OTP digit sequence. Please try again." });
    }
  };

  // Submission handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setDbError(null);
    setSuccessMsg("");

    let endpoint = "/api/auth/login";
    let payload: any = {};

    if (isLogin) {
      endpoint = "/api/auth/login";
      payload = {
        email: loginEmailOrPhone,
        password: loginPassword,
        adminPasscode: loginIsAdmin ? loginAdminPasscode : undefined
      };
    } else {
      endpoint = "/api/auth/register";
      payload = { role };

      if (role === "customer") {
        payload.email = custEmail;
        payload.password = custPassword;
        payload.confirmPassword = custConfirmPassword;
        payload.fullName = custFullName;
        payload.phone = custPhone;
        payload.shippingAddress = custAddress;
        payload.otpVerified = otpVerified;
      } else if (role === "vendor") {
        payload.businessEmail = vendEmail;
        payload.password = vendPassword;
        payload.confirmPassword = vendConfirmPassword;
        payload.vendorName = vendName;
        payload.businessName = vendBusName;
        payload.phone = vendPhone;
        payload.businessDescription = vendDesc;
        payload.whatDoYouSell = vendWhatSell;
        payload.gstNumber = vendGst;
        payload.shopAddress = vendShopAddr;
        payload.branchLocations = vendBranches;
        payload.otpVerified = otpVerified;
      } else if (role === "admin") {
        payload.email = adminEmail;
        payload.password = adminPassword;
        payload.confirmPassword = adminConfirmPassword;
        payload.adminId = adminIdVal;
        payload.adminPasscode = adminPasscodeVal;
      }
    }

    try {
      const res = await requestApi<{ success: boolean; token: string; user: any; message?: string }>(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.token) {
        setToken(res.token);
        setSuccessMsg(res.message || (isLogin ? "Welcome Back!" : "Account Registered and Database Initialized!"));
        setTimeout(() => {
          onAuthSuccess({
            id: res.user.id,
            email: res.user.email,
            role: res.user.role,
            fullName: res.user.fullName || res.user.email.split("@")[0]
          });
        }, 800);
      }
    } catch (err: any) {
      console.error("[Auth API error]:", err);
      setDbError(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePreseedSelect = (emailVal: string, passVal: string, isAdminCheck = false, passcodeVal = "") => {
    setIsLogin(true);
    setLoginEmailOrPhone(emailVal);
    setLoginPassword(passVal);
    setLoginIsAdmin(isAdminCheck);
    if (isAdminCheck) {
      setLoginAdminPasscode(passcodeVal);
    }
    setDbError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
      <div id="auth-card" className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all my-8">
        
        {/* Visual Brand Identity Saffron-White-Green accent lines */}
        <div className="h-1.5 w-full grid grid-cols-3">
          <div className="bg-[#FF9933]"></div>
          <div className="bg-slate-100"></div>
          <div className="bg-[#138808]"></div>
        </div>

        {/* Dynamic header banner */}
        <div className="bg-slate-900 px-8 py-6 text-white text-center relative border-b border-slate-800">
          <div className="absolute top-4 right-4 bg-teal-400 text-slate-900 text-xs font-bold font-mono px-2 py-0.5 rounded shadow tracking-wider uppercase">
            Active PG Link
          </div>
          <div className="flex justify-center items-center gap-2 mb-1.5">
            <Compass className="h-8 w-8 text-[#FF9933] animate-spin-slow" />
            <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-orange-400 via-white to-green-400 bg-clip-text text-transparent">
              Bharat E-Commerce Hub
            </span>
          </div>
          <p className="text-slate-400 text-xs">Realistic Indian Marketplace Protocol • Security Verified</p>
        </div>

        <div className="p-8">
          
          {/* PostGreSQL & Rest API Exception Diagnostics Banner */}
          {dbError && (
            <div id="sql-diagnostic-banner" className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-left">
              <div className="flex gap-2 items-start text-red-700 font-bold mb-2 text-sm uppercase tracking-wider font-mono">
                <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
                <span>[PostgreSQL Driver Exception]</span>
              </div>
              
              <div className="space-y-2 text-xs font-mono text-red-950 bg-red-100/60 p-3.5 rounded-lg border border-red-100">
                <div>
                  <span className="font-bold text-red-800">Constraint Error:</span> {dbError.error || "SERVER_REJECT"}
                </div>
                <div>
                  <span className="font-bold text-red-800">Diagnostic Message:</span> {dbError.message || "Unspecified validation fallback."}
                </div>
                
                {dbError.postgresError && (
                  <>
                    <div className="pt-2 border-t border-red-300/40 my-1"></div>
                    <div>
                      <span className="font-bold text-red-800">SQL State Code:</span> <span className="bg-red-200 px-1.5 py-0.5 rounded font-bold text-red-950">{dbError.postgresError.code}</span>
                    </div>
                    <div>
                      <span className="font-bold text-red-800">DB Details:</span> {dbError.postgresError.detail}
                    </div>
                    {dbError.postgresError.table && (
                      <div>
                        <span className="font-bold text-red-800">Target Table:</span> {dbError.postgresError.table}
                      </div>
                    )}
                    {dbError.postgresError.constraint && (
                      <div>
                        <span className="font-bold text-red-800">Constraint Violation:</span> <span className="bg-red-200/50 px-1 rounded text-red-900">{dbError.postgresError.constraint}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
              <p className="text-[10px] text-red-600/80 mt-2 italic font-medium">
                * Transaction context safely rolled back. No duplicate records parsed.
              </p>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm font-semibold flex items-center gap-2 animate-pulse">
              <Check className="h-5 w-5 text-green-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Navigation tabs */}
          <div className="grid grid-cols-2 bg-slate-100 p-1.5 rounded-xl mb-6">
            <button
              id="login-tab-btn"
              type="button"
              onClick={() => { setIsLogin(true); resetFormStates(); }}
              className={`flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                isLogin ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <LogIn className="h-4 w-4" />
              Sign Into Account
            </button>
            <button
              id="register-tab-btn"
              type="button"
              onClick={() => { setIsLogin(false); resetFormStates(); setRole("customer"); }}
              className={`flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                !isLogin ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Join As Member
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-6">

            {/* --- SIGN UP FLOW --- */}
            {!isLogin && (
              <div className="space-y-5">
                
                {/* Horizontal Role Selector Option Cards */}
                <div>
                  <label className="block text-slate-700 text-xs font-bold mb-2 uppercase tracking-wider">Select Signup Account Mode</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      id="role-customer-btn"
                      type="button"
                      onClick={() => { setRole("customer"); resetFormStates(); }}
                      className={`flex flex-col items-center justify-center px-4 py-3 border rounded-xl text-center cursor-pointer transition-all ${
                        role === "customer" 
                          ? "border-teal-500 bg-teal-50/30 text-teal-950 font-bold ring-2 ring-teal-500/20" 
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <ShoppingBag className="h-5 w-5 mb-1 text-teal-600" />
                      <span className="text-xs">Customer</span>
                    </button>
                    <button
                      id="role-vendor-btn"
                      type="button"
                      onClick={() => { setRole("vendor"); resetFormStates(); }}
                      className={`flex flex-col items-center justify-center px-4 py-3 border rounded-xl text-center cursor-pointer transition-all ${
                        role === "vendor" 
                          ? "border-amber-500 bg-amber-50/30 text-amber-950 font-bold ring-2 ring-amber-500/20" 
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Store className="h-5 w-5 mb-1 text-amber-600" />
                      <span className="text-xs">Vendor</span>
                    </button>
                    <button
                      id="role-admin-btn"
                      type="button"
                      onClick={() => { setRole("admin"); resetFormStates(); }}
                      className={`flex flex-col items-center justify-center px-4 py-3 border rounded-xl text-center cursor-pointer transition-all ${
                        role === "admin" 
                          ? "border-purple-500 bg-purple-50/30 text-purple-950 font-bold ring-2 ring-purple-500/20" 
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Shield className="h-5 w-5 mb-1 text-purple-600" />
                      <span className="text-xs">Platform Admin</span>
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4"></div>

                {/* --- CUSTOMER FIELDS --- */}
                {role === "customer" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-600 text-xs font-semibold mb-1.5">Full Name *</label>
                        <input
                          id="reg-fullname-input"
                          type="text"
                          required
                          placeholder="e.g. Rahul Sharma"
                          value={custFullName}
                          onChange={(e) => setCustFullName(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all text-sm text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 text-xs font-semibold mb-1.5">Indian Mobile Number *</label>
                        <div className="relative">
                          <input
                            id="reg-mobile-input"
                            type="text"
                            required
                            placeholder="e.g. 9876543210"
                            value={custPhone}
                            onChange={(e) => setCustPhone(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all text-sm text-slate-800"
                          />
                          <Smartphone className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-600 text-xs font-semibold mb-1.5">Email Address *</label>
                      <input
                        id="reg-email-input"
                        type="email"
                        required
                        placeholder="rahul.sharma@example.com"
                        value={custEmail}
                        onChange={(e) => setCustEmail(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all text-sm text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 text-xs font-semibold mb-1.5">Shipping Address *</label>
                      <div className="relative">
                        <textarea
                          id="reg-address-input"
                          required
                          rows={2}
                          placeholder="e.g. Block A, Sector 12, Dwarka, New Delhi"
                          value={custAddress}
                          onChange={(e) => setCustAddress(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all text-sm text-slate-800"
                        />
                        <MapPin className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-600 text-xs font-semibold mb-1.5">Password *</label>
                        <input
                          id="reg-password-input"
                          type="password"
                          required
                          placeholder="••••••••"
                          value={custPassword}
                          onChange={(e) => setCustPassword(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all text-sm text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 text-xs font-semibold mb-1.5">Confirm Password *</label>
                        <input
                          id="reg-confirmpassword-input"
                          type="password"
                          required
                          placeholder="••••••••"
                          value={custConfirmPassword}
                          onChange={(e) => setCustConfirmPassword(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all text-sm text-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* --- VENDOR FIELDS --- */}
                {role === "vendor" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-600 text-xs font-semibold mb-1.5">Vendor full Name *</label>
                        <input
                          id="reg-vendor-name-input"
                          type="text"
                          required
                          placeholder="e.g. Ramesh Patel"
                          value={vendName}
                          onChange={(e) => setVendName(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all text-sm text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 text-xs font-semibold mb-1.5">Business / Enterprise Name *</label>
                        <div className="relative">
                          <input
                            id="reg-business-name-input"
                            type="text"
                            required
                            placeholder="e.g. Patel Electronics"
                            value={vendBusName}
                            onChange={(e) => setVendBusName(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all text-sm text-slate-800"
                          />
                          <Building className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-600 text-xs font-semibold mb-1.5">Business Email Address *</label>
                        <input
                          id="reg-business-email-input"
                          type="email"
                          required
                          placeholder="sales@patelelectronics.in"
                          value={vendEmail}
                          onChange={(e) => setVendEmail(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all text-sm text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 text-xs font-semibold mb-1.5">Business Mobile Number *</label>
                        <div className="relative">
                          <input
                            id="reg-vendor-mobile"
                            type="text"
                            required
                            placeholder="e.g. 9876543200"
                            value={vendPhone}
                            onChange={(e) => setVendPhone(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all text-sm text-slate-800"
                          />
                          <Smartphone className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-600 text-xs font-semibold mb-1.5">What Do You Sell? *</label>
                        <select
                          id="reg-vendor-what-sell"
                          value={vendWhatSell}
                          onChange={(e) => setVendWhatSell(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all text-sm text-slate-800"
                        >
                          <option value="Smartphones">Smartphones</option>
                          <option value="Laptops">Laptops</option>
                          <option value="Headphones">Headphones</option>
                          <option value="Watches">Smart Watches</option>
                          <option value="Appliances">Home Appliances</option>
                          <option value="Clothing">Clothing</option>
                          <option value="Beauty">Beauty Products</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-600 text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                          <span>GST TIN Number *</span>
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded font-mono">15 Characters</span>
                        </label>
                        <div className="relative">
                          <input
                            id="reg-vendor-gst"
                            type="text"
                            required
                            placeholder="e.g. 22AAAAA0000A1Z5"
                            value={vendGst}
                            onChange={(e) => setVendGst(e.target.value.toUpperCase())}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all text-sm font-mono text-slate-800"
                          />
                          <Percent className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-600 text-xs font-semibold mb-1.5">Business / Enterprise Description</label>
                      <textarea
                        id="reg-vendor-desc"
                        rows={1}
                        placeholder="Patel Electronics supplies premium electronic peripherals in Western India."
                        value={vendDesc}
                        onChange={(e) => setVendDesc(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all text-sm text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 text-xs font-semibold mb-1.5">Primary Shop / Warehouse Address *</label>
                      <input
                        id="reg-vendor-address"
                        type="text"
                        required
                        placeholder="e.g. 45 Commercial Arcade, CG Road, Ahmedabad, Gujarat"
                        value={vendShopAddr}
                        onChange={(e) => setVendShopAddr(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all text-sm text-slate-800"
                      />
                    </div>

                    {/* Rich Dynamic Branches Manager */}
                    <div>
                      <label className="block text-slate-600 text-xs font-semibold mb-1.5">Additional Branch Locations (Optional)</label>
                      <div className="flex gap-2">
                        <input
                          id="branch-input"
                          type="text"
                          placeholder="e.g. Vadodara, Surat"
                          value={branchInput}
                          onChange={(e) => setBranchInput(e.target.value)}
                          className="flex-1 px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all text-sm text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={handleAddBranch}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-xl transition-all text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="h-4 w-4" /> Add Branch
                        </button>
                      </div>

                      {vendBranches.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                          {vendBranches.map((branch, i) => (
                            <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium rounded-lg">
                              <span>{branch}</span>
                              <button type="button" onClick={() => handleRemoveBranch(i)} className="p-0.5 hover:bg-amber-100 rounded-md text-amber-600 cursor-pointer">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-600 text-xs font-semibold mb-1.5">Password *</label>
                        <input
                          id="vend-password"
                          type="password"
                          required
                          placeholder="••••••••"
                          value={vendPassword}
                          onChange={(e) => setVendPassword(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all text-sm text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 text-xs font-semibold mb-1.5">Confirm Password *</label>
                        <input
                          id="vend-confirmpassword"
                          type="password"
                          required
                          placeholder="••••••••"
                          value={vendConfirmPassword}
                          onChange={(e) => setVendConfirmPassword(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all text-sm text-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* --- ADMIN FIELDS --- */}
                {role === "admin" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-slate-600 text-xs font-semibold mb-1.5">Admin Staff ID *</label>
                      <input
                        id="reg-admin-id"
                        type="text"
                        required
                        placeholder="e.g. SECURE-07"
                        value={adminIdVal}
                        onChange={(e) => setAdminIdVal(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500 transition-all text-sm text-slate-800 animate-fade-in"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 text-xs font-semibold mb-1.5">Company Corporate Email (Strict) *</label>
                      <input
                        id="reg-admin-email"
                        type="email"
                        required
                        placeholder="yourname@enterprise.in"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500 transition-all text-sm text-slate-800"
                      />
                      <p className="text-[10px] text-purple-700/80 mt-1 pl-1 italic font-medium">
                        * Note: Public domain addresses (like @gmail.com) are automatically blocked by the domain guard filter.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-600 text-xs font-semibold mb-1.5">Account Password *</label>
                        <input
                          id="admin-password"
                          type="password"
                          required
                          placeholder="••••••••"
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500 transition-all text-sm text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 text-xs font-semibold mb-1.5">Confirm Password *</label>
                        <input
                          id="admin-confirmpassword"
                          type="password"
                          required
                          placeholder="••••••••"
                          value={adminConfirmPassword}
                          onChange={(e) => setAdminConfirmPassword(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500 transition-all text-sm text-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* --- LIVE PASSWORD STRENGTH COMPONENT --- */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl mt-4">
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Password Integrity Guard</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      activePassStrength.score === 5 
                        ? "bg-green-100 text-green-800" 
                        : activePassStrength.score >= 3 
                          ? "bg-amber-100 text-amber-800" 
                          : "bg-red-100 text-red-800"
                    }`}>
                      {activePassStrength.rank}
                    </span>
                  </div>

                  {/* Segmented Strength Bar */}
                  <div className="grid grid-cols-5 gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((step) => (
                      <div 
                        key={step} 
                        className={`h-2 rounded transition-all ${
                          activePassStrength.score >= step 
                            ? activePassStrength.color 
                            : "bg-slate-200"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Checklist Items */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      {activePassStrength.rules.minLength ? (
                        <Check className="h-4 w-4 text-green-600 shrink-0" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-400">✖</div>
                      )}
                      <span className={activePassStrength.rules.minLength ? "text-green-800 font-medium" : "text-slate-500"}>At least 8 characters</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600">
                      {activePassStrength.rules.hasUpper ? (
                        <Check className="h-4 w-4 text-green-600 shrink-0" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-400">✖</div>
                      )}
                      <span className={activePassStrength.rules.hasUpper ? "text-green-800 font-medium" : "text-slate-500"}>1 Uppercase letter (A-Z)</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600">
                      {activePassStrength.rules.hasLower ? (
                        <Check className="h-4 w-4 text-green-600 shrink-0" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-400">✖</div>
                      )}
                      <span className={activePassStrength.rules.hasLower ? "text-green-800 font-medium" : "text-slate-500"}>1 Lowercase letter (a-z)</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600">
                      {activePassStrength.rules.hasDigit ? (
                        <Check className="h-4 w-4 text-green-600 shrink-0" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-400">✖</div>
                      )}
                      <span className={activePassStrength.rules.hasDigit ? "text-green-800 font-medium" : "text-slate-500"}>1 Numeric digit (0-9)</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600 sm:col-span-2">
                      {activePassStrength.rules.hasSpecial ? (
                        <Check className="h-4 w-4 text-green-600 shrink-0" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-400">✖</div>
                      )}
                      <span className={activePassStrength.rules.hasSpecial ? "text-green-800 font-medium" : "text-slate-500"}>1 Special character (!@#$%^&*)</span>
                    </div>
                  </div>
                </div>

                {/* --- OTP GENERATOR SECTION (ONLY CUSTOMER / VENDOR) --- */}
                {role !== "admin" && (
                  <div className="p-4 bg-[#fcf9f2] border border-orange-200/50 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                        <Smartphone className="h-4 w-4 text-orange-500" />
                        <span>Indian Sandbox OTP Verification</span>
                      </span>
                      {otpVerified && (
                        <span className="text-[10px] font-bold uppercase bg-green-100 text-green-800 px-2 py-0.5 rounded border border-green-200">
                          Verified
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      To complete registration, you must generate a verification code and verify your simulated mobile number digits.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        id="generate-otp-btn"
                        type="button"
                        onClick={handleGenerateOtp}
                        className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-orange-400 font-bold rounded-xl transition-all cursor-pointer text-xs shrink-0 flex items-center justify-center gap-1"
                      >
                        Generate OTP Code
                      </button>

                      <div className="flex-1 flex gap-2">
                        <input
                          id="otp-input"
                          type="text"
                          maxLength={6}
                          placeholder="Enter 6-digit OTP"
                          value={otpInput}
                          onChange={(e) => setOtpInput(e.target.value)}
                          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 text-sm font-mono text-center tracking-widest text-[#138808] font-bold"
                        />
                        <button
                          id="verify-otp-btn"
                          type="button"
                          onClick={handleVerifyOtp}
                          className="px-4 py-2 bg-[#138808] hover:bg-[#107007] text-white font-bold rounded-xl transition-all cursor-pointer text-xs"
                        >
                          Verify OTP
                        </button>
                      </div>
                    </div>

                    {otpStatus.text && (
                      <div className={`text-[11px] font-semibold flex items-center gap-1 ${
                        otpStatus.type === "success" 
                          ? "text-green-700" 
                          : otpStatus.type === "error" 
                            ? "text-red-700" 
                            : "text-[#996633]"
                      }`}>
                        <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                          otpStatus.type === "success" 
                            ? "bg-green-600 animate-pulse" 
                            : otpStatus.type === "error" 
                              ? "bg-red-600" 
                              : "bg-[#FF9933] animate-ping"
                        }`} />
                        <span>{otpStatus.text}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}


            {/* --- SIGN IN FLOW --- */}
            {isLogin && (
              <div className="space-y-4">
                
                {/* Admin Role Login Filter Toggle */}
                <div className="flex items-center justify-end">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600">
                    <input
                      id="admin-login-checkbox"
                      type="checkbox"
                      checked={loginIsAdmin}
                      onChange={(e) => {
                        setLoginIsAdmin(e.target.checked);
                        resetFormStates();
                      }}
                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4 cursor-pointer"
                    />
                    <Shield className="h-4 w-4 text-purple-600 inline" />
                    <span>Signing in as System State Administrator</span>
                  </label>
                </div>

                <div>
                  <label className="block text-slate-700 text-xs font-semibold mb-1.5 uppercase tracking-wide">
                    {loginIsAdmin ? "Company Corporate Email Address" : "Email or Indian Mobile Number"}
                  </label>
                  <input
                    id="auth-email-input"
                    type="text"
                    required
                    placeholder={loginIsAdmin ? "admin@enterprise.in" : "customer@gmail.com or 9876543212"}
                    value={loginEmailOrPhone}
                    onChange={(e) => setLoginEmailOrPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all text-sm text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 text-xs font-semibold mb-1.5 uppercase tracking-wide">Security Password</label>
                  <div className="relative">
                    <input
                      id="auth-password-input"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all text-sm text-slate-800"
                    />
                    <KeyRound className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                  </div>
                </div>


              </div>
            )}

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className={`w-full mt-2 py-3 px-4 text-slate-900 hover:text-white font-bold rounded-xl transition-all cursor-pointer shadow-md text-sm flex items-center justify-center gap-2 disabled:bg-slate-700 disabled:cursor-not-allowed ${
                loginIsAdmin 
                  ? "bg-purple-300 hover:bg-purple-800" 
                  : isLogin 
                    ? "bg-[#FF9933] hover:bg-[#df7d20]" 
                    : "bg-[#138808] hover:bg-[#0f6b06]"
              }`}
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              ) : isLogin ? (
                <>
                  <LogIn className="h-4 w-4 text-slate-900" />
                  <span>Access Secure Marketplace Gateway</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 text-slate-900" />
                  <span>Register Member & Complete Integration</span>
                </>
              )}
            </button>
          </form>

          {/* Preset Credentials for Quick Diagnostics Testing */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-slate-600 mb-3.5">
              <HelpCircle className="h-4 w-4 text-slate-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Diagnostic Sandbox Presets</h3>
            </div>
            
            <div className="space-y-2.5">
              <button
                id="preseed-customer-btn"
                type="button"
                onClick={() => handlePreseedSelect("customer@gmail.com", "customer123")}
                className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left cursor-pointer transition-colors text-xs flex justify-between items-center"
              >
                <div>
                  <span className="font-bold text-slate-700 block">Customer Account</span>
                  <span className="text-slate-500 font-mono">customer@gmail.com / customer123</span>
                </div>
                <div className="px-2 py-0.5 bg-teal-50 border border-teal-200 text-teal-800 rounded font-bold">Customer</div>
              </button>

              <button
                id="preseed-vendor-btn"
                type="button"
                onClick={() => handlePreseedSelect("9876543211", "vendor123")}
                className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left cursor-pointer transition-colors text-xs flex justify-between items-center"
              >
                <div>
                  <span className="font-bold text-slate-700 block">Vendor Account (Login via Phone Selected)</span>
                  <span className="text-slate-500 font-mono">9876543211 / vendor123</span>
                </div>
                <div className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 rounded font-bold font-mono">Vendor</div>
              </button>

              <button
                id="preseed-admin-btn"
                type="button"
                onClick={() => handlePreseedSelect("admin@enterprise.in", "admin123", true)}
                className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left cursor-pointer transition-colors text-xs flex justify-between items-center"
              >
                <div>
                  <span className="font-bold text-slate-700 block">System Administrator</span>
                  <span className="text-slate-500 font-mono">admin@enterprise.in / admin123</span>
                </div>
                <div className="px-2 py-0.5 bg-purple-50 border border-purple-200 text-purple-800 rounded font-bold">Admin</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
