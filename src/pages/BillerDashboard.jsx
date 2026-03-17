import { useEffect, useState, useContext } from "react";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function BillerDashboard() {
  const [unbilledTasks, setUnbilledTasks] = useState([]);
  const [billingHistory, setBillingHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("unbilled");
  const [selectedIds, setSelectedIds] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const [u, h] = await Promise.all([
        api.get("/biller/tasks/unbilled"),
        api.get("/biller/billing-history"),
      ]);
      setUnbilledTasks(u.data);
      setBillingHistory(h.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = (id) =>
    setSelectedIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const selectAll = () => setSelectedIds(unbilledTasks.map((t) => t.id));
  const clearAll = () => setSelectedIds([]);

  const selectedTasks = unbilledTasks.filter((t) => selectedIds.includes(t.id));
  const totalAmount = selectedTasks.reduce((s, t) => s + (t.approved_count || 0) * 4, 0);

  const generateBill = async () => {
    setGenerating(true);
    try {
      const res = await api.post("/biller/generate-bill", { taskIds: selectedIds }, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.setAttribute("download", `genius_labs_billing_${Date.now()}.pdf`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setTimeout(() => {
        load();
        setSelectedIds([]);
        setShowConfirm(false);
        alert("Bill generated successfully!");
      }, 800);
    } catch (err) {
      console.error(err);
      alert("Failed to generate bill");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary-600">Billing Dashboard</h1>
            <p className="text-sm text-gray-500">Genius Labs Image Accumulator</p>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={() => setActiveTab("unbilled")}
              className={`px-4 py-2 rounded-md font-medium ${activeTab === "unbilled" ? "bg-primary-100 text-primary-700" : "text-gray-600"}`}>
              Unbilled Tasks
            </button>
            <button onClick={() => setActiveTab("history")}
              className={`px-4 py-2 rounded-md font-medium ${activeTab === "history" ? "bg-primary-100 text-primary-700" : "text-gray-600"}`}>
              Billing History
            </button>
            <button onClick={() => { logout(); navigate("/"); }} className="btn-secondary">Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Unbilled Tasks ── */}
        {activeTab === "unbilled" && (
          <div className="space-y-6">
            {/* toolbar */}
            <div className="bg-white rounded-xl shadow-md p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Unbilled Tasks</h2>
                {selectedIds.length > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedIds.length} selected &mdash; Total:&nbsp;
                    <span className="font-bold text-green-600">Rs.{totalAmount.toLocaleString("en-IN")}</span>
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={selectAll} className="btn-secondary text-sm">Select All</button>
                <button onClick={clearAll} className="btn-secondary text-sm" disabled={!selectedIds.length}>Clear</button>
                <button
                  onClick={() => { if (!selectedIds.length) { alert("Select at least one task"); return; } setShowConfirm(true); }}
                  className="btn-primary text-sm"
                  disabled={!selectedIds.length}>
                  Generate Bill ({selectedIds.length})
                </button>
              </div>
            </div>

            {/* task cards */}
            {unbilledTasks.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-16 text-center text-gray-400 text-lg">
                No unbilled tasks available
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {unbilledTasks.map((task) => {
                  const sel = selectedIds.includes(task.id);
                  const amt = (task.approved_count || 0) * 4;
                  const pct = task.total_images > 0 ? Math.round(((task.approved_count || 0) / task.total_images) * 100) : 0;
                  return (
                    <div key={task.id} onClick={() => toggle(task.id)}
                      className={`bg-white rounded-xl shadow-md p-5 cursor-pointer transition-all ${sel ? "ring-2 ring-primary-500" : "hover:ring-2 hover:ring-primary-400"}`}>
                      <div className="flex items-start justify-between mb-3">
                        <input type="checkbox" checked={sel} onChange={() => toggle(task.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer mt-1" />
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          task.status === "open" ? "bg-blue-100 text-blue-800" :
                          task.status === "in_progress" ? "bg-yellow-100 text-yellow-800" :
                          task.status === "completed" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                        }`}>{task.status.replace("_", " ")}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 text-lg mb-2">{task.title}</h3>
                      <p className="text-sm text-gray-500 mb-1"><span className="font-medium">Category:</span> {task.category_name}</p>
                      <p className="text-sm text-gray-500 mb-2">
                        <span className="font-medium">Approved:</span>{" "}
                        <span className="text-green-600 font-semibold">{task.approved_count || 0}</span> / {task.total_images}
                      </p>
                      {(task.start_date || task.end_date) && (
                        <div className="text-xs text-gray-400 mb-3 space-y-0.5">
                          {task.start_date && <p>Start: {new Date(task.start_date).toLocaleDateString()}</p>}
                          {task.end_date && <p>End: {new Date(task.end_date).toLocaleDateString()}</p>}
                        </div>
                      )}
                      <div className="pt-3 border-t border-gray-200 flex justify-between items-end">
                        <p className="text-lg font-bold text-green-600">Rs.{amt.toLocaleString("en-IN")}</p>
                        <p className="text-xs text-gray-400">{pct}% approved</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Billing History ── */}
        {activeTab === "history" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md p-4">
              <h2 className="text-lg font-semibold text-gray-800">Billing History</h2>
            </div>
            {billingHistory.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-16 text-center text-gray-400 text-lg">No billing history yet</div>
            ) : (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Approved</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Billed At</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {billingHistory.map((b) => (
                        <tr key={b.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{b.task_title}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{b.approved_images} / {b.total_images}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">Rs.{Number(b.total_amount).toLocaleString("en-IN")}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {b.start_date && <div>Start: {new Date(b.start_date).toLocaleDateString()}</div>}
                            {b.end_date && <div>End: {new Date(b.end_date).toLocaleDateString()}</div>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(b.billed_at).toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{b.billed_by_full_name || b.billed_by_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Confirm Billing</h2>
            <p className="text-gray-600 mb-4">Generate bill for the following tasks:</p>

            <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
              {selectedTasks.map((t) => (
                <div key={t.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200 flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{t.title}</p>
                    <p className="text-sm text-gray-500">Approved: {t.approved_count || 0} images</p>
                  </div>
                  <p className="font-semibold text-green-600">Rs.{((t.approved_count || 0) * 4).toLocaleString("en-IN")}</p>
                </div>
              ))}
            </div>

            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6 flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
              <span className="text-2xl font-bold text-primary-600">Rs.{totalAmount.toLocaleString("en-IN")}</span>
            </div>

            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowConfirm(false)} className="btn-secondary" disabled={generating}>Cancel</button>
              <button onClick={generateBill} className="btn-primary" disabled={generating}>
                {generating ? "Generating..." : "Generate Bill"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
