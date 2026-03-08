"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.firebaseInitialized = exports.db = void 0;
exports.saveIncomingMessage = saveIncomingMessage;
exports.saveAssistantMessage = saveAssistantMessage;
exports.createOrder = createOrder;
exports.updateOrderStatus = updateOrderStatus;
exports.getCustomerByPhone = getCustomerByPhone;
const admin = __importStar(require("firebase-admin"));
// Attempt to initialize Firebase Admin using credentials from environment variables.
// If something goes wrong (e.g. env vars missing), we catch the error so the
// whole application can still start and the /health endpoint remains usable.
let serviceAccount = null;
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    }
    catch (err) {
        console.error('❌ FIREBASE_SERVICE_ACCOUNT_JSON is malformed or invalid JSON.');
    }
}
else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        clientId: process.env.FIREBASE_CLIENT_ID,
        authUri: process.env.FIREBASE_AUTH_URI,
        tokenUri: process.env.FIREBASE_TOKEN_URI,
        authProviderX509CertUrl: 'https://www.googleapis.com/oauth2/v1/certs',
        clientX509CertUrl: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL || '')}`,
    };
}
else {
    console.warn('⚠️ Missing Firebase Admin credentials in environment variables.');
    console.warn('Please provide FIREBASE_SERVICE_ACCOUNT_JSON or (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY).');
}
let db = null;
exports.db = db;
let firebaseInitialized = false;
exports.firebaseInitialized = firebaseInitialized;
try {
    if (serviceAccount && !admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        exports.db = db = admin.firestore();
        exports.firebaseInitialized = firebaseInitialized = true;
        console.log(`✅ Firebase Admin initialized successfully. ProjectID: ${serviceAccount.projectId || process.env.FIREBASE_PROJECT_ID || 'Unknown'}`);
    }
    else if (!serviceAccount) {
        console.warn(`⚠️ Firebase credentials missing. Running strictly Local/SQLite mode.`);
    }
}
catch (error) {
    console.warn(`⚠️ Firebase Admin initialization failed [${error?.code || 'ERROR'}]: ${error?.message || error}. Continuing without Firestore.`);
}
async function saveIncomingMessage(phone, message, type = 'text') {
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
    }
    catch (error) {
        console.error('Error saving incoming message:', error);
        throw error;
    }
}
async function saveAssistantMessage(phone, message, provider, incomingMessageId) {
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
    }
    catch (error) {
        console.error('Error saving assistant message:', error);
        throw error;
    }
}
async function createOrder(customerId, orderData) {
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
    }
    catch (error) {
        console.error('Error creating order:', error);
        throw error;
    }
}
async function updateOrderStatus(orderId, newStatus) {
    if (!firebaseInitialized || !db) {
        console.warn('updateOrderStatus called but Firestore is not initialized');
        throw new Error('Firestore not available');
    }
    try {
        await db.collection('orders').doc(orderId).update({
            status: newStatus,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    catch (error) {
        console.error('Error updating order status:', error);
        throw error;
    }
}
async function getCustomerByPhone(phone) {
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
        if (snapshot.empty)
            return null;
        return snapshot.docs[0].data();
    }
    catch (error) {
        console.error('Error getting customer:', error);
        throw error;
    }
}
