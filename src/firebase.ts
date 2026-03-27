import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, Timestamp, getDocFromServer, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, StorageError, uploadString, uploadBytesResumable } from 'firebase/storage';

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
console.log("Initializing Firebase with config:", {
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  authDomain: firebaseConfig.authDomain
});

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Use default storage initialization - let the SDK handle the bucket from config
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

console.log("Firebase services initialized.");
console.log("Storage bucket from config:", firebaseConfig.storageBucket);
console.log("Storage bucket from SDK object:", (storage as any)._bucket?.bucket || "unknown");

// Types
export interface PortfolioItem {
  id?: string;
  title: string;
  category: string;
  image?: string;
  link?: string;
  createdAt: Timestamp;
  uid: string;
}

export interface Profile {
  imageUrl: string;
  bio?: string;
  age?: number;
  updatedAt: Timestamp;
}

// Helper for error handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Auth helpers
export const login = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);

// Helper to convert File to Data URL (Base64 with prefix)
const fileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// Helper to compress image
const compressImage = async (file: File, maxWidth = 1000, maxHeight = 1000, quality = 0.6): Promise<File> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return resolve(file); // Only compress images
    }
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, { type: 'image/jpeg' });
              console.log(`Compressed image from ${Math.round(file.size / 1024)}KB to ${Math.round(compressedFile.size / 1024)}KB`);
              resolve(compressedFile);
            } else {
              resolve(file); // Fallback to original if blob fails
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

// Storage helper with progress callback and Firestore fallback
export const uploadImageWithProgress = async (
  file: File, 
  onProgress: (progress: number) => void,
  onStatus?: (status: string) => void
): Promise<string> => {
  let currentFile = file;
  
  // If file is very large (> 2MB), compress it immediately to help with network issues
  if (file.size > 2 * 1024 * 1024) {
    onStatus?.("Compressing large image...");
    currentFile = await compressImage(file, 1200, 1200, 0.7);
  }

  const primaryBucket = firebaseConfig.storageBucket;
  const secondaryBucket = primaryBucket.replace('.firebasestorage.app', '.appspot.com');
  const buckets = [primaryBucket, secondaryBucket];
  
  const attemptUpload = (bucketName: string, useBase64 = false): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      const method = useBase64 ? "Base64" : "Binary";
      console.log(`Attempting ${method} upload to bucket: ${bucketName}`);
      onStatus?.(`Connecting (${method})...`);
      
      const customStorage = getStorage(app, `gs://${bucketName}`);
      const path = `portfolio/${Date.now()}_${currentFile.name}`;
      const storageRef = ref(customStorage, path);
      
      const timeout = setTimeout(() => {
        reject(new Error("TIMEOUT"));
      }, 30000); // 30s per attempt to fail faster and reach fallback

      try {
        if (useBase64) {
          const reader = new FileReader();
          reader.readAsDataURL(currentFile);
          reader.onload = async () => {
            try {
              const base64Data = (reader.result as string).split(',')[1];
              onProgress(30);
              onStatus?.("Uploading Base64...");
              const snapshot = await uploadString(storageRef, base64Data, 'base64', {
                contentType: currentFile.type
              });
              clearTimeout(timeout);
              const downloadURL = await getDownloadURL(snapshot.ref);
              resolve(downloadURL);
            } catch (e) {
              clearTimeout(timeout);
              reject(e);
            }
          };
          reader.onerror = (e) => {
            clearTimeout(timeout);
            reject(e);
          };
        } else {
          const uploadTask = uploadBytesResumable(storageRef, currentFile);
          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              onProgress(progress);
              onStatus?.(`Uploading... ${Math.round(progress)}%`);
            }, 
            (error) => {
              clearTimeout(timeout);
              reject(error);
            }, 
            async () => {
              clearTimeout(timeout);
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadURL);
              } catch (error) {
                reject(error);
              }
            }
          );
        }
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  };

  onStatus?.("Starting upload...");
  
  // Strategy 1: Try Binary on Primary
  try {
    return await attemptUpload(primaryBucket, false);
  } catch (error: any) {
    console.warn(`Primary binary upload failed:`, error.message || error.code);
    if (error.code === 'storage/unauthorized') throw error;
  }

  // Strategy 2: Try Binary on Secondary
  try {
    return await attemptUpload(secondaryBucket, false);
  } catch (error: any) {
    console.warn(`Secondary binary upload failed:`, error.message || error.code);
  }

  // Strategy 3: Try Base64 on Primary
  try {
    console.log("Binary attempts failed. Trying Base64 Storage fallback...");
    return await attemptUpload(primaryBucket, true);
  } catch (error: any) {
    console.warn("Base64 Storage fallback also failed:", error.message || error.code);
  }

  // FINAL STRATEGY: Firestore-only Fallback (Bypasses Storage service entirely)
  // This stores the image directly in the Firestore document as a Data URL.
  // Limit: Firestore documents are 1MB.
  console.log("All Storage attempts failed. Using FINAL Firestore fallback...");
  onStatus?.("Using Database Fallback...");
  
  if (currentFile.size > 800 * 1024) {
    onStatus?.("Compressing for database...");
    currentFile = await compressImage(currentFile, 800, 800, 0.5);
  }

  if (currentFile.size > 900 * 1024) {
    throw new Error("Image is still too large for database storage after compression. Please use a smaller image or a different network.");
  }

  try {
    const dataUrl = await fileToDataURL(currentFile);
    onProgress(100);
    onStatus?.("Success (DB)!");
    console.log("Image converted to Data URL for Firestore storage.");
    return dataUrl;
  } catch (error) {
    console.error("Firestore fallback failed:", error);
    throw new Error("All upload methods failed. Your network appears to be blocking all Firebase services.");
  }
};

// Storage connection test
export async function testStorageConnection() {
  console.log("Testing Storage connection...");
  const primaryBucket = firebaseConfig.storageBucket;
  const secondaryBucket = primaryBucket.replace('.firebasestorage.app', '.appspot.com');
  
  const runTest = async (bucketName: string, useBase64 = false) => {
    const method = useBase64 ? "Base64" : "String";
    console.log(`Testing bucket: ${bucketName} (${method})...`);
    try {
      const customStorage = getStorage(app, `gs://${bucketName}`);
      const testRef = ref(customStorage, `test/connection_test_${method.toLowerCase()}.txt`);
      if (useBase64) {
        await uploadString(testRef, btoa('Connection test base64 ' + new Date().toISOString()), 'base64');
      } else {
        await uploadString(testRef, 'Connection test ' + new Date().toISOString());
      }
      console.log(`Storage connection test for ${bucketName} (${method}): SUCCESS`);
      return true;
    } catch (error) {
      // Silence the error log to avoid scaring the user, as we have a fallback
      console.warn(`Storage connection test for ${bucketName} (${method}): UNAVAILABLE (Network restriction)`);
      return false;
    }
  };

  const primarySuccess = await runTest(primaryBucket);
  if (primarySuccess) return true;

  console.log("Primary bucket failed, trying secondary bucket...");
  const secondarySuccess = await runTest(secondaryBucket);
  if (secondarySuccess) return true;

  console.log("Both buckets failed with string upload. Trying Base64 fallback test...");
  const base64Success = await runTest(primaryBucket, true);
  if (base64Success) return true;

  console.log("All Storage tests failed. The application will now use the Database (Firestore) as a fallback for image storage.");
  return false; // Return false so App.tsx knows native storage is unavailable
}

// Firestore helper
export const addPortfolioItem = async (item: Omit<PortfolioItem, 'id' | 'createdAt'>) => {
  const path = 'portfolio_items';
  try {
    return await addDoc(collection(db, path), {
      ...item,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const deletePortfolioItem = async (id: string) => {
  const path = `portfolio_items/${id}`;
  try {
    return await deleteDoc(doc(db, 'portfolio_items', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const setProfileImage = async (imageUrl: string) => {
  const path = 'profile/main';
  try {
    return await setDoc(doc(db, 'profile', 'main'), {
      imageUrl,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteProfileImage = async () => {
  const path = 'profile/main';
  try {
    return await deleteDoc(doc(db, 'profile', 'main'));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// Connection test
export async function testConnection() {
  try {
    // Attempt to read a non-existent doc to test connectivity
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connection test: Success (Firestore is reachable)");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Firebase connection test: FAILED - The client is offline. Check your Firebase configuration.");
    } else {
      console.log("Firebase connection test: Firestore reached (received expected error or success)");
    }
  }
}
