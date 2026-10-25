// src/firebase/storage.js - Firebase Storage Service
import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
  updateMetadata
} from 'firebase/storage';
import { storage } from './config';

// ============ IMAGE VALIDATION ============
// يجب أن تطابق storage.rules: jpeg/png/gif/webp وحد أقصى 5MB.
const IMAGE_EXT_BY_TYPE = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp'
};
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// يعيد نص الخطأ أو null إذا كانت الصورة مقبولة.
const validateImageFile = (file) => {
  if (!file || typeof file.size !== 'number') return 'الملف غير صالح.';
  if (!IMAGE_EXT_BY_TYPE[file.type]) {
    return 'نوع الملف غير مدعوم. المسموح: JPG أو PNG أو GIF أو WEBP.';
  }
  if (file.size <= 0) return 'الملف فارغ.';
  if (file.size > MAX_IMAGE_BYTES) return 'حجم الصورة يتجاوز 5 ميجابايت.';
  return null;
};

// ============ UPLOAD FUNCTIONS ============

export const uploadFile = async (path, file, metadata = {}) => {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file, metadata);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return { success: true, url: downloadURL, path: snapshot.ref.fullPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const uploadFileWithProgress = (path, file, onProgress, metadata = {}) => {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);
    
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress(progress, snapshot);
        }
      },
      (error) => {
        reject({ success: false, error: error.message });
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            success: true,
            url: downloadURL,
            path: uploadTask.snapshot.ref.fullPath
          });
        } catch (error) {
          reject({ success: false, error: error.message });
        }
      }
    );
  });
};

export const uploadMultipleFiles = async (files, basePath, onProgress) => {
  const results = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const path = `${basePath}/${timestamp}_${i}.${ext}`;
    
    const result = await uploadFile(path, file);
    results.push({ file: file.name, ...result });
    
    if (onProgress) {
      onProgress(((i + 1) / files.length) * 100);
    }
  }
  return results;
};

// ============ DELETE FUNCTIONS ============

export const deleteFile = async (path) => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteFiles = async (paths) => {
  try {
    const results = await Promise.all(paths.map(path => deleteFile(path)));
    return { success: true, results };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============ GET FILE INFO ============

export const getFileURL = async (path) => {
  try {
    const storageRef = ref(storage, path);
    const url = await getDownloadURL(storageRef);
    return { success: true, url };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getFileMetadata = async (path) => {
  try {
    const storageRef = ref(storage, path);
    const metadata = await getMetadata(storageRef);
    return { success: true, metadata };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateFileMetadata = async (path, metadata) => {
  try {
    const storageRef = ref(storage, path);
    await updateMetadata(storageRef, metadata);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============ LIST FILES ============

export const listFiles = async (path) => {
  try {
    const storageRef = ref(storage, path);
    const result = await listAll(storageRef);
    return {
      success: true,
      data: {
        prefixes: result.prefixes.map(ref => ref.fullPath),
        items: result.items.map(item => ({
          name: item.name,
          path: item.fullPath
        }))
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============ PRODUCT IMAGE HELPERS ============

export const uploadProductImage = async (productId, file) => {
  const invalid = validateImageFile(file);
  if (invalid) return { success: false, error: invalid };
  const timestamp = Date.now();
  const ext = IMAGE_EXT_BY_TYPE[file.type];
  const path = `products/${productId}/${timestamp}.${ext}`;
  return uploadFile(path, file, { contentType: file.type });
};

export const uploadProductImages = async (productId, files) => {
  const basePath = `products/${productId}`;
  return uploadMultipleFiles(files, basePath);
};

export const deleteProductImages = async (productId) => {
  const result = await listFiles(`products/${productId}`);
  if (result.success && result.data.items.length > 0) {
    const paths = result.data.items.map(item => item.path);
    return deleteFiles(paths);
  }
  return { success: true };
};

// ============ USER AVATAR ============

export const uploadAvatar = async (userId, file) => {
  const invalid = validateImageFile(file);
  if (invalid) return { success: false, error: invalid };
  // الامتداد من نوع الملف (وليس من اسمه) ليطابق قاعدة avatars/{uid}.{ext}
  const ext = IMAGE_EXT_BY_TYPE[file.type];
  const path = `avatars/${userId}.${ext}`;
  return uploadFile(path, file, {
    contentType: file.type,
    cacheControl: 'public, max-age=31536000'
  });
};

export const deleteAvatar = async (userId) => {
  // Try common extensions
  const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  for (const ext of extensions) {
    const result = await deleteFile(`avatars/${userId}.${ext}`);
    if (result.success) return result;
  }
  return { success: false, error: 'Avatar not found' };
};

// ============ CATEGORY IMAGES ============

export const uploadCategoryImage = async (categoryId, file) => {
  const invalid = validateImageFile(file);
  if (invalid) return { success: false, error: invalid };
  const ext = IMAGE_EXT_BY_TYPE[file.type];
  const path = `categories/${categoryId}.${ext}`;
  return uploadFile(path, file, { contentType: file.type });
};

// ============ BANNER IMAGES ============

export const uploadBannerImage = async (bannerId, file) => {
  const invalid = validateImageFile(file);
  if (invalid) return { success: false, error: invalid };
  const ext = IMAGE_EXT_BY_TYPE[file.type];
  const path = `banners/${bannerId}.${ext}`;
  return uploadFile(path, file, { contentType: file.type });
};

// ============ CHAT ATTACHMENTS ============

// المرفقات صور فقط (jpeg/png/gif/webp حتى 5MB) — تطابق storage.rules.
// أي نوع آخر (PDF أو HEIC ...) يُرفض هنا برسالة واضحة بدل خطأ Firebase مبهم.
export const uploadChatAttachment = async (chatId, file) => {
  if (!chatId) return { success: false, error: 'معرّف المحادثة مفقود.' };
  const invalid = validateImageFile(file);
  if (invalid) return { success: false, error: invalid };
  const timestamp = Date.now();
  const ext = IMAGE_EXT_BY_TYPE[file.type];
  const base = String(file.name || 'image')
    .replace(/\.[^.]*$/, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .slice(0, 60) || 'image';
  const path = `chats/${chatId}/${timestamp}_${base}.${ext}`;
  return uploadFile(path, file, { contentType: file.type });
};
