/**
 * Share-Bereich Layout — Doctor-Theme für alle /share/* Seiten.
 * Konsistentes Arzt-Interface: Expired-Seite + Dashboard erhalten data-theme="doctor".
 */
export default function ShareLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div data-theme="doctor">{children}</div>
}
