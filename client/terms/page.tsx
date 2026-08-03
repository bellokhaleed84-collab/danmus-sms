import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-4 md:px-6 py-10">
      <div className="max-w-3xl mx-auto">

        <div className="mb-10">
          <h1 className="text-3xl md:text-5xl font-bold">Terms & Conditions</h1>
          <p className="text-gray-400 mt-3">Last updated: June 2026</p>
        </div>

        <div className="space-y-8 text-gray-300 leading-8">

          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Acceptance of Terms</h2>
            <p>By creating an account on Danmus SMS, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use our platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Service Description</h2>
            <p>Danmus SMS provides virtual phone numbers for receiving OTP (One-Time Password) verification codes. These numbers are temporary and intended for single-use verification purposes only.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Eligibility</h2>
            <p>You must be at least 18 years old to use Danmus SMS. By registering, you confirm that you meet this age requirement and that all information you provide is accurate and truthful.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Acceptable Use</h2>
            <p>You agree to use Danmus SMS only for lawful purposes. You must not use our service to:</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>Engage in fraud, scams, or any illegal activity</li>
              <li>Create fake accounts on other platforms</li>
              <li>Violate any third-party terms of service</li>
              <li>Harass, abuse, or harm any person</li>
              <li>Bypass security measures of any platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Payments & Wallet</h2>
            <p>All wallet funding is processed securely via Paystack. Funds added to your Danmus SMS wallet are non-refundable except in cases of technical errors on our part. Virtual number purchases are charged from your wallet balance at the time of purchase.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. No Guarantee of SMS Delivery</h2>
            <p>While we strive to deliver OTP codes promptly, Danmus SMS does not guarantee successful delivery of every SMS. Delivery depends on third-party providers and network conditions. Refunds for failed deliveries are handled on a case-by-case basis.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Account Security</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials. Danmus SMS will never ask for your password. Report any unauthorized access to danmussms@gmail.com immediately.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. Termination</h2>
            <p>We reserve the right to suspend or terminate your account at any time if we determine you are violating these Terms. Remaining wallet balance may be forfeited in cases of serious violations.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">9. Privacy</h2>
            <p>We collect only the information necessary to provide our service (name, email, transaction history). We do not sell your data to third parties. Your data is stored securely on encrypted servers.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">10. Changes to Terms</h2>
            <p>We may update these Terms at any time. Continued use of Danmus SMS after changes are posted constitutes your acceptance of the new Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">11. Contact</h2>
            <p>For questions about these Terms, contact us at:</p>
            <ul className="mt-3 space-y-2">
              <li>Email: <a href="mailto:danmussms@gmail.com" className="text-blue-400 hover:text-blue-300">danmussms@gmail.com</a></li>
              <li>WhatsApp: <a href="https://whatsapp.com/channel/0029Vb8N0VeAojYsaAlNz83R" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">WhatsApp Channel</a></li>
            </ul>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-[var(--border)]">
          <Link href="/register">
            <button className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-2xl font-semibold transition">
              Back to Register
            </button>
          </Link>
        </div>

      </div>
    </main>
  );
}