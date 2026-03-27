import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const app = initializeApp({
  apiKey: 'AIzaSyDlvlhKHyyjfxAVgTSxuBSGdDB5qquVk6c', // from frontend env
  authDomain: 'xacai-delivery-prod.firebaseapp.com',
  projectId: 'xacai-delivery-prod'
});
const auth = getAuth(app);

async function main() {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, 'admin@xacai.com', 'Admin@123');
    const token = await userCredential.user.getIdToken();
    
    console.log('Got token, fetching orders...');
    
    const response = await fetch('http://localhost:3000/api/admin/orders?slug=default', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const text = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', text.substring(0, 500) + '...');
    
    const data = JSON.parse(text);
    if (data && data.length > 0) {
      console.log('--- FIRST ORDER DATA ---');
      console.log('ID:', data[0].id);
      console.log('customer_name:', data[0].customer_name);
      console.log('customer_phone:', data[0].customer_phone);
      console.log('First Item Name:', data[0].items[0]?.name);
    }
  } catch (e) {
    console.error('Error:', e);
  }
  process.exit(0);
}

main();
