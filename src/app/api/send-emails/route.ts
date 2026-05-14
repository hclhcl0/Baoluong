import { NextRequest } from "next/server";
import nodemailer from "nodemailer";
import { EmailPool } from "@/utils/emailPool";
import { generateSalaryEmail } from "@/utils/emailTemplate";
import type { GmailAccount, SalaryRecord, SendResult } from "@/types/salary";

interface SendEmailsBody {
  records: SalaryRecord[];
  accounts: GmailAccount[];
  subject?: string;
  batchSize?: number;
  batchDelayMs?: number;
  customMessage?: string;
}

function enc(controller: ReadableStreamDefaultController, data: object) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

export async function POST(req: NextRequest) {
  const body: SendEmailsBody = await req.json();
  const { records, accounts, subject, batchSize = 10, batchDelayMs = 2000, customMessage } = body;

  if (!records?.length) {
    return new Response("Không có dữ liệu nhân viên.", { status: 400 });
  }
  if (!accounts?.length) {
    return new Response("Cần ít nhất 1 tài khoản Gmail.", { status: 400 });
  }

  // Tạo transporter map — khởi tạo 1 lần cho tất cả accounts
  const transporters = new Map<string, nodemailer.Transporter>();
  for (const acc of accounts) {
    transporters.set(
      acc.id,
      nodemailer.createTransport({
        service: "gmail",
        auth: { user: acc.user, pass: acc.appPassword },
      })
    );
  }

  const pool = new EmailPool(accounts);
  const emailSubject = subject || "Thông báo lương quý - CDC Đà Nẵng";

  const stream = new ReadableStream({
    async start(controller) {
      // Gửi event khởi đầu
      enc(controller, { type: "start", total: records.length });

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const account = pool.next();
        const transporter = transporters.get(account.id)!;

        let result: SendResult;
        try {
          const html = generateSalaryEmail(record, { quarterTitle: emailSubject, customMessage });
          await transporter.sendMail({
            from: `"CDC Đà Nẵng - Phòng TCHC" <${account.user}>`,
            to: record.email,
            subject: emailSubject,
            html,
          });
          result = {
            tenNhanVien: record.tenNhanVien,
            email: record.email,
            status: "success",
            sentVia: account.user,
          };
        } catch (err) {
          result = {
            tenNhanVien: record.tenNhanVien,
            email: record.email,
            status: "error",
            sentVia: account.user,
            error: (err as Error).message,
          };
        }

        enc(controller, { type: "progress", index: i + 1, total: records.length, result });

        // Batch delay: nghỉ sau mỗi N email (trừ email cuối)
        if (batchSize > 0 && (i + 1) % batchSize === 0 && i < records.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, batchDelayMs));
        }
      }

      enc(controller, { type: "done", stats: pool.getStats() });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
