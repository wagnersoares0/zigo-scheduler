import "@zigoschedule/scheduler-react/styles.css";
import "./globals.css";

export const metadata = { title: "Zigo Scheduler Next consumer" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
