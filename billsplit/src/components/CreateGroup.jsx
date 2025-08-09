import React, { useState } from "react";
import { auth, db } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function CreateGroup() {
  const [name, setName] = useState("");
  const [members, setMembers] = useState([{ email: auth.currentUser.email }]);
  const navigate = useNavigate();

  const addMember = () => {
    setMembers([...members, { email: "" }]);
  };

  const removeMember = (index) => {
    const newMembers = [...members];
    newMembers.splice(index, 1);
    setMembers(newMembers);
  };

  const handleChange = (index, value) => {
    const newMembers = [...members];
    newMembers[index].email = value;
    setMembers(newMembers);
  };

  const handleSubmit = async () => {
    const memberEmails = members.map(m => m.email);
    await addDoc(collection(db, "groups"), {
      name,
      memberEmails,
      memberIds: [auth.currentUser.uid],
      expenses: []
    });
    navigate("/dashboard");
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Create Group</h1>
      <input
        type="text"
        placeholder="Group Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full p-2 border rounded mb-4"
      />

      <h2 className="font-semibold mb-2">Members</h2>
      {members.map((member, index) => (
        <div key={index} className="flex gap-2 mb-2">
          <input
            type="email"
            placeholder="Member Email"
            value={member.email}
            onChange={(e) => handleChange(index, e.target.value)}
            className="flex-1 p-2 border rounded"
          />
          {index !== 0 && (
            <button
              onClick={() => removeMember(index)}
              className="bg-red-500 text-white px-2 rounded"
            >
              Remove
            </button>
          )}
        </div>
      ))}

      <button
        onClick={addMember}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        Add Member
      </button>

      <button
        onClick={handleSubmit}
        className="bg-green-500 text-white px-4 py-2 rounded"
      >
        Create Group
      </button>
    </div>
  );
}
