import * as admin from 'firebase-admin';

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  clientId: process.env.FIREBASE_CLIENT_ID,
  authUri: process.env.FIREBASE_AUTH_URI,
  tokenUri: process.env.FIREBASE_TOKEN_URI,
  authProviderX509CertUrl: 'https://www.googleapis.com/oauth2/v1/certs',
  clientX509CertUrl: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(
    process.env.FIREBASE_CLIENT_EMAIL || ''
  )}`,
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

export const db = admin.firestore();

export async function saveIncomingMessage(
  phone: string,
  message: string,
  type: 'text' | 'image' | 'document' = 'text'
) {
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
