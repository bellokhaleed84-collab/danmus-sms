import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] py-6 md:py-10 px-5 md:px-8 mt-20">
      <div className="grid md:grid-cols-3 gap-10">
        <div>
          <h2 className="text-2xl font-bold text-blue-500">Danmus SMS</h2>
          <p className="text-gray-400 mt-4">Secure SMS verification and virtual number platform.</p>
          <div className="flex items-center gap-4 mt-6">
            <a href="https://whatsapp.com/channel/0029Vb8N0VeAojYsaAlNz83R" target="_blank" rel="noopener noreferrer" title="WhatsApp" className="w-10 h-10 rounded-full bg-[var(--input)] border border-[var(--border)] flex items-center justify-center hover:bg-green-600 hover:border-green-600 transition">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm5.78 14.13c-.24.68-1.39 1.32-1.91 1.39-.49.07-1.1.1-1.78-.11-.41-.13-.94-.3-1.62-.59-2.85-1.23-4.71-4.1-4.85-4.29-.14-.19-1.16-1.55-1.16-2.96s.74-2.1 1-2.39c.27-.29.59-.36.78-.36.2 0 .39 0 .56.01.18.01.42-.07.66.5.24.59.83 2.03.9 2.18.07.15.12.32.02.51-.1.19-.15.31-.3.47-.15.17-.31.37-.45.5-.15.14-.3.3-.13.59.17.29.76 1.25 1.63 2.03 1.12 1 2.06 1.31 2.35 1.46.29.15.46.13.63-.08.17-.21.71-.83.9-1.12.19-.29.38-.24.63-.14.26.1 1.65.78 1.93.92.29.15.48.22.55.34.07.13.07.74-.17 1.42z"/></svg>
            </a>
            <a href="https://t.me/Danmus_Sms" target="_blank" rel="noopener noreferrer" title="Telegram" className="w-10 h-10 rounded-full bg-[var(--input)] border border-[var(--border)] flex items-center justify-center hover:bg-sky-500 hover:border-sky-500 transition">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22 4.01L2.5 11.5c-1.3.5-1.3 1.2-.24 1.53l5 1.56 1.92 6.06c.24.66.12.92.81.92.53 0 .76-.24 1.05-.52l2.5-2.43 5.2 3.83c.96.53 1.65.26 1.9-.89l3.44-16.2c.36-1.4-.53-2.04-1.58-1.65z"/></svg>
            </a>
            <a href="https://x.com/danmus_sms?s=11" target="_blank" rel="noopener noreferrer" title="X" className="w-10 h-10 rounded-full bg-[var(--input)] border border-[var(--border)] flex items-center justify-center hover:bg-black hover:border-black transition">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-7.4 8.46L23.3 22H16.7l-5.16-6.74L5.6 22H2.5l7.9-9.03L1.7 2h6.8l4.66 6.16L18.9 2zm-1.16 18h1.71L7.34 3.9H5.5L17.74 20z"/></svg>
            </a>
            <a href="https://www.instagram.com/danmus_sms?igsh=MnRsaHVjbHBsMDJ6&utm_source=qr" target="_blank" rel="noopener noreferrer" title="Instagram" className="w-10 h-10 rounded-full bg-[var(--input)] border border-[var(--border)] flex items-center justify-center hover:bg-pink-600 hover:border-pink-600 transition">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.21 8.8 2.2 12 2.2zm0 1.8c-3.15 0-3.5.01-4.74.07-.97.04-1.5.21-1.85.34-.46.18-.79.4-1.14.74-.34.34-.56.67-.74 1.13-.13.36-.3.89-.34 1.86-.06 1.24-.07 1.6-.07 4.74s.01 3.5.07 4.74c.04.97.21 1.5.34 1.86.18.46.4.79.74 1.13.34.34.67.56 1.13.74.36.13.89.3 1.86.34 1.24.06 1.6.07 4.74.07s3.5-.01 4.74-.07c.97-.04 1.5-.21 1.86-.34.46-.18.79-.4 1.13-.74.34-.34.56-.67.74-1.13.13-.36.3-.89.34-1.86.06-1.24.07-1.6.07-4.74s-.01-3.5-.07-4.74c-.04-.97-.21-1.5-.34-1.86a3 3 0 00-.74-1.13 3 3 0 00-1.13-.74c-.36-.13-.89-.3-1.86-.34-1.24-.06-1.6-.07-4.74-.07zm0 4.86a4.94 4.94 0 110 9.88 4.94 4.94 0 010-9.88zm0 1.8a3.14 3.14 0 100 6.28 3.14 3.14 0 000-6.28zm6.3-2a1.15 1.15 0 11-2.3 0 1.15 1.15 0 012.3 0z"/></svg>
            </a>
            <a href="https://www.tiktok.com/@danmus_sms?_r=1&_t=ZS-97Mp9Jqxihp" target="_blank" rel="noopener noreferrer" title="TikTok" className="w-10 h-10 rounded-full bg-[var(--input)] border border-[var(--border)] flex items-center justify-center hover:bg-black hover:border-black transition">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 5.82c-1.01-.93-1.6-2.24-1.6-3.69V2h-3.4v13.6c0 1.42-1.15 2.57-2.57 2.57a2.57 2.57 0 01-2.57-2.57c0-1.42 1.15-2.57 2.57-2.57.29 0 .56.05.82.13v-3.45c-.27-.04-.54-.06-.82-.06A6 6 0 003 15.6 6 6 0 009 21.57a6 6 0 006-5.97V9.78a8.3 8.3 0 004.6 1.39V7.78a4.85 4.85 0 01-3-1.96z"/></svg>
            </a>
          </div>
        </div>
        <div>
          <h3 className="font-semibold mb-4">Services</h3>
          <ul className="space-y-2 text-gray-400">
            <li>Virtual Numbers</li>
            <li>SMS Verification</li>
            <li>eSIM Services</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-4">Support</h3>
          <ul className="space-y-3 text-gray-400">
            <li>
              <a href="https://whatsapp.com/channel/0029Vb8N0VeAojYsaAlNz83R" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition">
                WhatsApp Support
              </a>
            </li>
            <li>
              <a href="mailto:danmussms@gmail.com" className="hover:text-blue-500 transition">
                danmussms@gmail.com
              </a>
            </li>
            <li>
              <Link href="/settings" className="hover:text-blue-500 transition">
                Help Center
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--border)] mt-10 pt-6 text-center text-gray-500">
        &copy; 2026 Danmus SMS Verification. All rights reserved.
      </div>
    </footer>
  );
}