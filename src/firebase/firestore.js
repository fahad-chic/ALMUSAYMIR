// src/firebase/firestore.js - Firebase Firestore Service
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { auth, db } from './config';

// ============ COLLECTIONS ============
export const COLLECTIONS = {
  USERS: 'users',
  PRODUCTS: 'products',
  ORDERS: 'orders',
  CART: 'cart',
  FAVORITES: 'favorites',
  REVIEWS: 'reviews',
  CATEGORIES: 'categories',
  SETTINGS: 'settings',
  NOTIFICATIONS: 'notifications',
  MESSAGES: 'messages',
  BANNERS: 'banners',
  COUPONS: 'coupons'
};

// ============ USERS ============
export const createUser = async (userId, userData) => {
  try {
    await setDoc(doc(db, COLLECTIONS.USERS, userId), {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getUser = async (userId) => {
  try {
    const docRef = doc(db, COLLECTIONS.USERS, userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    }
    return { success: false, error: 'User not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateUser = async (userId, data) => {
  try {
    await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
      ...data,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============ PRODUCTS ============
export const addProduct = async (productData) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.PRODUCTS), {
      ...productData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getProducts = async (filters = {}) => {
  try {
    let q = collection(db, COLLECTIONS.PRODUCTS);
    const constraints = [orderBy('createdAt', 'desc')];
    
    if (filters.category) {
      constraints.push(where('category', '==', filters.category));
    }
    if (filters.limit) {
      constraints.push(limit(filters.limit));
    }
    if (filters.active !== undefined) {
      constraints.push(where('active', '==', filters.active));
    }
    
    const querySnapshot = await getDocs(query(q, ...constraints));
    const products = [];
    querySnapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: products };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getProduct = async (productId) => {
  try {
    const docSnap = await getDoc(doc(db, COLLECTIONS.PRODUCTS, productId));
    if (docSnap.exists()) {
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    }
    return { success: false, error: 'Product not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateProduct = async (productId, data) => {
  try {
    await updateDoc(doc(db, COLLECTIONS.PRODUCTS, productId), {
      ...data,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteProduct = async (productId) => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.PRODUCTS, productId));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============ ORDERS ============
export const createOrder = async (orderData) => {
  try {
    const currentUser = auth?.currentUser;
    if (!currentUser?.uid) {
      return { success: false, error: 'يجب تسجيل الدخول قبل إنشاء الطلب.' };
    }

    // هوية صاحب الطلب مصدرها جلسة Firebase، لا بيانات يرسلها المتصفح.
    const docRef = await addDoc(collection(db, COLLECTIONS.ORDERS), {
      ...orderData,
      userId: currentUser.uid,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getOrders = async (userId) => {
  try {
    const q = query(
      collection(db, COLLECTIONS.ORDERS),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const orders = [];
    querySnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: orders };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getAllOrders = async (status = null) => {
  try {
    const constraints = [orderBy('createdAt', 'desc')];
    if (status) {
      constraints.unshift(where('status', '==', status));
    }
    const q = query(collection(db, COLLECTIONS.ORDERS), ...constraints);
    const querySnapshot = await getDocs(q);
    const orders = [];
    querySnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: orders };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateOrderStatus = async (orderId, status) => {
  try {
    await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), {
      status,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============ CART ============
export const addToCart = async (userId, product) => {
  try {
    const cartRef = collection(db, COLLECTIONS.CART, userId, 'items');
    await addDoc(cartRef, {
      ...product,
      addedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getCart = async (userId) => {
  try {
    const cartRef = collection(db, COLLECTIONS.CART, userId, 'items');
    const querySnapshot = await getDocs(cartRef);
    const items = [];
    querySnapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: items };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const clearCart = async (userId) => {
  try {
    const cartRef = collection(db, COLLECTIONS.CART, userId, 'items');
    const querySnapshot = await getDocs(cartRef);
    const batch = writeBatch(db);
    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============ FAVORITES ============
export const addToFavorites = async (userId, productId) => {
  try {
    await setDoc(
      doc(db, COLLECTIONS.FAVORITES, userId, 'items', productId),
      { addedAt: serverTimestamp() }
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const removeFromFavorites = async (userId, productId) => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.FAVORITES, userId, 'items', productId));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getFavorites = async (userId) => {
  try {
    const favRef = collection(db, COLLECTIONS.FAVORITES, userId, 'items');
    const querySnapshot = await getDocs(favRef);
    const productIds = querySnapshot.docs.map((doc) => doc.id);
    return { success: true, data: productIds };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============ REVIEWS ============
export const addReview = async (productId, reviewData) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.REVIEWS), {
      productId,
      ...reviewData,
      createdAt: serverTimestamp()
    });

    const productRef = doc(db, COLLECTIONS.PRODUCTS, productId);
    const productSnap = await getDoc(productRef);

    if (productSnap.exists()) {
      const reviewsSnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.REVIEWS),
          where('productId', '==', productId)
        )
      );

      const ratings = reviewsSnapshot.docs
        .map((reviewDoc) => Number(reviewDoc.data().rating))
        .filter((rating) => Number.isFinite(rating));

      const reviewCount = ratings.length;
      const totalRating = ratings.reduce((sum, rating) => sum + rating, 0);
      const avgRating = reviewCount > 0 ? totalRating / reviewCount : 0;

      await updateDoc(productRef, {
        rating: avgRating,
        reviewCount
      });
    }

    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getReviews = async (productId) => {
  try {
    const q = query(
      collection(db, COLLECTIONS.REVIEWS),
      where('productId', '==', productId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const reviews = [];
    querySnapshot.forEach((doc) => {
      reviews.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: reviews };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============ CATEGORIES ============
export const getCategories = async () => {
  try {
    const querySnapshot = await getDocs(
      query(collection(db, COLLECTIONS.CATEGORIES), orderBy('order', 'asc'))
    );
    const categories = [];
    querySnapshot.forEach((doc) => {
      categories.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: categories };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const addCategory = async (categoryData) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.CATEGORIES), {
      ...categoryData,
      createdAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============ SETTINGS ============
export const getSettings = async (key = null) => {
  try {
    if (key) {
      const docSnap = await getDoc(doc(db, COLLECTIONS.SETTINGS, key));
      if (docSnap.exists()) {
        return { success: true, data: docSnap.data() };
      }
      return { success: false, error: 'Setting not found' };
    }
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.SETTINGS));
    const settings = {};
    querySnapshot.forEach((doc) => {
      settings[doc.id] = doc.data();
    });
    return { success: true, data: settings };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateSettings = async (key, data) => {
  try {
    await setDoc(doc(db, COLLECTIONS.SETTINGS, key), {
      ...data,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============ NOTIFICATIONS ============
export const sendNotification = async (userId, notification) => {
  try {
    await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
      userId,
      ...notification,
      read: false,
      createdAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getNotifications = async (userId) => {
  try {
    const q = query(
      collection(db, COLLECTIONS.NOTIFICATIONS),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const querySnapshot = await getDocs(q);
    const notifications = [];
    querySnapshot.forEach((doc) => {
      notifications.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: notifications };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============ COUPONS ============
export const validateCoupon = async (code) => {
  try {
    const q = query(
      collection(db, COLLECTIONS.COUPONS),
      where('code', '==', code.toUpperCase()),
      where('active', '==', true)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const coupon = querySnapshot.docs[0].data();
      if (coupon.expiresAt?.toDate() > new Date()) {
        return { success: true, data: { id: querySnapshot.docs[0].id, ...coupon } };
      }
      return { success: false, error: 'Coupon expired' };
    }
    return { success: false, error: 'Invalid coupon' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const createCoupon = async (couponData) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.COUPONS), {
      ...couponData,
      code: couponData.code.toUpperCase(),
      active: true,
      createdAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============ MESSAGES (Chat) ============
export const sendMessage = async (chatId, messageData) => {
  try {
    await addDoc(collection(db, COLLECTIONS.MESSAGES, chatId, 'items'), {
      ...messageData,
      createdAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const subscribeToMessages = (chatId, callback) => {
  const q = query(
    collection(db, COLLECTIONS.MESSAGES, chatId, 'items'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snapshot) => {
    const messages = [];
    snapshot.forEach((doc) => {
      messages.push({ id: doc.id, ...doc.data() });
    });
    callback(messages);
  });
};
