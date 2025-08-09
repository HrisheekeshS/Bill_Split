// src/components/Auth.jsx
import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth, provider } from "../lib/firebase";
import { useNavigate } from "react-router-dom";

export default function Auth() {
  const [username, setUsername] = useState(""); // email
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

  // Email & Password Auth
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (isSignUp) {
        // Sign Up
        await createUserWithEmailAndPassword(auth, username, password);
        alert("Account created successfully!");
      } else {
        // Sign In
        
        const result=await signInWithEmailAndPassword(auth, username, password);
        window.localStorage.setItem("user",JSON.stringify(result.user))
        alert("Signed in successfully!");
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  };

  // Google Sign In
  const handleGoogleSignIn = async () => {
    try {

      const result=await signInWithPopup(auth, provider);
      window.localStorage.setItem("user",JSON.stringify(result.user))
      alert("Signed in with Google!");
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl shadow-lg w-full max-w-sm"
      >
        <h2 className="text-2xl font-bold text-center mb-4">
          {isSignUp ? "Sign Up" : "Sign In"}
        </h2>

        {error && (
          <p className="text-red-500 text-sm mb-3 text-center">{error}</p>
        )}

        <input
          type="email"
          placeholder="Email"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full px-4 py-2 text-black border border-black rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-2 text-black border border-black rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <button
          type="submit"
          className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-semibold transition"
        >
          {isSignUp ? "Sign Up" : "Sign In"}
        </button>

        <div className="my-4 text-center text-gray-500">OR</div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-semibold transition"
        >
          Sign in with Google
        </button>

        <p className="text-black mt-4 text-center text-sm">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-blue-600 hover:underline"
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </p>
      </form>
    </div>
  );
}
