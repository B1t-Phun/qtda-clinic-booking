export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="doctor-layout min-h-screen">
      {children}
    </div>
  );
}
