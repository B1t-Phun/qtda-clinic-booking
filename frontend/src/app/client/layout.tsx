export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="client-layout min-h-screen">
      {children}
    </div>
  );
}
