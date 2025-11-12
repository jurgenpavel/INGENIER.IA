import "./globals.css";
export const metadata = { title: "INGENIER.IA · Etapa 1", description: "Sistema Básico de Producción" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
