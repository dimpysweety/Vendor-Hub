/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { requestApi } from "../lib/api.ts";
import { Product, Review } from "../types.ts";
import { Star, X, Check, MessageSquare, ShoppingCart, Tag, Send } from "lucide-react";
import { motion } from "motion/react";

interface ProductDetailsModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  userRole: string;
}

export function ProductDetailsModal({ product, onClose, onAddToCart, userRole }: ProductDetailsModalProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Submit Form States
  const [rating, setRating] = useState<number>(5);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadReviews() {
      setLoading(true);
      try {
        const list = await requestApi<Review[]>(`/api/reviews/${product.id}`);
        setReviews(list);
      } catch (err) {
        console.error("Failed to load reviews:", err);
      } finally {
        setLoading(false);
      }
    }
    loadReviews();
  }, [product.id]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError("Please write a small comment to share your experience");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const newReview = await requestApi<Review>("/api/reviews", {
        method: "POST",
        body: JSON.stringify({
          productId: product.id,
          rating,
          comment: comment.trim()
        })
      });
      setReviews((prev) => [newReview, ...prev]);
      setSuccess(true);
      setComment("");
      setRating(5);
      // Automatically reset success banner in 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.message || err?.error || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const isOutOfStock = product.inventory <= 0;
  const discountPct = product.discount || 0;
  const originalPrice = discountPct > 0 
    ? Math.round(product.price / (1 - discountPct / 100))
    : product.price;

  // Compute average stats
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : (product.rating || 4.1).toFixed(1);

  return (
    <div id={`product-details-modal-${product.id}`} className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200"
      >
        {/* Header Block */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#FF9933] block mb-0.5">
              Product Detailed Specification
            </span>
            <h2 className="text-lg font-bold tracking-tight line-clamp-1">
              {product.title}
            </h2>
          </div>
          <button
            id="close-details-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-sans">
            {/* Left Hand: Image Column */}
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden h-72 md:h-96 relative flex items-center justify-center">
                <img
                  src={product.imageUrl}
                  alt={product.title}
                  className="max-h-full max-w-full object-contain"
                  referrerPolicy="no-referrer"
                />
                
                {discountPct > 0 && (
                  <span className="absolute top-4 left-4 bg-red-600 text-white text-xs font-black px-3 py-1 rounded-xl shadow-lg font-mono">
                    {discountPct}% OFF
                  </span>
                )}
                
                <span className="absolute top-4 right-4 bg-slate-900 text-slate-100 text-xs font-bold px-3 py-1 rounded-xl shadow-sm">
                  {product.category}
                </span>

                {isOutOfStock && (
                  <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center">
                    <span className="bg-red-600 text-white text-sm font-extrabold px-6 py-2 rounded-2xl shadow-xl tracking-widest">
                      OUT OF STOCK
                    </span>
                  </div>
                )}
              </div>

              {/* Quick Pricing Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block font-mono">Effective Deal Price</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-[#138808] font-mono">
                      ₹{product.price.toLocaleString("en-IN")}
                    </span>
                    {discountPct > 0 && (
                      <span className="text-sm text-slate-400 line-through font-mono">
                        ₹{originalPrice.toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                </div>

                {userRole !== "vendor" && (
                  <button
                    id="modal-add-to-cart-btn"
                    onClick={() => {
                      onAddToCart(product);
                    }}
                    disabled={isOutOfStock}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all border ${
                      isOutOfStock
                        ? "bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed shadow-none"
                        : "bg-slate-950 hover:bg-slate-900 text-white border-slate-950 cursor-pointer"
                    }`}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Add To Cart
                  </button>
                )}
              </div>
            </div>

            {/* Right Hand: Specs & Brand Details Column */}
            <div className="space-y-6">
              <div>
                <span className="text-xs font-semibold text-[#FF9933] uppercase tracking-wider font-mono">
                  {product.brand || "Generics"} Official Store
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">{product.title}</h3>
                
                {/* Aggregate Star Rating */}
                <div className="flex items-center gap-2 mt-3 bg-amber-50 border border-amber-200/50 rounded-xl p-2.5 w-fit">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const starVal = Number(avgRating);
                      return (
                        <Star
                          key={star}
                          className={`h-4.5 w-4.5 ${
                            star <= starVal
                              ? "fill-amber-500 text-amber-500"
                              : "text-slate-300"
                          }`}
                        />
                      );
                    })}
                  </div>
                  <span className="text-sm font-bold text-amber-950 font-mono">{avgRating} / 5.0</span>
                  <span className="text-xs text-slate-500">• {reviews.length} Verified Buyer Reviews</span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 font-mono">Product Briefing</h4>
                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>

              {/* Metadata Highlights */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase font-mono block">Database Inventory</span>
                  <span className={`text-xs font-extrabold ${product.inventory > 5 ? "text-slate-700" : "text-red-500"}`}>
                    {product.inventory > 0 ? `${product.inventory} items remaining` : "Out of stock / Sold out"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase font-mono block">Registered Merchant</span>
                  <span className="text-xs font-extrabold text-slate-700">
                    {product.vendorName || "Super Tech Vendor Ltd."}
                  </span>
                </div>
              </div>

              {/* Category specifications */}
              <div className="flex items-center gap-2">
                <span className="text-xs bg-slate-100 px-3 py-1 rounded-lg text-slate-600 font-semibold flex items-center gap-1">
                  <Tag className="h-3 w-3" /> {product.category}
                </span>
                <span className="text-xs bg-slate-100 px-3 py-1 rounded-lg text-slate-600 font-semibold">
                  M.R.P Clearance
                </span>
              </div>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Star-Rating and Text-Review Section */}
          <div className="space-y-6">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 font-sans">
              <MessageSquare className="h-5 w-5 text-slate-700" /> Ratings & Customer Reviews ({reviews.length})
            </h3>

            {/* Active Submission Form for logged-in Customers */}
            {userRole === "customer" && (
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4 text-left font-sans">
                <h4 className="text-sm font-bold text-slate-800">Submit Your Experience Rating & Review</h4>
                
                <form id="product-review-submission-form" onSubmit={handleSubmitReview} className="space-y-4">
                  {/* Select Ratings using Interactive Stars */}
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Your Recommendation Rating</label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoveredRating(star)}
                          onMouseLeave={() => setHoveredRating(null)}
                          onClick={() => setRating(star)}
                          className="p-0.5 hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star
                            className={`h-7 w-7 transition-colors duration-150 ${
                              star <= (hoveredRating ?? rating)
                                ? "fill-amber-500 text-amber-500"
                                : "text-slate-300"
                            }`}
                          />
                        </button>
                      ))}
                      <span className="text-xs text-slate-500 ml-2 font-mono font-bold">
                        {rating === 1 && "⚠️ Needs Improvement (1)"}
                        {rating === 2 && "⚠️ Below Average (2)"}
                        {rating === 3 && "✨ Average / Fine (3)"}
                        {rating === 4 && "⭐ Highly Recommended (4)"}
                        {rating === 5 && "🔥 Absolute Perfection (5)"}
                      </span>
                    </div>
                  </div>

                  {/* Comment Text Area */}
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Detailed Remarks</label>
                    <textarea
                      id="review-comment-textarea"
                      placeholder="Share your experience about using this product... Mention delivery quality, skin effect or performance."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      className="w-full text-slate-900 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>

                  {error && <p className="text-xs text-red-600 font-bold font-mono">⚠️ {error}</p>}
                  {success && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                      <Check className="h-4 w-4 bg-emerald-600 text-white rounded-full p-0.5" />
                      Your trusted review and rating has been recorded successfully in the PostgreSQL simulated state
                    </div>
                  )}

                  <button
                    id="submit-review-btn"
                    disabled={submitting}
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {submitting ? "Publishing Review..." : "Publish Review"}
                  </button>
                </form>
              </div>
            )}

            {userRole !== "customer" && (
              <div className="text-slate-500 text-xs italic bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200 font-sans">
                📌 Customer accounts are authorized to write active product reviews. Your current role is <strong>{userRole}</strong>.
              </div>
            )}

            {/* List existing reviews */}
            <div className="space-y-4 font-sans">
              {loading ? (
                <div className="py-8 text-center flex flex-col items-center gap-2">
                  <div className="h-6 w-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-slate-400 font-mono">Syncing review threads from state...</span>
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                  <MessageSquare className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-xs font-bold">No active review threads yet</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">Be the first customer to contribute and raise platform trust!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {reviews.map((rev) => (
                    <div
                      id={`review-item-${rev.id}`}
                      key={rev.id}
                      className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-xs text-left"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="text-xs font-extrabold text-slate-800">{rev.userName}</span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            Reviewed on: {new Date(rev.createdAt).toLocaleDateString("en-IN", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                        </div>
                        <div className="flex bg-amber-50 px-2 py-1 rounded-lg border border-amber-200/50 items-center gap-0.5 text-xs font-bold text-amber-700">
                          <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                          <span>{rev.rating}</span>
                        </div>
                      </div>
                      <p className="text-slate-600 text-xs mt-3 leading-relaxed">
                        {rev.comment}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
