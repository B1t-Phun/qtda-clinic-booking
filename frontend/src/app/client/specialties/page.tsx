'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  CalendarPlus,
  Users,
} from 'lucide-react';
import {
  PageHeader,
  Card,
  Button,
  Skeleton,
  EmptyState,
  ErrorState,
} from '@/components/ui/core';
import { createClient } from '@/lib/supabase/client';
import type { SpecialtyItem } from '../client-types';

interface SpecialtyWithDoctors extends SpecialtyItem {
  doctors?: { id: string; is_active: boolean }[];
}

export default function ClientSpecialtiesPage() {
  const [specialties, setSpecialties] = useState<SpecialtyWithDoctors[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function load() {
      try {
        const { data, error: fetchErr } = await supabase
          .from('specialties')
          .select(`
            id,
            name,
            description,
            created_at,
            doctors (
              id,
              is_active
            )
          `)
          .order('name', { ascending: true });

        if (fetchErr) throw fetchErr;
        if (active) {
          setSpecialties((data as SpecialtyWithDoctors[]) || []);
          setError(null);
        }
      } catch (err: unknown) {
        console.error('Error fetching specialties:', err);
        if (active) {
          setError(err instanceof Error ? err.message : 'Lỗi tải danh mục chuyên khoa');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [reloadTick]);

  const fetchSpecialties = () => {
    setLoading(true);
    setError(null);
    setReloadTick((t) => t + 1);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Danh mục Chuyên khoa"
        description="Các chuyên khoa y tế hàng đầu với hệ thống trang thiết bị hiện đại và đội ngũ chuyên gia tận tâm"
        actions={
          <Link href="/client/booking">
            <Button variant="primary" icon={<CalendarPlus className="size-4" />}>
              Đặt lịch khám ngay
            </Button>
          </Link>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-6 space-y-4">
              <Skeleton className="size-12 rounded-2xl" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-9 w-full" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <ErrorState onRetry={fetchSpecialties} />
      ) : specialties.length === 0 ? (
        <EmptyState
          kind="empty"
          title="Chưa có chuyên khoa nào"
          description="Hiện tại hệ thống chưa cập nhật danh mục chuyên khoa khám bệnh."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {specialties.map((spec, index) => {
            const activeDoctorsCount =
              spec.doctors?.filter((d) => d.is_active).length ?? 0;

            // Varied aesthetic icon colors
            const colorThemes = [
              { bg: 'bg-blue-50', text: 'text-blue-600', hoverBorder: 'hover:border-blue-300' },
              { bg: 'bg-teal-50', text: 'text-teal-600', hoverBorder: 'hover:border-teal-300' },
              { bg: 'bg-rose-50', text: 'text-rose-600', hoverBorder: 'hover:border-rose-300' },
              { bg: 'bg-amber-50', text: 'text-amber-600', hoverBorder: 'hover:border-amber-300' },
              { bg: 'bg-purple-50', text: 'text-purple-600', hoverBorder: 'hover:border-purple-300' },
              { bg: 'bg-indigo-50', text: 'text-indigo-600', hoverBorder: 'hover:border-indigo-300' },
            ];
            const theme = colorThemes[index % colorThemes.length];

            return (
              <Card
                key={spec.id}
                className={`flex flex-col justify-between p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${theme.hoverBorder} group`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`flex size-12 items-center justify-center rounded-2xl ${theme.bg} ${theme.text} transition-transform group-hover:scale-105`}
                    >
                      <Activity className="size-6" />
                    </div>

                    {activeDoctorsCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        <Users className="size-3 text-slate-400" />
                        {activeDoctorsCount} bác sĩ
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-ink group-hover:text-primary transition-colors">
                    {spec.name}
                  </h3>

                  <p className="mt-2 text-13 text-muted leading-relaxed line-clamp-3 min-h-[58px]">
                    {spec.description ||
                      'Chuyên khoa khám, tư vấn và điều trị toàn diện với tiêu chuẩn y khoa chất lượng cao.'}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-line flex items-center justify-between">
                  <Link href={`/client/doctors?specialty=${spec.id}`} className="w-full">
                    <Button
                      variant="secondary"
                      size="md"
                      className="w-full justify-between group-hover:border-primary group-hover:text-primary"
                    >
                      <span>Xem danh sách bác sĩ</span>
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
