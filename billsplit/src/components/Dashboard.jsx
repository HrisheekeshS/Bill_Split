import React, { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { collection, query, where, getDocs ,deleteDoc,doc} from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [groups, setGroups] = useState([]);
  const navigate = useNavigate();
  const [userId,setUserId]=useState("")

  useEffect(() => {
    const fetchGroups = async () => {
      
      const user=window.localStorage.getItem("user")
      const user_id=JSON.parse(user).uid
      setUserId(user_id)
      console.log(user_id)
      if (!user_id) return;
      const q = query(
        collection(db, "groups"),
        where("memberEmails", "array-contains",JSON.parse(user).email)
      );
      const snapshot = await getDocs(q);
      setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchGroups();
  }, []);
    console.log(groups)
    const handleDeleteGroup = async (groupId) => {
      console.log(groupId)
    if (window.confirm("Are you sure you want to delete this group?")) {
      try {
        await deleteDoc(doc(db, "groups", groupId));
        setGroups(prev => prev.filter(group => group.id !== groupId));
      } catch (error) {
        console.error("Error deleting group:", error);
      }
    }
  };

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
            <div
              key={group.id}
              className="flex justify-between items-center p-4 bg-white text-black shadow rounded hover:bg-gray-50"
            >
              <Link to={`/group/${group.id}`} className="flex-1">
                {group.name}
              </Link>

              {/* Show delete button only if current user created this group */}
              {group.createdBy === userId && (
                <button
                  onClick={() => handleDeleteGroup(group.id)}
                  className="ml-4 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
