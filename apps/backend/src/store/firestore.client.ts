import * as admin from 'firebase-admin';
import { getFirebaseAdminInitError, getFirebaseFirestore, isFirebaseAdminReady } from '../lib/firebase-admin';

let db: FirebaseFirestore.Firestore | null = null;
let firebaseInitialized = false;

try {
  if (isFirebaseAdminReady()) {
    db = getFirebaseFirestore();
    firebaseInitialized = true;
    console.log(`Firebase Admin initialized successfully. ProjectID: ${process.env.FIREBASE_PROJECT_ID || 'Unknown'}`);
  } else {
    const initError = getFirebaseAdminInitError();
    console.warn(`Firebase credentials missing or invalid. Firestore disabled. ${initError?.message || ''}`.trim());
  }
} catch (error: any) {
  console.warn(`Firebase Admin initialization failed [${error?.code || 'ERROR'}]: ${error?.message || error}. Continuing without Firestore.`);
}

export { db, firebaseInitialized };

export async function saveIncomingMessage(
  phone: string,
  message: string,
  type: 'text' | 'image' | 'document' = 'text'
) {
  if (!firebaseInitialized || !db) {
    console.warn('saveIncomingMessage called but Firestore is not initialized');
    throw new Error('Firestore not available');
  }

  try {
    const doc = await db.collection('messages').add({
      phone,
      message,
      type,
      direction: 'incoming',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      processed: false,
    });
    return doc.id;
  } catch (error) {
    console.error('Error saving incoming message:', error);
    throw error;
  }
}

export async function saveAssistantMessage(
  phone: string,
  message: string,
  provider: string,
  incomingMessageId?: string
) {
  if (!firebaseInitialized || !db) {
    console.warn('saveAssistantMessage called but Firestore is not initialized');
    throw new Error('Firestore not available');
  }

  try {
    await db.collection('messages').add({
      phone,
      message,
      type: 'text',
      direction: 'outgoing',
      provider,
      incomingMessageId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Error saving assistant message:', error);
    throw error;
  }
}

export async function createOrder(
  customerId: string,
  orderData: Record<string, any>
) {
  if (!firebaseInitialized || !db) {
    console.warn('createOrder called but Firestore is not initialized');
    throw new Error('Firestore not available');
  }

  try {
    const doc = await db.collection('orders').add({
      ...orderData,
      customerId,
      status: 'placed',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return doc.id;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: string
) {
  if (!firebaseInitialized || !db) {
    console.warn('updateOrderStatus called but Firestore is not initialized');
    throw new Error('Firestore not available');
  }

  try {
    await db.collection('orders').doc(orderId).update({
      status: newStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
}

export async function getCustomerByPhone(phone: string) {
  if (!firebaseInitialized || !db) {
    console.warn('getCustomerByPhone called but Firestore is not initialized');
    throw new Error('Firestore not available');
  }

  try {
    const snapshot = await db
      .collection('customers')
      .where('phone', '==', phone)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return snapshot.docs[0].data();
  } catch (error) {
    console.error('Error getting customer:', error);
    throw error;
  }
}
