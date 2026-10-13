import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyAoBj8LbGeTFyvEq4_MN3K_Xkj0_fqFy6A",
  authDomain: "farmer-orders.firebaseapp.com",
  projectId: "farmer-orders",
  storageBucket: "farmer-orders.firebasestorage.app",
  messagingSenderId: "429930948447",
  appId: "1:429930948447:web:5033bdfdfb50196f42f8ea",
  measurementId: "G-2NGMRB0GEE"
};

// Инициализация приложения
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Инициализация Auth с постоянным хранением сессии через AsyncStorage
let auth: any;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  auth = getAuth(app);
}

// Инициализация базы данных Cloud Firestore
const db = getFirestore(app);

export { app, auth, db };
