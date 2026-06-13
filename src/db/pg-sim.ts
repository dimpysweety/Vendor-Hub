/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import bcryptjs from "bcryptjs";
import { User, UserProfile, Address, PaymentMethod, Product, Order, UserRole, OrderItem, Review } from "../types.js";
import { defaultProducts } from "./seeded-products.js";

// Specific Postgres Database Error to match requirements
export class PostgresDatabaseError extends Error {
  code: string; // e.g. "23505" for unique violation, "23503" for foreign key violation
  detail: string;
  table?: string;
  constraint?: string;
  query?: string;
  severity: string = "ERROR";

  constructor(code: string, message: string, detail: string, table?: string, constraint?: string, query?: string) {
    super(message);
    this.name = "PostgresDatabaseError";
    this.code = code;
    this.detail = detail;
    this.table = table;
    this.constraint = constraint;
    this.query = query;
  }
}

interface DatabaseState {
  users: User[];
  profiles: UserProfile[];
  addresses: Address[];
  paymentMethods: PaymentMethod[];
  products: Product[];
  orders: Order[];
  reviews?: Review[];
  version: number;
}

const DB_FILE_PATH = path.join(process.cwd(), "db_data.json");

// Simulated Redis Cache with Logs
class RedisCache {
  private cache = new Map<string, { value: any; expiry: number }>();

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) {
      console.log(`[Redis Cache] GET ${key} - MISS`);
      return null;
    }
    if (Date.now() > item.expiry) {
      console.log(`[Redis Cache] GET ${key} - EXPIRED`);
      this.cache.delete(key);
      return null;
    }
    console.log(`[Redis Cache] GET ${key} - HIT`);
    return item.value;
  }

  set(key: string, value: any, ttlSeconds: number = 300) {
    console.log(`[Redis Cache] SET ${key} (TTL: ${ttlSeconds}s)`);
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  delete(key: string) {
    console.log(`[Redis Cache] DEL ${key}`);
    this.cache.delete(key);
  }

  clear() {
    console.log("[Redis Cache] FLUSHALL");
    this.cache.clear();
  }
}

// Simulated Elasticsearch Engine with Indexing Logs and search query
class ElasticsearchEngine {
  private indexList = new Map<number, { keywords: string[]; product: Product }>();

  indexProduct(product: Product) {
    const text = `${product.title} ${product.brand || ""} ${product.vendorName || ""} ${product.description} ${product.category}`.toLowerCase();
    const keywords = text.split(/\s+/).filter(word => word.length > 2);
    this.indexList.set(product.id, { keywords, product });
    console.log(`[Elasticsearch] Indexed product ID: ${product.id} ("${product.title}")`);
  }

  search(q: string): Product[] {
    console.log(`[Elasticsearch] Search query received: "${q}"`);
    const queryTerm = q.toLowerCase().trim();
    if (!queryTerm) return [];

    const start = process.hrtime();
    const results: { product: Product; score: number }[] = [];

    for (const [_, entry] of this.indexList.entries()) {
      let score = 0;
      if (entry.product.title.toLowerCase().includes(queryTerm)) score += 10;
      if (entry.product.brand && entry.product.brand.toLowerCase().includes(queryTerm)) score += 8;
      if (entry.product.vendorName && entry.product.vendorName.toLowerCase().includes(queryTerm)) score += 6;
      if (entry.product.description.toLowerCase().includes(queryTerm)) score += 3;
      if (entry.product.category.toLowerCase().includes(queryTerm)) score += 5;

      if (score > 0) {
        results.push({ product: entry.product, score });
      }
    }

    results.sort((a, b) => b.score - a.score);
    const end = process.hrtime(start);
    console.log(`[Elasticsearch] Found ${results.length} matches (took ${(end[0] * 1000 + end[1] / 1000000).toFixed(2)}ms)`);
    return results.map(r => r.product);
  }
}

class PostgresConnectionPool {
  private state: DatabaseState = {
    users: [],
    profiles: [],
    addresses: [],
    paymentMethods: [],
    products: [],
    orders: [],
    reviews: [],
    version: 1,
  };

  public redis = new RedisCache();
  public elasticsearch = new ElasticsearchEngine();

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const dataStr = fs.readFileSync(DB_FILE_PATH, "utf8");
        this.state = JSON.parse(dataStr);
        if (!this.state.reviews) {
          this.state.reviews = [];
        }
        if (!this.state.version || this.state.version < 17) {
          console.log("[PostgreSQL] Upgrading database state to Version 17 with precise high-quality Fashion images...");
          const seedIds = new Set(defaultProducts.map(p => p.id));
          const existingCustomProducts = (this.state.products || []).filter(p => !seedIds.has(p.id));
          this.state.products = [...defaultProducts, ...existingCustomProducts];
          this.state.version = 17;
          this.saveState();
          this.rebuildElasticsearchIndex();
        } else {
          console.log("[PostgreSQL] Virtual Database state successfully loaded from persistent storage");
        }
      } else {
        this.initializeWithSeedData();
      }
    } catch (e) {
      console.error("[PostgreSQL] Error reading persistence file, resetting to seeds:", e);
      this.initializeWithSeedData();
    }
    this.rebuildElasticsearchIndex();
  }

  private saveState() {
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(this.state, null, 2), "utf8");
    } catch (e) {
      console.error("[PostgreSQL] Failed to persist data to filesystem:", e);
    }
  }

  private initializeWithSeedData() {
    console.log("[PostgreSQL] Seeding database with clean Indian Rupee mock entities...");

    // Seed default users
    const adminPasswordHash = bcryptjs.hashSync("admin123", 10);
    const vendorPasswordHash = bcryptjs.hashSync("vendor123", 10);
    const customerPasswordHash = bcryptjs.hashSync("customer123", 10);

    const defaultUsers: User[] = [
      {
        id: 1,
        email: "admin@enterprise.in",
        passwordHash: adminPasswordHash,
        role: "admin",
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        email: "vendor@enterprise.in",
        passwordHash: vendorPasswordHash,
        role: "vendor",
        createdAt: new Date().toISOString(),
      },
      {
        id: 3,
        email: "customer@gmail.com",
        passwordHash: customerPasswordHash,
        role: "customer",
        createdAt: new Date().toISOString(),
      },
    ];

    const defaultProfiles: UserProfile[] = [
      { userId: 1, fullName: "Chief Platform Admin", phone: "9876543210" },
      { userId: 2, fullName: "Super Tech Vendor Ltd.", phone: "9876543211", businessName: "Super Tech Vendor Ltd.", gstNumber: "22AAAAA0000A1Z5", shopAddress: "Tech Park, Bengaluru, Karnataka", branchLocations: ["Bengaluru", "Mumbai"] },
      { userId: 3, fullName: "John Consumer", phone: "9876543212" },
    ];

    const defaultAddresses: Address[] = [
      {
        id: 1,
        userId: 3,
        street: "G-Block, Bandra Kurla Complex",
        city: "Mumbai",
        state: "Maharashtra",
        zipCode: "400051",
        country: "India",
        isDefault: true,
      },
    ];

    const defaultPaymentMethods: PaymentMethod[] = [
      {
        id: 1,
        userId: 3,
        cardHolder: "JOHN CONSUMER",
        cardNumberMasked: "•••• •••• •••• 5678",
        expiry: "09/31",
        isDefault: true,
      },
    ];

    const defaultProductsData: Product[] = defaultProducts;

    const defaultReviews: Review[] = [
      {
        id: 1,
        productId: 403, // Cetaphil Gentle Cleanser
        userId: 3,
        userName: "John Consumer",
        rating: 5,
        comment: "This skin cleanser is absolutely amazing. Super gentle on dry and sensitive skin, doesn't leave it dry or tight! Highly recommend it.",
        createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      },
      {
        id: 2,
        productId: 403,
        userId: 2,
        userName: "Rita Sharma",
        rating: 4,
        comment: "Excellent daily cleanser, very mild and has no fragrance. Great for Indian summer skincare.",
        createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      }
    ];

    this.state = {
      users: defaultUsers,
      profiles: defaultProfiles,
      addresses: defaultAddresses,
      paymentMethods: defaultPaymentMethods,
      products: defaultProductsData,
      orders: [],
      reviews: defaultReviews,
      version: 15,
    };
    this.saveState();
  }

  private rebuildElasticsearchIndex() {
    this.state.products.forEach(p => {
      this.elasticsearch.indexProduct(p);
    });
  }

  // --- REGISTRATION & LOGIN QUERY SIMULATION WITH DETAILED SQL ERRORS ---
  public async registerUser(email: string, passwordPlain: string, role: UserRole, fullName: string, extraProfileData?: Partial<UserProfile>): Promise<User> {
    console.log(`[SQL Log] INSERT INTO users (email, password_hash, role) VALUES ('${email}', '...', '${role}') RETURNING *`);
    
    // Strict Validation Checks
    if (!email || !email.includes("@")) {
      const errorMsg = "invalid input syntax for type email";
      const detail = `Email parameter "${email}" lacks domain symbol @ or is invalid.`;
      const sqlErr = new PostgresDatabaseError("22007", errorMsg, detail, "users", undefined, "INSERT INTO users ...");
      console.error("[PostgreSQL Database Error]", sqlErr);
      throw sqlErr;
    }

    if (!passwordPlain || passwordPlain.length < 6) {
      const errorMsg = "value too short for password constraint";
      const detail = "Minimum password size is 6 characters.";
      const sqlErr = new PostgresDatabaseError("23514", errorMsg, detail, "users", "users_password_check", "INSERT INTO users ...");
      console.error("[PostgreSQL Database Error]", sqlErr);
      throw sqlErr;
    }

    // Role check
    if (role !== "customer" && role !== "vendor" && role !== "admin") {
      const errorMsg = "invalid enum value for role type";
      const detail = `Role "${role}" does not exist in type system check.`;
      const sqlErr = new PostgresDatabaseError("22023", errorMsg, detail, "users", "users_role_type_check", "INSERT INTO users ...");
      console.error("[PostgreSQL Database Error]", sqlErr);
      throw sqlErr;
    }

    // Check unique constraint violation
    const existing = this.state.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      const errorMsg = `duplicate key value violates unique constraint "users_email_key"`;
      const detail = `Key (email)=(${email}) already exists in the Postgres users table.`;
      const sqlErr = new PostgresDatabaseError("23505", errorMsg, detail, "users", "users_email_key", "INSERT INTO users ...");
      console.error("[PostgreSQL Database Error]", sqlErr);
      throw sqlErr;
    }

    const nextId = this.state.users.reduce((max, u) => u.id > max ? u.id : max, 0) + 1;
    const passwordHash = bcryptjs.hashSync(passwordPlain, 10);
    const newUser: User = {
      id: nextId,
      email,
      passwordHash,
      role,
      createdAt: new Date().toISOString(),
    };

    this.state.users.push(newUser);

    // Profile pairing
    this.state.profiles.push({
      userId: nextId,
      fullName: fullName || email.split("@")[0],
      phone: extraProfileData?.phone || "",
      ...extraProfileData
    });

    // If shippingAddress is specified for customer, register it as default customer address
    if (extraProfileData?.shippingAddress) {
      const addrId = this.state.addresses.reduce((max, a) => a.id > max ? a.id : max, 0) + 1;
      this.state.addresses.push({
        id: addrId,
        userId: nextId,
        street: extraProfileData.shippingAddress,
        city: "Mumbai",
        state: "Maharashtra",
        zipCode: "400001",
        country: "India",
        isDefault: true
      });
    }

    this.saveState();
    this.redis.delete(`user_by_email:${email.toLowerCase()}`);
    return newUser;
  }

  public async findUserByEmail(email: string): Promise<User | null> {
    console.log(`[SQL Log] SELECT * FROM users WHERE email = '${email}' LIMIT 1`);
    
    // Check Redis caching
    const cacheKey = `user_by_email:${email.toLowerCase()}`;
    const cached = this.redis.get(cacheKey);
    if (cached) return cached;

    const user = this.state.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
    if (user) {
      this.redis.set(cacheKey, user, 60); // Cache in Redis for 60 seconds
    }
    return user;
  }

  public async findUserByEmailOrPhone(identifier: string): Promise<User | null> {
    console.log(`[SQL Log] SELECT u.* FROM users u LEFT JOIN profiles p ON u.id = p.user_id WHERE u.email = '${identifier}' OR p.phone = '${identifier}' LIMIT 1`);
    
    // Check email matches
    const emailUser = this.state.users.find(u => u.email.toLowerCase() === identifier.toLowerCase());
    if (emailUser) return emailUser;

    // Check phone matches
    const cleanPhone = identifier.replace(/[\s\-\+\(\)]/g, "");
    const profile = this.state.profiles.find(p => {
      const cleanPPhone = (p.phone || "").replace(/[\s\-\+\(\)]/g, "");
      return cleanPPhone === cleanPhone && cleanPhone.length > 0;
    });

    if (profile) {
      const phoneUser = this.state.users.find(u => u.id === profile.userId);
      if (phoneUser) return phoneUser;
    }

    return null;
  }

  public async findUserById(id: number): Promise<User | null> {
    console.log(`[SQL Log] SELECT * FROM users WHERE id = ${id}`);
    return this.state.users.find(u => u.id === id) || null;
  }

  // --- PRODUCTS ---
  public async getProducts(searchQuery?: string, category?: string): Promise<Product[]> {
    console.log(`[SQL Log] SELECT * FROM products ${searchQuery ? `WHERE search @@ '${searchQuery}'` : ""}`);
    
    // Use simulated Elasticsearch for search if query exists
    if (searchQuery) {
      return this.elasticsearch.search(searchQuery);
    }

    let list = [...this.state.products];
    if (category) {
      list = list.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }
    return list;
  }

  public async storeProduct(vendorId: number, title: string, description: string, price: number, category: string, inventory: number, imageUrl: string): Promise<Product> {
    console.log(`[SQL Log] INSERT INTO products (vendor_id, title, price, inventory) VALUES (${vendorId}, ...)`);
    
    const nextId = this.state.products.reduce((max, p) => p.id > max ? p.id : max, 100) + 1;
    const newProduct: Product = {
      id: nextId,
      vendorId,
      title,
      description,
      price,
      category,
      inventory,
      imageUrl: imageUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
      createdAt: new Date().toISOString(),
    };

    this.state.products.push(newProduct);
    this.saveState();
    
    // Index into Elasticsearch
    this.elasticsearch.indexProduct(newProduct);

    return newProduct;
  }

  public async getVendorProducts(vendorId: number): Promise<Product[]> {
    console.log(`[SQL Log] SELECT * FROM products WHERE vendor_id = ${vendorId}`);
    return this.state.products.filter(p => p.vendorId === vendorId);
  }

  // --- PROFILE, ADDRESSES, PAYMENTS ---
  public async getProfile(userId: number): Promise<UserProfile | null> {
    console.log(`[SQL Log] SELECT * FROM profiles WHERE user_id = ${userId}`);
    return this.state.profiles.find(p => p.userId === userId) || null;
  }

  public async updateProfile(userId: number, fullName: string, phone: string, profilePicture?: string, shippingAddress?: string): Promise<UserProfile> {
    console.log(`[SQL Log] UPDATE profiles SET full_name = '${fullName}', phone = '${phone}' WHERE user_id = ${userId}`);
    let profile = this.state.profiles.find(p => p.userId === userId);
    if (!profile) {
      profile = { userId, fullName, phone, profilePicture, shippingAddress };
      this.state.profiles.push(profile);
    } else {
      profile.fullName = fullName;
      profile.phone = phone;
      if (profilePicture !== undefined) {
        profile.profilePicture = profilePicture;
      }
      if (shippingAddress !== undefined) {
        profile.shippingAddress = shippingAddress;
      }
    }
    this.saveState();
    return profile;
  }

  public async getAddresses(userId: number): Promise<Address[]> {
    console.log(`[SQL Log] SELECT * FROM addresses WHERE user_id = ${userId}`);
    return this.state.addresses.filter(a => a.userId === userId);
  }

  public async addAddress(userId: number, street: string, city: string, state: string, zipCode: string, country: string, isDefault: boolean): Promise<Address> {
    console.log(`[SQL Log] INSERT INTO addresses (user_id, street, city) VALUES (${userId}, ...)`);
    const nextId = this.state.addresses.reduce((max, a) => a.id > max ? a.id : max, 0) + 1;
    
    if (isDefault) {
      // unset defaults
      this.state.addresses.filter(a => a.userId === userId).forEach(a => a.isDefault = false);
    }

    const newAddr: Address = {
      id: nextId,
      userId,
      street,
      city,
      state,
      zipCode,
      country,
      isDefault,
    };
    this.state.addresses.push(newAddr);
    this.saveState();
    return newAddr;
  }

  public async getPaymentMethods(userId: number): Promise<PaymentMethod[]> {
    console.log(`[SQL Log] SELECT * FROM payment_methods WHERE user_id = ${userId}`);
    return this.state.paymentMethods.filter(p => p.userId === userId);
  }

  public async addPaymentMethod(userId: number, cardHolder: string, cardNumber: string, expiry: string, isDefault: boolean): Promise<PaymentMethod> {
    console.log(`[SQL Log] INSERT INTO payment_methods (user_id, card_holder) VALUES (${userId}, ...)`);
    const nextId = this.state.paymentMethods.reduce((max, p) => p.id > max ? p.id : max, 0) + 1;
    
    if (isDefault) {
      this.state.paymentMethods.filter(p => p.userId === userId).forEach(p => p.isDefault = false);
    }

    const lastFour = cardNumber.trim().replace(/\s/g, "").slice(-4);
    const masked = `•••• •••• •••• ${lastFour || "0000"}`;

    const newPay: PaymentMethod = {
      id: nextId,
      userId,
      cardHolder: cardHolder.toUpperCase(),
      cardNumberMasked: masked,
      expiry,
      isDefault,
    };
    this.state.paymentMethods.push(newPay);
    this.saveState();
    return newPay;
  }

  // --- ORDERS ---
  public async createOrder(
    customerId: number, 
    totalAmount: number, 
    items: OrderItem[], 
    addressId?: number, 
    paymentMethodId?: number,
    paymentMethod?: string,
    shippingAddressText?: string,
    estimatedDeliveryDate?: string
  ): Promise<Order> {
    console.log(`[SQL Log] BEGIN TRANSACTION; INSERT INTO orders (customer_id, total_amount) VALUES (${customerId}, ${totalAmount});`);
    const nextId = this.state.orders.reduce((max, o) => o.id > max ? o.id : max, 1000) + 1;

    // Adjust inventory
    for (const item of items) {
      const prod = this.state.products.find(p => p.id === item.productId);
      if (prod) {
        if (prod.inventory < item.quantity) {
          console.log(`[PostgreSQL Rollback] Inventory stockout error for product ID: ${item.productId}`);
          throw new PostgresDatabaseError("40001", "transaction conflict: serialized inventory stockout", `Requested ${item.quantity} units but only ${prod.inventory} units available for product ID ${item.productId}`, "products", "inventory_positive_check", "UPDATE products SET inventory = inventory - ... WHERE id = ...");
        }
        prod.inventory -= item.quantity;
        console.log(`[SQL Log] UPDATE products SET inventory = ${prod.inventory} WHERE id = ${prod.id}`);
      }
    }

    // Default status to "Order Placed" per specifications
    const DefaultStatus = "Order Placed";

    // Auto calculate estimated shipping if not provided (+ 3 to 7 days, e.g. 5 days)
    let finalEstDate = estimatedDeliveryDate;
    if (!finalEstDate) {
      const estDate = new Date();
      estDate.setDate(estDate.getDate() + 5);
      finalEstDate = estDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    }

    const newOrder: Order = {
      id: nextId,
      customerId,
      totalAmount,
      status: DefaultStatus,
      addressId,
      paymentMethodId,
      items,
      createdAt: new Date().toISOString(),
      paymentMethod: paymentMethod || "Cash on Delivery",
      shippingAddressText: shippingAddressText || "Default Shipping Location",
      estimatedDeliveryDate: finalEstDate,
    };

    this.state.orders.push(newOrder);
    this.saveState();
    console.log(`[SQL Log] COMMIT TRANSACTION; Order created with ID: ${newOrder.id}`);
    return newOrder;
  }

  public async getCustomerOrders(customerId: number): Promise<Order[]> {
    console.log(`[SQL Log] SELECT * FROM orders WHERE customer_id = ${customerId}`);
    return this.state.orders.filter(o => o.customerId === customerId);
  }

  public async getVendorOrders(vendorId: number): Promise<Order[]> {
    console.log(`[SQL Log] SELECT o.* FROM orders o JOIN LATERAL jsonb_to_recordset(o.items) AS (product_id int) ON TRUE WHERE EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.vendor_id = ${vendorId})`);
    
    // Filter orders where at least one item belongs to a product owned by this vendor
    const vendorProdIds = new Set(this.state.products.filter(p => p.vendorId === vendorId).map(p => p.id));
    return this.state.orders.filter(o => o.items.some(item => vendorProdIds.has(item.productId)));
  }

  public async updateOrderStatus(orderId: number, status: Order["status"]): Promise<Order | null> {
    console.log(`[SQL Log] UPDATE orders SET status = '${status}' WHERE id = ${orderId}`);
    const order = this.state.orders.find(o => o.id === orderId);
    if (order) {
      order.status = status;
      this.saveState();
      return order;
    }
    return null;
  }

  public async editProduct(productId: number, vendorId: number, updates: Partial<Product>): Promise<Product | null> {
    console.log(`[SQL Log] UPDATE products SET title = '${updates.title || ""}', price = '${updates.price || ""}' WHERE id = ${productId}`);
    const product = this.state.products.find(p => p.id === productId && (vendorId === 0 || p.vendorId === vendorId));
    if (product) {
      if (updates.title !== undefined) product.title = updates.title;
      if (updates.description !== undefined) product.description = updates.description;
      if (updates.price !== undefined) product.price = Number(updates.price);
      if (updates.category !== undefined) product.category = updates.category;
      if (updates.inventory !== undefined) product.inventory = Number(updates.inventory);
      if (updates.imageUrl !== undefined) product.imageUrl = updates.imageUrl;
      this.saveState();
      this.rebuildElasticsearchIndex();
      return product;
    }
    return null;
  }

  public async deleteProduct(productId: number, vendorId: number): Promise<boolean> {
    console.log(`[SQL Log] DELETE FROM products WHERE id = ${productId}`);
    const initialLen = this.state.products.length;
    // Note: vendorId 0 means admin bypass
    this.state.products = this.state.products.filter(p => !(p.id === productId && (vendorId === 0 || p.vendorId === vendorId)));
    if (this.state.products.length < initialLen) {
      this.saveState();
      this.rebuildElasticsearchIndex();
      return true;
    }
    return false;
  }

  public async setVendorBlockStatus(vendorId: number, isBlocked: boolean): Promise<boolean> {
    console.log(`[SQL Log] UPDATE users SET isBlocked = ${isBlocked} WHERE id = ${vendorId}`);
    const user = this.state.users.find(u => u.id === vendorId);
    if (user) {
      user.isBlocked = isBlocked;
      this.saveState();
      return true;
    }
    return false;
  }

  public async getAllUsersAdmin() {
    console.log(`[SQL Log] SELECT u.id, u.email, u.role, u.is_blocked, p.full_name, p.phone FROM users u LEFT JOIN profiles p ON u.id = p.user_id`);
    return this.state.users.map(u => {
      const p = this.state.profiles.find(prof => prof.userId === u.id);
      return {
        id: u.id,
        email: u.email,
        role: u.role,
        isBlocked: !!u.isBlocked,
        fullName: p?.fullName || "",
        phone: p?.phone || "",
        businessName: p?.businessName || "",
        profilePicture: p?.profilePicture || ""
      };
    });
  }

  public async getVendorDashboardStats(vendorId: number) {
    const products = await this.getVendorProducts(vendorId);
    const orders = await this.getVendorOrders(vendorId);
    
    const vendorProdIds = new Set(products.map(p => p.id));
    
    let totalRevenue = 0;
    let unitsSold = 0;

    for (const o of orders) {
      for (const item of o.items) {
        if (vendorProdIds.has(item.productId)) {
          totalRevenue += item.price * item.quantity;
          unitsSold += item.quantity;
        }
      }
    }

    return {
      productCount: products.length,
      ordersCount: orders.length,
      unitsSold,
      totalRevenue,
    };
  }

  public async getAllOrdersAdmin(): Promise<Order[]> {
    console.log(`[SQL Log] SELECT * FROM orders ORDER BY created_at DESC`);
    return this.state.orders;
  }

  // --- REVIEWS ---
  public async getReviews(productId: number): Promise<Review[]> {
    console.log(`[SQL Log] SELECT r.*, p.full_name FROM reviews r JOIN profiles p ON r.user_id = p.user_id WHERE r.product_id = ${productId}`);
    if (!this.state.reviews) {
      this.state.reviews = [];
    }
    return this.state.reviews.filter(r => r.productId === productId);
  }

  public async addReview(userId: number, productId: number, rating: number, comment: string): Promise<Review> {
    console.log(`[SQL Log] INSERT INTO reviews (user_id, product_id, rating, comment) VALUES (${userId}, ${productId}, ${rating}, '${comment}')`);
    if (!this.state.reviews) {
      this.state.reviews = [];
    }

    // Get user profile name
    const profile = this.state.profiles.find(p => p.userId === userId);
    const userName = profile?.fullName || "Verified Buyer";

    const nextId = this.state.reviews.reduce((max, r) => r.id > max ? r.id : max, 0) + 1;
    const newReview: Review = {
      id: nextId,
      productId,
      userId,
      userName,
      rating,
      comment: comment || "",
      createdAt: new Date().toISOString()
    };

    this.state.reviews.push(newReview);

    // Recalculate average rating for this product and update it
    const productReviews = this.state.reviews.filter(r => r.productId === productId);
    const avgRating = productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length;
    
    const productIndex = this.state.products.findIndex(p => p.id === productId);
    if (productIndex !== -1) {
      this.state.products[productIndex].rating = parseFloat(avgRating.toFixed(1));
      // Re-index product in Elasticsearch
      this.elasticsearch.indexProduct(this.state.products[productIndex]);
    }

    this.saveState();
    return newReview;
  }
}

export const dbPool = new PostgresConnectionPool();
