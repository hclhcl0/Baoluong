"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload, Mail, Send, Plus, X, CheckCircle, XCircle,
  Loader2, Eye, EyeOff, ChevronLeft, ChevronRight,
  Users, Zap, AlertCircle, RefreshCw, Search,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { generateSalaryEmail } from "@/utils/emailTemplate";
import type { SalaryRecord, GmailAccount, SendResult, SendStatus } from "@/types/salary";

interface AccountUI extends GmailAccount { showPass: boolean }

interface SalaryRecordUI extends SalaryRecord {
  id: string;
  selected: boolean;
  status: SendStatus | "idle";
  error?: string;
}

interface ProgressState {
  sent: number; total: number; success: number; failed: number;
  results: SendResult[];
}

const PAGE_SIZE = 8;
const fmt = (v: number | string) => {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isNaN(n) ? String(v) : n.toLocaleString("vi-VN");
};

export default function HomePage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const [records, setRecords] = useState<SalaryRecordUI[]>([]);
  const [filterStatus, setFilterStatus] = useState<"all" | "selected" | "success" | "error">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [isDrag, setIsDrag] = useState(false);
  const [page, setPage] = useState(0);

  const [accounts, setAccounts] = useState<AccountUI[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPass, setNewPass] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("cdc_gmail_pool");
    if (saved) {
      try { setAccounts(JSON.parse(saved)); } catch {}
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("cdc_gmail_pool", JSON.stringify(accounts));
    }
  }, [accounts, isLoaded]);

  const [subject, setSubject] = useState("Thông báo lương quý - CDC Đà Nẵng");
  const [customMessage, setCustomMessage] = useState("");
  const [batchSize, setBatchSize] = useState(10);
  const [delayMs, setDelayMs] = useState(2000);

  const [isSending, setIsSending] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [prog, setProg] = useState<ProgressState>({ sent: 0, total: 0, success: 0, failed: 0, results: [] });
  const [previewRecord, setPreviewRecord] = useState<SalaryRecord | null>(null);

  // ── Upload Excel ────────────────────────────────────────────
  const processFile = useCallback(async (file: File) => {
    setParseError(""); setParsing(true); setRecords([]); setFileName(file.name); setPage(0);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/parse-excel", { method: "POST", body: fd });
      const json = await res.json();
      if (json.records) {
        setRecords(json.records.map((r: SalaryRecord) => ({
          ...r,
          id: crypto.randomUUID(),
          selected: true,
          status: "idle"
        })));
      }
    } catch { setParseError("Không thể kết nối server."); }
    finally { setParsing(false); }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // ── Gmail Pool ──────────────────────────────────────────────
  const addAccount = () => {
    if (!newEmail.trim() || !newPass.trim()) return;
    setAccounts(prev => [...prev, {
      id: crypto.randomUUID(), user: newEmail.trim(),
      appPassword: newPass.replace(/\s/g, ""), showPass: false,
    }]);
    setNewEmail(""); setNewPass("");
  };
  const removeAccount = (id: string) => setAccounts(prev => prev.filter(a => a.id !== id));
  const togglePass = (id: string) =>
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, showPass: !a.showPass } : a));

  // ── Send Emails ─────────────────────────────────────────────
  const startSend = async () => {
    const selectedRecords = records.filter(r => r.selected && r.status !== "success");
    if (!selectedRecords.length || !accounts.length || isSending) return;
    setIsSending(true); setIsDone(false);
    setProg({ sent: 0, total: selectedRecords.length, success: 0, failed: 0, results: [] });
    
    // Reset status of records that are about to be sent
    setRecords(prev => prev.map(r => selectedRecords.some(sr => sr.id === r.id) ? { ...r, status: "idle", error: undefined } : r));

    try {
      const res = await fetch("/api/send-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records: selectedRecords, accounts: accounts.map(({ id, user, appPassword }) => ({ id, user, appPassword })),
          subject, batchSize, batchDelayMs: delayMs, customMessage,
        }),
      });
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const ev = JSON.parse(line.slice(6));
          if (ev.type === "progress") {
            const r: SendResult = ev.result;
            
            // Update individual record status
            setRecords(prev => prev.map(rec => 
              (rec.email === r.email && rec.tenNhanVien === r.tenNhanVien) 
                ? { ...rec, status: r.status, error: r.error } 
                : rec
            ));

            setProg(p => ({
              sent: ev.index, total: ev.total,
              success: p.success + (r.status === "success" ? 1 : 0),
              failed: p.failed + (r.status === "error" ? 1 : 0),
              results: [...p.results, r],
            }));
            resultsRef.current?.scrollTo({ top: 999999, behavior: "smooth" });
          }
          if (ev.type === "done") setIsDone(true);
        }
      }
    } catch (e) { console.error(e); }
    finally { setIsSending(false); }
  };

  const pct = prog.total ? Math.round((prog.sent / prog.total) * 100) : 0;
  
  const filteredRecords = records.filter(r => {
    if (searchQuery && !r.tenNhanVien.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterStatus === "selected") return r.selected;
    if (filterStatus === "success") return r.status === "success";
    if (filterStatus === "error") return r.status === "error";
    return true;
  });

  const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE);
  const pageRows = filteredRecords.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  
  const selectedCount = records.filter(r => r.selected && r.status !== "success").length;
  const canSend = selectedCount > 0 && accounts.length > 0 && !isSending;

  const toggleSelectAll = (checked: boolean) => {
    setRecords(prev => prev.map(r => ({ ...r, selected: checked })));
  };
  const toggleSelect = (id: string, checked: boolean) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, selected: checked } : r));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-indigo-50">
      {/* ── HEADER ── */}
      <header className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 shadow-lg">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center overflow-hidden border-2 border-white/20 shadow-inner">
              <img src="https://ksbtdanang.vn/assets/images/logo.png" alt="CDC Logo" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Hệ Thống Gửi Báo Lương</h1>
              <p className="text-indigo-200 text-xs">Trung tâm Kiểm soát bệnh tật thành phố Đà Nẵng</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {accounts.length > 0 && (
              <Badge variant="outline" className="border-white/30 text-white bg-white/10 text-xs">
                <Zap className="w-3 h-3" /> {accounts.length} tài khoản
              </Badge>
            )}
            {records.length > 0 && (
              <Badge variant="outline" className="border-white/30 text-white bg-white/10 text-xs">
                <Users className="w-3 h-3" /> {records.length} nhân viên
              </Badge>
            )}
            <a href="/preview" target="_blank"
              className="text-xs text-indigo-200 hover:text-white border border-white/20 rounded-lg px-3 py-1.5 hover:bg-white/10 transition-colors">
              👁 Xem trước email
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* ── STEP 1: UPLOAD ── */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">1</span>
            <h2 className="font-semibold text-slate-800">Tải file Excel danh sách nhân viên</h2>
          </div>
          <div className="p-6">
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDrag(true); }}
              onDragLeave={() => setIsDrag(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                isDrag ? "border-indigo-500 bg-indigo-50" : "border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50"
              }`}
            >
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFileChange} />
              {parsing ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                  <p className="text-slate-500 text-sm">Đang phân tích file...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center mb-1">
                    <Upload className="w-7 h-7 text-indigo-600" />
                  </div>
                  <p className="font-medium text-slate-700">Kéo thả hoặc nhấn để chọn file dữ liệu</p>
                  <p className="text-slate-400 text-sm mb-3">Hỗ trợ: .xlsx, .xls, .csv</p>
                  <div className="flex justify-center border-t border-slate-100 pt-3 mt-1">
                    <a href="/mau-bang-luong.xlsx" download="mau-bang-luong-cdc.xlsx" onClick={e => e.stopPropagation()}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition-colors border border-indigo-200">
                      ⬇ Tải file mẫu nhập liệu (.xlsx)
                    </a>
                  </div>
                </div>
              )}
            </div>

            {parseError && (
              <div className="mt-3 flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" /> {parseError}
              </div>
            )}

            {records.length > 0 && (
              <div className="mt-4">
                <div className="flex flex-col gap-3 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="success"><Users className="w-3 h-3" /> {records.length} NV</Badge>
                        <span className="text-slate-400 text-xs">{fileName}</span>
                      </div>
                      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                        <Button variant={filterStatus === "all" ? "default" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => { setFilterStatus("all"); setPage(0); }}>Tất cả</Button>
                        <Button variant={filterStatus === "selected" ? "default" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => { setFilterStatus("selected"); setPage(0); }}>Đã chọn ({records.filter(r => r.selected).length})</Button>
                        <Button variant={filterStatus === "error" ? "default" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => { setFilterStatus("error"); setPage(0); }}>Lỗi ({records.filter(r => r.status === "error").length})</Button>
                        <Button variant={filterStatus === "success" ? "default" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => { setFilterStatus("success"); setPage(0); }}>Thành công</Button>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
                      <RefreshCw className="w-3.5 h-3.5" /> Đổi file
                    </Button>
                  </div>
                  <div className="relative w-72">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Tìm kiếm tên nhân viên..."
                      className="pl-9 h-9 text-sm border-slate-200"
                      value={searchQuery}
                      onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
                    />
                  </div>
                </div>

                {/* Preview Table */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left px-3 py-2.5 font-semibold text-slate-600 w-10">
                            <input type="checkbox" checked={records.length > 0 && records.every(r => r.selected)} onChange={e => toggleSelectAll(e.target.checked)} className="rounded border-slate-300 w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                          </th>
                          <th className="text-left px-3 py-2.5 font-semibold text-slate-600">#</th>
                          <th className="text-left px-3 py-2.5 font-semibold text-slate-600">Tên nhân viên</th>
                          <th className="text-left px-3 py-2.5 font-semibold text-slate-600">Email</th>
                          <th className="text-right px-3 py-2.5 font-semibold text-slate-600">HS T1</th>
                          <th className="text-right px-3 py-2.5 font-semibold text-slate-600">HS T2</th>
                          <th className="text-right px-3 py-2.5 font-semibold text-slate-600">HS T3</th>
                          <th className="text-right px-3 py-2.5 font-semibold text-indigo-700">Tổng thu nhập</th>
                          <th className="text-center px-3 py-2.5 font-semibold text-slate-600">Trạng thái</th>
                          <th className="text-center px-3 py-2.5 font-semibold text-slate-600">Xem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map((r, i) => (
                          <tr key={r.id} className={`border-b border-slate-100 ${i % 2 === 0 ? "" : "bg-slate-50/50"} ${r.status === 'error' ? 'bg-red-50' : r.status === 'success' ? 'bg-emerald-50' : ''}`}>
                            <td className="px-3 py-2">
                              <input type="checkbox" checked={r.selected} onChange={e => toggleSelect(r.id, e.target.checked)} className="rounded border-slate-300 w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                            </td>
                            <td className="px-3 py-2 text-slate-400">{page * PAGE_SIZE + i + 1}</td>
                            <td className="px-3 py-2 font-medium text-slate-800">{r.tenNhanVien}</td>
                            <td className="px-3 py-2 text-slate-500">{r.email}</td>
                            <td className="px-3 py-2 text-right text-slate-600">{r.heSoLieuT1}</td>
                            <td className="px-3 py-2 text-right text-slate-600">{r.heSoLieuT2}</td>
                            <td className="px-3 py-2 text-right text-slate-600">{r.heSoLieuT3}</td>
                            <td className="px-3 py-2 text-right font-semibold text-indigo-700">{fmt(r.tongThuNhap)}</td>
                            <td className="px-3 py-2 text-center">
                              {r.status === "success" && <CheckCircle className="w-5 h-5 text-emerald-500 inline" />}
                              {r.status === "error" && <span title={r.error}><XCircle className="w-5 h-5 text-red-500 inline" /></span>}
                              {r.status === "idle" && <span className="text-slate-300 text-xs font-semibold">—</span>}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <Button size="icon" variant="ghost" className="w-7 h-7 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50" onClick={() => setPreviewRecord(r)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 && (
                    <div className="px-4 py-2.5 flex items-center justify-between border-t border-slate-200 bg-slate-50">
                      <span className="text-xs text-slate-500">Trang {page + 1}/{totalPages}</span>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── STEP 2: GMAIL POOL ── */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">2</span>
              <h2 className="font-semibold text-slate-800">Cấu hình Gmail Pool (Round-Robin)</h2>
            </div>
            {accounts.length > 0 && (
              <Badge variant="success"><CheckCircle className="w-3 h-3" /> {accounts.length} tài khoản</Badge>
            )}
          </div>
          <div className="p-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-800 text-xs mb-5 flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Dùng <strong>App Password</strong> (không phải mật khẩu Google). Vào: <em>Google Account → Security → 2-Step Verification → App passwords</em>. Mỗi account gửi tối đa ~500 email/ngày.</span>
            </div>

            {/* Add account form */}
            <div className="flex gap-2 mb-4">
              <Input placeholder="email@gmail.com" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addAccount()} className="flex-1" />
              <Input placeholder="App Password (16 ký tự)" value={newPass} onChange={e => setNewPass(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addAccount()} type="password" className="flex-1" />
              <Button onClick={addAccount} disabled={!newEmail || !newPass}>
                <Plus className="w-4 h-4" /> Thêm
              </Button>
            </div>

            {accounts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                Chưa có tài khoản nào. Thêm ít nhất 1 tài khoản Gmail để bắt đầu.
              </div>
            ) : (
              <div className="space-y-2">
                {accounts.map((acc, idx) => (
                  <div key={acc.id} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">{acc.user}</p>
                      <p className="text-slate-400 text-xs font-mono">
                        {acc.showPass ? acc.appPassword : "••••••••••••••••"}
                      </p>
                    </div>
                    <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => togglePass(acc.id)}>
                      {acc.showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="w-7 h-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => removeAccount(acc.id)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── STEP 3: SEND ── */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">3</span>
            <h2 className="font-semibold text-slate-800">Cấu hình & Gửi Email</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tiêu đề email (Subject)</label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Nhập tiêu đề email..." />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nội dung ghi chú thêm (Tùy chọn)</label>
              <textarea 
                value={customMessage} 
                onChange={e => setCustomMessage(e.target.value)} 
                placeholder="Nhập nội dung bạn muốn gởi kèm trong email (có thể xuống dòng)..." 
                className="w-full min-h-[80px] rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Batch size (email/lần)</label>
                <Input type="number" min={1} max={50} value={batchSize}
                  onChange={e => setBatchSize(Number(e.target.value))} />
                <p className="text-slate-400 text-xs mt-1">Khuyến nghị: 10</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Delay giữa batch (ms)</label>
                <Input type="number" min={500} max={10000} step={500} value={delayMs}
                  onChange={e => setDelayMs(Number(e.target.value))} />
                <p className="text-slate-400 text-xs mt-1">Khuyến nghị: 2000ms</p>
              </div>
            </div>

            {/* Summary */}
            {(records.length > 0 || accounts.length > 0) && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-4 text-sm space-y-1">
                <p className="text-indigo-800"><strong>{records.length}</strong> nhân viên × <strong>{accounts.length}</strong> tài khoản Gmail</p>
                {accounts.length > 0 && records.length > 0 && (
                  <p className="text-indigo-600 text-xs">Mỗi tài khoản gửi ~{Math.ceil(records.length / accounts.length)} email</p>
                )}
              </div>
            )}

            <Button
              size="lg"
              className="w-full text-base font-semibold"
              onClick={startSend}
              disabled={!canSend}
            >
              {isSending ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Đang gửi {prog.sent}/{prog.total}...</>
              ) : (
                <><Send className="w-5 h-5" /> Bắt đầu gửi {selectedCount} email</>
              )}
            </Button>
          </div>
        </section>

        {/* ── PROGRESS & RESULTS ── */}
        {(isSending || isDone) && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isDone
                  ? <CheckCircle className="w-5 h-5 text-emerald-500" />
                  : <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />}
                <h2 className="font-semibold text-slate-800">
                  {isDone ? "Hoàn tất!" : `Đang gửi... ${pct}%`}
                </h2>
              </div>
              <span className="text-slate-400 text-sm">{prog.sent}/{prog.total}</span>
            </div>
            <div className="p-6 space-y-4">
              {/* Progress bar */}
              <Progress value={pct} colorClass={isDone && prog.failed === 0 ? "bg-emerald-500" : "bg-indigo-600"} />

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
                  <p className="text-2xl font-bold text-slate-800">{prog.sent}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Đã xử lý</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-200">
                  <p className="text-2xl font-bold text-emerald-700">{prog.success}</p>
                  <p className="text-xs text-emerald-600 mt-0.5">Thành công</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center border border-red-200">
                  <p className="text-2xl font-bold text-red-600">{prog.failed}</p>
                  <p className="text-xs text-red-500 mt-0.5">Thất bại</p>
                </div>
              </div>

              {/* Results list */}
              <div ref={resultsRef} className="max-h-80 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                {prog.results.map((r, i) => (
                  <div key={i} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${r.status === "success" ? "bg-white" : "bg-red-50"}`}>
                    {r.status === "success"
                      ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-slate-800">{r.tenNhanVien}</span>
                      <span className="text-slate-400 ml-2 text-xs">{r.email}</span>
                      {r.status === "error" && <p className="text-red-500 text-xs">{r.error}</p>}
                    </div>
                    <span className="text-slate-400 text-xs shrink-0">{r.sentVia}</span>
                  </div>
                ))}
              </div>

              {isDone && prog.failed > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-800 text-sm flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{prog.failed} email thất bại. Kiểm tra lại địa chỉ email và kết nối Gmail.</span>
                </div>
              )}

              {isDone && prog.failed === 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-emerald-800 text-sm flex gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>Tất cả {prog.success} email đã được gửi thành công! 🎉</span>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-slate-400 text-xs">
        Hệ thống Gửi Báo Lương — CDC Đà Nẵng © {new Date().getFullYear()}
      </footer>

      {/* ── PREVIEW MODAL ── */}
      <Dialog.Root open={!!previewRecord} onOpenChange={(open) => !open && setPreviewRecord(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden outline-none">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <Dialog.Title className="font-semibold text-slate-800 text-lg flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600" />
                Xem trước: {previewRecord?.tenNhanVien}
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200">
                  <X className="w-4 h-4" />
                </Button>
              </Dialog.Close>
            </div>
            <div className="flex-1 overflow-y-auto p-0 bg-[#f5f5f5]">
              {previewRecord && (
                <div 
                  className="w-full flex justify-center py-6 px-4"
                  dangerouslySetInnerHTML={{ __html: generateSalaryEmail(previewRecord, { quarterTitle: subject, customMessage }) }} 
                />
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
              <Dialog.Close asChild>
                <Button variant="outline">Đóng</Button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
