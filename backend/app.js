const { useEffect, useMemo, useState } = React;

const STORAGE_KEY = "lumen-note-studio";

const sections = [
  { id: "dashboard", icon: "H", label: "Home" },
  { id: "notes", icon: "N", label: "Notes" },
  { id: "todo", icon: "T", label: "To-Do" },
  { id: "voice", icon: "V", label: "Voice Notes" },
  { id: "record", icon: "R", label: "Record" },
  { id: "calendar", icon: "C", label: "Calendar" },
  { id: "resume", icon: "B", label: "Resume" },
  { id: "settings", icon: "S", label: "Settings" }
];

function App() {
  const [data, setData] = useState(null);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [authVisible, setAuthVisible] = useState(true);
  const [search, setSearch] = useState("");
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
  const [voiceDraft, setVoiceDraft] = useState("");
  const [voiceListening, setVoiceListening] = useState(false);
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
    async function loadData() {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setData(JSON.parse(saved));
        return;
      }

      const response = await fetch("./data/seed.json");
      const seed = await response.json();
      setData(seed);
    }

    loadData();
  }, []);

  useEffect(() => {
    if (data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data]);

  const filteredNotes = useMemo(() => {
    if (!data) return [];
    return data.notes.filter((note) => {
      const haystack = `${note.title} ${note.content} ${note.category} ${note.tags.join(" ")}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
  }, [data, search]);

  const monthModel = useMemo(() => buildCalendar(data?.events || []), [data]);

  if (!data) {
    return <div className="main">Loading workspace...</div>;
  }

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

  function startVoiceCapture() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.onstart = () => setVoiceListening(true);
    recognition.onend = () => setVoiceListening(false);
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join("");
      setVoiceDraft(transcript);
    };
    recognition.start();
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

  function addRecord(event) {
    event.preventDefault();
    if (!recordDraft.title.trim()) return;
    const fileInput = document.getElementById("record-file");
    const fileName = fileInput?.files?.[0]?.name || "No file attached";
    const record = {
      id: crypto.randomUUID(),
      title: recordDraft.title,
      type: recordDraft.type,
      description: `${recordDraft.description} ${fileName}`.trim(),
      createdAt: new Date().toISOString()
    };
    updateCollection("recordings", [record, ...data.recordings]);
    setRecordDraft({ title: "", type: "image", description: "" });
    if (fileInput) fileInput.value = "";
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

  function clearWorkspace() {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }

  return (
    <>
      {authVisible && (
        <div className="auth-overlay">
          <div className="auth-card">
            <span className="eyebrow">Authentication / Home</span>
            <h2 className="section-title">Enter your creative workspace</h2>
            <p className="muted">
              This screen mirrors the login and signup idea from your sketch. Continue to open the app.
            </p>
            <div className="list-stack" style={{ marginTop: 18 }}>
              <input className="input" placeholder="Email or username" />
              <input className="input" type="password" placeholder="Password" />
              <div className="inline-group">
                <button className="primary" onClick={() => setAuthVisible(false)}>
                  Login
                </button>
                <button className="ghost" onClick={() => setAuthVisible(false)}>
                  Signup with Google
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  <p className="muted">Tap start speaking and turn your speech into saved note drafts.</p>
                  <div className="inline-group" style={{ marginTop: 16 }}>
                    <button className="primary" onClick={startVoiceCapture}>
                      {voiceListening ? "Listening..." : "Start voice AI"}
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
                    <button className="primary" onClick={startVoiceCapture}>
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
                    {data.recordings.map((record) => (
                      <div key={record.id} className="record-item">
                        <div className="record-head">
                          <div>
                            <strong>{record.title}</strong>
                            <p className="meta">
                              {record.type.toUpperCase()} • {new Date(record.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <p>{record.description}</p>
                      </div>
                    ))}
                  </div>
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
                  <h3>Workspace settings</h3>
                  <div className="settings-list">
                    <div className="span-12" style={{ width: "100%" }}>
                      <div className="settings-row">
                        <div>
                          <strong>Theme</strong>
                          <p className="meta">{data.settings.theme}</p>
                        </div>
                        <button className="ghost">Aurora Glow</button>
                      </div>
                      <div className="settings-row">
                        <div>
                          <strong>Privacy policy</strong>
                          <p className="meta">{data.settings.privacy}</p>
                        </div>
                        <button className="ghost">Review</button>
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
                </div>

                <div className="card span-6">
                  <h3>About and logout</h3>
                  <div className="list-stack">
                    <div className="note-card">
                      <strong>About profile</strong>
                      <p className="muted">Designed as a premium personal productivity studio with a vertical navbar and rich sections.</p>
                    </div>
                    <div className="note-card">
                      <strong>Contact us</strong>
                      <p className="muted">Add your email, support links or backend API later if you want to extend it.</p>
                    </div>
                    <div className="inline-group">
                      <button className="ghost" onClick={() => setAuthVisible(true)}>Logout</button>
                      <button className="danger" onClick={clearWorkspace}>Reset JSON data</button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </>
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

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
