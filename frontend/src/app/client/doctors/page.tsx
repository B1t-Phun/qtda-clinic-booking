'use client';

import React, { Suspense, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CalendarPlus,
  MapPin,
  CreditCard,
  Award,
  Phone,
  Filter,
} from 'lucide-react';
import {
  PageHeader,
  Card,
  Button,
  Avatar,
  Skeleton,
  EmptyState,
  ErrorState,
  Chip,
} from '@/components/ui/core';
import { SearchInput, Select } from '@/components/ui/form';
import { Modal } from '@/components/ui/overlay';
import { createClient } from '@/lib/supabase/client';
import { fmtVND, normalize } from '@/lib/format';
import {
  type DoctorItem,
  type SpecialtyItem,
  getDoctorProfile,
  getDoctorSpecialty,
} from '../client-types';

function DoctorListContent() {
  const searchParams = useSearchParams();
  const initialSpecialty = searchParams.get('specialty') || 'all';

  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>(initialSpecialty);

  // Selected doctor for detail modal
  const [detailDoctor, setDetailDoctor] = useState<DoctorItem | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function load() {
      try {
        // 1. Fetch specialties
        const { data: specData, error: specErr } = await supabase
          .from('specialties')
          .select('*')
          .order('name', { ascending: true });

        if (specErr) throw specErr;
        if (active) setSpecialties(specData || []);

        // 2. Fetch doctors with profiles and specialties
        const { data: docData, error: docErr } = await supabase
          .from('doctors')
          .select(`
            id,
            bio,
            room,
            years_experience,
            consultation_fee,
            is_active,
            specialty_id,
            profiles (
              id,
              full_name,
              phone,
              avatar_url,
              gender
            ),
            specialties (
              id,
              name,
              description
            )
          `)
          .eq('is_active', true)
          .order('years_experience', { ascending: false });

        if (docErr) throw docErr;
        if (active) {
          setDoctors((docData as DoctorItem[]) || []);
          setError(null);
        }
      } catch (err: unknown) {
        console.error('Error fetching doctors:', err);
        if (active) {
          setError(err instanceof Error ? err.message : 'Lỗi kết nối máy chủ');
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

  const fetchData = () => {
    setLoading(true);
    setError(null);
    setReloadTick((t) => t + 1);
  };

  // Filtered doctors
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      const profile = getDoctorProfile(doc);
      const specialty = getDoctorSpecialty(doc);

      // Filter by specialty
      if (selectedSpecialty !== 'all') {
        if (
          String(doc.specialty_id) !== selectedSpecialty &&
          String(specialty?.id) !== selectedSpecialty
        ) {
          return false;
        }
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const queryNorm = normalize(searchQuery.trim());
        const nameNorm = profile ? normalize(profile.full_name) : '';
        const specialtyNorm = specialty ? normalize(specialty.name) : '';
        if (!nameNorm.includes(queryNorm) && !specialtyNorm.includes(queryNorm)) {
          return false;
        }
      }

      return true;
    });
  }, [doctors, selectedSpecialty, searchQuery]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Danh sách Bác sĩ"
        description="Đội ngũ bác sĩ chuyên khoa giàu kinh nghiệm, tận tâm vì sức khỏe của bạn"
        actions={
          <Link href="/client/booking">
            <Button variant="primary" icon={<CalendarPlus className="size-4" />}>
              Đặt lịch khám ngay
            </Button>
          </Link>
        }
      />

      {/* Filter & Search Bar */}
      <Card className="p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-center">
          <div className="sm:col-span-7">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Tìm kiếm theo tên bác sĩ hoặc chuyên khoa..."
            />
          </div>

          <div className="sm:col-span-5">
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-slate-400 shrink-0 hidden sm:block" />
              <Select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="w-full"
                aria-label="Lọc theo chuyên khoa"
              >
                <option value="all">Tất cả chuyên khoa ({specialties.length})</option>
                {specialties.map((s) => (
                  <option key={String(s.id)} value={String(s.id)}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {/* Quick specialty chips */}
        <div className="mt-3.5 pt-3.5 border-t border-line flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-muted shrink-0 mr-1 font-medium">Chuyên khoa nhanh:</span>
          <button
            type="button"
            onClick={() => setSelectedSpecialty('all')}
            className={`rounded-full px-3 py-1 font-medium transition-colors shrink-0 ${
              selectedSpecialty === 'all'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả
          </button>
          {specialties.map((s) => {
            const specId = String(s.id);
            const isSelected = selectedSpecialty === specId;
            return (
              <button
                key={specId}
                type="button"
                onClick={() => setSelectedSpecialty(specId)}
                className={`rounded-full px-3 py-1 font-medium transition-colors shrink-0 ${
                  isSelected
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Main Content: Doctors Grid or Skeletons / Empty */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-5 space-y-4">
              <div className="flex items-start gap-3.5">
                <Skeleton className="size-14 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-12 w-full" />
              <div className="space-y-2 pt-2 border-t border-line">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 flex-1" />
              </div>
            </Card>
          ))}
        </div>
      ) : error ? (
        <ErrorState onRetry={fetchData} />
      ) : filteredDoctors.length === 0 ? (
        <EmptyState
          kind={searchQuery || selectedSpecialty !== 'all' ? 'search' : 'empty'}
          title="Không tìm thấy bác sĩ phù hợp"
          description={
            searchQuery || selectedSpecialty !== 'all'
              ? 'Vui lòng thử điều chỉnh lại bộ lọc chuyên khoa hoặc từ khóa tìm kiếm.'
              : 'Hiện chưa có bác sĩ nào trong hệ thống.'
          }
          action={
            (searchQuery || selectedSpecialty !== 'all') && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSpecialty('all');
                }}
              >
                Xóa bộ lọc tìm kiếm
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDoctors.map((doc) => {
            const profile = getDoctorProfile(doc);
            const specialty = getDoctorSpecialty(doc);
            const fullName = profile?.full_name || 'Bác sĩ chuyên khoa';

            return (
              <Card
                key={doc.id}
                className="flex flex-col justify-between p-5 transition-all duration-200 hover:shadow-md hover:border-blue-200 group"
              >
                <div>
                  {/* Doctor Header */}
                  <div className="flex items-start gap-3.5 mb-3.5">
                    <Avatar
                      name={fullName}
                      url={profile?.avatar_url}
                      size={54}
                      className="ring-2 ring-blue-100 group-hover:ring-primary/40 transition-all shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-base text-ink truncate group-hover:text-primary transition-colors">
                        {fullName}
                      </h3>
                      {specialty && (
                        <div className="mt-1">
                          <Chip tone="blue">{specialty.name}</Chip>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Doctor Bio */}
                  <p className="text-13 text-muted line-clamp-2 leading-relaxed mb-4 min-h-[40px]">
                    {doc.bio || 'Bác sĩ chuyên khoa giàu kinh nghiệm, tận tâm và chu đáo trong khám và điều trị bệnh nhân.'}
                  </p>

                  {/* Key Details */}
                  <div className="space-y-2 py-3 border-y border-line text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted">
                        <Award className="size-3.5 text-amber-500" />
                        Kinh nghiệm:
                      </span>
                      <span className="font-semibold text-ink">
                        {doc.years_experience} năm
                      </span>
                    </div>

                    {doc.room && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-muted">
                          <MapPin className="size-3.5 text-primary" />
                          Phòng khám:
                        </span>
                        <span className="font-semibold text-ink">{doc.room}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted">
                        <CreditCard className="size-3.5 text-emerald-600" />
                        Giá khám:
                      </span>
                      <span className="font-bold text-emerald-600">
                        {fmtVND(doc.consultation_fee || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-1 flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-slate-600 hover:text-ink text-13"
                    onClick={() => setDetailDoctor(doc)}
                  >
                    Xem chi tiết
                  </Button>
                  <Link href={`/client/booking?doctor_id=${doc.id}`} className="flex-1">
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full text-13"
                      icon={<CalendarPlus className="size-3.5" />}
                    >
                      Đặt lịch
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Doctor Detail Modal */}
      {detailDoctor && (
        <Modal
          open={!!detailDoctor}
          onClose={() => setDetailDoctor(null)}
          title="Thông tin chi tiết Bác sĩ"
          size="md"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDetailDoctor(null)}>
                Đóng
              </Button>
              <Link href={`/client/booking?doctor_id=${detailDoctor.id}`}>
                <Button
                  variant="primary"
                  icon={<CalendarPlus className="size-4" />}
                  onClick={() => setDetailDoctor(null)}
                >
                  Đặt lịch với Bác sĩ này
                </Button>
              </Link>
            </>
          }
        >
          {(() => {
            const profile = getDoctorProfile(detailDoctor);
            const specialty = getDoctorSpecialty(detailDoctor);
            const fullName = profile?.full_name || 'Bác sĩ chuyên khoa';

            return (
              <div className="space-y-5">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-line">
                  <Avatar name={fullName} url={profile?.avatar_url} size={64} />
                  <div>
                    <h3 className="text-lg font-bold text-ink">{fullName}</h3>
                    {specialty && (
                      <div className="mt-1">
                        <Chip tone="blue">{specialty.name}</Chip>
                      </div>
                    )}
                    {profile?.phone && (
                      <p className="mt-1 text-xs text-muted flex items-center gap-1">
                        <Phone className="size-3 text-primary" />
                        {profile.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-line p-3">
                    <span className="text-xs text-muted block mb-0.5">Kinh nghiệm công tác</span>
                    <span className="font-bold text-ink text-base">
                      {detailDoctor.years_experience} năm
                    </span>
                  </div>

                  <div className="rounded-lg border border-line p-3">
                    <span className="text-xs text-muted block mb-0.5">Phí khám tư vấn</span>
                    <span className="font-bold text-emerald-600 text-base">
                      {fmtVND(detailDoctor.consultation_fee || 0)}
                    </span>
                  </div>

                  {detailDoctor.room && (
                    <div className="col-span-2 rounded-lg border border-line p-3 flex items-center gap-2">
                      <MapPin className="size-4 text-primary shrink-0" />
                      <div>
                        <span className="text-xs text-muted">Phòng làm việc:</span>{' '}
                        <span className="font-semibold text-ink">{detailDoctor.room}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-ink mb-2">Tiểu sử & Chuyên môn</h4>
                  <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-line border border-line">
                    {detailDoctor.bio || 'Bác sĩ chưa cập nhật thông tin tiểu sử chi tiết.'}
                  </div>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}

export default function ClientDoctorsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-56 w-full" />
            ))}
          </div>
        </div>
      }
    >
      <DoctorListContent />
    </Suspense>
  );
}
