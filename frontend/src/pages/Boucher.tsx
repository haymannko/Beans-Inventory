import { FiShield } from 'react-icons/fi'

export default function Boucher() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bouncher</h1>
        <p className="text-gray-500 dark:text-gray-400">Security & access control overview</p>
      </div>

      <div className="card flex flex-col items-center gap-6 p-8">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary-100 rounded-lg text-primary-600">
            <FiShield className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Bouncher</h2>
        </div>

        <img
          src="/Bouncher.png"
          alt="Bouncer"
          className="max-w-full w-full max-w-2xl rounded-lg shadow-lg"
        />
      </div>
    </div>
  )
}
