// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {getAuth,GoogleAuthProvider} from "firebase/auth";
import {getFirestore} from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDecFwvlSILTsGoGT585ZsYqR7X_gyKToQ",
  authDomain: "billsplit-d6972.firebaseapp.com",
  projectId: "billsplit-d6972",
  storageBucket: "billsplit-d6972.firebasestorage.app",
  messagingSenderId: "662633440142",
  appId: "1:662633440142:web:4c1d1c8272d30707f1fadf",
  measurementId: "G-1MY0ZX1129"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth=getAuth(app);
const provider=new GoogleAuthProvider();
const db= getFirestore(app);
const analytics = getAnalytics(app);

export {auth,provider,db};
