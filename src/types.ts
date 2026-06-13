/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = "customer" | "vendor" | "admin";

export interface User {
  id: number;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
  isBlocked?: boolean;
}

export interface UserProfile {
  userId: number;
  fullName: string;
  phone: string;
  profilePicture?: string;
  // Customer specific
  shippingAddress?: string;
  // Vendor specific
  businessName?: string;
  businessDescription?: string;
  whatDoYouSell?: string;
  gstNumber?: string;
  shopAddress?: string;
  branchLocations?: string[];
  // Admin specific
  adminId?: string;
  adminPasscode?: string;
}

export interface Address {
  id: number;
  userId: number;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

export interface PaymentMethod {
  id: number;
  userId: number;
  cardHolder: string;
  cardNumberMasked: string;
  expiry: string;
  isDefault: boolean;
}

export interface Product {
  id: number;
  vendorId: number;
  title: string;
  description: string;
  price: number;
  category: string;
  inventory: number;
  imageUrl: string;
  createdAt: string;
  brand?: string;
  discount?: number;
  vendorName?: string;
  rating?: number;
}

export interface OrderItem {
  productId: number;
  title: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: number;
  customerId: number;
  totalAmount: number;
  status: "Order Placed" | "Processing" | "Shipped" | "Out for Delivery" | "Delivered" | "cancelled" | "pending" | "completed";
  addressId?: number;
  paymentMethodId?: number;
  items: OrderItem[];
  createdAt: string;
  paymentMethod?: string;
  estimatedDeliveryDate?: string;
  shippingAddressText?: string;
}

export interface DecodedToken {
  id: number;
  email: string;
  role: UserRole;
}

export interface Review {
  id: number;
  productId: number;
  userId: number;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

