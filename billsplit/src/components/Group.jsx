// Group.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db, auth } from "../lib/firebase"; // adjust if you export auth differently
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

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!id) return;
    const docRef = doc(db, "groups", id);
    const unsub = onSnapshot(docRef, snap => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setGroup(data);
        // set default paidBy to current user if present & is a member
        if (auth?.currentUser && data.memberEmails?.includes(auth.currentUser.email)) {
          setPaidBy(auth.currentUser.email);
        } else if (!paidBy && data.memberEmails && data.memberEmails.length > 0) {
          setPaidBy(data.memberEmails[0]);
        }
      } else {
        setGroup(null);
      }
    });

    return () => unsub();
  }, [id]);

  // helper: compute balances (positive => should receive, negative => owes)
  const calculateBalances = (members = [], expenses = []) => {
    const balances = {};
    members.forEach(m => (balances[m] = 0));

    const eps = 0.005;
    (expenses || []).forEach(exp => {
      const paid = exp.paidBy;
      const amt = Number(exp.amount) || 0;
      const split = exp.split || {};

      // We'll trust split sums to equal amount (we create them that way),
      // but handle gracefully if they don't.
      members.forEach(m => {
        const share = Number(split[m] ?? 0);
        if (m === paid) {
          // payer effectively paid others' shares: he should receive (amount - his own share)
          balances[m] += amt - share;
        } else {
          // other members owe their share
          balances[m] -= share;
        }
      });
    });

    // round to 2 decimals for display / further computations
    Object.keys(balances).forEach(k => {
      balances[k] = Math.round((balances[k] + Number.EPSILON) * 100) / 100;
      // zero small floats
      if (Math.abs(balances[k]) < eps) balances[k] = 0;
    });

    return balances;
  };

  // helper: produce settlement suggestions (greedy)
  // returns array of { from, to, amount }
  const computeSettlements = balancesObj => {
    const eps = 0.005;
    const creditors = [];
    const debtors = [];
    Object.entries(balancesObj).forEach(([email, bal]) => {
      if (bal > eps) creditors.push({ email, amount: Math.round(bal * 100) }); // cents
      else if (bal < -eps) debtors.push({ email, amount: Math.round(-bal * 100) }); // cents owed
    });

    // sort largest first (not necessary but gives nicer grouping)
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const settlements = [];
    let i = 0,
      j = 0;
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

  const handleAddExpense = async () => {
    setError("");
    if (!group) {
      setError("Group not loaded.");
      return;
    }
    const n = group.memberEmails.length;
    if (!desc.trim()) {
      setError("Enter a description.");
      return;
    }
    const amtNum = Number(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setError("Enter a valid positive amount.");
      return;
    }
    if (!paidBy || !group.memberEmails.includes(paidBy)) {
      setError("Select a valid payer.");
      return;
    }

    // Split fairly by cents to avoid floating rounding issues:
    const amountCents = Math.round(amtNum * 100);
    const base = Math.floor(amountCents / n);
    const remainder = amountCents % n; // distribute +1 cent to first `remainder` members

    const split = {};
    // Keep stable order: distribute extra cents to first members in memberEmails order
    group.memberEmails.forEach((email, idx) => {
      const cents = base + (idx < remainder ? 1 : 0);
      split[email] = cents / 100; // rupees decimal
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
      // keep paidBy as same person (convenience)
    } catch (e) {
      console.error("add expense failed", e);
      setError("Failed to add expense. Check console for details.");
    }
  };

  if (!group) return <p className="p-6">Loading group...</p>;

  const balances = calculateBalances(group.memberEmails || [], group.expenses || []);
  const settlements = computeSettlements(balances);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{group.name}</h1>

      <div className="mb-4">
        <h2 className="font-semibold">Members</h2>
        <ul className="mb-2">
          {group.memberEmails.map((email) => (
            <li key={email} className="flex items-center gap-3">
              <span>{email}</span>
              {currentUser?.email === email && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">You</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-gray-100 p-4 rounded mb-4">
        <h3 className="font-semibold mb-2">Add Expense</h3>

        {error && <div className="text-red-600 mb-2">{error}</div>}

        <input
          type="text"
          placeholder="Description"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="w-full p-2 text-black border rounded mb-2 placeholder-gray"
        />

        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full p-2 text-black border rounded mb-2"
        />

        <label className="block mb-2 text-sm font-medium">Payer</label>
        <select
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
          className="w-full p-2 border rounded mb-2"
        >
          {group.memberEmails.map(email => (
            <option key={email} value={email}>
              {email} {auth?.currentUser?.email === email ? "(you)" : ""}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <button
            onClick={handleAddExpense}
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            Add Expense
          </button>
          <button
            onClick={() => { setDesc(""); setAmount(""); setError(""); }}
            className="bg-gray-300 px-4 py-2 rounded"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="font-semibold mb-2">Balances</h2>
        <ul>
          {Object.entries(balances).map(([email, bal]) => (
            <li key={email} className="mb-1">
              <strong>{email}</strong> —{" "}
              {bal > 0
                ? `should receive ₹${bal.toFixed(2)}`
                : bal < 0
                ? `owes ₹${Math.abs(bal).toFixed(2)}`
                : "is settled"}
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-4">
        <h2 className="font-semibold mb-2">Settle-up suggestions</h2>
        {settlements.length > 0 ? (
          <ul>
            {settlements.map((s, idx) => (
              <li key={idx} className="mb-1">
                <span className="block">
                  <strong>{s.from}</strong> pays <strong>{s.to}</strong> — ₹{s.amount.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>Everyone is settled.</p>
        )}
      </div>

      <div className="mb-4">
        <h2 className="font-semibold mb-2">Expenses</h2>
        {group.expenses?.length > 0 ? (
          <ul>
            {group.expenses.map((exp, i) => (
              <li key={i} className="mb-2 p-2 border rounded">
                <div className="flex justify-between">
                  <div>
                    <strong>{exp.description}</strong>
                    <div className="text-sm text-gray-600">
                      paid by <strong>{exp.paidBy}</strong>
                    </div>
                  </div>
                  <div>₹{Number(exp.amount).toFixed(2)}</div>
                </div>

                <div className="mt-2">
                  <div className="text-sm font-medium">Split</div>
                  {Object.entries(exp.split || {}).map(([email, amt]) => (
                    <div key={email} className="text-sm">
                      {email}: ₹{Number(amt).toFixed(2)}
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No expenses yet.</p>
        )}
      </div>
    </div>
  );
}
