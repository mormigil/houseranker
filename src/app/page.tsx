import Link from "next/link";
import ApiKeyManager from "@/components/ApiKeyManager";

export default function Home() {
  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            House Ranker
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Rank houses using binary search comparison like Beli
          </p>
        </div>

        <ApiKeyManager />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/list"
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              View Rankings
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              See your houses ranked from best to worst
            </p>
          </Link>

          <Link
            href="/rank"
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Rank Houses
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Compare and rank unranked houses
            </p>
          </Link>

          <Link
            href="/manage"
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Manage Houses
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Add new houses and manage existing ones
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
