"use client";
import { useState, useEffect } from "react";
import { Zap, AlertCircle, Plus, Eye, EyeOff, X, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import TaxTab from "@/components/TaxTab";
import CustomSalaryTab from "@/components/CustomSalaryTab";
import SalaryTab from "@/components/SalaryTab";

import type { GmailAccount } from "@/types/salary";

interface AccountUI extends GmailAccount { showPass: boolean }

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"salary" | "custom" | "tax">("salary");

  const [accounts, setAccounts] = useState<AccountUI[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPass, setNewPass] = useState("");

  const [batchSize, setBatchSize] = useState(10);
  const [delayMs, setDelayMs] = useState(2000);

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
              <h1 className="text-xl font-bold text-white tracking-tight">Hệ Thống Gửi Email Tự Động</h1>
              <p className="text-indigo-200 text-xs">Trung tâm Kiểm soát bệnh tật thành phố Đà Nẵng</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {accounts.length > 0 && (
              <Badge variant="outline" className="border-white/30 text-white bg-white/10 text-xs">
                <Zap className="w-3 h-3" /> {accounts.length} tài khoản
              </Badge>
            )}
          </div>
        </div>
        {/* Tab Navigation */}
        <div className="max-w-5xl mx-auto px-6 pb-0 flex gap-1">
          <button
            onClick={() => setActiveTab("salary")}
            className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-all ${
              activeTab === "salary"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-indigo-200 hover:text-white hover:bg-white/10"
            }`}
          >
            📊 Báo Lương Quý (Mẫu cũ)
          </button>
          <button
            onClick={() => setActiveTab("custom")}
            className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-all ${
              activeTab === "custom"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-indigo-200 hover:text-white hover:bg-white/10"
            }`}
          >
            ⚙️ Gửi Email Tùy Chỉnh (Excel)
          </button>
          <button
            onClick={() => setActiveTab("tax")}
            className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-all ${
              activeTab === "tax"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-indigo-200 hover:text-white hover:bg-white/10"
            }`}
          >
            🧾 Báo Thuế TNCN
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        
        {/* ── GMAIL POOL (Chung cho cả 2 tab) ── */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center">@</span>
              <h2 className="font-semibold text-slate-800">Cấu hình tài khoản gửi (Gmail Pool)</h2>
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
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
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

        {/* ── TABS CONTENT ── */}
        {activeTab === "salary" && (
          <SalaryTab accounts={accounts} batchSize={batchSize} delayMs={delayMs} />
        )}
        
        {activeTab === "custom" && (
          <CustomSalaryTab accounts={accounts} batchSize={batchSize} delayMs={delayMs} />
        )}
        
        {activeTab === "tax" && (
          <TaxTab accounts={accounts} batchSize={batchSize} delayMs={delayMs} />
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-slate-400 text-xs">
        Hệ thống Gửi Email Tự Động — CDC Đà Nẵng © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
