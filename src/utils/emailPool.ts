// ============================================================
// utils/emailPool.ts
// Quản lý Email Pool với thuật toán Round-Robin
// ============================================================

import { GmailAccount } from "@/types/salary";

export class EmailPool {
  private accounts: GmailAccount[];
  private currentIndex: number = 0;
  private sentCount: Map<string, number> = new Map();

  constructor(accounts: GmailAccount[]) {
    if (!accounts || accounts.length === 0) {
      throw new Error("Email pool phải có ít nhất 1 tài khoản Gmail.");
    }
    this.accounts = accounts;
    accounts.forEach((a) => this.sentCount.set(a.id, 0));
  }

  /**
   * Lấy tài khoản tiếp theo theo Round-Robin.
   * Mỗi lần gọi sẽ chuyển sang tài khoản kế tiếp.
   */
  next(): GmailAccount {
    const account = this.accounts[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.accounts.length;
    this.sentCount.set(account.id, (this.sentCount.get(account.id) ?? 0) + 1);
    return account;
  }

  /** Thống kê số email đã gửi của từng tài khoản */
  getStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.sentCount.forEach((count, id) => {
      stats[id] = count;
    });
    return stats;
  }

  get totalAccounts(): number {
    return this.accounts.length;
  }
}
