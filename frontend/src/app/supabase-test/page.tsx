"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SupabaseTestPage() {
  const [status, setStatus] = useState("Đang kiểm tra...");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function checkConnection() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("connection_test")
        .select("message")
        .limit(1);

      if (error) {
        setStatus("Kết nối thất bại");
        setMessage(error.message);
        return;
      }

      setStatus("Kết nối Supabase thành công!");
      setMessage(data?.[0]?.message ?? "Không có dữ liệu kiểm tra");
    }

    checkConnection();
  }, []);

  return (
    <main className="min-h-screen p-10">
      <h1 className="text-2xl font-bold">ClinicCare - Supabase Test</h1>
      <p className="mt-4">{status}</p>
      <p className="mt-2">{message}</p>
    </main>
  );
}