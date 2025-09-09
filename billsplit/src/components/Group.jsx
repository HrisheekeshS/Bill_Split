// src/pages/Group.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db, auth } from "../lib/firebase";
import {
  doc,
  onSnapshot,
  updateDoc,
  arrayUnion
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function Group() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState("");

  // Auth listener
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubAuth();
  }, []);

  // Firestore real-time listener for group
  useEffect(() => {
    if (!id) return;
    const docRef = doc(db, "groups", id);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setGroup(data);
        if (auth?.currentUser && data.memberEmails?.includes(auth.currentUser.email)) {
          setPaidBy(auth.currentUser.email);
        } else if (!paidBy && data.memberEmails?.length > 0) {
          setPaidBy(data.memberEmails[0]);
        }
      } else {
        setGroup(null);
      }
    });
    return () => unsub();
  }, [id]);

  // Calculate balances including payments
  const calculateBalances = (members = [], expenses = [], payments = []) => {
    const balances = {};
    members.forEach((m) => (balances[m] = 0));

    // Expenses
    expenses.forEach((exp) => {
      const paid = exp.paidBy;
      const amt = Number(exp.amount) || 0;
      const split = exp.split || {};
      members.forEach((m) => {
        const share = Number(split[m] ?? 0);
        if (m === paid) balances[m] += amt - share;
        else balances[m] -= share;
      });
    });

    // Payments
    payments.forEach((p) => {
      if (balances[p.from] !== undefined) balances[p.from] += p.amount;
      if (balances[p.to] !== undefined) balances[p.to] -= p.amount;
    });

    return Object.fromEntries(
      Object.entries(balances).map(([m, bal]) => [m, Math.round(bal * 100) / 100])
    );
  };

  // Compute who owes whom
  const computeSettlements = (balancesObj) => {
    const creditors = [];
    const debtors = [];
    Object.entries(balancesObj).forEach(([email, bal]) => {
      if (bal > 0.005) creditors.push({ email, amount: Math.round(bal * 100) });
      else if (bal < -0.005) debtors.push({ email, amount: Math.round(-bal * 100) });
    });

    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const settlements = [];
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const transfer = Math.min(debtor.amount, creditor.amount);
      settlements.push({
        from: debtor.email,
        to: creditor.email,
        amount: transfer / 100
      });
      debtor.amount -= transfer;
      creditor.amount -= transfer;
      if (debtor.amount === 0) i++;
      if (creditor.amount === 0) j++;
    }
    return settlements;
  };

  // Add expense
  const handleAddExpense = async () => {
    setError("");
    if (!group) return setError("Group not loaded.");
    if (!desc.trim()) return setError("Enter a description.");
    const amtNum = Number(amount);
    if (isNaN(amtNum) || amtNum <= 0) return setError("Enter a valid positive amount.");
    if (!paidBy || !group.memberEmails.includes(paidBy)) return setError("Select a valid payer.");

    const n = group.memberEmails.length;
    const amountCents = Math.round(amtNum * 100);
    const base = Math.floor(amountCents / n);
    const remainder = amountCents % n;

    const split = {};
    group.memberEmails.forEach((email, idx) => {
      const cents = base + (idx < remainder ? 1 : 0);
      split[email] = cents / 100;
    });

    const docRef = doc(db, "groups", id);
    try {
      await updateDoc(docRef, {
        expenses: arrayUnion({
          description: desc.trim(),
          amount: amtNum,
          paidBy,
          split,
          createdAt: new Date().toISOString()
        })
      });
      setDesc("");
      setAmount("");
    } catch (e) {
      console.error("add expense failed", e);
      setError("Failed to add expense.");
    }
  };

  // Per-expense payment
  const handleExpensePay = async (expense) => {
    if (!group || !currentUser) return;
    try {
      const docRef = doc(db, "groups", id);
      await updateDoc(docRef, {
        payments: arrayUnion({
          from: currentUser.email,
          to: expense.paidBy,
          amount: expense.split[currentUser.email],
          expenseDescription: expense.description,
          createdAt: new Date().toISOString()
        })
      });
    } catch (err) {
      console.error("Expense payment failed", err);
    }
  };

  if (!group) return <p className="p-6">Loading group...</p>;

  const balances = calculateBalances(group.memberEmails || [], group.expenses || [], group.payments || []);
  const settlements = computeSettlements(balances);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{group.name}</h1>

      {/* Members */}
      <div className="mb-4">
        <h2 className="font-semibold">Members</h2>
        <ul>
          {group.memberEmails.map((email) => (
            <li key={email}>
              {email} {currentUser?.email === email && <span>(You)</span>}
            </li>
          ))}
        </ul>
      </div>

      {/* Add Expense */}
      <div className="bg-gray-300 p-4 rounded mb-4">
        <h3 className="font-semibold mb-2 text-black">Add Expense</h3>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <input
          type="text"
          placeholder="Description"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="w-full p-2 border-black rounded mb-2 text-black"
        />
        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full text-black p-2 border rounded mb-2"
        />
        <select
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
          className="w-full p-2 border rounded mb-2 text-black"
        >
          {group.memberEmails.map((email) => (
            <option key={email} value={email}>
              {email} {auth?.currentUser?.email === email ? "(you)" : ""}
            </option>
          ))}
        </select>
        <button onClick={handleAddExpense} className="bg-green-500 text-white px-4 py-2 rounded">
          Add Expense
        </button>
      </div>

      {/* Balances */}
      <div className="mb-4">
        <h2 className="font-semibold mb-2">Balances</h2>
        {Object.entries(balances).map(([email, bal]) => (
          <div key={email}>
            {email} — {bal > 0 ? `should receive ₹${bal}` : bal < 0 ? `owes ₹${Math.abs(bal)}` : "settled"}
          </div>
        ))}
      </div>

      {/* Settlement Suggestions */}
      <div className="mb-4">
        <h2 className="font-semibold mb-2">Settle-up suggestions</h2>
        {settlements.length > 0 ? (
          settlements.map((s, idx) => (
            <div key={idx} className="flex justify-between mb-1">
              <span>
                {s.from} → {s.to} : ₹{s.amount}
              </span>
              {currentUser?.email === s.from && (
                <button
                  onClick={() => handleExpensePay({ paidBy: s.to, split: { [s.from]: s.amount }, description: "Settle-up" })}
                  className="bg-blue-500 text-white px-2 py-1 rounded"
                >
                  Pay
                </button>
              )}
            </div>
          ))
        ) : (
          <p>Everyone is settled.</p>
        )}
      </div>

      {/* Expenses with per-expense pay buttons */}
      <div>
        <h2 className="font-semibold mb-2">Expenses</h2>
        {group.expenses?.length > 0 ? (
          group.expenses.map((exp, i) => {
            const userShare = exp.split?.[currentUser?.email] || 0;
            const userOwes = currentUser?.email !== exp.paidBy && userShare > 0;

            // Check if already paid
            const alreadyPaid = group.payments?.some(
              (p) =>
                p.from === currentUser?.email &&
                p.to === exp.paidBy &&
                p.expenseDescription === exp.description
            );

            return (
              <div key={i} className="border p-2 mb-2 rounded">
                <div className="flex justify-between">
                  <div>
                    <strong>{exp.description}</strong> — ₹{Number(exp.amount).toFixed(2)}
                    <div className="text-sm text-gray-600">
                      Paid by <strong>{exp.paidBy}</strong>
                    </div>
                  </div>
                  {userOwes && !alreadyPaid && (
                    <button
                      onClick={() => handleExpensePay(exp)}
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                    >
                      Pay ₹{userShare.toFixed(2)}
                    </button>
                  )}
                </div>

                <div className="mt-2 text-sm">
                  <span className="font-medium">Split:</span>
                  {Object.entries(exp.split || {}).map(([email, amt]) => {
                    const memberPaid = group.payments?.some(
                      (p) =>
                        p.from === email &&
                        p.to === exp.paidBy &&
                        p.expenseDescription === exp.description
                    );
                    return (
                      <div key={email}>
                        {email}: ₹{amt.toFixed(2)}{" "}
                        {memberPaid && <span className="text-green-600">✅</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <p>No expenses yet.</p>
        )}
      </div>
    </div>
  );
}
