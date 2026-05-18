"use client";
import { useState, useRef, useCallback } from "react";
import {
  Upload, Send, Plus, X, CheckCircle, XCircle,
  Loader2, Eye, AlertCircle, RefreshCw, Search,
  ChevronLeft, ChevronRight, Users,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { generateTaxEmail } from "@/utils/taxEmailTemplate";
import type { TaxRecord, GmailAccount, SendStatus } from "@/types/salary";

interface TaxRecordUI extends TaxRecord {
  id: string;
  selected: boolean;
  status: SendStatus | "idle";
  error?: string;
}

interface ProgressState {
  sent: number; total: number; success: number; failed: number;
  results: { tenNhanVien: string; email: string; status: string; sentVia?: string; error?: string }[];
}

const PAGE_SIZE = 8;
const fmt = (v: number) => v === 0 ? "0" : v.toLocaleString("vi-VN");

interface Props {
  accounts: GmailAccount[];
  batchSize: number;
  delayMs: number;
}

export default function TaxTab({ accounts, batchSize, delayMs }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const [records, setRecords] = useState<TaxRecordUI[]>([]);
  const [thang, setThang] = useState("");
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [isDrag, setIsDrag] = useState(false);
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all"|"selected"|"success"|"error">("all");

  const [subject, setSubject] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [showKhoanDetail, setShowKhoanDetail] = useState(true);

  const [isSending, setIsSending] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [prog, setProg] = useState<ProgressState>({ sent:0, total:0, success:0, failed:0, results:[] });
  const [previewRecord, setPreviewRecord] = useState<TaxRecord | null>(null);

  const processFile = useCallback(async (file: File) => {
    setParseError(""); setParsing(true); setRecords([]); setFileName(file.name); setPage(0); setThang("");
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/parse-tax-excel", { method: "POST", body: fd });
      const json = await res.json();
      if (json.error) { setParseError(json.error); return; }
      if (json.records) {
        // Chỉ lấy nhân viên có thuế > 0
        const withTax = json.records.filter((r: TaxRecord) => r.thueTNCN > 0);
        setRecords(withTax.map((r: TaxRecord) => ({ ...r, id: crypto.randomUUID(), selected: true, status: "idle" })));
        setThang(json.thang || "");
        if (json.records.length !== withTax.length) {
          const skipped = json.records.length - withTax.length;
          setParseError(`ℹ️ Đã bỏ qua ${skipped} nhân viên không phát sinh thuế TNCN.`);
        }
      }
    } catch { setParseError("Không thể kết nối server."); }
    finally { setParsing(false); }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const startSend = async () => {
    const selected = records.filter(r => r.selected && r.status !== "success");
    if (!selected.length || !accounts.length || isSending) return;
    setIsSending(true); setIsDone(false);
    setProg({ sent:0, total:selected.length, success:0, failed:0, results:[] });
    setRecords(prev => prev.map(r => selected.some(s => s.id === r.id) ? { ...r, status:"idle", error:undefined } : r));
    try {
      const emailTitle = subject || `Thông báo Thuế TNCN tháng ${thang} - CDC Đà Nẵng`;
      const res = await fetch("/api/send-tax-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records: selected,
          accounts: accounts.map(({ id, user, appPassword }) => ({ id, user, appPassword })),
          subject: emailTitle, batchSize, batchDelayMs: delayMs, customMessage, showKhoanDetail,
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
      {/* STEP 1: Upload */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">1</span>
          <h2 className="font-semibold text-slate-800">Tải file Excel Thuế TNCN</h2>
        </div>
        <div className="p-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDrag(true); }}
            onDragLeave={() => setIsDrag(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${isDrag ? "border-emerald-500 bg-emerald-50" : "border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/50"}`}
          >
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
            {parsing ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                <p className="text-slate-500 text-sm">Đang phân tích file...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-1">
                  <Upload className="w-7 h-7 text-emerald-600" />
                </div>
                <p className="font-medium text-slate-700">Kéo thả hoặc nhấn để chọn file Thuế TNCN</p>
                <p className="text-slate-400 text-sm">Hỗ trợ: .xlsx, .xls, .csv</p>
              </div>
            )}
          </div>

          {parseError && (
            <div className={`mt-3 flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${parseError.startsWith("ℹ️") ? "text-blue-700 bg-blue-50 border border-blue-200" : "text-red-600 bg-red-50 border border-red-200"}`}>
              <AlertCircle className="w-4 h-4 shrink-0" /> {parseError}
            </div>
          )}

          {records.length > 0 && (
            <div className="mt-4">
              <div className="flex flex-col gap-3 mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="success"><Users className="w-3 h-3" /> {records.length} NV có thuế</Badge>
                      <span className="text-slate-400 text-xs">{fileName}</span>
                      {thang && <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">Tháng {thang}</Badge>}
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                      <Button variant={filterStatus==="all"?"default":"ghost"} size="sm" className="h-7 text-xs" onClick={() => { setFilterStatus("all"); setPage(0); }}>Tất cả</Button>
                      <Button variant={filterStatus==="selected"?"default":"ghost"} size="sm" className="h-7 text-xs" onClick={() => { setFilterStatus("selected"); setPage(0); }}>Đã chọn ({records.filter(r=>r.selected).length})</Button>
                      <Button variant={filterStatus==="error"?"default":"ghost"} size="sm" className="h-7 text-xs" onClick={() => { setFilterStatus("error"); setPage(0); }}>Lỗi ({records.filter(r=>r.status==="error").length})</Button>
                      <Button variant={filterStatus==="success"?"default":"ghost"} size="sm" className="h-7 text-xs" onClick={() => { setFilterStatus("success"); setPage(0); }}>Thành công</Button>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
                    <RefreshCw className="w-3.5 h-3.5" /> Đổi file
                  </Button>
                </div>
                <div className="relative w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input type="text" placeholder="Tìm kiếm tên nhân viên..." className="pl-9 h-9 text-sm border-slate-200" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(0); }} />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-3 py-2.5 w-10">
                          <input type="checkbox" checked={records.length > 0 && records.every(r => r.selected)} onChange={e => setRecords(prev => prev.map(r => ({ ...r, selected: e.target.checked })))} className="rounded border-slate-300 w-4 h-4 text-emerald-600 cursor-pointer" />
                        </th>
                        <th className="text-left px-3 py-2.5 font-semibold text-slate-600">#</th>
                        <th className="text-left px-3 py-2.5 font-semibold text-slate-600">Phòng</th>
                        <th className="text-left px-3 py-2.5 font-semibold text-slate-600">Tên nhân viên</th>
                        <th className="text-left px-3 py-2.5 font-semibold text-slate-600">Email</th>
                        <th className="text-right px-3 py-2.5 font-semibold text-slate-600">Tổng cộng</th>
                        <th className="text-right px-3 py-2.5 font-semibold text-slate-600">TNTT</th>
                        <th className="text-right px-3 py-2.5 font-semibold text-red-600">Thuế TNCN</th>
                        <th className="text-center px-3 py-2.5 font-semibold text-slate-600">TT</th>
                        <th className="text-center px-3 py-2.5 font-semibold text-slate-600">Xem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((r, i) => (
                        <tr key={r.id} className={`border-b border-slate-100 ${i%2===0?"":"bg-slate-50/50"} ${r.status==="error"?"bg-red-50":r.status==="success"?"bg-emerald-50":""}`}>
                          <td className="px-3 py-2">
                            <input type="checkbox" checked={r.selected} onChange={e => setRecords(prev => prev.map(rec => rec.id===r.id ? {...rec, selected: e.target.checked} : rec))} className="rounded border-slate-300 w-4 h-4 text-emerald-600 cursor-pointer" />
                          </td>
                          <td className="px-3 py-2 text-slate-400">{page*PAGE_SIZE+i+1}</td>
                          <td className="px-3 py-2 text-slate-500">{r.phong}</td>
                          <td className="px-3 py-2 font-medium text-slate-800">{r.tenNhanVien}</td>
                          <td className="px-3 py-2 text-slate-500">{r.email}</td>
                          <td className="px-3 py-2 text-right text-slate-600">{fmt(r.cong)}</td>
                          <td className="px-3 py-2 text-right text-slate-600">{fmt(r.thuNhapTinhThue > 0 ? r.thuNhapTinhThue : 0)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-red-600">{fmt(r.thueTNCN)}</td>
                          <td className="px-3 py-2 text-center">
                            {r.status==="success" && <CheckCircle className="w-5 h-5 text-emerald-500 inline" />}
                            {r.status==="error" && <span title={r.error}><XCircle className="w-5 h-5 text-red-500 inline" /></span>}
                            {r.status==="idle" && <span className="text-slate-300 text-xs font-semibold">—</span>}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Button size="icon" variant="ghost" className="w-7 h-7 text-emerald-600 hover:bg-emerald-50" onClick={() => setPreviewRecord(r)}>
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
          )}
        </div>
      </section>

      {/* STEP 2: Cấu hình gửi */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">2</span>
          <h2 className="font-semibold text-slate-800">Cấu hình &amp; Gửi Email Thuế TNCN</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tiêu đề email</label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder={`Thông báo Thuế TNCN tháng ${thang||"__"} - CDC Đà Nẵng`} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nội dung ghi chú thêm (Tùy chọn)</label>
            <textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)} placeholder="Nhập nội dung gửi kèm..." className="w-full min-h-[70px] rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-y" />
          </div>

          {/* Tùy chọn hiển thị chi tiết khoản */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
            <input
              type="checkbox"
              id="showKhoanDetail"
              checked={showKhoanDetail}
              onChange={e => setShowKhoanDetail(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="showKhoanDetail" className="text-sm text-slate-700 cursor-pointer select-none">
              <span className="font-semibold">Hiển thị chi tiết từng khoản thu nhập</span>
              <span className="text-slate-400 ml-2 text-xs">(UNC135, lương tháng, nghị quyết...)</span>
            </label>
          </div>

          {(records.length > 0 || accounts.length > 0) && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 text-sm space-y-1">
              <p className="text-emerald-800"><strong>{selectedCount}</strong> nhân viên có thuế × <strong>{accounts.length}</strong> tài khoản Gmail</p>
              {accounts.length > 0 && selectedCount > 0 && (
                <p className="text-emerald-600 text-xs">Mỗi tài khoản gửi ~{Math.ceil(selectedCount / accounts.length)} email</p>
              )}
            </div>
          )}

          <Button size="lg" className="w-full text-base font-semibold bg-emerald-600 hover:bg-emerald-700" onClick={startSend} disabled={!canSend}>
            {isSending ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Đang gửi {prog.sent}/{prog.total}...</>
            ) : (
              <><Send className="w-5 h-5" /> Gửi {selectedCount} email Thuế TNCN</>
            )}
          </Button>
        </div>
      </section>

      {/* PROGRESS */}
      {(isSending || isDone) && (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isDone ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />}
              <h2 className="font-semibold text-slate-800">{isDone ? "Hoàn tất!" : `Đang gửi... ${pct}%`}</h2>
            </div>
            <span className="text-slate-400 text-sm">{prog.sent}/{prog.total}</span>
          </div>
          <div className="p-6 space-y-4">
            <Progress value={pct} colorClass={isDone && prog.failed===0 ? "bg-emerald-500" : "bg-emerald-600"} />
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
                <span>{prog.failed} email thất bại. Kiểm tra lại địa chỉ email và kết nối Gmail.</span>
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

      {/* PREVIEW MODAL */}
      <Dialog.Root open={!!previewRecord} onOpenChange={(open) => !open && setPreviewRecord(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden outline-none">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <Dialog.Title className="font-semibold text-slate-800 text-lg">
                🧾 Xem trước: {previewRecord?.tenNhanVien}
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full"><X className="w-4 h-4" /></Button>
              </Dialog.Close>
            </div>
            <div className="mb-3 px-4 pt-3 flex items-center gap-3 shrink-0">
              <input type="checkbox" id="previewDetail" checked={showKhoanDetail} onChange={e => setShowKhoanDetail(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-emerald-600 cursor-pointer" />
              <label htmlFor="previewDetail" className="text-sm text-slate-600 cursor-pointer">Hiển thị chi tiết từng khoản trong email</label>
            </div>
            <div className="flex-1 overflow-y-auto p-0 bg-[#f5f5f5]">
              {previewRecord && (
                <div className="w-full flex justify-center py-6 px-4"
                  dangerouslySetInnerHTML={{ __html: generateTaxEmail(previewRecord, { showKhoanDetail, customMessage }) }}
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
