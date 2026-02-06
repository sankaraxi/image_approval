import { useEffect, useState, useContext } from "react";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function AdminDashboard() {
  // ───── state ─────
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null); // task detail view
  const [taskImages, setTaskImages] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");

  // create-task modal
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", main_category_id: "", total_images: 100 });
  const [subCatsForTask, setSubCatsForTask] = useState([]); // level-2 children
  const [subSubOptions, setSubSubOptions] = useState({}); // { subcatId: [level-3 items] }
  const [selectedSubSubs, setSelectedSubSubs] = useState({}); // { subcatId: subsubId | "" }

  // review modal
  const [reviewImage, setReviewImage] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");

  // preview
  const [previewImage, setPreviewImage] = useState(null);

  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ───── loaders ─────
  const loadTasks = async () => {
    try { const res = await api.get("/tasks"); setTasks(res.data); } catch (e) { console.error(e); }
  };
  const loadStats = async () => {
    try { const res = await api.get("/admin/stats"); setStats(res.data); } catch (e) { console.error(e); }
  };
  const loadCategories = async () => {
    try { const res = await api.get("/categories/hierarchy"); setCategories(res.data); } catch (e) { console.error(e); }
  };
  const loadTaskImages = async (taskId) => {
    try { const res = await api.get(`/admin/images?task_id=${taskId}`); setTaskImages(res.data); } catch (e) { console.error(e); }
  };
  const loadAllImages = async () => {
    try { const res = await api.get("/admin/images"); setTaskImages(res.data); } catch (e) { console.error(e); }
  };

  useEffect(() => { loadTasks(); loadStats(); loadCategories(); }, []);

  // URL-based task navigation
  useEffect(() => {
    const taskId = searchParams.get("taskId");
    if (taskId && tasks.length > 0) {
      const task = tasks.find((t) => t.id === parseInt(taskId));
      if (task && (!selectedTask || selectedTask.id !== task.id)) {
        setSelectedTask(task);
        loadTaskImages(task.id);
      }
    }
  }, [searchParams, tasks]);

  // PDF report download
  const downloadPdfReport = async () => {
    try {
      const res = await api.get("/admin/report/pdf", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "image_report.pdf");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to download report");
    }
  };

  // when admin picks a category in the create-task form, load its subcategories + their children
  const handleTaskCategoryChange = async (catId) => {
    setTaskForm((f) => ({ ...f, main_category_id: catId }));
    setSelectedSubSubs({});
    if (!catId) { setSubCatsForTask([]); setSubSubOptions({}); return; }
    try {
      const res = await api.get(`/categories/children/${catId}`);
      setSubCatsForTask(res.data);
      // Load sub-sub options for each subcategory
      const opts = {};
      await Promise.all(
        res.data.map(async (sub) => {
          const r = await api.get(`/categories/children/${sub.id}`);
          opts[sub.id] = r.data;
        })
      );
      setSubSubOptions(opts);
    } catch { setSubCatsForTask([]); }
  };

  // ───── create task ─────
  const createTask = async () => {
    if (!taskForm.title || !taskForm.main_category_id || !taskForm.total_images) {
      alert("Please fill title, category, and image count");
      return;
    }

    const subcategory_requirements = subCatsForTask.map((sub) => ({
      subcategory_id: sub.id,
      subsub_category_id: selectedSubSubs[sub.id] ? parseInt(selectedSubSubs[sub.id]) : null
    }));

    try {
      await api.post("/tasks", {
        ...taskForm,
        total_images: parseInt(taskForm.total_images),
        subcategory_requirements
      });
      setShowCreateTask(false);
      setTaskForm({ title: "", description: "", main_category_id: "", total_images: 100 });
      setSubCatsForTask([]);
      setSubSubOptions({});
      setSelectedSubSubs({});
      loadTasks();
      loadStats();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create task");
    }
  };

  // ───── review actions ─────
  const approve = async (id) => {
    await api.put(`/admin/approve/${id}`, { admin_notes: adminNotes });
    setReviewImage(null);
    setAdminNotes("");
    if (selectedTask) loadTaskImages(selectedTask.id);
    loadStats();
  };
  const reject = async (id) => {
    if (!adminNotes.trim()) {
      alert("Description is required for rejection");
      return;
    }
    await api.put(`/admin/reject/${id}`, { admin_notes: adminNotes });
    setReviewImage(null);
    setAdminNotes("");
    if (selectedTask) loadTaskImages(selectedTask.id);
    loadStats();
  };

  // ───── open task detail ─────
  const openTask = (task) => {
    setSelectedTask(task);
    setSearchParams({ taskId: task.id });
    loadTaskImages(task.id);
  };

  const closeTaskDetail = () => {
    setSelectedTask(null);
    setTaskImages([]);
    setSearchParams({});
  };

  const filteredTaskImages = taskImages.filter(
    (img) => filterStatus === "all" || img.status === filterStatus
  );

  const mainCategory = categories; // hierarchy already loaded

  // ───── render ─────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ──── Header ──── */}
      <header className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Evaluator Dashboard</h1>
            <p className="text-sm text-gray-500">Manage tasks &amp; review images</p>
          </div>
          <div className="flex items-center space-x-3">
            {selectedTask && (
              <button onClick={closeTaskDetail} className="btn-secondary text-sm">
                ← Back to Tasks
              </button>
            )}
            <button onClick={downloadPdfReport} className="btn-secondary flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span>PDF Report</span>
            </button>
            <button onClick={() => setShowCreateTask(true)} className="btn-primary flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              <span>Create Task</span>
            </button>
            <button onClick={() => { logout(); navigate("/"); }} className="btn-secondary">Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ──── Stats ──── */}
        {stats && !selectedTask && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Tasks", value: stats.total_tasks, color: "text-gray-900" },
              { label: "Open Tasks", value: stats.open_tasks, color: "text-blue-600" },
              { label: "Total Images", value: stats.total_images, color: "text-gray-900" },
              { label: "Pending Review", value: stats.pending_images, color: "text-yellow-600" },
            ].map((s) => (
              <div key={s.label} className="card p-5">
                <p className="text-sm font-medium text-gray-500">{s.label}</p>
                <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value ?? 0}</p>
              </div>
            ))}
          </div>
        )}

        {/* ──── TASK LIST VIEW ──── */}
        {!selectedTask && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">All Tasks</h2>
            {tasks.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-lg">No tasks yet. Create one to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tasks.map((task) => {
                  const pct = task.total_images > 0 ? Math.round((task.uploaded_count / task.total_images) * 100) : 0;
                  return (
                    <div
                      key={task.id}
                      onClick={() => openTask(task)}
                      className="card-premium p-5 cursor-pointer hover:ring-2 hover:ring-primary-400 transition-all"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-gray-900 text-lg">{task.title}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          task.status === "open" ? "bg-blue-100 text-blue-800" :
                          task.status === "in_progress" ? "bg-yellow-100 text-yellow-800" :
                          task.status === "completed" ? "bg-green-100 text-green-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>{task.status.replace("_", " ")}</span>
                      </div>
                      {task.description && <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>}
                      <p className="text-sm text-gray-500 mb-1">
                        <span className="font-medium">Category:</span> {task.category_name}
                      </p>
                      <p className="text-sm text-gray-500 mb-3">
                        <span className="font-medium">Images:</span> {task.uploaded_count} / {task.total_images}
                      </p>
                      {/* progress bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${pct >= 100 ? "bg-green-500" : "bg-primary-500"}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1 text-right">{pct}%</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ──── TASK DETAIL VIEW ──── */}
        {selectedTask && (
          <div>
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedTask.title}</h2>
                  {selectedTask.description && <p className="text-gray-600 mt-1">{selectedTask.description}</p>}
                  <p className="text-sm text-gray-500 mt-2">
                    Category: <span className="font-medium">{selectedTask.category_name}</span> &nbsp;|&nbsp;
                    Images: <span className="font-medium">{selectedTask.uploaded_count} / {selectedTask.total_images}</span>
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  selectedTask.status === "open" ? "bg-blue-100 text-blue-800" :
                  selectedTask.status === "in_progress" ? "bg-yellow-100 text-yellow-800" :
                  selectedTask.status === "completed" ? "bg-green-100 text-green-800" :
                  "bg-gray-100 text-gray-800"
                }`}>{selectedTask.status.replace("_", " ")}</span>
              </div>
            </div>

            {/* filter bar */}
            <div className="flex space-x-2 mb-6 bg-white p-2 rounded-lg shadow-md w-fit">
              {["all", "pending", "approved", "rejected"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={`px-4 py-2 rounded-md font-medium transition-all text-sm capitalize ${
                    filterStatus === f ? "bg-primary-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >{f === "all" ? "All" : f}</button>
              ))}
            </div>

            {/* image grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredTaskImages.length === 0 ? (
                <div className="col-span-full text-center py-12 text-gray-400">
                  <p>No images match the current filter.</p>
                </div>
              ) : (
                filteredTaskImages.map((img) => (
                  <div key={img.id} className="card-premium group">
                    <div className="relative aspect-video bg-gray-200 overflow-hidden">
                      <img
                        src={`http://localhost:5000/uploads/${img.filename}`}
                        alt={img.renamed_filename}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                        onClick={() => setPreviewImage(`http://localhost:5000/uploads/${img.filename}`)}
                      />
                      <div className="absolute top-2 right-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          img.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                          img.status === "approved" ? "bg-green-100 text-green-800" :
                          "bg-red-100 text-red-800"
                        }`}>{img.status}</span>
                      </div>
                    </div>
                    <div className="p-3 space-y-1">
                      <p className="text-sm font-semibold text-gray-900 truncate" title={img.renamed_filename}>{img.renamed_filename}</p>
                      {/* <p className="text-xs text-gray-500">Original: {img.original_filename}</p> */}
                      <p className="text-xs text-gray-500">User: {img.studentName}</p>
                      <p className="text-xs text-gray-400">{new Date(img.uploaded_at).toLocaleString()}</p>
                      {img.status === "pending" && (
                        <button
                          onClick={() => setReviewImage(img)}
                          className="mt-2 w-full btn-primary text-sm py-1.5"
                        >Review</button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* ──── CREATE TASK MODAL ──── */}
      {showCreateTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-premium-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Create Task / Job Card</h2>
              <button onClick={() => setShowCreateTask(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Task Title *</label>
                <input
                  className="input-field"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="e.g. Bangalore Road Mapping – Feb 2026"
                />
              </div>

              {/* description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  className="input-field"
                  rows={2}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Optional task details…"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* category */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Category *</label>
                  <select
                    className="select-field"
                    value={taskForm.main_category_id}
                    onChange={(e) => handleTaskCategoryChange(e.target.value)}
                  >
                    <option value="">Select Category</option>
                    {mainCategory.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* total images */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Total Images *</label>
                  <input
                    type="number"
                    min={1}
                    className="input-field"
                    value={taskForm.total_images}
                    onChange={(e) => setTaskForm({ ...taskForm, total_images: e.target.value })}
                  />
                </div>
              </div>

              {/* subcategory checkboxes with sub-sub selectors */}
              {subCatsForTask.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Subcategory Requirements
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Select a specific option for each subcategory, or leave "User will choose" for users to pick during upload.
                  </p>
                  <div className="space-y-3">
                    {subCatsForTask.map((sub) => (
                      <div key={sub.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                        <span className="text-sm font-medium text-gray-800 w-36 shrink-0">{sub.name}</span>
                        <select
                          className="select-field text-sm py-2"
                          value={selectedSubSubs[sub.id] || ""}
                          onChange={(e) =>
                            setSelectedSubSubs((prev) => ({ ...prev, [sub.id]: e.target.value }))
                          }
                        >
                          <option value="">— User will choose —</option>
                          {(subSubOptions[sub.id] || []).map((opt) => (
                            <option key={opt.id} value={opt.id}>{opt.name}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button onClick={() => setShowCreateTask(false)} className="btn-secondary">Cancel</button>
              <button onClick={createTask} className="btn-primary">Create Task</button>
            </div>
          </div>
        </div>
      )}

      {/* ──── REVIEW MODAL ──── */}
      {reviewImage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-premium-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Review Image</h2>
              <button onClick={() => { setReviewImage(null); setAdminNotes(""); }} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
                <img src={`http://localhost:5000/uploads/${reviewImage.filename}`} alt="" className="w-full h-full object-contain" />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-gray-500">System Name</p><p className="font-medium">{reviewImage.renamed_filename}</p></div>
                <div><p className="text-gray-500">Original Name</p><p className="font-medium">{reviewImage.original_filename}</p></div>
                <div><p className="text-gray-500">User</p><p className="font-medium">{reviewImage.studentName}</p></div>
                <div><p className="text-gray-500">Uploaded</p><p className="font-medium">{new Date(reviewImage.uploaded_at).toLocaleString()}</p></div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Admin Notes <span className="text-red-500">(Required for rejection)*</span></label>
                <textarea className="input-field" rows={3} value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Required reason for rejection…" />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button onClick={() => reject(reviewImage.id)} className="btn-danger">Reject</button>
              <button onClick={() => approve(reviewImage.id)} className="btn-success">Approve</button>
            </div>
          </div>
        </div>
      )}

      {/* ──── PREVIEW MODAL ──── */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} alt="Preview" className="max-w-5xl w-full h-auto rounded-lg" />
          <button onClick={() => setPreviewImage(null)} className="absolute top-4 right-4 text-white hover:text-gray-300">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}