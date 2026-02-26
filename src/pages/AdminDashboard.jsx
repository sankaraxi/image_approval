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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("tasks"); // "tasks" | "categories"

  // ── Category Manager state ──
  const [allCategoriesFlat, setAllCategoriesFlat] = useState([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatForm, setNewCatForm] = useState({ name: "", level: 1, parent_id: "", naming_prefix: "", display_order: 0 });
  const [namingFields, setNamingFields] = useState([]); // for selected main category
  const [selectedManageCategory, setSelectedManageCategory] = useState(null); // main cat being managed
  const [showAddNamingField, setShowAddNamingField] = useState(false);
  const [newFieldForm, setNewFieldForm] = useState({
    field_name: "", field_label: "", field_type: "text", field_options: "",
    is_required: true, display_order: 0, placeholder: "", separator: "_"
  });
  const [editingField, setEditingField] = useState(null);

  // create-task modal
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", main_category_id: "", total_images: 100, start_date: "", end_date: "", final_review_date: "" });
  const [subCatsForTask, setSubCatsForTask] = useState([]); // level-2 children
  const [subSubOptions, setSubSubOptions] = useState({}); // { subcatId: [level-3 items] }
  const [selectedSubSubs, setSelectedSubSubs] = useState({}); // { subcatId: subsubId | "" }

  // edit-task modal
  const [showEditTask, setShowEditTask] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", main_category_id: "", total_images: 100, start_date: "", end_date: "", final_review_date: "" });
  const [editSubCats, setEditSubCats] = useState([]);
  const [editSubSubOptions, setEditSubSubOptions] = useState({});
  const [editSelectedSubSubs, setEditSelectedSubSubs] = useState({});

  // review modal
  const [reviewImage, setReviewImage] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [approveLoading, setApproveLoading] = useState(false); // Loading state for approval + vendor upload

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

  // ── Category Manager loaders ──
  const loadAllCategoriesFlat = async () => {
    try { const res = await api.get("/categories"); setAllCategoriesFlat(res.data); } catch (e) { console.error(e); }
  };
  const loadNamingFields = async (categoryId) => {
    try { const res = await api.get(`/categories/naming-fields/${categoryId}`); setNamingFields(res.data); } catch (e) { console.error(e); }
  };

  const addCategory = async () => {
    if (!newCatForm.name) return alert("Name is required");
    try {
      await api.post("/categories", {
        name: newCatForm.name,
        level: parseInt(newCatForm.level),
        parent_id: newCatForm.parent_id ? parseInt(newCatForm.parent_id) : null,
        naming_prefix: newCatForm.naming_prefix || null,
        display_order: parseInt(newCatForm.display_order) || 0
      });
      setShowAddCategory(false);
      setNewCatForm({ name: "", level: 1, parent_id: "", naming_prefix: "", display_order: 0 });
      loadCategories();
      loadAllCategoriesFlat();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add category");
    }
  };

  const deleteCategory = async (id) => {
    if (!confirm("Delete this category and all its children?")) return;
    try {
      await api.delete(`/categories/${id}`);
      loadCategories();
      loadAllCategoriesFlat();
      if (selectedManageCategory?.id === id) {
        setSelectedManageCategory(null);
        setNamingFields([]);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete category");
    }
  };

  const addNamingField = async () => {
    if (!newFieldForm.field_name || !newFieldForm.field_label) return alert("Field name and label are required");
    const payload = {
      category_id: selectedManageCategory.id,
      field_name: newFieldForm.field_name,
      field_label: newFieldForm.field_label,
      field_type: newFieldForm.field_type,
      field_options: newFieldForm.field_options ? newFieldForm.field_options.split(",").map(s => s.trim()).filter(Boolean) : null,
      is_required: newFieldForm.is_required ? 1 : 0,
      display_order: parseInt(newFieldForm.display_order) || 0,
      placeholder: newFieldForm.placeholder || null,
      separator: newFieldForm.separator || "_"
    };
    try {
      if (editingField) {
        await api.put(`/categories/naming-fields/${editingField.id}`, payload);
      } else {
        await api.post("/categories/naming-fields", payload);
      }
      setShowAddNamingField(false);
      setEditingField(null);
      setNewFieldForm({ field_name: "", field_label: "", field_type: "text", field_options: "", is_required: true, display_order: 0, placeholder: "", separator: "_" });
      loadNamingFields(selectedManageCategory.id);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save naming field");
    }
  };

  const deleteNamingField = async (id) => {
    if (!confirm("Delete this naming field?")) return;
    try {
      await api.delete(`/categories/naming-fields/${id}`);
      loadNamingFields(selectedManageCategory.id);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete naming field");
    }
  };

  const openEditNamingField = (field) => {
    setEditingField(field);
    setNewFieldForm({
      field_name: field.field_name,
      field_label: field.field_label,
      field_type: field.field_type,
      field_options: field.field_options ? field.field_options.join(", ") : "",
      is_required: !!field.is_required,
      display_order: field.display_order,
      placeholder: field.placeholder || "",
      separator: field.separator || "_"
    });
    setShowAddNamingField(true);
  };

  const selectManageCategory = (cat) => {
    setSelectedManageCategory(cat);
    loadNamingFields(cat.id);
  };

  useEffect(() => { loadTasks(); loadStats(); loadCategories(); loadAllCategoriesFlat(); }, []);

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

  // when admin picks a category in the edit-task form
  const handleEditCategoryChange = async (catId) => {
    setEditForm((f) => ({ ...f, main_category_id: catId }));
    setEditSelectedSubSubs({});
    if (!catId) { setEditSubCats([]); setEditSubSubOptions({}); return; }
    try {
      const res = await api.get(`/categories/children/${catId}`);
      setEditSubCats(res.data);
      const opts = {};
      await Promise.all(
        res.data.map(async (sub) => {
          const r = await api.get(`/categories/children/${sub.id}`);
          opts[sub.id] = r.data;
        })
      );
      setEditSubSubOptions(opts);
    } catch { setEditSubCats([]); }
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
      setTaskForm({ title: "", description: "", main_category_id: "", total_images: 100, start_date: "", end_date: "", final_review_date: "" });
      setSubCatsForTask([]);
      setSubSubOptions({});
      setSelectedSubSubs({});
      loadTasks();
      loadStats();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create task");
    }
  };

  // ───── edit task ─────
  const openEditTask = async (task, e) => {
    e.stopPropagation(); // prevent opening task detail
    try {
      // Load full task details including requirements
      const res = await api.get(`/tasks/${task.id}`);
      const fullTask = res.data;
      
      setEditingTask(fullTask);
      setEditForm({
        title: fullTask.title,
        description: fullTask.description || "",
        main_category_id: fullTask.main_category_id,
        total_images: fullTask.total_images,
        start_date: fullTask.start_date ? fullTask.start_date.slice(0, 10) : "",
        end_date: fullTask.end_date ? fullTask.end_date.slice(0, 10) : "",
        final_review_date: fullTask.final_review_date ? fullTask.final_review_date.slice(0, 10) : ""
      });

      // Load subcategories for the selected category
      const subRes = await api.get(`/categories/children/${fullTask.main_category_id}`);
      setEditSubCats(subRes.data);

      // Load sub-sub options and set selected values
      const opts = {};
      const selected = {};
      await Promise.all(
        subRes.data.map(async (sub) => {
          const r = await api.get(`/categories/children/${sub.id}`);
          opts[sub.id] = r.data;
          
          // Find if this subcategory has a requirement
          const req = fullTask.requirements?.find(req => req.subcategory_id === sub.id);
          if (req && req.subsub_category_id) {
            selected[sub.id] = req.subsub_category_id.toString();
          } else {
            selected[sub.id] = "";
          }
        })
      );
      setEditSubSubOptions(opts);
      setEditSelectedSubSubs(selected);
      setShowEditTask(true);
    } catch (err) {
      alert("Failed to load task details");
      console.error(err);
    }
  };

  const updateTask = async () => {
    if (!editForm.title || !editForm.main_category_id || !editForm.total_images) {
      alert("Please fill title, category, and image count");
      return;
    }

    const subcategory_requirements = editSubCats.map((sub) => ({
      subcategory_id: sub.id,
      subsub_category_id: editSelectedSubSubs[sub.id] ? parseInt(editSelectedSubSubs[sub.id]) : null
    }));

    try {
      await api.put(`/tasks/${editingTask.id}`, {
        ...editForm,
        total_images: parseInt(editForm.total_images),
        subcategory_requirements
      });
      setShowEditTask(false);
      setEditingTask(null);
      setEditForm({ title: "", description: "", main_category_id: "", total_images: 100, start_date: "", end_date: "", final_review_date: "" });
      setEditSubCats([]);
      setEditSubSubOptions({});
      setEditSelectedSubSubs({});
      loadTasks();
      loadStats();
      // If we're viewing this task, refresh its details
      if (selectedTask && selectedTask.id === editingTask.id) {
        const updatedTask = tasks.find(t => t.id === editingTask.id);
        if (updatedTask) setSelectedTask(updatedTask);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update task");
    }
  };

  // ───── review actions ─────
  const approve = async (id) => {
    setApproveLoading(true);
    try {
      // Call new POST endpoint that approves AND uploads to vendor
      const response = await api.post(`/admin/approve-image/${id}`, { admin_notes: adminNotes });
      alert("✅ " + (response.data?.message || "Image approved and uploaded to vendor"));
      setReviewImage(null);
      setAdminNotes("");
      if (selectedTask) loadTaskImages(selectedTask.id);
      else loadAllImages();
      loadStats();
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || "Failed to approve image";
      console.error("Approval error:", err);
      alert("❌ " + errorMsg);
    } finally {
      setApproveLoading(false);
    }
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Evaluator Dashboard</h1>
              <p className="text-xs sm:text-sm text-gray-500">Manage tasks &amp; review images</p>
            </div>
            
            {/* Hamburger Icon for Mobile */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-3">
              {selectedTask && (
                <button onClick={closeTaskDetail} className="btn-secondary text-sm">
                  ← Back to Tasks
                </button>
              )}
              <button
                onClick={() => { setActiveTab("tasks"); setSelectedManageCategory(null); }}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${activeTab === "tasks" ? "bg-primary-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
              >Tasks</button>
              <button
                onClick={() => { setActiveTab("categories"); loadAllCategoriesFlat(); }}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${activeTab === "categories" ? "bg-primary-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
              >Category Manager</button>
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

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden mt-4 pb-4 border-t border-gray-200 pt-4 space-y-2">
              {selectedTask && (
                <button
                  onClick={() => { closeTaskDetail(); setMobileMenuOpen(false); }}
                  className="w-full btn-secondary text-sm justify-start"
                >
                  ← Back to Tasks
                </button>
              )}
              <button
                onClick={() => { setActiveTab("tasks"); setMobileMenuOpen(false); }}
                className={`w-full px-4 py-2 rounded-md font-medium text-sm text-left ${activeTab === "tasks" ? "bg-primary-100 text-primary-700" : "text-gray-600"}`}
              >Tasks</button>
              <button
                onClick={() => { setActiveTab("categories"); loadAllCategoriesFlat(); setMobileMenuOpen(false); }}
                className={`w-full px-4 py-2 rounded-md font-medium text-sm text-left ${activeTab === "categories" ? "bg-primary-100 text-primary-700" : "text-gray-600"}`}
              >Category Manager</button>
              <button
                onClick={() => { downloadPdfReport(); setMobileMenuOpen(false); }}
                className="w-full btn-secondary flex items-center space-x-2 justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <span>PDF Report</span>
              </button>
              <button
                onClick={() => { setShowCreateTask(true); setMobileMenuOpen(false); }}
                className="w-full btn-primary flex items-center space-x-2 justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                <span>Create Task</span>
              </button>
              <button
                onClick={() => { logout(); navigate("/"); setMobileMenuOpen(false); }}
                className="w-full btn-secondary"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ──── Stats ──── */}
        {stats && !selectedTask && activeTab === "tasks" && (
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
        {!selectedTask && activeTab === "tasks" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">All Tasks</h2>
            {tasks.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-lg">No tasks yet. Create one to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tasks.map((task) => {
                  const pct = task.total_images > 0 ? Math.round(((task.approved_count || 0) / task.total_images) * 100) : 0;
                  const isExpired = task.end_date && new Date(task.end_date) < new Date(new Date().toDateString());
                  return (
                    <div
                      key={task.id}
                      onClick={() => openTask(task)}
                      className="card-premium p-5 cursor-pointer hover:ring-2 hover:ring-primary-400 transition-all relative"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-gray-900 text-lg pr-2">{task.title}</h3>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => openEditTask(task, e)}
                            className="p-1.5 rounded-md text-gray-600 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                            title="Edit Task"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            task.status === "open" ? "bg-blue-100 text-blue-800" :
                            task.status === "in_progress" ? "bg-yellow-100 text-yellow-800" :
                            task.status === "completed" ? "bg-green-100 text-green-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>{task.status.replace("_", " ")}</span>
                        </div>
                      </div>
                      {task.description && <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>}
                      <p className="text-sm text-gray-500 mb-1">
                        <span className="font-medium">Category:</span> {task.category_name}
                      </p>
                      <p className="text-sm text-gray-500 mb-1">
                        <span className="font-medium">Uploaded:</span> {task.uploaded_count || 0} &nbsp;|&nbsp;
                        <span className="font-medium">Approved:</span> <span className="text-green-600 font-semibold">{task.approved_count || 0}</span> / {task.total_images}
                      </p>
                      {/* Dates */}
                      {(task.start_date || task.end_date || task.final_review_date) && (
                        <div className="text-xs text-gray-400 mb-2 space-y-0.5">
                          {task.start_date && <p>Start: {new Date(task.start_date).toLocaleDateString()}</p>}
                          {task.end_date && <p className={isExpired ? "text-red-500 font-medium" : ""}>End: {new Date(task.end_date).toLocaleDateString()}{isExpired ? " (Expired)" : ""}</p>}
                          {task.final_review_date && <p>Review by: {new Date(task.final_review_date).toLocaleDateString()}</p>}
                        </div>
                      )}
                      {/* progress bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${pct >= 100 ? "bg-green-500" : "bg-primary-500"}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1 text-right">{pct}% approved</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ──── TASK DETAIL VIEW ──── */}
        {selectedTask && activeTab === "tasks" && (
          <div>
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedTask.title}</h2>
                  {selectedTask.description && <p className="text-gray-600 mt-1">{selectedTask.description}</p>}
                  <p className="text-sm text-gray-500 mt-2">
                    Category: <span className="font-medium">{selectedTask.category_name}</span> &nbsp;|&nbsp;
                    Uploaded: <span className="font-medium">{selectedTask.uploaded_count || 0}</span> &nbsp;|&nbsp;
                    Approved: <span className="font-medium text-green-600">{selectedTask.approved_count || 0}</span> / {selectedTask.total_images} images
                  </p>
                  {(selectedTask.start_date || selectedTask.end_date || selectedTask.final_review_date) && (
                    <div className="flex gap-4 mt-2 text-xs text-gray-400">
                      {selectedTask.start_date && <span>Start: {new Date(selectedTask.start_date).toLocaleDateString()}</span>}
                      {selectedTask.end_date && <span>End: {new Date(selectedTask.end_date).toLocaleDateString()}</span>}
                      {selectedTask.final_review_date && <span>Review by: {new Date(selectedTask.final_review_date).toLocaleDateString()}</span>}
                    </div>
                  )}
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
                        src={`http://103.118.158.33:5003/uploads/${img.filename}`}
                        alt={img.renamed_filename}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                        onClick={() => setPreviewImage(`http://103.118.158.33:5003/uploads/${img.filename}`)}
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

        {/* ──── CATEGORY MANAGER TAB ──── */}
        {activeTab === "categories" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Category Manager</h2>
              <button onClick={() => setShowAddCategory(true)} className="btn-primary flex items-center space-x-2 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                <span>Add Category</span>
              </button>
            </div>

            {/* Category Hierarchy */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Category Tree */}
              <div className="lg:col-span-1 space-y-4">
                {categories.map((mainCat) => (
                  <div key={mainCat.id} className={`card p-4 cursor-pointer transition-all ${selectedManageCategory?.id === mainCat.id ? "ring-2 ring-primary-500 bg-primary-50" : "hover:shadow-md"}`}>
                    <div className="flex justify-between items-center" onClick={() => selectManageCategory(mainCat)}>
                      <div>
                        <h3 className="font-semibold text-gray-900">{mainCat.name}</h3>
                        <p className="text-xs text-gray-500">Prefix: {mainCat.namingPrefix || "—"} | {mainCat.subCategories?.length || 0} sub-categories</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium text-gray-600">Level 1</span>
                        <button onClick={(e) => { e.stopPropagation(); deleteCategory(mainCat.id); }} className="p-1 text-red-400 hover:text-red-600" title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                    {/* Show subcategories inline */}
                    {mainCat.subCategories && mainCat.subCategories.length > 0 && (
                      <div className="mt-3 space-y-2 border-t pt-3">
                        {mainCat.subCategories.map((sub) => (
                          <div key={sub.id} className="ml-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700">{sub.name}</span>
                              <button onClick={(e) => { e.stopPropagation(); deleteCategory(sub.id); }} className="p-0.5 text-red-300 hover:text-red-500">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                            {sub.subSubCategories && sub.subSubCategories.length > 0 && (
                              <div className="ml-4 mt-1 flex flex-wrap gap-1">
                                {sub.subSubCategories.map((ss) => (
                                  <span key={ss.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                                    {ss.name}
                                    <button onClick={(e) => { e.stopPropagation(); deleteCategory(ss.id); }} className="text-red-300 hover:text-red-500">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Right: Naming Convention Fields for selected category */}
              <div className="lg:col-span-2">
                {selectedManageCategory ? (
                  <div className="card p-6">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{selectedManageCategory.name} – Naming Convention</h3>
                        <p className="text-sm text-gray-500">Define the fields that make up the file naming pattern for this category</p>
                      </div>
                      <button onClick={() => { setEditingField(null); setNewFieldForm({ field_name: "", field_label: "", field_type: "text", field_options: "", is_required: true, display_order: namingFields.length + 1, placeholder: "", separator: "_" }); setShowAddNamingField(true); }} className="btn-primary text-sm">
                        + Add Field
                      </button>
                    </div>

                    {/* Preview format */}
                    {namingFields.length > 0 && (
                      <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs font-medium text-blue-800 mb-1">Filename Preview:</p>
                        <code className="text-sm text-blue-700">
                          {namingFields.map((f, i) => `{${f.field_name}}`).join("_")}.jpg
                        </code>
                        <p className="text-xs text-blue-600 mt-1">
                          Example: {namingFields.map((f) => f.placeholder || f.field_label).join("_")}.jpg
                        </p>
                      </div>
                    )}

                    {/* Fields list */}
                    {namingFields.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <p>No naming fields defined yet. Click "+ Add Field" to create the naming convention.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {namingFields.map((field, idx) => (
                          <div key={field.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 group">
                            <span className="w-8 h-8 flex items-center justify-center bg-primary-100 text-primary-700 rounded-full text-sm font-bold shrink-0">{idx + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-gray-900 text-sm">{field.field_label}</span>
                                <code className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">{field.field_name}</code>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${field.field_type === 'select' ? 'bg-purple-100 text-purple-700' : field.field_type === 'date' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{field.field_type}</span>
                                {field.is_required ? <span className="text-xs text-red-500">*required</span> : <span className="text-xs text-gray-400">optional</span>}
                              </div>
                              {field.field_options && field.field_options.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {field.field_options.map((opt, oi) => (
                                    <span key={oi} className="text-xs bg-white border px-1.5 py-0.5 rounded">{opt}</span>
                                  ))}
                                </div>
                              )}
                              {field.placeholder && <p className="text-xs text-gray-400 mt-0.5">Placeholder: {field.placeholder}</p>}
                            </div>
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEditNamingField(field)} className="p-1.5 text-blue-500 hover:bg-blue-100 rounded" title="Edit">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button onClick={() => deleteNamingField(field.id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded" title="Delete">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                            {idx < namingFields.length - 1 && (
                              <span className="text-gray-300 font-mono text-lg shrink-0" title={`Separator: ${field.separator || '_'}`}>{field.separator || '_'}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="card p-12 text-center text-gray-400">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    <p className="text-lg">Select a main category to manage its naming convention fields</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ──── ADD CATEGORY MODAL ──── */}
      {showAddCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-premium-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Add Category</h2>
              <button onClick={() => setShowAddCategory(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category Name *</label>
                <input className="input-field" value={newCatForm.name} onChange={(e) => setNewCatForm({ ...newCatForm, name: e.target.value })} placeholder="e.g. Agri, Healthcare" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Level *</label>
                <select className="select-field" value={newCatForm.level} onChange={(e) => setNewCatForm({ ...newCatForm, level: parseInt(e.target.value), parent_id: "" })}>
                  <option value={1}>Level 1 – Main Category</option>
                  <option value={2}>Level 2 – Sub Category</option>
                  <option value={3}>Level 3 – Sub-Sub Category</option>
                </select>
              </div>
              {newCatForm.level > 1 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Parent Category *</label>
                  <select className="select-field" value={newCatForm.parent_id} onChange={(e) => setNewCatForm({ ...newCatForm, parent_id: e.target.value })}>
                    <option value="">Select Parent</option>
                    {allCategoriesFlat
                      .filter(c => c.level === newCatForm.level - 1)
                      .map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))
                    }
                  </select>
                </div>
              )}
              {newCatForm.level === 1 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Naming Prefix</label>
                  <input className="input-field" value={newCatForm.naming_prefix} onChange={(e) => setNewCatForm({ ...newCatForm, naming_prefix: e.target.value.toUpperCase() })} placeholder="e.g. AGRI, MOB" maxLength={10} />
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Display Order</label>
                <input type="number" min={0} className="input-field" value={newCatForm.display_order} onChange={(e) => setNewCatForm({ ...newCatForm, display_order: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button onClick={() => setShowAddCategory(false)} className="btn-secondary">Cancel</button>
              <button onClick={addCategory} className="btn-primary">Add Category</button>
            </div>
          </div>
        </div>
      )}

      {/* ──── ADD/EDIT NAMING FIELD MODAL ──── */}
      {showAddNamingField && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-premium-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">{editingField ? "Edit" : "Add"} Naming Field</h2>
              <button onClick={() => { setShowAddNamingField(false); setEditingField(null); }} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Field Name (key) *</label>
                  <input className="input-field" value={newFieldForm.field_name} onChange={(e) => setNewFieldForm({ ...newFieldForm, field_name: e.target.value.replace(/\s+/g, "") })} placeholder="e.g. cropName, city" />
                  <p className="text-xs text-gray-400 mt-0.5">Internal key, no spaces</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Display Label *</label>
                  <input className="input-field" value={newFieldForm.field_label} onChange={(e) => setNewFieldForm({ ...newFieldForm, field_label: e.target.value })} placeholder="e.g. Crop Name, City Code" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Field Type</label>
                  <select className="select-field" value={newFieldForm.field_type} onChange={(e) => setNewFieldForm({ ...newFieldForm, field_type: e.target.value })}>
                    <option value="text">Text Input</option>
                    <option value="select">Dropdown Select</option>
                    <option value="date">Date</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Separator</label>
                  <input className="input-field" value={newFieldForm.separator} onChange={(e) => setNewFieldForm({ ...newFieldForm, separator: e.target.value })} placeholder="_" maxLength={3} />
                  <p className="text-xs text-gray-400 mt-0.5">Char between this and next field</p>
                </div>
              </div>
              {newFieldForm.field_type === "select" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Options (comma-separated)</label>
                  <textarea className="input-field" rows={2} value={newFieldForm.field_options} onChange={(e) => setNewFieldForm({ ...newFieldForm, field_options: e.target.value })} placeholder="e.g. healthyPlant, diseasedPlant, pestAffected" />
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Placeholder / Hint</label>
                <input className="input-field" value={newFieldForm.placeholder} onChange={(e) => setNewFieldForm({ ...newFieldForm, placeholder: e.target.value })} placeholder="e.g. Enter crop name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Display Order</label>
                  <input type="number" min={0} className="input-field" value={newFieldForm.display_order} onChange={(e) => setNewFieldForm({ ...newFieldForm, display_order: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={newFieldForm.is_required} onChange={(e) => setNewFieldForm({ ...newFieldForm, is_required: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm font-medium text-gray-700">Required field</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button onClick={() => { setShowAddNamingField(false); setEditingField(null); }} className="btn-secondary">Cancel</button>
              <button onClick={addNamingField} className="btn-primary">{editingField ? "Update" : "Add"} Field</button>
            </div>
          </div>
        </div>
      )}

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

              {/* dates */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={taskForm.start_date}
                    onChange={(e) => setTaskForm({ ...taskForm, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={taskForm.end_date}
                    onChange={(e) => setTaskForm({ ...taskForm, end_date: e.target.value })}
                  />
                  <p className="text-xs text-gray-400 mt-0.5">Uploads blocked after this date</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Review Deadline</label>
                  <input
                    type="date"
                    className="input-field"
                    value={taskForm.final_review_date}
                    onChange={(e) => setTaskForm({ ...taskForm, final_review_date: e.target.value })}
                  />
                  <p className="text-xs text-gray-400 mt-0.5">Last date for admin approval</p>
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

      {/* ──── EDIT TASK MODAL ──── */}
      {showEditTask && editingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-premium-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Edit Task / Job Card</h2>
              <button onClick={() => setShowEditTask(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Task Title *</label>
                <input
                  className="input-field"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="e.g. Bangalore Road Mapping – Feb 2026"
                />
              </div>

              {/* description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  className="input-field"
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Optional task details…"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* category */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Category *</label>
                  <select
                    className="select-field"
                    value={editForm.main_category_id}
                    onChange={(e) => handleEditCategoryChange(e.target.value)}
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
                    value={editForm.total_images}
                    onChange={(e) => setEditForm({ ...editForm, total_images: e.target.value })}
                  />
                </div>
              </div>

              {/* dates */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={editForm.start_date}
                    onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={editForm.end_date}
                    onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                  />
                  <p className="text-xs text-gray-400 mt-0.5">Uploads blocked after this date</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Review Deadline</label>
                  <input
                    type="date"
                    className="input-field"
                    value={editForm.final_review_date}
                    onChange={(e) => setEditForm({ ...editForm, final_review_date: e.target.value })}
                  />
                  <p className="text-xs text-gray-400 mt-0.5">Last date for admin approval</p>
                </div>
              </div>

              {/* subcategory checkboxes with sub-sub selectors */}
              {editSubCats.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Subcategory Requirements
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Select a specific option for each subcategory, or leave "User will choose" for users to pick during upload.
                  </p>
                  <div className="space-y-3">
                    {editSubCats.map((sub) => (
                      <div key={sub.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                        <span className="text-sm font-medium text-gray-800 w-36 shrink-0">{sub.name}</span>
                        <select
                          className="select-field text-sm py-2"
                          value={editSelectedSubSubs[sub.id] || ""}
                          onChange={(e) =>
                            setEditSelectedSubSubs((prev) => ({ ...prev, [sub.id]: e.target.value }))
                          }
                        >
                          <option value="">— User will choose —</option>
                          {(editSubSubOptions[sub.id] || []).map((opt) => (
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
              <button onClick={() => setShowEditTask(false)} className="btn-secondary">Cancel</button>
              <button onClick={updateTask} className="btn-primary">Update Task</button>
            </div>
          </div>
        </div>
      )}

      {/* ──── REVIE  W MODAL ──── */}
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
                <img src={`http://103.118.158.33:5003/uploads/${reviewImage.filename}`} alt="" className="w-full h-full object-contain" />
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
              <button onClick={() => reject(reviewImage.id)} className="btn-danger" disabled={approveLoading}>Reject</button>
              <button onClick={() => approve(reviewImage.id)} className="btn-success" disabled={approveLoading}>{approveLoading ? "⏳ Uploading..." : "Approve"}</button>
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