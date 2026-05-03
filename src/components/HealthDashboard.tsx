'use client';

import { useState, useEffect } from 'react';

interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    supabase: { status: string; responseTime?: number; message: string };
    resend: { status: string; responseTime?: number; message: string };
    security: { status: string; responseTime?: number; message: string };
    database: { status: string; responseTime?: number; message: string };
  };
  metrics: {
    responseTime: number;
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
  };
  alerts: string[];
}

export function HealthDashboard() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchHealth = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealth(data);
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    
    if (autoRefresh) {
      const interval = setInterval(fetchHealth, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const runSpecificTest = async (testType: string) => {
    try {
      const response = await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: testType })
      });
      const data = await response.json();
      
      alert(`Test Result: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      alert(`Test failed: ${error}`);
    }
  };

  if (loading) {
    return (
      <div className="imperial-card p-6">
        <div className="flex items-center justify-center">
          <div className="loading-imperial mr-3" />
          <span>Checking system health...</span>
        </div>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="imperial-card p-6">
        <p className="text-red-500">Failed to load health data</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'text-soberano-emerald';
      case 'fail': return 'text-red-500';
      case 'warn': return 'text-soberano-gold';
      default: return 'text-soberano-steel';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return '✅';
      case 'fail': return '❌';
      case 'warn': return '⚠️';
      default: return '❓';
    }
  };

  return (
    <div className="imperial-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-imperial">🛡️ System Health Dashboard</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1 rounded-lg text-sm ${
              autoRefresh ? 'bg-soberano-emerald text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            {autoRefresh ? '🔄 Auto ON' : '⏸️ Auto OFF'}
          </button>
          <button
            onClick={fetchHealth}
            className="btn-gold-glow text-sm px-3 py-1"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Overall Status */}
      <div className={`p-4 rounded-lg mb-6 ${
        health.status === 'healthy' ? 'bg-soberano-emerald/10 border border-soberano-emerald/20' :
        health.status === 'degraded' ? 'bg-yellow-100/10 border border-yellow-500/20' :
        'bg-red-500/10 border border-red-500/20'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-lg font-semibold ${
              health.status === 'healthy' ? 'text-soberano-emerald' :
              health.status === 'degraded' ? 'text-yellow-500' :
              'text-red-500'
            }`}>
              Overall Status: {health.status.toUpperCase()}
            </h3>
            <p className="text-sm text-soberano-steel">
              Last checked: {new Date(health.timestamp).toLocaleString()}
            </p>
          </div>
          <div className={`text-3xl ${
            health.status === 'healthy' ? 'text-soberano-emerald' :
            health.status === 'degraded' ? 'text-yellow-500' :
            'text-red-500'
          }`}>
            {health.status === 'healthy' ? '🟢' : health.status === 'degraded' ? '🟡' : '🔴'}
          </div>
        </div>
      </div>

      {/* Services Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {Object.entries(health.services).map(([service, status]) => (
          <div key={service} className="engagement-card">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold capitalize">{service}</h4>
              <span className={`text-lg ${getStatusColor(status.status)}`}>
                {getStatusIcon(status.status)}
              </span>
            </div>
            <p className="text-sm text-soberano-steel mb-1">{status.message}</p>
            {status.responseTime && (
              <p className="text-xs text-soberano-steel">
                Response: {status.responseTime}ms
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Metrics */}
      <div className="engagement-card mb-6">
        <h3 className="font-semibold mb-3">System Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-soberano-steel">Response Time:</span>
            <span className="ml-2 font-medium">{health.metrics.responseTime}ms</span>
          </div>
          <div>
            <span className="text-soberano-steel">Uptime:</span>
            <span className="ml-2 font-medium">
              {Math.floor(health.metrics.uptime / 3600)}h {Math.floor((health.metrics.uptime % 3600) / 60)}m
            </span>
          </div>
          <div>
            <span className="text-soberano-steel">Memory:</span>
            <span className="ml-2 font-medium">
              {Math.round(health.metrics.memoryUsage.heapUsed / 1024 / 1024)}MB
            </span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {health.alerts.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold mb-3 text-red-500">Alerts</h3>
          <div className="space-y-2">
            {health.alerts.map((alert, index) => (
              <div key={index} className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{alert}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Tests */}
      <div className="engagement-card">
        <h3 className="font-semibold mb-3">Quick Tests</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => runSpecificTest('nexo_causal')}
            className="px-4 py-2 bg-soberano-deep text-soberano-pearl rounded-lg hover:bg-soberano-midnight transition-colors"
          >
            🔗 Test Nexo Causal
          </button>
          <button
            onClick={() => runSpecificTest('rls_protection')}
            className="px-4 py-2 bg-soberano-deep text-soberano-pearl rounded-lg hover:bg-soberano-midnight transition-colors"
          >
            🛡️ Test RLS Protection
          </button>
          <button
            onClick={() => runSpecificTest('email_performance')}
            className="px-4 py-2 bg-soberano-deep text-soberano-pearl rounded-lg hover:bg-soberano-midnight transition-colors"
          >
            📧 Test Email Speed
          </button>
        </div>
      </div>
    </div>
  );
}
