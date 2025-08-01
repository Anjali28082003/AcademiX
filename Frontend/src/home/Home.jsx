
// AcademiXDashboard.jsx

import React, { useState, useEffect } from "react";
import axios from "axios";
import dayjs from "dayjs";

import A from "../assets/A.png";
import X from "../assets/X.png";
import WeatherCard from "../WeatherSection/WeatherCard";
import { startGoogleLogin } from "../utils/googleAuth";
import CodingProfiles from "../pages/CodingProfiles";
import UserProfile from "../pages/UserProfile";
import { useUserContext } from "../context/userContext.jsx";
import AttendanceCards from "../pages/AttendanceCards";
import { getDocId } from '../utils/getDocId';


const Button = ({
  children,
  className = "",
  onClick,
  type = "button",
  disabled = false,
  active = false,          
}) => {
  const idleClasses   = "bg-[#0C1D4F] text-white hover:bg-[#AAD0E9] hover:text-black";
  const activeClasses = "bg-[#AAD0E9] text-black";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
     // Button.jsx  (only the className line shown)
className={`
  w-full text-left                    /* NEW ①  */
  ${active ? activeClasses : idleClasses}
  font-semibold py-2 px-4 rounded     /* px-4 so every label starts at the same x-offset */
  transition-colors duration-200
  disabled:opacity-50 disabled:cursor-not-allowed
  ${className}
`}

    >
      {children}
    </button>
  );
};



/* -------------------------------------------------------------------------- */
/*  TOKEN HELPERS                                                             */
/* -------------------------------------------------------------------------- */
const getAccessToken = () => localStorage.getItem("gAccess");
const getRefreshToken = () => localStorage.getItem("gRefresh") || "";

const clearClientStorage = () => {
  localStorage.removeItem("gAccess");
  localStorage.removeItem("gRefresh");
  localStorage.removeItem("gExpires");
  localStorage.removeItem("codingProfiles.usernames");
};


/*  ADD‑CLASS MODAL                                                           */

const AddClassForm = ({ onClose, onTokenExpired }) => {
  const [form, setForm] = useState({
    subject_name: "",
    subject_code: "",
    classroom: "",
    professor_name: "",
    start_time: "",
    end_time: "",
    day: "Monday",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      /* Build absolute ISO datetimes for first occurrence */
      const nextDay = dayjs()
        .day(
          {
            Sunday: 0,
            Monday: 1,
            Tuesday: 2,
            Wednesday: 3,
            Thursday: 4,
            Friday: 5,
            Saturday: 6,
          }[form.day]
        )
        .hour(Number(form.start_time.split(":")[0]))
        .minute(Number(form.start_time.split(":")[1]))
        .second(0)
        .millisecond(0);

      const startDate = nextDay.isBefore(dayjs())
        ? nextDay.add(7, "day")
        : nextDay;

      const startISO = startDate.toDate().toISOString();
      const endISO = startDate
        .hour(Number(form.end_time.split(":")[0]))
        .minute(Number(form.end_time.split(":")[1]))
        .toDate()
        .toISOString();

      /* Headers with tokens */
      const headers = { Authorization: `Bearer ${getAccessToken()}` };
      const rToken = getRefreshToken();
      if (rToken) headers["x-refresh-token"] = rToken;
      const resp = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/v1/student/addClass`,
        { ...form, start_time: startISO, end_time: endISO },
        { headers }
      );

      /* Save refreshed tokens if backend returned them */
      if (resp.data.tokens) {
        const { access_token, refresh_token, expires_in } = resp.data.tokens;
        if (access_token) localStorage.setItem("gAccess", access_token);
        if (refresh_token) localStorage.setItem("gRefresh", refresh_token);
        if (expires_in)
          localStorage.setItem("gExpires", Date.now() + expires_in * 1000);
      }

      setMsg("Event added to Google Calendar 🎉");
      setTimeout(onClose, 1200);
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Something went wrong";
      setMsg(errorMsg);

      if (errorMsg.includes("Google token expired")) {
        onTokenExpired?.();
        clearClientStorage();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[999]">
      <div className="bg-[#0C1D4F] text-white p-6 rounded-lg w-80">
        <h2 className="text-xl font-bold mb-4 text-center">
          Add Class to Calendar
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {[
            ["Subject Name", "subject_name", "text"],
            ["Subject Code", "subject_code", "text"],
            ["Classroom", "classroom", "text"],
            ["Professor", "professor_name", "text"],
            ["Start Time", "start_time", "time"],
            ["End Time", "end_time", "time"],
          ].map(([label, name, type]) => (
            <label key={name} className="flex flex-col">
              <span className="mb-1">{label}</span>
              <input
                required
                type={type}
                name={name}
                value={form[name]}
                onChange={handleChange}
                className="p-2 rounded bg-transparent border border-white focus:outline-none"
              />
            </label>
          ))}

          {/* Day selector */}
          <label className="flex flex-col">
            <span className="mb-1">Day of Week</span>
            <select
              name="day"
              value={form.day}
              onChange={handleChange}
              className="p-2 rounded bg-transparent border border-white"
            >
              {[
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday",
              ].map((d) => (
                <option key={d} value={d} className="text-black">
                  {d}
                </option>
              ))}
            </select>
          </label>

          {/* Actions */}
          <Button type="submit" disabled={loading} className="mt-4 w-full py-2">
            {loading ? "Adding…" : "ADD"}
          </Button>
          <Button
            onClick={onClose}
            className="mt-2 bg-red-500 text-white w-full py-2"
          >
            Cancel
          </Button>

          {msg && <p className="text-center mt-2 text-sm">{msg}</p>}
        </form>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  MAIN DASHBOARD                                                            */
const AcademiXDashboard = () => {
 
  const [activePage, setActivePage] = useState("Dashboard");
  const [showAddClass, setShowAddClass] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  // Anything that toggles 'showDocuments' should already be in your state.
const currentBtn = showDocuments ? "Get Documents" : activePage;


  /* document & upload state (kept as‑is) */
  const [documents, setDocuments] = useState([]);
  const [docName, setDocName] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deletingDocId, setDeletingDocId] = useState(null);
  const [success, setSuccess] = useState(null);

  /* google token status */
  const [hasGoogleToken, setHasGoogleToken] = useState(
    !!localStorage.getItem("gAccess") && !!localStorage.getItem("gRefresh")
  );

  /* context */
  const { userState, resetUserState } = useUserContext();
  const userData = JSON.parse(localStorage.getItem("academixUser"));
const firstName = userData?.name?.split(" ")[0] || "there";

  /* --------- keep token state synced across tabs ---------- */
  useEffect(() => {
    const sync = () =>
      setHasGoogleToken(
        !!localStorage.getItem("gAccess") && !!localStorage.getItem("gRefresh")
      );
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  /* --------- Google connect ---------- */
  const handleGoogleConnect = async () => {
    try {
      await startGoogleLogin();
      setHasGoogleToken(true);
    } catch (err) {
      alert(err.message);
    }
  };

  /* ---------------------------------------------------------------------- */
  /*  (Upload / docs helpers – unchanged except URLs switched to env)       */
  /* ---------------------------------------------------------------------- */
  

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return setError("Please select a file");
    const formData = new FormData();
    formData.append("name", docName);
    formData.append("localDocument", file);

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/v1/student/uploadDocument`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      setDocName("");
      setFile(null);
      fetchDocuments();
       setSuccess("Document uploaded successfully ✅");
    setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };
const fetchDocuments = async () => {
  try {
    setLoading(true);

    const res = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/api/v1/student/getAllDocuments`,
      { credentials: "include" }
    );

    if (!res.ok) {
      const { message = "Failed to fetch documents" } = await res.json();
      throw new Error(message);
    }

    const { message } = await res.json();          
setDocuments(message?.documents ?? []);     
  } catch (err) {
    console.error(err);
    setError(err.message);
    setDocuments([]);                      
  } finally {
    setLoading(false);
  }
};


 
const handleDelete = async (docId) => {
  if (!docId) return setError("No document id found");

  // Optimistically remove the document
  const previousDocs = documents;
  setDocuments((prev) => prev.filter((d) => getDocId(d) !== docId));
  setDeletingDocId(docId);

  try {
    const res = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/api/v1/student/deleteDocument/${docId}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    const payload = await res.json();

    if (!res.ok) {
      throw new Error(payload.message || "Failed to delete document");
    }


  } catch (err) {
    // Roll back only if it failed
    setDocuments(previousDocs);
    setError(err.message);
  } finally {
    setDeletingDocId(null);
  }
};

  /* ---------------------------------------------------------------------- */
  /*  Logout                                                                */
  /* ---------------------------------------------------------------------- */
  const handleLogout = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/v1/student/logout`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Logout failed");
      clearClientStorage();
      resetUserState();
      window.location.href = "/login";
    } catch {
      setError("Logout failed. Please try again.");
    }
  };

  const getFileIcon = (filename) => {
    const ext = filename.split(".").pop().toLowerCase();
    const icons = {
      pdf: "📄",
      doc: "📝",
      docx: "📝",
      ppt: "📊",
      pptx: "📊",
      xls: "📈",
      xlsx: "📈",
      png: "🖼️",
      jpg: "🖼️",
      jpeg: "🖼️",
      gif: "🖼️",
      zip: "🗜️",
      rar: "🗜️",
    };
    return icons[ext] || "📁";
  };

  /* ---------------------------------------------------------------------- */
  /*  MAIN CONTENT RENDERER                                                 */
  /* ---------------------------------------------------------------------- */
  const renderMainContent = () => {
    /* ---------- Uploaded docs grid ---------- */
    if (activePage === "Dashboard" && showDocuments) {
      return (
        <div>
          <h2 className="text-2xl font-bold mb-6">Uploaded Documents</h2>
          {loading && <p className="italic mb-4">Loading documents…</p>}

          {documents.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {documents.map((doc) => {
  const fileName = doc.originalName || doc.name;        // ①
  const icon = getFileIcon(fileName);   
  const id = getDocId(doc);                // ②

  return (
    <div
      key={doc._id}
      className="bg-[#044466] rounded-lg p-4 flex flex-col items-center"
    >
      {/* icon */}
      <span className="text-4xl mb-3">{icon}</span>     {/* ③ */}

      {/* name / label */}
      <span className="text-lg font-medium mb-2 text-center break-all text-white">
        {doc.name}
      </span>

      {/* view / download */}
      <a
        href={doc.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-white -600 hover:underline mb-3"
      >
        View&nbsp;/&nbsp;Download
      </a>

      {/* delete */}
     <button
  type="button"
  onClick={(e) => {
    e.stopPropagation();
    handleDelete(id);
  }}
  disabled={deletingDocId === id}
  className={`relative z-10 text-red-500 text-sm hover:underline ${
    deletingDocId === id ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
  }`}
>
  {deletingDocId === id ? 'Deleting…' : 'Delete'}
</button>
    </div>
  );
})}



            </div>
          ) :  !loading && (
            <p className="text-gray-500">No documents uploaded yet.</p>
          )}
        </div>
      );
    }

     if (activePage === "User Profile") return <UserProfile />;

    /* ---------- Main dashboard ---------- */
   if (activePage === "Dashboard") {
  return (
    <div>
  {/* Top welcome + weather */}
  <div className="flex justify-between items-start">
    <div>
      <h1 className="text-4xl font-bold text-[#0C1D4F]">
        Welcome to AcademiX!
      </h1>
      <p className="mt-4 text-3xl font-bold text-[#0C1D4F]">
        Hey, {firstName}
      </p>
    </div>
    <WeatherCard city="bihta" />
  </div>

  {/* Attendance cards (static mock) */}
  <p className="mt-6 text-xl font-semibold text-[#0C1D4F] italic">
    Attendance Tracker ✅
  </p>
  <AttendanceCards />

  {/* Calendar CTA */}
  <p className="mt-6 text-xl font-semibold text-[#0C1D4F] italic">
    Struggling with Reminders? Integrate Google Calendar seamlessly. 📝
  </p>

  <div className="flex justify-center">
    {!hasGoogleToken ? (
      <button
        onClick={handleGoogleConnect}
        className="bg-[#00255A] rounded-xl px-6 py-3 text-lg mt-4 text-white"
      >
        Connect Google Calendar
      </button>
    ) : (
      <button
        onClick={() => setShowAddClass(true)}
        className="bg-[#00255A] rounded-xl px-6 py-3 text-lg mt-4 text-white"
      >
        Add Class To Calendar
      </button>
    )}
  </div>
</div>
  );
}


    /* ---------- Coding Profiles ---------- */
    if (activePage === "Coding Profiles") {
      return <CodingProfiles />;
    }

    /* ---------- Upload Docs form ---------- */
   if (activePage === "Upload Docs") {
  return (
    <div className="flex justify-center items-center min-h-screen bg-[#B3D4F1]">
      <div className="w-full max-w-lg p-6 bg-[#F0F9FF] rounded-xl shadow-lg border border-gray-300">
        <h2 className="text-3xl font-bold mb-6 text-center text-[#00255A]">
          Upload Your Documents
        </h2>

        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-2 bg-green-100 text-green-800 border border-green-300 rounded shadow flex items-center gap-2 animate-fade-in-down">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-green-600"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414L8.414 15 3.293 9.879a1 1 0 111.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            {success}
          </div>
        )}

        <form
          onSubmit={handleUpload}
          className="flex flex-col gap-5"
        >
          <label className="text-sm font-medium text-gray-700">
            Document Name
            <input
              type="text"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              className="w-full mt-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
              required
            />
          </label>

          <label className="text-sm font-medium text-gray-700">
            Select File
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full mt-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
              required
            />
          </label>

          <Button
            type="submit"
            className="w-full py-2 bg-[#00255A] text-white font-semibold rounded hover:bg-[#013580] transition-colors duration-300"
            disabled={loading}
          >
            {loading ? "Uploading…" : "Upload Document"}
          </Button>
        </form>
      </div>
    </div>
  );
}


    return null;
  };

  /* ---------------------------------------------------------------------- */
  /*  RENDER                                                                */
  /* ---------------------------------------------------------------------- */
  return (
    <div className="flex h-screen">
      {/* Global modal mount */}
      {showAddClass && (
        <AddClassForm
          onClose={() => setShowAddClass(false)}
          onTokenExpired={() => setHasGoogleToken(false)}
        />
      )}

      {/* Sidebar */}
      <aside className="bg-[#0C1D4F] text-white w-64 p-4 flex flex-col justify-between">
  <div>
    {/* Logo and Title */}
    <div className="flex items-center gap-4 mb-8">
  {}
  <div className="relative w-9 h-9">
    <img
      src={A}
      alt="A"
      className="absolute top-0 left-0 w-8 h-8"
    />
    <img
      src={X}
      alt="X"
      className="absolute bottom-0 right-0 w-7 h-7"
    />
  </div>

  {/* AcademiX text */}
  <h1 className="text-2xl font-extrabold text-[#7AC2E3] leading-tight">
    Academi<span className="text-[#55A2D3]">X</span>
  </h1>
</div>



    <nav className="flex flex-col gap-4">
      {/* User Profile Button */}
      <Button
       active={currentBtn === "User Profile"}
        className="justify-start"
        onClick={() => setActivePage("User Profile")}
      >
        User Profile
      </Button>

      {/* Main Sidebar Buttons */}
      {["Dashboard", "Coding Profiles", "Upload Docs"].map(
        (btn) => (
          <Button
            key={btn}
            active={currentBtn === btn}
            className="justify-start"
            onClick={() => {
              setActivePage(btn);
              if (btn === "Dashboard") setShowDocuments(false);
            }}
          >
            {btn}
          </Button>
        )
      )}

      {/* Get Documents Button */}
      <Button
      active={currentBtn === "Get Documents"}
        className="justify-start"
        onClick={() => {
          setActivePage("Dashboard");
          setShowDocuments(true);
          fetchDocuments();
        }}
      >
        Get Documents
      </Button>
    </nav>
  </div>

  <Button onClick={handleLogout}>Logout</Button>
</aside>

      {/* Main panel */}
      <main className="flex-1 bg-[#B3D4F1] p-8 overflow-auto">
        {renderMainContent()}
      </main>
    </div>
  );
};

export default AcademiXDashboard;
