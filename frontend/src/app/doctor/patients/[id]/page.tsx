import PatientDetailView from '@/modules/doctor/views/PatientDetailView';
export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PatientDetailView id={id} />;
}
