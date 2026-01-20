/**
 * System Settings Page
 * 
 * Runtime configuration and controls
 */
import React from 'react';
import { MLToggle } from '../components/MLToggle';
import { Link } from 'react-router-dom';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
              <p className="text-sm text-gray-600 mt-1">Runtime configuration and controls</p>
            </div>
            <Link
              to="/"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ML Control */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">ML Advisor Control</h2>
            <MLToggle />
          </div>

          {/* System Info */}
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">System Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Engine Version:</span>
                <span className="text-gray-900 font-medium">v1.1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Rules Engine:</span>
                <span className="text-green-600 font-medium">ACTIVE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Decision Gates:</span>
                <span className="text-green-600 font-medium">ENABLED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Mode:</span>
                <span className="text-blue-600 font-medium">PRODUCTION</span>
              </div>
            </div>
          </div>

          {/* Documentation */}
          <div className="lg:col-span-2 p-4 bg-white rounded-lg border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Documentation</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Engine Architecture</h3>
                <p className="text-gray-600">Rules-based decision engine with ML advisor support</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Safety Guarantees</h3>
                <p className="text-gray-600">Kill Switch, Decision Gates, and operator controls ensure safety</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">ML Role</h3>
                <p className="text-gray-600">ML advises only - Rules always make final decisions</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
