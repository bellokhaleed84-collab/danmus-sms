export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] py-6 md:py-10 px-5 md:px-8 mt-20">

      <div className="grid md:grid-cols-3 gap-10">

        <div>
          <h2 className="text-2xl font-bold text-blue-500">
            Danmus SMS
          </h2>

          <p className="text-gray-400 mt-4">
            Secure SMS verification and virtual number platform.
          </p>
        </div>

        <div>
          <h3 className="font-semibold mb-4">
            Services
          </h3>

          <ul className="space-y-2 text-gray-400">
            <li>Virtual Numbers</li>
            <li>SMS Verification</li>
            <li>eSIM Services</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold mb-4">
            Support
          </h3>

          <ul className="space-y-2 text-gray-400">
            <li>Contact Us</li>
            <li>Help Center</li>
            <li>Privacy Policy</li>
          </ul>
        </div>

      </div>

      <div className="border-t border-[var(--border)] mt-10 pt-6 text-center text-gray-500">
        © 2026 Danmus SMS Verification. All rights reserved.
      </div>

    </footer>
  );
}