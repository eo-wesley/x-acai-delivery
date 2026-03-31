import * as admin from 'firebase-admin';

let initializationAttempted = false;
let initializationError: Error | null = null;
let warnedMissingCredentials = false;

function normalizePrivateKey(value?: string): string | undefined {
    return value?.replace(/\\n/g, '\n');
}

function buildServiceAccount(): admin.ServiceAccount | null {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        try {
            const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
            if (parsed?.private_key && !parsed.privateKey) {
                parsed.privateKey = parsed.private_key;
            }
            if (parsed?.client_email && !parsed.clientEmail) {
                parsed.clientEmail = parsed.client_email;
            }
            if (parsed?.project_id && !parsed.projectId) {
                parsed.projectId = parsed.project_id;
            }
            if (parsed?.privateKey) {
                parsed.privateKey = normalizePrivateKey(parsed.privateKey);
            }
            return parsed as admin.ServiceAccount;
        } catch (error: any) {
            initializationError = new Error(`FIREBASE_SERVICE_ACCOUNT_JSON inválido: ${error.message}`);
            return null;
        }
    }

    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        return {
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
            privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            clientId: process.env.FIREBASE_CLIENT_ID,
        } as admin.ServiceAccount;
    }

    return null;
}

export function initializeFirebaseAdmin(): admin.app.App | null {
    if (admin.apps.length > 0) {
        return admin.app();
    }

    if (initializationAttempted) {
        return null;
    }

    initializationAttempted = true;
    const serviceAccount = buildServiceAccount();

    if (!serviceAccount) {
        if (!initializationError) {
            initializationError = new Error(
                'Firebase Admin credentials are missing. Configure FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY.'
            );
        }
        if (!warnedMissingCredentials) {
            console.warn(`Firebase Admin not initialized: ${initializationError.message}`);
            warnedMissingCredentials = true;
        }
        return null;
    }

    try {
        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } catch (error: any) {
        initializationError = error instanceof Error ? error : new Error(String(error));
        console.warn(`Firebase Admin initialization failed: ${initializationError.message}`);
        return null;
    }
}

export function isFirebaseAdminReady(): boolean {
    return !!initializeFirebaseAdmin();
}

export function getFirebaseAdminApp(): admin.app.App {
    const app = initializeFirebaseAdmin();
    if (!app) {
        throw initializationError || new Error('Firebase Admin is not initialized.');
    }
    return app;
}

export function getFirebaseAdminAuth() {
    return admin.auth(getFirebaseAdminApp());
}

export function getFirebaseFirestore() {
    return admin.firestore(getFirebaseAdminApp());
}

export function getFirebaseAdminInitError(): Error | null {
    initializeFirebaseAdmin();
    return initializationError;
}
