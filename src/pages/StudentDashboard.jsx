import { useEffect, useState, useContext } from "react";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function StudentDashboard() {
  // ── state ──
  const [tasks, setTasks] = useState([]);
  const [myImages, setMyImages] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");

  // upload modal
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTask, setUploadTask] = useState(null); // the task we're uploading to
  const [taskDetail, setTaskDetail] = useState(null); // task + requirements
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  // naming meta fields – filled by the student
  const [namingMeta, setNamingMeta] = useState({});

  // subcategory selections (when admin didn't specify)
  const [studentSubSelections, setStudentSubSelections] = useState({});
  const [subSubOptions, setSubSubOptions] = useState({});

  // view requirements modal
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);
  const [viewingTaskRequirements, setViewingTaskRequirements] = useState(null);

  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // ── loaders ──
  const loadTasks = async () => {
    try {
      const res = await api.get("/tasks");
      setTasks(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadMyImages = async () => {
    try {
      const res = await api.get("/student/images");
      setMyImages(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadTasks();
    loadMyImages();
  }, []);

  // ── view task requirements ──
  const viewTaskRequirements = async (task) => {
    try {
      const res = await api.get(`/tasks/${task.id}`);
      setViewingTaskRequirements(res.data);
      setShowRequirementsModal(true);
    } catch (e) {
      console.error(e);
    }
  };

  // ── open upload modal for a specific task ──
  const startUpload = async (task) => {
    setUploadTask(task);
    setFiles([]);
    setNamingMeta({});
    setStudentSubSelections({});
    setSubSubOptions({});

    // fetch task detail with requirements
    try {
      const res = await api.get(`/tasks/${task.id}`);
      setTaskDetail(res.data);

      // For unspecified sub-subs, load the options so student can pick
      if (res.data.requirements) {
        const opts = {};
        await Promise.all(
          res.data.requirements
            .filter((r) => !r.subsub_category_id)
            .map(async (r) => {
              const childRes = await api.get(`/categories/children/${r.subcategory_id}`);
              opts[r.subcategory_id] = childRes.data;
            })
        );
        setSubSubOptions(opts);
      }
    } catch {
      setTaskDetail(null);
    }

    setShowUpload(true);
  };

  // ── upload handler ──
  const handleUpload = async () => {
    if (!files.length) return alert("Please select images to upload");
    if (!uploadTask) return;

    // Validate that all required naming fields are filled
    const isMobility = uploadTask.category_name === "Mobility";
    if (isMobility) {
      if (!namingMeta.city || !namingMeta.camera) {
        return alert("Please fill in all naming convention fields (City, Camera)");
      }
    } else {
      if (!namingMeta.client || !namingMeta.storeId || !namingMeta.category || !namingMeta.product || !namingMeta.shelf || !namingMeta.angle) {
        return alert("Please fill in all naming convention fields");
      }
    }

    setUploading(true);

    const formData = new FormData();
    formData.append("task_id", uploadTask.id);
    for (const f of files) formData.append("images", f);

    // merge student sub-selections into naming_meta
    const finalMeta = {
      ...namingMeta,
      date: namingMeta.date || new Date().toISOString().slice(0, 10).replace(/-/g, ""),
      studentSubSelections
    };
    formData.append("naming_meta", JSON.stringify(finalMeta));

    try {
      const res = await api.post("/student/upload", formData);
      alert(res.data.message);
      setShowUpload(false);
      setFiles([]);
      setNamingMeta({});
      loadTasks();
      loadMyImages();
    } catch (err) {
      alert(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const filteredImages =
    filterStatus === "all" ? myImages : myImages.filter((img) => img.status === filterStatus);

  const isMob = uploadTask?.category_name === "Mobility";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <header className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Dashboard</h1>
            <p className="text-sm text-gray-500">Welcome, {user?.user?.username || user?.user?.full_name}</p>
          </div>
          <button onClick={handleLogout} className="btn-secondary">Logout</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "My Images", value: myImages.length, color: "text-gray-900", bg: "bg-primary-100", icon: "text-primary-600" },
            { label: "Pending", value: myImages.filter((i) => i.status === "pending").length, color: "text-yellow-600", bg: "bg-yellow-100", icon: "text-yellow-600" },
            { label: "Approved", value: myImages.filter((i) => i.status === "approved").length, color: "text-green-600", bg: "bg-green-100", icon: "text-green-600" },
            { label: "Rejected", value: myImages.filter((i) => i.status === "rejected").length, color: "text-red-600", bg: "bg-red-100", icon: "text-red-600" }
          ].map((s) => (
            <div key={s.label} className="card p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{s.label}</p>
                <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${s.bg}`}>
                <svg className={`w-7 h-7 ${s.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          ))}
        </div>

        {/* ── Available Tasks ── */}
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Available Tasks</h2>
        {tasks.length === 0 ? (
          <div className="text-center py-12 text-gray-400 mb-8">
            <p>No tasks available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
            {tasks.map((task) => {
              const remaining = task.total_images - task.approved_count;
              const pct = task.total_images > 0 ? Math.round((task.approved_count / task.total_images) * 100) : 0;
              return (
                <div key={task.id} className="card-premium p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{task.title}</h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => viewTaskRequirements(task)}
                        className="p-1 text-gray-500 hover:text-primary-600 transition-colors"
                        title="View Task Requirements"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        task.status === "open" ? "bg-blue-100 text-blue-800" :
                        task.status === "in_progress" ? "bg-yellow-100 text-yellow-800" :
                        "bg-green-100 text-green-800"
                      }`}>{task.status.replace("_", " ")}</span>
                    </div>
                  </div>
                  {task.description && <p className="text-sm text-gray-600 mb-2 line-clamp-2">{task.description}</p>}
                  <p className="text-sm text-gray-500 mb-1">Category: <span className="font-medium">{task.category_name}</span></p>
                  <p className="text-sm text-gray-500 mb-2">Approved: <span className="font-semibold text-green-600">{task.approved_count || 0}</span> / {task.total_images} images</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div className={`h-2 rounded-full ${pct >= 100 ? "bg-green-500" : "bg-primary-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  {(task.status === "open" || task.status === "in_progress") && (
                    <button onClick={() => startUpload(task)} className="w-full btn-primary text-sm py-2">
                      Upload Images
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── My Uploads ── */}
        <h2 className="text-lg font-semibold text-gray-800 mb-3">My Uploads</h2>
        <div className="flex space-x-2 mb-5 bg-white p-2 rounded-lg shadow-md w-fit">
          {["all", "pending", "approved", "rejected"].map((f) => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-all capitalize ${
                filterStatus === f ? "bg-primary-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-100"
              }`}
            >{f === "all" ? "All" : f}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredImages.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-400">
              <p>No images yet. Upload to a task above!</p>
            </div>
          ) : (
            filteredImages.map((img) => (
              <div key={img.id} className="card-premium group">
                <div className="relative aspect-video bg-gray-200 overflow-hidden">
                  <img
                    src={`http://localhost:5000/uploads/${img.filename}`}
                    alt={img.renamed_filename}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      img.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                      img.status === "approved" ? "bg-green-100 text-green-800" :
                      "bg-red-100 text-red-800"
                    }`}>{img.status}</span>
                  </div>
                </div>
                <div className="p-3 space-y-1">
                  <p className="text-sm font-semibold text-gray-900 truncate" title={img.renamed_filename}>
                    {img.renamed_filename}
                  </p>
                  <p className="text-xs text-gray-500">Original: {img.original_filename}</p>
                  <p className="text-xs text-gray-500">Task: {img.task_title || "—"}</p>
                  <p className="text-xs text-gray-400">{new Date(img.uploaded_at).toLocaleString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* ──── UPLOAD MODAL ──── */}
      {showUpload && uploadTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-premium-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Upload to: {uploadTask.title}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Category: {uploadTask.category_name} &nbsp;|&nbsp;
                  Remaining: {uploadTask.total_images - uploadTask.uploaded_count} images
                </p>
              </div>
              <button onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-gray-600" disabled={uploading}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* ── File selector ── */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Select Images *</label>
                <label className="w-full flex flex-col items-center px-4 py-6 bg-gray-50 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="mt-2 text-sm text-gray-600">
                    {files.length ? `${files.length} file(s) selected` : "Click to select images"}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={(e) => setFiles(Array.from(e.target.files))}
                    disabled={uploading}
                  />
                </label>
                {files.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {files.map((f) => f.name).join(", ")}
                  </p>
                )}
              </div>

              {/* ── Subcategory selections (if admin didn't specify) ── */}
              {taskDetail?.requirements?.some((r) => !r.subsub_category_id) && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Select Subcategories *</label>
                  <p className="text-xs text-gray-500 mb-3">The task requires you to choose a value for each subcategory below.</p>
                  <div className="space-y-3">
                    {taskDetail.requirements
                      .filter((r) => !r.subsub_category_id)
                      .map((r) => (
                        <div key={r.subcategory_id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                          <span className="text-sm font-medium text-gray-800 w-36 shrink-0">{r.subcategory_name}</span>
                          <select
                            className="select-field text-sm py-2"
                            value={studentSubSelections[r.subcategory_id] || ""}
                            onChange={(e) =>
                              setStudentSubSelections((prev) => ({ ...prev, [r.subcategory_id]: e.target.value }))
                            }
                          >
                            <option value="">— Select —</option>
                            {(subSubOptions[r.subcategory_id] || []).map((opt) => (
                              <option key={opt.id} value={opt.id}>{opt.name}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* ── Pre-specified requirements (read-only) ── */}
              {taskDetail?.requirements?.some((r) => r.subsub_category_id) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">Task Requirements (set by admin)</h3>
                  <div className="space-y-1">
                    {taskDetail.requirements
                      .filter((r) => r.subsub_category_id)
                      .map((r) => (
                        <p key={r.id} className="text-sm text-blue-800">
                          <span className="font-medium">{r.subcategory_name}:</span> {r.subsub_category_name}
                        </p>
                      ))}
                  </div>
                </div>
              )}

              {/* ── Naming Convention Fields ── */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-1">Naming Convention Details *</h3>
                <p className="text-xs text-gray-500 mb-3">
                  {isMob
                    ? "Format: MOB_City_Camera_Date_FrameID.jpg"
                    : "Format: Client_StoreID_Category_Product_Shelf_Angle_Date_Sequence.jpg"}
                </p>

                {isMob ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">City Code (3 letters) *</label>
                      <input
                        className="input-field text-sm py-2"
                        placeholder="e.g. BLR"
                        maxLength={3}
                        value={namingMeta.city || ""}
                        onChange={(e) => setNamingMeta({ ...namingMeta, city: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Camera Position *</label>
                      <select
                        className="select-field text-sm py-2"
                        value={namingMeta.camera || ""}
                        onChange={(e) => setNamingMeta({ ...namingMeta, camera: e.target.value })}
                      >
                        <option value="">Select</option>
                        <option value="FC">FC – Front Camera</option>
                        <option value="RC">RC – Rear Camera</option>
                        <option value="LC">LC – Left Camera</option>
                        <option value="RIC">RIC – Right Inside Camera</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Date (YYYYMMDD)</label>
                      <input
                        className="input-field text-sm py-2"
                        placeholder={new Date().toISOString().slice(0, 10).replace(/-/g, "")}
                        maxLength={8}
                        value={namingMeta.date || ""}
                        onChange={(e) => setNamingMeta({ ...namingMeta, date: e.target.value })}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Client / Brand *</label>
                      <input
                        className="input-field text-sm py-2"
                        placeholder="e.g. Reliance"
                        value={namingMeta.client || ""}
                        onChange={(e) => setNamingMeta({ ...namingMeta, client: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Store ID *</label>
                      <input
                        className="input-field text-sm py-2"
                        placeholder="e.g. STR1023"
                        value={namingMeta.storeId || ""}
                        onChange={(e) => setNamingMeta({ ...namingMeta, storeId: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Product Category *</label>
                      <input
                        className="input-field text-sm py-2"
                        placeholder="e.g. Beverages"
                        value={namingMeta.category || ""}
                        onChange={(e) => setNamingMeta({ ...namingMeta, category: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Product / SKU *</label>
                      <input
                        className="input-field text-sm py-2"
                        placeholder="e.g. CocaCola_330ml"
                        value={namingMeta.product || ""}
                        onChange={(e) => setNamingMeta({ ...namingMeta, product: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Shelf *</label>
                      <input
                        className="input-field text-sm py-2"
                        placeholder="e.g. Shelf2"
                        value={namingMeta.shelf || ""}
                        onChange={(e) => setNamingMeta({ ...namingMeta, shelf: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Capture Angle *</label>
                      <select
                        className="select-field text-sm py-2"
                        value={namingMeta.angle || ""}
                        onChange={(e) => setNamingMeta({ ...namingMeta, angle: e.target.value })}
                      >
                        <option value="">Select</option>
                        <option value="Front">Front</option>
                        <option value="Left">Left</option>
                        <option value="Right">Right</option>
                        <option value="Top">Top</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Date (YYYYMMDD)</label>
                      <input
                        className="input-field text-sm py-2"
                        placeholder={new Date().toISOString().slice(0, 10).replace(/-/g, "")}
                        maxLength={8}
                        value={namingMeta.date || ""}
                        onChange={(e) => setNamingMeta({ ...namingMeta, date: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {/* Preview generated name */}
                <div className="mt-3 bg-white border border-gray-200 rounded p-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">Preview (first image):</p>
                  <code className="text-sm text-primary-700">
                    {isMob
                      ? `MOB_${(namingMeta.city || "___").substring(0, 3)}_${namingMeta.camera || "__"}_${namingMeta.date || "YYYYMMDD"}_F001.jpg`
                      : `${namingMeta.client || "Client"}_${namingMeta.storeId || "STR0000"}_${namingMeta.category || "Category"}_${namingMeta.product || "Product"}_${namingMeta.shelf || "Shelf1"}_${namingMeta.angle || "Front"}_${namingMeta.date || "YYYYMMDD"}_01.jpg`}
                  </code>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button onClick={() => setShowUpload(false)} className="btn-secondary" disabled={uploading}>Cancel</button>
              <button
                onClick={handleUpload}
                className="btn-primary"
                disabled={uploading || files.length === 0}
              >
                {uploading ? "Uploading…" : `Upload ${files.length || 0} Image(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──── VIEW REQUIREMENTS MODAL ──── */}
      {showRequirementsModal && viewingTaskRequirements && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-premium-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Task Requirements</h2>
              <button onClick={() => { setShowRequirementsModal(false); setViewingTaskRequirements(null); }} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{viewingTaskRequirements.title}</h3>
                {viewingTaskRequirements.description && (
                  <p className="text-sm text-gray-600 mt-1">{viewingTaskRequirements.description}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Category</p>
                  <p className="font-medium">{viewingTaskRequirements.category_name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Target Images</p>
                  <p className="font-medium">{viewingTaskRequirements.total_images}</p>
                </div>
                <div>
                  <p className="text-gray-500">Approved</p>
                  <p className="font-medium text-green-600">{viewingTaskRequirements.approved_count || 0}</p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <p className="font-medium capitalize">{viewingTaskRequirements.status?.replace("_", " ")}</p>
                </div>
              </div>
              {viewingTaskRequirements.requirements && viewingTaskRequirements.requirements.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">Subcategory Requirements</h4>
                  <div className="space-y-1">
                    {viewingTaskRequirements.requirements.map((r) => (
                      <p key={r.id} className="text-sm text-blue-800">
                        <span className="font-medium">{r.subcategory_name}:</span>{" "}
                        {r.subsub_category_name || "User will choose"}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button onClick={() => { setShowRequirementsModal(false); setViewingTaskRequirements(null); }} className="btn-primary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
