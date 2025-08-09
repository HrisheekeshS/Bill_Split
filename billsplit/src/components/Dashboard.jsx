import React, { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [groups, setGroups] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGroups = async () => {
      if (!auth.currentUser) return;
      const q = query(
        collection(db, "groups"),
        where("memberIds", "array-contains", auth.currentUser.uid)
      );
      const snapshot = await getDocs(q);
      setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchGroups();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Your Groups</h1>
        <button
          onClick={() => navigate("/create-group")}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Create Group
        </button>
      </div>

      {groups.length === 0 ? (
        <p className="text-gray-500">No groups yet.</p>
      ) : (
        <div className="space-y-4">
          {groups.map(group => (
            <Link
              to={`/group/${group.id}`}
              key={group.id}
              className="block p-4 bg-white text-black shadow rounded hover:bg-gray-50"
            >
              {group.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
