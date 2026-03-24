import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDTcgF9U3R04MJ6WL7acSMCoAtv4EclHpc",
  authDomain: "publisolar-ops.firebaseapp.com",
  projectId: "publisolar-ops",
  storageBucket: "publisolar-ops.firebasestorage.app",
  messagingSenderId: "476339477803",
  appId: "1:476339477803:web:db1272b8292502c3d7f96e"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
