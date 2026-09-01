import { useEffect, useMemo, useRef, useState } from "react";
import seedData from "./data/seed.json";
import "./App.css";

const STORAGE_KEY = "lumen-note-studio";
const AUTH_USERS_KEY = "lumen-note-users";
const AUTH_SESSION_KEY = "lumen-note-session";

const defaultSignupForm = {
  username: "",
  email: "",
  password: "",
  age: "",
  mobile: "",
  country: "India"
};

const defaultLoginForm = {
  username: "",
  password: ""
};

const defaultForgotForm = {
  username: "",
  newPassword: "",
  confirmPassword: ""
};

const defaultFlowchartForm = {
  projectName: "",
  description: "",
  diagramType: "Activity Diagram",
  extraContext: ""
};

const sections = [
  { id: "dashboard", icon: "H", label: "Home" },
  { id: "notes", icon: "N", label: "Notes" },
  { id: "todo", icon: "T", label: "To-Do" },
  { id: "voice", icon: "V", label: "Voice Notes" },
  { id: "record", icon: "R", label: "Record" },
  { id: "flowchart", icon: "F", label: "Flowchart" },
  { id: "calendar", icon: "C", label: "Calendar" },
  { id: "resume", icon: "B", label: "Resume" },
  { id: "settings", icon: "S", label: "Settings" }
];

const landingSlides = [
  {
    title: "Write, plan and organize in one elegant studio",
    caption: "Smart notes, to-dos, voice typing and records designed for fast daily work.",
    badge: "Notes + Voice"
  },
  {
    title: "See your work flow through rich boards and calendars",
    caption: "Color events, dashboard metrics and structured planning that feels more alive than plain notes.",
    badge: "Planner + Calendar"
  },
  {
    title: "Build your profile, resume and workspace identity",
    caption: "One account opens a premium productivity space with a strong personal dashboard.",
    badge: "Profile + Resume"
  }
];

function App() {
  const [data, setData] = useState(() => loadInitialData());
  const [activeSection, setActiveSection] = useState("dashboard");
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState("landing");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [authMessage, setAuthMessage] = useState("");
  const [signupForm, setSignupForm] = useState(defaultSignupForm);
  const [loginForm, setLoginForm] = useState(defaultLoginForm);
  const [forgotForm, setForgotForm] = useState(defaultForgotForm);
  const [flowchartForm, setFlowchartForm] = useState(defaultFlowchartForm);
  const [flowchartOutput, setFlowchartOutput] = useState("");
  const [flowchartSvg, setFlowchartSvg] = useState("");
  const [flowchartStatus, setFlowchartStatus] = useState("");
  const [search, setSearch] = useState("");
  const [recordSearch, setRecordSearch] = useState("");
  const [noteDraft, setNoteDraft] = useState({
    title: "",
    content: "",
    category: "Personal",
    tags: ""
  });
  const [todoDraft, setTodoDraft] = useState({
    title: "",
    priority: "Medium",
    dueDate: ""
  });
  const recognitionRef = useRef(null);
  const noteVoiceBaseContentRef = useRef("");
  const [voiceDraft, setVoiceDraft] = useState("");
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceTarget, setVoiceTarget] = useState("");
  const [voiceStatus, setVoiceStatus] = useState("Write the title manually, then use voice to fill note content.");
  const [recordDraft, setRecordDraft] = useState({
    title: "",
    type: "image",
    description: ""
  });
  const [eventDraft, setEventDraft] = useState({
    title: "",
    date: "",
    color: "#ff7a59"
  });

  useEffect(() => {
    if (data) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data]);

  useEffect(() => {
    if (!currentUser) return undefined;

    setData((current) => ({
      ...current,
      user: {
        ...current.user,
        name: currentUser.username
      }
    }));

    return undefined;
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) return undefined;

    const slider = window.setInterval(() => {
      setCurrentSlide((current) => (current + 1) % landingSlides.length);
    }, 3000);

    return () => window.clearInterval(slider);
  }, [currentUser]);

  const filteredNotes = useMemo(() => {
    if (!data) return [];
    return data.notes.filter((note) => {
      const haystack = `${note.title} ${note.content} ${note.category} ${note.tags.join(" ")}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
  }, [data, search]);

  const filteredRecords = useMemo(() => {
    if (!data) return [];
    return data.recordings.filter((record) =>
      record.title.toLowerCase().includes(recordSearch.toLowerCase())
    );
  }, [data, recordSearch]);

  const monthModel = useMemo(() => buildCalendar(data?.events || []), [data]);

  const doneTodos = data.todos.filter((todo) => todo.done).length;

  function updateCollection(key, value) {
    setData((current) => ({ ...current, [key]: value }));
  }

  function addNote() {
    if (!noteDraft.title.trim() || !noteDraft.content.trim()) return;
    const newNote = {
      id: crypto.randomUUID(),
      title: noteDraft.title,
      content: noteDraft.content,
      category: noteDraft.category,
      tags: noteDraft.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      pinned: false,
      updatedAt: new Date().toISOString()
    };
    updateCollection("notes", [newNote, ...data.notes]);
    setNoteDraft({ title: "", content: "", category: "Personal", tags: "" });
  }

  function togglePin(noteId) {
    updateCollection(
      "notes",
      data.notes.map((note) => (note.id === noteId ? { ...note, pinned: !note.pinned } : note))
    );
  }

  function deleteNote(noteId) {
    updateCollection(
      "notes",
      data.notes.filter((note) => note.id !== noteId)
    );
  }

  function addTodo() {
    if (!todoDraft.title.trim()) return;
    const newTodo = {
      id: crypto.randomUUID(),
      title: todoDraft.title,
      priority: todoDraft.priority,
      done: false,
      dueDate: todoDraft.dueDate || new Date().toISOString().slice(0, 10)
    };
    updateCollection("todos", [newTodo, ...data.todos]);
    setTodoDraft({ title: "", priority: "Medium", dueDate: "" });
  }

  function toggleTodo(todoId) {
    updateCollection(
      "todos",
      data.todos.map((todo) => (todo.id === todoId ? { ...todo, done: !todo.done } : todo))
    );
  }

  function removeTodo(todoId) {
    updateCollection(
      "todos",
      data.todos.filter((todo) => todo.id !== todoId)
    );
  }

  function startVoiceCapture(target = "note-content") {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceStatus("Speech recognition is not supported in this browser. Type manually or try Chrome/Edge.");
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        // Ignore stop errors when a previous session already ended.
      }
    }

    if (target === "note-content") {
      setActiveSection("notes");
      noteVoiceBaseContentRef.current = noteDraft.content;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      setVoiceListening(true);
      setVoiceTarget(target);
      setVoiceStatus(
        target === "note-content"
          ? "Listening... your speech will appear live in the note textarea."
          : "Listening for voice note transcript."
      );
    };
    recognition.onend = () => {
      setVoiceListening(false);
      setVoiceTarget("");
      recognitionRef.current = null;
      if (target === "note-content") {
        setVoiceStatus("Voice typing finished.");
      }
    };
    recognition.onerror = (event) => {
      setVoiceListening(false);
      setVoiceTarget("");
      recognitionRef.current = null;
      setVoiceStatus(`Voice input error: ${event.error}. Try Chrome or Edge and allow microphone access.`);
    };
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join("");
      if (!transcript.trim()) return;
      setVoiceDraft(transcript);
      if (target === "note-content") {
        const liveContent = [noteVoiceBaseContentRef.current, transcript.trim()]
          .filter(Boolean)
          .join(noteVoiceBaseContentRef.current ? "\n" : "");
        setNoteDraft((current) => ({
          ...current,
          content: liveContent
        }));
        setVoiceStatus("Speaking detected. Text is being written into the note.");
      } else {
        setVoiceStatus("Transcript captured successfully.");
      }
    };
    recognition.start();
  }

  function stopVoiceCapture() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        // Ignore stop errors if recognition already ended.
      }
    }
  }

  function saveVoiceNote() {
    if (!voiceDraft.trim()) return;
    const newVoiceNote = {
      id: crypto.randomUUID(),
      title: `Voice note ${data.voiceNotes.length + 1}`,
      transcript: voiceDraft,
      createdAt: new Date().toISOString()
    };
    updateCollection("voiceNotes", [newVoiceNote, ...data.voiceNotes]);
    setVoiceDraft("");
  }

  async function addRecord(event) {
    event.preventDefault();
    if (!recordDraft.title.trim()) return;
    const fileInput = document.getElementById("record-file");
    const file = fileInput?.files?.[0];
    const fileName = file?.name || "No file attached";
    const preview = file && recordDraft.type === "image"
      ? await readFileAsDataUrl(file)
      : "";
    const record = {
      id: crypto.randomUUID(),
      title: recordDraft.title,
      type: recordDraft.type,
      description: recordDraft.description,
      fileName,
      preview,
      createdAt: new Date().toISOString()
    };
    updateCollection("recordings", [record, ...data.recordings]);
    setRecordDraft({ title: "", type: "image", description: "" });
    if (fileInput) fileInput.value = "";
  }

  function deleteRecord(recordId) {
    updateCollection(
      "recordings",
      data.recordings.filter((record) => record.id !== recordId)
    );
  }

  async function generateFlowchartCode() {
    const output = generatePlantUml(flowchartForm);
    setFlowchartOutput(output);
    setFlowchartStatus("Generating diagram preview...");

    try {
      const response = await fetch("https://kroki.io/plantuml/svg", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain"
        },
        body: output
      });

      if (!response.ok) {
        throw new Error("Preview service unavailable");
      }

      const svg = await response.text();
      setFlowchartSvg(svg);
      setFlowchartStatus("Diagram preview generated.");
    } catch (error) {
      setFlowchartSvg("");
      setFlowchartStatus("Preview could not be generated. PlantUML code is still available below.");
    }
  }

  async function copyFlowchartCode() {
    if (!flowchartOutput) return;
    await navigator.clipboard.writeText(flowchartOutput);
  }

  function addEvent() {
    if (!eventDraft.title.trim() || !eventDraft.date) return;
    const eventItem = { id: crypto.randomUUID(), ...eventDraft };
    updateCollection("events", [eventItem, ...data.events]);
    setEventDraft({ title: "", date: "", color: "#ff7a59" });
  }

  function updateResume(field, value) {
    setData((current) => ({
      ...current,
      resume: {
        ...current.resume,
        [field]: field === "skills" ? value.split(",").map((item) => item.trim()).filter(Boolean) : value
      }
    }));
  }

  function toggleNotifications() {
    setData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        notifications: !current.settings.notifications
      }
    }));
  }

  function openAuthMode(mode, message = "") {
    setAuthMode(mode);
    setAuthMessage(message);
  }

  function completeAuth(user, message = "") {
    saveAuthSession(user);
    setCurrentUser(user);
    setAuthMessage(message);
    setSignupForm(defaultSignupForm);
    setLoginForm(defaultLoginForm);
    setForgotForm(defaultForgotForm);
  }

  function handleSignup(event) {
    event.preventDefault();

    const username = signupForm.username.trim();
    const email = signupForm.email.trim().toLowerCase();
    const password = signupForm.password;
    const age = signupForm.age.trim();
    const mobile = signupForm.mobile.trim();
    const country = signupForm.country.trim();
    if (!username || !email || !password || !age || !mobile || !country) {
      setAuthMessage("Please fill in every signup field.");
      return;
    }

    const users = loadAuthUsers();
    const exists = users.some(
      (user) => user.username.toLowerCase() === username.toLowerCase() || user.email.toLowerCase() === email.toLowerCase()
    );

    if (exists) {
      setAuthMessage("An account with this username or email already exists. Please log in.");
      setAuthMode("login");
      setLoginForm((current) => ({ ...current, username }));
      return;
    }

    const newUser = {
      id: crypto.randomUUID(),
      username,
      email,
      password,
      age,
      mobile,
      country
    };

    saveAuthUsers([...users, newUser]);
    setSignupForm(defaultSignupForm);
    setLoginForm({ username, password: "" });
    setAuthMode("login");
    setAuthMessage("Signup successful. Please sign in.");
  }

  function handleLogin(event) {
    event.preventDefault();

    const username = loginForm.username.trim();
    const password = loginForm.password;
    if (!username || !password) {
      setAuthMessage("Enter your username and password to log in.");
      return;
    }

    const user = loadAuthUsers().find(
      (item) => item.username.toLowerCase() === username.toLowerCase() && item.password === password
    );

    if (!user) {
      setAuthMessage("Incorrect username or password.");
      return;
    }

    completeAuth(user, "Login successful.");
  }

  function handleForgotPassword(event) {
    event.preventDefault();

    const username = forgotForm.username.trim();
    const newPassword = forgotForm.newPassword;
    const confirmPassword = forgotForm.confirmPassword;
    if (!username || !newPassword || !confirmPassword) {
      setAuthMessage("Fill in every field to reset your password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setAuthMessage("New password and confirm password do not match.");
      return;
    }

    const users = loadAuthUsers();
    const userIndex = users.findIndex((item) => item.username.toLowerCase() === username.toLowerCase());

    if (userIndex === -1) {
      setAuthMessage("No account found with that username.");
      return;
    }

    const updatedUsers = [...users];
    updatedUsers[userIndex] = {
      ...updatedUsers[userIndex],
      password: newPassword
    };
    saveAuthUsers(updatedUsers);
    setAuthMode("login");
    setLoginForm({ username, password: "" });
    setForgotForm(defaultForgotForm);
    setAuthMessage("Password updated. Please log in with your new password.");
  }

  function handleGoogleContinue() {
    const users = loadAuthUsers();
    let googleUser = users.find((user) => user.email === "google.user@lumennote.local");

    if (!googleUser) {
      googleUser = {
        id: crypto.randomUUID(),
        username: "GoogleUser",
        email: "google.user@lumennote.local",
        password: "google-auth",
        age: "22",
        mobile: "0000000000",
        country: "India"
      };
      saveAuthUsers([...users, googleUser]);
    }

    completeAuth(googleUser, "Google sign-in completed.");
  }

  function handleLogout() {
    window.localStorage.removeItem(AUTH_SESSION_KEY);
    setCurrentUser(null);
    setAuthMode("landing");
    setAuthMessage("Logged out successfully.");
  }

  function clearWorkspace() {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(AUTH_USERS_KEY);
    window.localStorage.removeItem(AUTH_SESSION_KEY);
    setData(loadFreshSeed());
    setActiveSection("dashboard");
    setCurrentUser(null);
    setAuthMode("signup");
    setAuthMessage("Workspace reset. Create a new account to continue.");
  }

  if (!currentUser) {
    const activeSlide = landingSlides[currentSlide];

    if (authMode === "landing") {
      return (
        <div className="landing-page">
          <header className="landing-header">
            <div className="landing-brand">
              <div className="brand-badge">L</div>
              <div>
                <h1>LumenNote Studio</h1>
                <p>Creative productivity with premium note flow</p>
              </div>
            </div>

            <div className="landing-actions">
              <button className="ghost" onClick={() => openAuthMode("login", "Sign in to continue to your workspace.")}>
                Login
              </button>
              <button className="primary" onClick={() => openAuthMode("signup", "Create your account to start using the app.")}>
                Signup
              </button>
            </div>
          </header>

          <section className="landing-hero">
            <div className="landing-copy">
              <span className="eyebrow">Landing Page</span>
              <h2>Capture ideas, tasks, voice and planning inside one expressive workspace.</h2>
              <p>
                Explore the product first. The landing page stays visible, top-right buttons open authentication,
                and new visitors automatically see the signup popup after 10 seconds.
              </p>
              <div className="inline-group top-gap">
                <button className="primary" onClick={() => openAuthMode("signup", "Create your account to start using the app.")}>
                  Get Started
                </button>
                <button className="ghost" onClick={() => openAuthMode("login", "Sign in to continue to your workspace.")}>
                  I have an account
                </button>
              </div>
            </div>

            <div className="landing-slider">
              <div className={`slide-visual slide-${currentSlide + 1}`}>
                <span className="slide-badge">{activeSlide.badge}</span>
                <div className="slide-card large">
                  <strong>{activeSlide.title}</strong>
                  <p>{activeSlide.caption}</p>
                </div>
                <div className="slide-row">
                  <div className="slide-card">
                    <span>Notes</span>
                    <strong>Fast capture</strong>
                  </div>
                  <div className="slide-card">
                    <span>Voice</span>
                    <strong>Live typing</strong>
                  </div>
                  <div className="slide-card">
                    <span>Planner</span>
                    <strong>Color events</strong>
                  </div>
                </div>
              </div>

              <div className="slide-dots">
                {landingSlides.map((slide, index) => (
                  <button
                    key={slide.badge}
                    type="button"
                    className={`slide-dot ${currentSlide === index ? "active" : ""}`}
                    onClick={() => setCurrentSlide(index)}
                    aria-label={`Show slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>
      );
    }

    return (
      <div className="auth-page">
        <div className="auth-page-panel">
          <div className="auth-page-copy">
            <div className="landing-brand">
              <div className="brand-badge">L</div>
              <div>
                <h1>LumenNote Studio</h1>
                <p>Account access for your note-taking workspace</p>
              </div>
            </div>
            <span className="eyebrow">Authentication</span>
            <h2 className="section-title">
              {authMode === "signup" && "Signup Page"}
              {authMode === "login" && "Sign In Page"}
              {authMode === "forgot" && "Forgot Password"}
            </h2>
            <p className="muted">
              {authMode === "signup" && "Create your account first. After signup, you will move to the sign-in page."}
              {authMode === "login" && "Sign in with your username and password to enter the note-taking application."}
              {authMode === "forgot" && "Reset your password and go back to sign in."}
            </p>
            <button type="button" className="ghost top-gap" onClick={() => openAuthMode("landing")}>
              Back to landing page
            </button>
          </div>

          <div className="auth-card auth-page-card">
            {authMessage && <p className="auth-message">{authMessage}</p>}

            {authMode === "signup" && (
              <form className="list-stack auth-form" onSubmit={handleSignup}>
                <input className="input" placeholder="Username" value={signupForm.username} onChange={(event) => setSignupForm({ ...signupForm, username: event.target.value })} />
                <input className="input" type="email" placeholder="Email ID" value={signupForm.email} onChange={(event) => setSignupForm({ ...signupForm, email: event.target.value })} />
                <input className="input" type="password" placeholder="Password" value={signupForm.password} onChange={(event) => setSignupForm({ ...signupForm, password: event.target.value })} />
                <div className="auth-grid">
                  <input className="input" type="number" min="1" placeholder="Age" value={signupForm.age} onChange={(event) => setSignupForm({ ...signupForm, age: event.target.value })} />
                  <input className="input" type="tel" placeholder="Mobile number" value={signupForm.mobile} onChange={(event) => setSignupForm({ ...signupForm, mobile: event.target.value })} />
                </div>
                <select className="select" value={signupForm.country} onChange={(event) => setSignupForm({ ...signupForm, country: event.target.value })}>
                  <option>India</option>
                  <option>United States</option>
                  <option>United Kingdom</option>
                  <option>Canada</option>
                  <option>Australia</option>
                  <option>Germany</option>
                  <option>Japan</option>
                </select>
                <button type="submit" className="primary">Create account</button>
                <button type="button" className="ghost" onClick={handleGoogleContinue}>Continue with Google</button>
                <p className="meta">
                  Already have an account? <button type="button" className="auth-link" onClick={() => openAuthMode("login")}>Go to sign in</button>
                </p>
              </form>
            )}

            {authMode === "login" && (
              <form className="list-stack auth-form" onSubmit={handleLogin}>
                <input className="input" placeholder="Username" value={loginForm.username} onChange={(event) => setLoginForm({ ...loginForm, username: event.target.value })} />
                <input className="input" type="password" placeholder="Password" value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} />
                <button type="submit" className="primary">Sign in</button>
                <div className="auth-footer">
                  <button type="button" className="auth-link" onClick={() => openAuthMode("forgot")}>Forgot password?</button>
                  <p className="meta">
                    New here? <button type="button" className="auth-link" onClick={() => openAuthMode("signup")}>Signup</button>
                  </p>
                </div>
              </form>
            )}

            {authMode === "forgot" && (
              <form className="list-stack auth-form" onSubmit={handleForgotPassword}>
                <input className="input" placeholder="Username" value={forgotForm.username} onChange={(event) => setForgotForm({ ...forgotForm, username: event.target.value })} />
                <input className="input" type="password" placeholder="New password" value={forgotForm.newPassword} onChange={(event) => setForgotForm({ ...forgotForm, newPassword: event.target.value })} />
                <input className="input" type="password" placeholder="Confirm new password" value={forgotForm.confirmPassword} onChange={(event) => setForgotForm({ ...forgotForm, confirmPassword: event.target.value })} />
                <button type="submit" className="primary">Update password</button>
                <p className="meta">
                  Remembered it? <button type="button" className="auth-link" onClick={() => openAuthMode("login")}>Back to sign in</button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-badge">L</div>
            <div>
              <h1>LumenNote Studio</h1>
              <p>More alive than a plain workspace</p>
            </div>
          </div>

          <div className="profile-card">
            <h3 style={{ margin: "0 0 6px" }}>{data.user.name}</h3>
            <p>{data.user.role}</p>
            <p className="muted" style={{ marginTop: 10 }}>{data.user.focus}</p>
            <div className="streak">Streak {data.user.streak} days</div>
          </div>

          <div className="nav-group">
            {sections.map((section) => (
              <button
                key={section.id}
                className={`nav-button ${activeSection === section.id ? "active" : ""}`}
                onClick={() => setActiveSection(section.id)}
              >
                <span>
                  <strong>{section.icon}</strong>
                  {section.label}
                </span>
                <span className="meta">→</span>
              </button>
            ))}
            <button className="nav-button" onClick={handleLogout}>
              <span>
                <strong>L</strong>
                Logout
              </span>
              <span className="meta">→</span>
            </button>
          </div>
        </aside>

        <main className="main">
          <section className="hero">
            <div className="hero-panel">
              <div className="hero-copy">
                <span className="eyebrow">Smart note taking reimagined</span>
                <h2>Capture notes, plans, voice and records in one expressive canvas.</h2>
                <p>
                  Your sketch is now a polished React workspace with notes, to-dos, voice-to-text, file records,
                  calendar planning, resume building and settings, all inside one elegant interface.
                </p>
              </div>
              <div className="hero-stats">
                <div className="stat">
                  <strong>{data.notes.length}</strong>
                  Notes
                </div>
                <div className="stat">
                  <strong>{data.todos.length}</strong>
                  Tasks
                </div>
                <div className="stat">
                  <strong>{data.events.length}</strong>
                  Events
                </div>
              </div>
            </div>

            <div className="hero-side">
              <span className="eyebrow" style={{ background: "rgba(255,255,255,0.08)", color: "#ffe5cd" }}>
                Workspace pulse
              </span>
              <div className="pulse">
                <div>
                  <strong style={{ fontSize: "2.2rem" }}>{Math.round((doneTodos / Math.max(data.todos.length, 1)) * 100)}%</strong>
                  <p className="muted" style={{ color: "#f3d8be" }}>Task completion this week</p>
                </div>
                <div className="pulse-bar" />
                <div className="mini-card" style={{ background: "rgba(255,255,255,0.08)", color: "#fbeada" }}>
                  Voice AI ready, calendar colors active, resume preview live.
                </div>
              </div>
            </div>
          </section>

          {activeSection === "dashboard" && (
            <section>
              <div className="section-head">
                <h2 className="section-title">Dashboard</h2>
                <input
                  className="input"
                  style={{ maxWidth: 280 }}
                  placeholder="Search notes, tags, categories..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <div className="card-grid">
                <div className="card span-4">
                  <h3>Quick Notes</h3>
                  <p className="muted">Pinned ideas stay visible here.</p>
                  <div className="list-stack">
                    {filteredNotes.filter((note) => note.pinned).slice(0, 3).map((note) => (
                      <div key={note.id} className="note-card pinned">
                        <div className="note-head">
                          <strong>{note.title}</strong>
                          <span className="meta">{note.category}</span>
                        </div>
                        <p className="muted">{note.content}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card span-4">
                  <h3>To-Do Snapshot</h3>
                  <div className="list-stack">
                    {data.todos.slice(0, 4).map((todo) => (
                      <div className={`todo-item ${todo.done ? "done" : ""}`} key={todo.id}>
                        <div className="todo-head">
                          <strong>{todo.title}</strong>
                          <span className="priority-chip" style={{ background: priorityColor(todo.priority).bg, color: priorityColor(todo.priority).text }}>
                            {todo.priority}
                          </span>
                        </div>
                        <p className="meta">Due {todo.dueDate}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card span-4">
                  <h3>Voice Assistant</h3>
                  <p className="muted">Use this for general voice transcripts. For notes, write the title manually and speak only the content in the Notes page.</p>
                  <div className="inline-group" style={{ marginTop: 16 }}>
                    <button className="primary" onClick={() => startVoiceCapture("voice-note")}>
                      {voiceListening ? "Listening..." : "Start transcript"}
                    </button>
                    <button className="soft" onClick={saveVoiceNote}>Save transcript</button>
                  </div>
                  <textarea
                    className="textarea"
                    style={{ marginTop: 16 }}
                    placeholder="Speech transcript will appear here..."
                    value={voiceDraft}
                    onChange={(event) => setVoiceDraft(event.target.value)}
                  />
                  <p className="meta" style={{ marginTop: 12 }}>{voiceStatus}</p>
                </div>

                <div className="card span-7">
                  <h3>Upcoming Calendar</h3>
                  <div className="calendar-grid">
                    {monthModel.labels.map((label) => (
                      <div key={label} className="calendar-label">{label}</div>
                    ))}
                    {monthModel.days.map((day) => (
                      <div
                        key={day.key}
                        className={`calendar-day ${day.event ? "has-event" : ""}`}
                        style={day.event ? { "--day-color": day.event.color } : {}}
                      >
                        <span>{day.date ? day.date.getDate() : ""}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card span-5">
                  <h3>Resume Builder</h3>
                  <p className="muted">{data.resume.headline}</p>
                  <div className="tag-list">
                    {data.resume.skills.map((skill) => (
                      <span key={skill} className="tag">{skill}</span>
                    ))}
                  </div>
                  <button className="ghost" style={{ marginTop: 18 }} onClick={() => setActiveSection("resume")}>
                    Open resume section
                  </button>
                </div>

                <div className="card span-12">
                  <div className="section-head" style={{ marginBottom: 0 }}>
                    <div>
                      <h3 style={{ margin: 0 }}>Settings</h3>
                      <p className="muted" style={{ marginTop: 8 }}>
                        Open profile, contact us, about us, and privacy policy from the home page.
                      </p>
                    </div>
                    <button className="primary" onClick={() => setActiveSection("settings")}>
                      Open Settings
                    </button>
                  </div>
                </div>

                <div className="card span-12">
                  <div className="section-head" style={{ marginBottom: 0 }}>
                    <div>
                      <h3 style={{ margin: 0 }}>Flowchart Creator</h3>
                      <p className="muted" style={{ marginTop: 8 }}>
                        Generate clean PlantUML activity and use case diagrams from project descriptions.
                      </p>
                    </div>
                    <button className="primary" onClick={() => setActiveSection("flowchart")}>
                      Open Flowchart Creator
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === "notes" && (
            <section>
              <div className="section-head">
                <h2 className="section-title">Notes</h2>
                <div className="filters">
                  <input
                    className="input"
                    style={{ width: 270 }}
                    placeholder="Search all notes"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
              </div>
              <div className="card-grid">
                <div className="editor-card span-5">
                  <h3>Create note</h3>
                  <p className="muted" style={{ marginBottom: 12 }}>
                    Write the title manually, then use the microphone button to speak the note content.
                  </p>
                  <div className="list-stack">
                    <input
                      className="input"
                      placeholder="Note title"
                      value={noteDraft.title}
                      onChange={(event) => setNoteDraft({ ...noteDraft, title: event.target.value })}
                    />
                    <select
                      className="select"
                      value={noteDraft.category}
                      onChange={(event) => setNoteDraft({ ...noteDraft, category: event.target.value })}
                    >
                      <option>Personal</option>
                      <option>Work</option>
                      <option>AI</option>
                      <option>Research</option>
                    </select>
                    <input
                      className="input"
                      placeholder="Tags separated by commas"
                      value={noteDraft.tags}
                      onChange={(event) => setNoteDraft({ ...noteDraft, tags: event.target.value })}
                    />
                    <textarea
                      className="textarea"
                      placeholder="Write your note"
                      value={noteDraft.content}
                      onChange={(event) => setNoteDraft({ ...noteDraft, content: event.target.value })}
                    />
                    <div className="voice-controls">
                      <div className={`mic-indicator ${voiceListening && voiceTarget === "note-content" ? "active" : ""}`}>
                        <span className="mic-dot" />
                        <span>
                          {voiceListening && voiceTarget === "note-content" ? "Mic is on" : "Mic is off"}
                        </span>
                      </div>
                      <div className="inline-group">
                        <button
                          type="button"
                          className="soft"
                          onClick={() => startVoiceCapture("note-content")}
                        >
                          {voiceListening && voiceTarget === "note-content" ? "Listening..." : "Start voice typing"}
                        </button>
                        {voiceListening && voiceTarget === "note-content" && (
                          <button type="button" className="danger" onClick={stopVoiceCapture}>
                            Stop
                          </button>
                        )}
                      </div>
                      <span className="meta">{voiceStatus}</span>
                    </div>
                    <button className="primary" onClick={addNote}>Save note</button>
                  </div>
                </div>

                <div className="card span-7">
                  <h3>Your note wall</h3>
                  <div className="list-stack">
                    {filteredNotes.map((note) => (
                      <div key={note.id} className={`note-card ${note.pinned ? "pinned" : ""}`}>
                        <div className="note-head">
                          <div>
                            <strong>{note.title}</strong>
                            <p className="meta">
                              {note.category} • {new Date(note.updatedAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="inline-group">
                            <button className="ghost" onClick={() => togglePin(note.id)}>
                              {note.pinned ? "Unpin" : "Pin"}
                            </button>
                            <button className="danger" onClick={() => deleteNote(note.id)}>Delete</button>
                          </div>
                        </div>
                        <p>{note.content}</p>
                        <div className="tag-list">
                          {note.tags.map((tag) => (
                            <span key={tag} className="tag">{tag}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {!filteredNotes.length && <div className="empty">No notes found.</div>}
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === "todo" && (
            <section>
              <div className="section-head">
                <h2 className="section-title">To-Do Planner</h2>
              </div>
              <div className="card-grid">
                <div className="editor-card span-4">
                  <h3>Add task</h3>
                  <div className="list-stack">
                    <input
                      className="input"
                      placeholder="Task title"
                      value={todoDraft.title}
                      onChange={(event) => setTodoDraft({ ...todoDraft, title: event.target.value })}
                    />
                    <select
                      className="select"
                      value={todoDraft.priority}
                      onChange={(event) => setTodoDraft({ ...todoDraft, priority: event.target.value })}
                    >
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                    <input
                      className="input"
                      type="date"
                      value={todoDraft.dueDate}
                      onChange={(event) => setTodoDraft({ ...todoDraft, dueDate: event.target.value })}
                    />
                    <button className="primary" onClick={addTodo}>Add to-do</button>
                  </div>
                </div>

                <div className="card span-8">
                  <h3>Task board</h3>
                  <div className="list-stack">
                    {data.todos.map((todo) => {
                      const color = priorityColor(todo.priority);
                      return (
                        <div key={todo.id} className={`todo-item ${todo.done ? "done" : ""}`}>
                          <div className="todo-head">
                            <div>
                              <h4 style={{ margin: 0 }}>{todo.title}</h4>
                              <p className="meta">Due {todo.dueDate}</p>
                            </div>
                            <div className="inline-group">
                              <span className="priority-chip" style={{ background: color.bg, color: color.text }}>
                                {todo.priority}
                              </span>
                              <button className="soft" onClick={() => toggleTodo(todo.id)}>
                                {todo.done ? "Undo" : "Complete"}
                              </button>
                              <button className="danger" onClick={() => removeTodo(todo.id)}>Delete</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === "voice" && (
            <section>
              <div className="section-head">
                <h2 className="section-title">Voice Notes</h2>
              </div>
              <div className="card-grid">
                <div className="editor-card span-5">
                  <h3>Voice to notes</h3>
                  <p className="muted">Use browser speech recognition to capture ideas instantly.</p>
                  <div className="inline-group" style={{ marginTop: 12 }}>
                    <button className="primary" onClick={() => startVoiceCapture("voice-note")}>
                      {voiceListening ? "Listening..." : "Start speaking"}
                    </button>
                    <button className="soft" onClick={saveVoiceNote}>Save voice note</button>
                  </div>
                  <textarea
                    className="textarea"
                    style={{ marginTop: 16 }}
                    value={voiceDraft}
                    placeholder="Transcript appears here"
                    onChange={(event) => setVoiceDraft(event.target.value)}
                  />
                </div>
                <div className="card span-7">
                  <h3>Saved transcripts</h3>
                  <div className="list-stack">
                    {data.voiceNotes.map((voice) => (
                      <div className="voice-item" key={voice.id}>
                        <div className="voice-head">
                          <strong>{voice.title}</strong>
                          <span className="meta">{new Date(voice.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p>{voice.transcript}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === "record" && (
            <section>
              <div className="section-head">
                <h2 className="section-title">Record Center</h2>
                <div className="search-inline">
                  <span className="search-icon">⌕</span>
                  <input
                    className="input search-field"
                    placeholder="Search record title"
                    value={recordSearch}
                    onChange={(event) => setRecordSearch(event.target.value)}
                  />
                </div>
              </div>
              <div className="card-grid">
                <form className="editor-card span-5" onSubmit={addRecord}>
                  <h3>Upload image or video</h3>
                  <div className="list-stack">
                    <input
                      className="input"
                      placeholder="Record title"
                      value={recordDraft.title}
                      onChange={(event) => setRecordDraft({ ...recordDraft, title: event.target.value })}
                    />
                    <select
                      className="select"
                      value={recordDraft.type}
                      onChange={(event) => setRecordDraft({ ...recordDraft, type: event.target.value })}
                    >
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                      <option value="audio">Audio</option>
                    </select>
                    <textarea
                      className="textarea"
                      placeholder="Description"
                      value={recordDraft.description}
                      onChange={(event) => setRecordDraft({ ...recordDraft, description: event.target.value })}
                    />
                    <input className="input" id="record-file" type="file" accept="image/*,video/*,audio/*" />
                    <button className="primary" type="submit">Save record</button>
                  </div>
                </form>

                <div className="card span-7">
                  <h3>Saved records</h3>
                  <div className="list-stack">
                    {filteredRecords.map((record) => (
                      <div key={record.id} className="record-item">
                        <div className="record-head">
                          <div>
                            <strong>{record.title}</strong>
                            <p className="meta">
                              {record.type.toUpperCase()} • {new Date(record.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <button className="danger" onClick={() => deleteRecord(record.id)}>Delete</button>
                        </div>
                        {record.preview && (
                          <img className="record-preview" src={record.preview} alt={record.title} />
                        )}
                        <p><strong>Description:</strong> {record.description || "No description added."}</p>
                        <p className="meta"><strong>File:</strong> {record.fileName || "No file attached"}</p>
                      </div>
                    ))}
                    {!filteredRecords.length && <div className="empty">No records found for that title.</div>}
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === "flowchart" && (
            <section>
              <div className="section-head">
                <h2 className="section-title">Flowchart Creator</h2>
              </div>
              <div className="card-grid">
                <div className="editor-card span-5">
                  <h3>Project Input</h3>
                  <div className="list-stack">
                    <input
                      className="input"
                      placeholder="Project Name"
                      value={flowchartForm.projectName}
                      onChange={(event) => setFlowchartForm({ ...flowchartForm, projectName: event.target.value })}
                    />
                    <select
                      className="select"
                      value={flowchartForm.diagramType}
                      onChange={(event) => setFlowchartForm({ ...flowchartForm, diagramType: event.target.value })}
                    >
                      <option>Activity Diagram</option>
                      <option>Use Case Diagram</option>
                    </select>
                    <textarea
                      className="textarea"
                      placeholder="Description"
                      value={flowchartForm.description}
                      onChange={(event) => setFlowchartForm({ ...flowchartForm, description: event.target.value })}
                    />
                    <textarea
                      className="textarea"
                      placeholder="Extra Context"
                      value={flowchartForm.extraContext}
                      onChange={(event) => setFlowchartForm({ ...flowchartForm, extraContext: event.target.value })}
                    />
                    <div className="inline-group">
                      <button className="primary" onClick={generateFlowchartCode}>Generate PlantUML</button>
                      <button className="ghost" onClick={copyFlowchartCode}>Copy Code</button>
                    </div>
                  </div>
                </div>

                <div className="card span-7">
                  <h3>Diagram Preview</h3>
                  <p className="muted">{flowchartStatus || "Generate a diagram to preview it here."}</p>
                  <div className="diagram-preview">
                    {flowchartSvg ? (
                      <div dangerouslySetInnerHTML={{ __html: flowchartSvg }} />
                    ) : (
                      <div className="empty">No diagram preview yet.</div>
                    )}
                  </div>
                  <h3 style={{ marginTop: 18 }}>PlantUML Output</h3>
                  <textarea
                    className="code-output"
                    value={flowchartOutput}
                    readOnly
                    placeholder="@startuml&#10;title Project Name&#10;...generated PlantUML code..."
                  />
                </div>
              </div>
            </section>
          )}

          {activeSection === "calendar" && (
            <section>
              <div className="section-head">
                <h2 className="section-title">Calendar</h2>
              </div>
              <div className="card-grid">
                <div className="calendar-card span-7">
                  <h3>{monthModel.title}</h3>
                  <div className="calendar-grid">
                    {monthModel.labels.map((label) => (
                      <div key={label} className="calendar-label">{label}</div>
                    ))}
                    {monthModel.days.map((day) => (
                      <div
                        key={day.key}
                        className={`calendar-day ${day.event ? "has-event" : ""}`}
                        style={day.event ? { "--day-color": day.event.color } : {}}
                      >
                        <div>
                          <strong>{day.date ? day.date.getDate() : ""}</strong>
                          <div className="meta" style={{ fontSize: "0.72rem" }}>{day.event?.title || ""}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="editor-card span-5">
                  <h3>Create event</h3>
                  <div className="list-stack">
                    <input
                      className="input"
                      placeholder="Event title"
                      value={eventDraft.title}
                      onChange={(event) => setEventDraft({ ...eventDraft, title: event.target.value })}
                    />
                    <input
                      className="input"
                      type="date"
                      value={eventDraft.date}
                      onChange={(event) => setEventDraft({ ...eventDraft, date: event.target.value })}
                    />
                    <input
                      className="input"
                      type="color"
                      value={eventDraft.color}
                      onChange={(event) => setEventDraft({ ...eventDraft, color: event.target.value })}
                    />
                    <button className="primary" onClick={addEvent}>Add event</button>
                    <div className="list-stack">
                      {data.events.map((eventItem) => (
                        <div key={eventItem.id} className="event-item">
                          <span className="event-color" style={{ background: `${eventItem.color}20`, color: eventItem.color }}>
                            {eventItem.title}
                          </span>
                          <p className="meta">{eventItem.date}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === "resume" && (
            <section>
              <div className="section-head">
                <h2 className="section-title">Resume Builder</h2>
                <button className="ghost" onClick={() => window.print()}>Export / Print</button>
              </div>
              <div className="card-grid">
                <div className="editor-card span-5">
                  <h3>Edit resume</h3>
                  <div className="list-stack">
                    <input className="input" value={data.resume.name} onChange={(event) => updateResume("name", event.target.value)} />
                    <input className="input" value={data.resume.headline} onChange={(event) => updateResume("headline", event.target.value)} />
                    <textarea className="textarea" value={data.resume.summary} onChange={(event) => updateResume("summary", event.target.value)} />
                    <input
                      className="input"
                      value={data.resume.skills.join(", ")}
                      onChange={(event) => updateResume("skills", event.target.value)}
                    />
                    <textarea
                      className="textarea"
                      value={data.resume.experience}
                      onChange={(event) => updateResume("experience", event.target.value)}
                    />
                  </div>
                </div>

                <div className="resume-preview span-7">
                  <h3>Live preview</h3>
                  <div className="resume-sheet">
                    <h2>{data.resume.name}</h2>
                    <p><strong>{data.resume.headline}</strong></p>
                    <p>{data.resume.summary}</p>
                    <h4>Skills</h4>
                    <div className="tag-list">
                      {data.resume.skills.map((skill) => (
                        <span key={skill} className="tag">{skill}</span>
                      ))}
                    </div>
                    <h4>Experience</h4>
                    <p>{data.resume.experience}</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === "settings" && (
            <section>
              <div className="section-head">
                <h2 className="section-title">Settings</h2>
              </div>
              <div className="card-grid">
                <div className="card span-6">
                  <h3>Profile</h3>
                  <div className="list-stack">
                    <div className="note-card">
                      <strong>{data.user.name}</strong>
                      <p className="meta">{data.user.role}</p>
                      <p className="muted" style={{ marginTop: 8 }}>{data.user.focus}</p>
                    </div>
                    <div className="settings-row">
                      <div>
                        <strong>Theme</strong>
                        <p className="meta">{data.settings.theme}</p>
                      </div>
                      <button className="ghost">Aurora Glow</button>
                    </div>
                    <div className="settings-row">
                      <div>
                        <strong>Notifications</strong>
                        <p className="meta">Keep reminders and updates enabled</p>
                      </div>
                      <button className={`switch ${data.settings.notifications ? "enabled" : ""}`} onClick={toggleNotifications} />
                    </div>
                  </div>
                </div>

                <div className="card span-6">
                  <h3>Contact Us</h3>
                  <div className="list-stack">
                    <div className="note-card">
                      <strong>Email support</strong>
                      <p className="muted">support@lumennote.app</p>
                    </div>
                    <div className="note-card">
                      <strong>Mobile</strong>
                      <p className="muted">+91 98765 43210</p>
                    </div>
                    <div className="note-card">
                      <strong>Office</strong>
                      <p className="muted">Creative Workspace Hub, Bengaluru, India</p>
                    </div>
                  </div>
                </div>

                <div className="card span-6">
                  <h3>About Us</h3>
                  <div className="list-stack">
                    <div className="note-card">
                      <strong>LumenNote Studio</strong>
                      <p className="muted">
                        A premium note-taking and productivity workspace built for notes, voice typing,
                        planning, records, resume building, and daily focus.
                      </p>
                    </div>
                    <div className="note-card">
                      <strong>Mission</strong>
                      <p className="muted">Make note-taking feel faster, warmer, and more expressive than plain workspace apps.</p>
                    </div>
                  </div>
                </div>

                <div className="card span-6">
                  <h3>Privacy Policy</h3>
                  <div className="list-stack">
                    <div className="note-card">
                      <strong>Workspace privacy</strong>
                      <p className="muted">{data.settings.privacy}</p>
                    </div>
                    <div className="note-card">
                      <strong>Data storage</strong>
                      <p className="muted">This demo currently stores account and workspace data in your browser localStorage.</p>
                    </div>
                    <div className="inline-group">
                      <button className="ghost" onClick={handleLogout}>Logout</button>
                      <button className="danger" onClick={clearWorkspace}>Reset JSON data</button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
  );
}

function priorityColor(priority) {
  const map = {
    High: { bg: "rgba(210,79,79,0.14)", text: "#a33a3a" },
    Medium: { bg: "rgba(242,193,78,0.18)", text: "#8f6910" },
    Low: { bg: "rgba(37,183,159,0.14)", text: "#127866" }
  };
  return map[priority] || map.Medium;
}

function buildCalendar(events) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const lead = firstDay.getDay();
  const total = lastDay.getDate();
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const days = [];

  for (let i = 0; i < lead; i += 1) {
    days.push({ key: `empty-${i}`, date: null, event: null });
  }

  for (let day = 1; day <= total; day += 1) {
    const date = new Date(year, month, day);
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const event = events.find((item) => item.date === iso);
    days.push({ key: iso, date, event });
  }

  return {
    title: today.toLocaleString("en-US", { month: "long", year: "numeric" }),
    labels,
    days
  };
}

function loadFreshSeed() {
  return JSON.parse(JSON.stringify(seedData));
}

function loadInitialData() {
  return readStoredJson(STORAGE_KEY, loadFreshSeed());
}

function loadAuthUsers() {
  return readStoredJson(AUTH_USERS_KEY, []);
}

function saveAuthUsers(users) {
  window.localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function loadAuthSession() {
  return readStoredJson(AUTH_SESSION_KEY, null);
}

function saveAuthSession(user) {
  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
}

function generatePlantUml({ projectName, description, diagramType, extraContext }) {
  const safeProjectName = sanitizePlantText(projectName || "Untitled Project");
  const combinedText = [description, extraContext].filter(Boolean).join(". ");
  const steps = extractProcessSteps(combinedText);

  if (diagramType === "Use Case Diagram") {
    return buildUseCasePlantUml(safeProjectName, combinedText, steps);
  }

  return buildActivityPlantUml(safeProjectName, combinedText, steps);
}

function buildActivityPlantUml(projectName, combinedText, steps) {
  const lines = ["@startuml", `title ${projectName}`, "start"];

  if (!steps.length) {
    lines.push(':Review project description;');
    lines.push(':Identify actors, components, and flows;');
    lines.push(':Produce system diagram output;');
  } else {
    steps.forEach((step) => {
      if (isDecisionStep(step)) {
        const label = sanitizePlantText(step);
        lines.push(`if (${label}?) then (yes)`);
        lines.push(':Continue primary flow;');
        lines.push('else (no)');
        lines.push(':Handle alternate path;');
        lines.push('endif');
      } else {
        lines.push(`:${sanitizePlantText(step)};`);
      }
    });
  }

  if (/\bapprove|validation|verify|check\b/i.test(combinedText)) {
    lines.push('if (Validation successful?) then (yes)');
    lines.push(':Finalize output;');
    lines.push('else (no)');
    lines.push(':Return for correction;');
    lines.push('endif');
  }

  lines.push("stop", "@enduml");
  return lines.join("\n");
}

function buildUseCasePlantUml(projectName, combinedText, steps) {
  const actors = extractActors(combinedText);
  const useCases = extractUseCases(steps, combinedText);
  const lines = ["@startuml", `title ${projectName}`, "left to right direction"];

  actors.forEach((actor) => {
    lines.push(`actor "${sanitizePlantText(actor)}" as ${toAlias(actor)}`);
  });

  lines.push('rectangle "System" {');
  useCases.forEach((useCase) => {
    lines.push(`  usecase "${sanitizePlantText(useCase)}" as ${toAlias(`uc ${useCase}`)}`);
  });
  lines.push("}");

  actors.forEach((actor, actorIndex) => {
    useCases.forEach((useCase, useCaseIndex) => {
      if (useCaseIndex % actors.length === actorIndex || actorIndex === 0) {
        lines.push(`${toAlias(actor)} --> ${toAlias(`uc ${useCase}`)}`);
      }
    });
  });

  lines.push("@enduml");
  return lines.join("\n");
}

function extractProcessSteps(text) {
  return text
    .split(/[\n.]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function extractActors(text) {
  const actors = [];
  const actorMap = [
    ["admin", "Admin"],
    ["customer", "Customer"],
    ["user", "User"],
    ["manager", "Manager"],
    ["developer", "Developer"],
    ["guest", "Guest"]
  ];

  actorMap.forEach(([keyword, label]) => {
    if (new RegExp(`\\b${keyword}\\b`, "i").test(text)) {
      actors.push(label);
    }
  });

  if (!actors.length) {
    actors.push("User", "System Admin");
  }

  return actors;
}

function extractUseCases(steps, text) {
  const candidates = steps
    .map((step) => toUseCaseLabel(step))
    .filter(Boolean);

  if (/\blogin|sign in|authenticate\b/i.test(text)) candidates.push("Authenticate account");
  if (/\bcreate|signup|register\b/i.test(text)) candidates.push("Create account");
  if (/\bsearch\b/i.test(text)) candidates.push("Search records");
  if (/\bdelete\b/i.test(text)) candidates.push("Delete item");
  if (/\bgenerate\b/i.test(text)) candidates.push("Generate output");

  return Array.from(new Set(candidates)).slice(0, 8).length
    ? Array.from(new Set(candidates)).slice(0, 8)
    : ["Use system", "Manage workflow", "View output"];
}

function toUseCaseLabel(step) {
  const cleaned = step.replace(/^(user|admin|system)\s+/i, "").trim();
  if (!cleaned) return "";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function isDecisionStep(step) {
  return /\bif\b|\bwhen\b|\bwhether\b|\bapprove\b|\bvalid\b/i.test(step);
}

function sanitizePlantText(text) {
  return String(text).replace(/"/g, "'").replace(/[{}]/g, "").trim();
}

function toAlias(text) {
  return sanitizePlantText(text).toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function readStoredJson(key, fallbackValue) {
  try {
    const saved = window.localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallbackValue;
  } catch (error) {
    window.localStorage.removeItem(key);
    return fallbackValue;
  }
}

export default App;
