"use client";
import { useState, useRef, useCallback } from "react";
import {
  Upload, Send, Plus, X, CheckCircle, XCircle,
  Loader2, Eye, AlertCircle, RefreshCw, Search,
  ChevronLeft, ChevronRight, Users, Settings2, Mail
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { generateCustomEmail } from "@/utils/customEmailTemplate";
import type { GmailAccount, SendStatus, ExcelPreview, ColumnMapping, CustomRecord, CustomSendResult } from "@/types/salary";

interface CustomRecordUI extends CustomRecord {
  id: string;
  selected: boolean;
  status: SendStatus | "idle";
  error?: string;
}

interface ProgressState {
  sent: number; total: number; success: number; failed: number;
  results: CustomSendResult[];
}

const PAGE_SIZE = 8;
const fmt = (v: unknown) => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return v === 0 ? "0" : v.toLocaleString("vi-VN");
  const n = parseFloat(String(v));
  if (!isNaN(n) && String(v).trim() !== "") return n.toLocaleString("vi-VN");
  return String(v);
};

interface Props {
  accounts: GmailAccount[];
  batchSize: number;
  delayMs: number;
}

export default function CustomSalaryTab({ accounts, batchSize, delayMs }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // File state
  const [fileBase64, setFileBase64] = useState<string>("");
  const [fileName, setFileName] = useState("");
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [isSubHeader, setIsSubHeader] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  
  // Mapping state
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Upload, 2: Map, 3: Review & Send
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    nameCol: "", emailCol: "", displayCols: [], totalCol: ""
  });
  
  // Data state
  const [records, setRecords] = useState<CustomRecordUI[]>([]);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [isDrag, setIsDrag] = useState(false);
  
  // UI state
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all"|"selected"|"success"|"error">("all");
  const [subject, setSubject] = useState("Thông báo lương - CDC Đà Nẵng");
  const [customMessage, setCustomMessage] = useState("");
  const [footerNote, setFooterNote] = useState("");

  // Sending state
  const [isSending, setIsSending] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [prog, setProg] = useState<ProgressState>({ sent:0, total:0, success:0, failed:0, results:[] });
  const [previewRecord, setPreviewRecord] = useState<CustomRecordUI | null>(null);

  // --- BƯỚC 1: UPLOAD FILE ---
  const processFile = useCallback(async (file: File) => {
    setParseError(""); setParsing(true); setStep(1); setRecords([]);
    setFileName(file.name);
    
    try {
      // Đọc base64 để gửi lặp lại
      const reader = new FileReader();
      reader.onload = async (e) => {
        const b64 = (e.target?.result as string).split(",")[1];
        setFileBase64(b64);
        
        const fd = new FormData(); fd.append("file", file);
        const res = await fetch("/api/preview-excel", { method: "POST", body: fd });
        const json = await res.json();
        
        if (json.error) {
          setParseError(json.error);
        } else {
          setHeaders(json.headers);
          setHeaderRowIndex(json.headerRowIndex);
          setIsSubHeader(json.isSubHeader || false);
          // Tự động đoán cột
          const lowerHeaders = json.headers.map((h: string) => h.toLowerCase());
          const guessName = json.headers[lowerHeaders.findIndex((h: string) => h.includes("họ và tên") || h.includes("tên nhân viên"))] || "";
          const guessEmail = json.headers[lowerHeaders.findIndex((h: string) => h.includes("mail"))] || "";
          const guessTotal = json.headers[lowerHeaders.findIndex((h: string) => h.includes("tổng thu nhập") || h.includes("thành tiền"))] || "";
          
          setColumnMapping({
            nameCol: guessName,
            emailCol: guessEmail,
            totalCol: guessTotal,
            displayCols: [] // Mặc định chưa chọn
          });
          setStep(2);
        }
        setParsing(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setParseError("Không thể kết nối server.");
      setParsing(false);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  // --- BƯỚC 2: XÁC NHẬN CỘT ---
  const loadData = async () => {
    if (!columnMapping.nameCol || !columnMapping.emailCol) {
      setParseError("Vui lòng chọn Cột Tên nhân viên và Cột Email.");
      return;
    }
    setParsing(true); setParseError("");
    try {
      const res = await fetch("/api/send-custom-emails", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileBase64, headerRowIndex, isSubHeader, columnMapping })
      });
      const json = await res.json();
      if (json.records) {
        setRecords(json.records.map((r: CustomRecord) => ({
          ...r, id: crypto.randomUUID(), selected: true, status: "idle"
        })));
        setStep(3);
      } else {
        setParseError("Lỗi khi tải dữ liệu từ file.");
      }
    } catch (e) {
      setParseError("Không thể kết nối server.");
    } finally {
      setParsing(false);
    }
  };

  const toggleDisplayCol = (header: string, checked: boolean) => {
    setColumnMapping(prev => {
      let newCols = [...prev.displayCols];
      if (checked) {
        if (!newCols.find(c => c.key === header)) newCols.push({ key: header, label: header });
      } else {
        newCols = newCols.filter(c => c.key !== header);
      }
      return { ...prev, displayCols: newCols };
    });
  };

  // --- BƯỚC 3: GỬI EMAIL ---
  const startSend = async () => {
    const selected = records.filter(r => r.selected && r.status !== "success");
    if (!selected.length || !accounts.length || isSending) return;
    setIsSending(true); setIsDone(false);
    setProg({ sent:0, total:selected.length, success:0, failed:0, results:[] });
    
    setRecords(prev => prev.map(r => selected.some(s => s.id === r.id) ? { ...r, status:"idle", error:undefined } : r));
    
    try {
      const emailTitle = subject || "Thông báo lương - CDC Đà Nẵng";
      const res = await fetch("/api/send-custom-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileBase64, fileName, headerRowIndex, isSubHeader, columnMapping,
          records: selected, accounts: accounts.map(({ id, user, appPassword }) => ({ id, user, appPassword })),
          subject: emailTitle, emailTitle, batchSize, batchDelayMs: delayMs, customMessage, footerNote,
        }),
      });
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const ev = JSON.parse(line.slice(6));
          if (ev.type === "progress") {
            const r = ev.result;
            setRecords(prev => prev.map(rec => rec.email === r.email && rec.tenNhanVien === r.tenNhanVien ? { ...rec, status: r.status, error: r.error } : rec));
            setProg(p => ({ sent: ev.index, total: ev.total, success: p.success + (r.status === "success" ? 1 : 0), failed: p.failed + (r.status === "error" ? 1 : 0), results: [...p.results, r] }));
            resultsRef.current?.scrollTo({ top: 999999, behavior: "smooth" });
          }
          if (ev.type === "done") setIsDone(true);
        }
      }
    } catch (e) { console.error(e); }
    finally { setIsSending(false); }
  };

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
  const pct = prog.total ? Math.round((prog.sent / prog.total) * 100) : 0;
  const canSend = selectedCount > 0 && accounts.length > 0 && !isSending;

  return (
    <div className="space-y-6">
      {/* --- UI Bước 1 hoặc 2 --- */}
      {step < 3 && (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">1</span>
            <h2 className="font-semibold text-slate-800">Tải & Chọn Cột Dữ Liệu</h2>
          </div>
          <div className="p-6">
            {step === 1 ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDrag(true); }}
                onDragLeave={() => setIsDrag(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${isDrag ? "border-indigo-500 bg-indigo-50" : "border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50"}`}
              >
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
                {parsing ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                    <p className="text-slate-500 text-sm">Đang đọc file...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center mb-1">
                      <Upload className="w-7 h-7 text-indigo-600" />
                    </div>
                    <p className="font-medium text-slate-700">Kéo thả hoặc nhấn để chọn file dữ liệu</p>
                    <p className="text-slate-400 text-sm">Hỗ trợ: .xlsx, .xls, .csv</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-500">File:</span>
                    <Badge variant="outline" className="text-indigo-700 bg-indigo-50 border-indigo-200">{fileName}</Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Đổi file
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Cột bắt buộc */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2">1. Cột Bắt Buộc</h3>
                    
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cột Tên nhân viên <span className="text-red-500">*</span></label>
                      <select 
                        className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm focus:ring-2 focus:ring-indigo-500"
                        value={columnMapping.nameCol} onChange={e => setColumnMapping(p => ({...p, nameCol: e.target.value}))}
                      >
                        <option value="">-- Chọn cột --</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cột Email <span className="text-red-500">*</span></label>
                      <select 
                        className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm focus:ring-2 focus:ring-indigo-500"
                        value={columnMapping.emailCol} onChange={e => setColumnMapping(p => ({...p, emailCol: e.target.value}))}
                      >
                        <option value="">-- Chọn cột --</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cột Tổng thu nhập (Tùy chọn, sẽ tô đỏ)</label>
                      <select 
                        className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm focus:ring-2 focus:ring-indigo-500"
                        value={columnMapping.totalCol} onChange={e => setColumnMapping(p => ({...p, totalCol: e.target.value}))}
                      >
                        <option value="">-- Không chọn --</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Cột hiển thị */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2">2. Cột Hiển Thị Trong Email</h3>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 max-h-[250px] overflow-y-auto">
                      {(() => {
                        const validHeaders = headers.filter(h => h !== columnMapping.nameCol && h !== columnMapping.emailCol);
                        if (validHeaders.length === 0) return <span className="text-xs text-slate-400">Không có cột nào.</span>;

                        const grouped = validHeaders.reduce((acc, h) => {
                          const parts = h.split(" - ");
                          const group = parts.length > 1 ? parts[0] : "Thông tin chung";
                          const sub = parts.length > 1 ? parts.slice(1).join(" - ") : h;
                          if (!acc[group]) acc[group] = [];
                          acc[group].push({ full: h, sub });
                          return acc;
                        }, {} as Record<string, { full: string, sub: string }[]>);

                        return Object.entries(grouped).map(([group, cols]) => (
                          <div key={group} className="mb-3 last:mb-0">
                            {group !== "Thông tin chung" && (
                              <div className="text-xs font-bold text-indigo-700 bg-indigo-50/50 px-2 py-1 rounded mb-1">{group}</div>
                            )}
                            <div className="space-y-1">
                              {cols.map(c => {
                                const isChecked = !!columnMapping.displayCols.find(x => x.key === c.full);
                                return (
                                  <label key={c.full} className={`flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1.5 rounded ${group !== "Thông tin chung" ? "ml-2" : ""}`}>
                                    <input 
                                      type="checkbox" 
                                      checked={isChecked}
                                      onChange={e => toggleDisplayCol(c.full, e.target.checked)}
                                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-slate-700">{c.sub}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>

                {parseError && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {parseError}
                  </div>
                )}

                <Button className="w-full mt-4" onClick={loadData} disabled={parsing || !columnMapping.nameCol || !columnMapping.emailCol}>
                  {parsing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Settings2 className="w-4 h-4 mr-2" />}
                  Lưu Cấu Hình & Tải Dữ Liệu
                </Button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* --- UI Bước 3: Preview & Gửi --- */}
      {step === 3 && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">1</span>
              <h2 className="font-semibold text-slate-800">Danh Sách Nhân Viên</h2>
            </div>
            <div className="p-6">
              <div className="flex flex-col gap-3 mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="success"><Users className="w-3 h-3" /> {records.length} NV</Badge>
                      <span className="text-slate-400 text-xs truncate max-w-[150px]">{fileName}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                      <Button variant={filterStatus==="all"?"default":"ghost"} size="sm" className="h-7 text-xs" onClick={() => { setFilterStatus("all"); setPage(0); }}>Tất cả</Button>
                      <Button variant={filterStatus==="selected"?"default":"ghost"} size="sm" className="h-7 text-xs" onClick={() => { setFilterStatus("selected"); setPage(0); }}>Đã chọn ({records.filter(r=>r.selected).length})</Button>
                      <Button variant={filterStatus==="error"?"default":"ghost"} size="sm" className="h-7 text-xs" onClick={() => { setFilterStatus("error"); setPage(0); }}>Lỗi ({records.filter(r=>r.status==="error").length})</Button>
                      <Button variant={filterStatus==="success"?"default":"ghost"} size="sm" className="h-7 text-xs" onClick={() => { setFilterStatus("success"); setPage(0); }}>Thành công</Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setStep(2)}>
                      <Settings2 className="w-3.5 h-3.5 mr-1" /> Cấu hình lại cột
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                      <RefreshCw className="w-3.5 h-3.5" /> Đổi file
                    </Button>
                  </div>
                </div>
                <div className="relative w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input type="text" placeholder="Tìm kiếm tên..." className="pl-9 h-9 text-sm border-slate-200" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(0); }} />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-3 py-2.5 w-10">
                          <input type="checkbox" checked={records.length > 0 && records.every(r => r.selected)} onChange={e => setRecords(prev => prev.map(r => ({ ...r, selected: e.target.checked })))} className="rounded border-slate-300 w-4 h-4 text-indigo-600 cursor-pointer" />
                        </th>
                        <th className="text-left px-3 py-2.5 font-semibold text-slate-600">#</th>
                        <th className="text-left px-3 py-2.5 font-semibold text-slate-600">Tên nhân viên</th>
                        <th className="text-left px-3 py-2.5 font-semibold text-slate-600">Email</th>
                        {columnMapping.totalCol && <th className="text-right px-3 py-2.5 font-semibold text-indigo-700">{columnMapping.totalCol}</th>}
                        <th className="text-center px-3 py-2.5 font-semibold text-slate-600">TT</th>
                        <th className="text-center px-3 py-2.5 font-semibold text-slate-600">Xem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((r, i) => (
                        <tr key={r.id} className={`border-b border-slate-100 ${i%2===0?"":"bg-slate-50/50"} ${r.status==="error"?"bg-red-50":r.status==="success"?"bg-emerald-50":""}`}>
                          <td className="px-3 py-2">
                            <input type="checkbox" checked={r.selected} onChange={e => setRecords(prev => prev.map(rec => rec.id===r.id ? {...rec, selected: e.target.checked} : rec))} className="rounded border-slate-300 w-4 h-4 text-indigo-600 cursor-pointer" />
                          </td>
                          <td className="px-3 py-2 text-slate-400">{page*PAGE_SIZE+i+1}</td>
                          <td className="px-3 py-2 font-medium text-slate-800">{r.tenNhanVien}</td>
                          <td className="px-3 py-2 text-slate-500">{r.email}</td>
                          {columnMapping.totalCol && <td className="px-3 py-2 text-right font-semibold text-indigo-700">{fmt(r.data[columnMapping.totalCol])}</td>}
                          <td className="px-3 py-2 text-center">
                            {r.status==="success" && <CheckCircle className="w-5 h-5 text-emerald-500 inline" />}
                            {r.status==="error" && <span title={r.error}><XCircle className="w-5 h-5 text-red-500 inline" /></span>}
                            {r.status==="idle" && <span className="text-slate-300 text-xs font-semibold">—</span>}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Button size="icon" variant="ghost" className="w-7 h-7 text-indigo-600 hover:bg-indigo-50" onClick={() => setPreviewRecord(r)}>
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
                    <span className="text-xs text-slate-500">Trang {page+1}/{totalPages}</span>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => setPage(p => Math.max(0, p-1))} disabled={page===0}><ChevronLeft className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => setPage(p => Math.min(totalPages-1, p+1))} disabled={page===totalPages-1}><ChevronRight className="w-4 h-4" /></Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Gửi Email */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">2</span>
              <h2 className="font-semibold text-slate-800">Cấu hình & Gửi Email</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tiêu đề email</label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="VD: Thông báo lương tháng 4 - CDC Đà Nẵng" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nội dung ghi chú trên bảng (Tùy chọn)</label>
                <textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)} placeholder="Nhập nội dung gửi kèm phía trên bảng lương..." className="w-full min-h-[70px] rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ghi chú cuối email (Footer Note)</label>
                <textarea value={footerNote} onChange={e => setFooterNote(e.target.value)} placeholder="Mặc định: Vui lòng kiểm tra lại thông tin..." className="w-full min-h-[70px] rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y" />
              </div>

              {(records.length > 0 || accounts.length > 0) && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-4 text-sm space-y-1">
                  <p className="text-indigo-800"><strong>{selectedCount}</strong> nhân viên × <strong>{accounts.length}</strong> tài khoản Gmail</p>
                </div>
              )}

              <Button size="lg" className="w-full text-base font-semibold" onClick={startSend} disabled={!canSend}>
                {isSending ? (
                  <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Đang gửi {prog.sent}/{prog.total}...</>
                ) : (
                  <><Send className="w-5 h-5 mr-2" /> Gửi {selectedCount} email</>
                )}
              </Button>
            </div>
          </section>
        </div>
      )}

      {/* --- UI PROGRESS --- */}
      {(isSending || isDone) && (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isDone ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />}
              <h2 className="font-semibold text-slate-800">{isDone ? "Hoàn tất!" : `Đang gửi... ${pct}%`}</h2>
            </div>
            <span className="text-slate-400 text-sm">{prog.sent}/{prog.total}</span>
          </div>
          <div className="p-6 space-y-4">
            <Progress value={pct} colorClass={isDone && prog.failed===0 ? "bg-emerald-500" : "bg-indigo-600"} />
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
            <div ref={resultsRef} className="max-h-80 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
              {prog.results.map((r, i) => (
                <div key={i} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${r.status==="success"?"bg-white":"bg-red-50"}`}>
                  {r.status==="success" ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-slate-800">{r.tenNhanVien}</span>
                    <span className="text-slate-400 ml-2 text-xs">{r.email}</span>
                    {r.status==="error" && <p className="text-red-500 text-xs">{r.error}</p>}
                  </div>
                  <span className="text-slate-400 text-xs shrink-0">{r.sentVia}</span>
                </div>
              ))}
            </div>
            {isDone && prog.failed>0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-800 text-sm flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{prog.failed} email thất bại.</span>
              </div>
            )}
            {isDone && prog.failed===0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-emerald-800 text-sm flex gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Tất cả {prog.success} email đã được gửi thành công! 🎉</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* --- PREVIEW MODAL --- */}
      <Dialog.Root open={!!previewRecord} onOpenChange={(open) => !open && setPreviewRecord(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden outline-none">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <Dialog.Title className="font-semibold text-slate-800 text-lg flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600" />
                Xem trước: {previewRecord?.tenNhanVien}
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full"><X className="w-4 h-4" /></Button>
              </Dialog.Close>
            </div>
            <div className="flex-1 overflow-y-auto p-0 bg-[#f5f5f5]">
              {previewRecord && (
                <div className="w-full flex justify-center py-6 px-4"
                  dangerouslySetInnerHTML={{ __html: generateCustomEmail(previewRecord, { 
                    emailTitle: subject || "Thông báo lương - CDC Đà Nẵng", 
                    customMessage,
                    footerNote, 
                    columnMapping 
                  }) }}
                />
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
              <Dialog.Close asChild><Button variant="outline">Đóng</Button></Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
