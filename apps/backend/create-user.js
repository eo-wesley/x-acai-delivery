const admin = require('firebase-admin');

// Lendo a variável de ambiente ou injetando direto se rodar no backend
require('dotenv').config({ path: '.env' });

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID || 'xacai-delivery-prod',
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function createTestUser() {
  const userRecord = await admin.auth().createUser({
    email: 'admin@xacai.com',
    emailVerified: true,
    password: 'password123',
    displayName: 'Admin Master',
    disabled: false,
  });
  console.log('Successfully created new user:', userRecord.uid);
}

createTestUser();
