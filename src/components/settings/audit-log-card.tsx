"use client";

import { ScrollText, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** Settings entry point for the audit log — the log itself lives on the
 *  standalone /log page (dense, always-dark, live). */
export function AuditLogCard() {
  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <ScrollText className="h-5 w-5 text-primary" />
        <CardTitle>Nhật ký thay đổi</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          Ghi lại mọi thay đổi (thêm / sửa / xoá) trong ứng dụng để đối chiếu — chỉ để xem, không
          thể hoàn tác. Mở trang nhật ký để xem trực tiếp.
        </p>
        <a href="/log" target="_blank" rel="noopener noreferrer" className="self-start">
          <Button variant="outline">
            <ExternalLink className="h-4 w-4" />
            Mở trang nhật ký
          </Button>
        </a>
      </CardContent>
    </Card>
  );
}
