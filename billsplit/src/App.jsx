import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SignIn from "./components/signin";
import Dashboard from "./components/Dashboard";
import CreateGroup from "./components/Creategroup";
import Group from "./components/Group";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SignIn />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create-group" element={<CreateGroup />} />
        <Route path="/group/:id" element={<Group />} />
      </Routes>
    </Router>
  );
}
