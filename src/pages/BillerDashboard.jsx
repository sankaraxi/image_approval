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
  const [showPayment, setShowPayment] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [diseasedRate, setDiseasedRate] = useState(4);
const [pestRate, setPestRate] = useState(4);

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
    const selectedTasks = unbilledTasks.filter((t) =>
    selectedIds.includes(t.id)
  );

  const totalAmount = selectedTasks.reduce(
    (sum, t) => sum + ((t.approved_count || 0) * 4),
    0
  );

  const hasAgri = selectedTasks.some(
    (t) => t.main_category_id === 68
  );
  const groupedInvoices = billingHistory.reduce((acc, b) => {
    const key = b.invoice_number || `INV-${b.id}`;
    if (!acc[key]) {
      acc[key] = {
        id: b.invoice_id,
        invoice_number: b.invoice_number,
        total_amount: 0,
        status: b.invoice_status,
        transaction_id: b.transaction_id,
        payment_date: b.payment_date,
        payment_amount: b.payment_amount,
        billed_at: b.billed_at,
        billed_by: b.billed_by_full_name || b.billed_by_name,
        tasks: []
      };
    }
    acc[key].tasks.push(b);
    acc[key].total_amount += Number(b.total_amount);
    return acc;
  }, {});
  const invoiceList = Object.values(groupedInvoices);

  const generateBill = async () => {
    setGenerating(true);
    try {
      const data = { taskIds: selectedIds };
      if (hasAgri) {
        data.agriRates = {
          diseasedPlant: parseFloat(diseasedRate) || 4,
          pestAffected: parseFloat(pestRate) || 4
        };
      }
      const res = await api.post("/biller/generate-bill", data);
      alert("Billing report sent via email successfully!");
      load();
      setSelectedIds([]);
      setShowConfirm(false);
    } catch (err) {
      console.error(err);
      alert("Failed to send billing email");
    } finally {
      setGenerating(false);
    }
  };

  // Dashboard summary stats
  const totalTaskCount = unbilledTasks.length + billingHistory.length;
  const totalInvoiceCount = invoiceList.length;
  const paidInvoices = invoiceList.filter(inv => inv.status === 'completed');
  const unpaidInvoices = invoiceList.filter(inv => inv.status !== 'completed');
  const totalInvoiceAmount = invoiceList.reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalReceived = paidInvoices.reduce((sum, inv) => sum + (Number(inv.payment_amount) || 0), 0);
  const totalPending = unpaidInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);

  const [openAccordion, setOpenAccordion] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary-600">Invoice Dashboard</h1>
            <p className="text-sm text-gray-500">Genius Labs Image Accumulator</p>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={() => setActiveTab("unbilled")}
              className={`px-4 py-2 rounded-md font-medium ${activeTab === "unbilled" ? "bg-primary-100 text-primary-700" : "text-gray-600"}`}>
              Non-Invoice Tasks
            </button>
            <button onClick={() => setActiveTab("history")}
              className={`px-4 py-2 rounded-md font-medium ${activeTab === "history" ? "bg-primary-100 text-primary-700" : "text-gray-600"}`}>
              Invoice History
            </button>
            <button onClick={() => { logout(); navigate("/"); }} className="btn-secondary">Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Stat Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {/* Total Tasks */}
          <div className="bg-white border-2 border-blue-400 rounded-xl shadow p-4 flex flex-col items-center justify-center">
            <span className="text-xs font-medium text-blue-600 mb-1">Total Tasks</span>
            <span className="text-2xl font-bold text-blue-700">{totalTaskCount}</span>
          </div>
          {/* Total Invoices */}
          <div className="bg-white border-2 border-purple-400 rounded-xl shadow p-4 flex flex-col items-center justify-center">
            <span className="text-xs font-medium text-purple-600 mb-1">Total Invoices</span>
            <span className="text-2xl font-bold text-purple-700">{totalInvoiceCount}</span>
          </div>
          {/* Received Payment */}
          <div className="bg-white border-2 border-green-400 rounded-xl shadow p-4 flex flex-col items-center justify-center">
            <span className="text-xs font-medium text-green-600 mb-1">Received Payment</span>
            <span className="text-2xl font-bold text-green-700">{paidInvoices.length}</span>
          </div>
          {/* Yet to Receive Payment */}
          <div className="bg-white border-2 border-yellow-400 rounded-xl shadow p-4 flex flex-col items-center justify-center">
            <span className="text-xs font-medium text-yellow-600 mb-1">Yet to Receive Payment</span>
            <span className="text-2xl font-bold text-yellow-700">{unpaidInvoices.length}</span>
          </div>
        </div>
        {/* Amount Stat Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          {/* Total Invoice Amount */}
          <div className="bg-white border-2 border-indigo-400 rounded-xl shadow p-4 flex flex-col items-center justify-center">
            <span className="text-xs font-medium text-indigo-600 mb-1">Total Invoice Amount</span>
            <span className="text-2xl font-bold text-indigo-700">Rs.{totalInvoiceAmount.toLocaleString("en-IN")}</span>
          </div>
          {/* Cost Received */}
          <div className="bg-white border-2 border-green-400 rounded-xl shadow p-4 flex flex-col items-center justify-center">
            <span className="text-xs font-medium text-green-600 mb-1">Amount Received</span>
            <span className="text-2xl font-bold text-green-700">Rs.{totalReceived.toLocaleString("en-IN")}</span>
          </div>
          {/* Cost Yet to Receive */}
          <div className="bg-white border-2 border-yellow-400 rounded-xl shadow p-4 flex flex-col items-center justify-center">
            <span className="text-xs font-medium text-yellow-600 mb-1">Amount Yet to Receive</span>
            <span className="text-2xl font-bold text-yellow-700">Rs.{totalPending.toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* ── Unbilled Tasks ── */}
        {activeTab === "unbilled" && (
          <div className="space-y-6">
            {/* toolbar */}
            <div className="bg-white rounded-xl shadow-md p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Non-Invoice Tasks</h2>
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
                  Generate Invoice ({selectedIds.length})
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
              <h2 className="text-lg font-semibold text-gray-800">Invoice History</h2>
            </div>
            {invoiceList.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-16 text-center text-gray-400 text-lg">No invoice history yet</div>
            ) : (
              <div className="space-y-4">
                {invoiceList.map((inv, idx) => (
                  <div key={inv.invoice_number} className="bg-white rounded-xl shadow-md">
                    <button
                      className="w-full flex justify-between items-center p-4 focus:outline-none border-b border-gray-200 hover:bg-gray-50 transition"
                      onClick={() => setOpenAccordion(openAccordion === idx ? null : idx)}
                    >
                      <div className="flex flex-col text-left">
                        <span className="text-lg font-bold text-gray-900">{inv.invoice_number}</span>
                        <span className="text-xs text-gray-500">Billed At: {new Date(inv.billed_at).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`text-sm font-semibold ${inv.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}>{inv.status === 'completed' ? 'Paid' : 'Pending'}</span>
                        <svg className={`w-5 h-5 transform transition-transform ${openAccordion === idx ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </button>
                    {openAccordion === idx && (
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-sm text-gray-500">By: {inv.billed_by}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-600">Rs.{inv.total_amount.toLocaleString("en-IN")}</p>
                            {inv.status === 'completed' && (
                              <div className="text-xs text-gray-500">
                                <p>Txn ID: {inv.transaction_id}</p>
                                <p>Paid: {new Date(inv.payment_date).toLocaleDateString()} - Rs.{Number(inv.payment_amount).toLocaleString("en-IN")}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        {inv.status === 'pending' && (
                          <button onClick={() => { setSelectedInvoice(inv); setShowPayment(true); }} className="btn-primary mb-4">
                            Mark Payment Received
                          </button>
                        )}
                        {/* <div className="border-t pt-4">
                          <h4 className="font-semibold mb-2">Tasks:</h4>
                          <div className="space-y-2">
                            {inv.tasks.map((t) => (
                              <div key={t.id} className="bg-gray-50 rounded p-3 flex justify-between">
                                <div>
                                  <p className="font-medium">{t.task_title}</p>
                                  <p className="text-sm text-gray-500">Approved: {t.approved_images} / {t.total_images}</p>
                                </div>
                                <p className="font-semibold text-green-600">Rs.{Number(t.total_amount).toLocaleString("en-IN")}</p>
                              </div>
                            ))}
                          </div>
                        </div> */}
                        <div className="border-t pt-4">
                            <h4 className="font-semibold mb-2">Tasks:</h4>

                            <div className="overflow-x-auto">
                              <table className="min-w-full border border-gray-200 rounded">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="text-left px-4 py-2 border text-primary-600 ">Task</th>
                                    <th className="text-left px-4 py-2 border text-primary-600">Approval Count</th>
                                    <th className="text-right px-4 py-2 border text-primary-600">Amount</th>
                                  </tr>
                                </thead>

                                <tbody>
                                  {inv.tasks.map((t) => (
                                    <tr key={t.id} className="hover:bg-gray-50">
                                      <td className="px-4 py-2 border font-medium">
                                        {t.task_title}
                                      </td>

                                      <td className="px-4 py-2 border text-sm text-gray-600">
                                        {t.approved_images}
                                      </td>

                                      <td className="px-4 py-2 border text-right font-semibold text-green-600">
                                        Rs.{Number(t.total_amount).toLocaleString("en-IN")}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Confirm Invoice</h2>
            <p className="text-gray-600 mb-4">Generate bill for the following tasks:</p>

            <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
              {selectedTasks.map((t) => (
                <div key={t.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200 flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{t.title}</p>
                    <p className="text-sm text-gray-500">Category: {t.category_name || 'N/A'}</p>
                    <p className="text-sm text-gray-500">Approved: {t.approved_count || 0} images</p>
                  </div>
                  <p className="font-semibold text-green-600">Rs.{((t.approved_count || 0) * 4).toLocaleString("en-IN")}</p>
                </div>
              ))}
            </div>

            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6 flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900">Estimated Total Amount:</span>
              <span className="text-2xl font-bold text-primary-600">Rs.{totalAmount.toLocaleString("en-IN")}</span>
            </div>

            {hasAgri && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Agri Category Rates</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Diseased Plant Rate (Rs.)</label>
                    <input type="number" value={diseasedRate} onChange={(e) => setDiseasedRate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" min="0" step="0.01" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pest-Affected Plant Rate (Rs.)</label>
                    <input type="number" value={pestRate} onChange={(e) => setPestRate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" min="0" step="0.01" />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowConfirm(false)} className="btn-secondary" disabled={generating}>Cancel</button>
              <button onClick={generateBill} className="btn-primary" disabled={generating}>
                {generating ? "Sending..." : "Generate Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Mark Payment Received</h2>
            <p className="text-gray-600 mb-4">Invoice: {selectedInvoice.invoice_number}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID</label>
                <input type="text" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount</label>
                <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" min="0" step="0.01" />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setShowPayment(false)} className="btn-secondary">Cancel</button>
              <button onClick={async () => {
                try {
                  await api.post('/biller/mark-payment', {
                    invoiceId: selectedInvoice.id,
                    transactionId,
                    paymentDate,
                    paymentAmount
                  });
                  alert('Payment marked as received');
                  load();
                  setShowPayment(false);
                  setTransactionId('');
                  setPaymentDate('');
                  setPaymentAmount('');
                } catch (err) {
                  alert('Failed to mark payment');
                }
              }} className="btn-primary">Mark Paid</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
