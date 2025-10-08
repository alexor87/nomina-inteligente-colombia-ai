import React from 'react';
import { ProactiveDetectionResult, AlertSeverity } from '@/types/proactive-detection';
import { ProactiveAlertCard } from './ProactiveAlert';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, CheckCircle } from 'lucide-react';

interface ProactiveAlertsPanelProps {
  detection: ProactiveDetectionResult;
  onAlertAction?: (alertId: string) => void;
  onAlertDismiss?: (alertId: string) => void;
}

export const ProactiveAlertsPanel: React.FC<ProactiveAlertsPanelProps> = ({
  detection,
  onAlertAction,
  onAlertDismiss
}) => {
  // Ordenar alertas por severidad
  const sortedAlerts = [...detection.alerts].sort((a, b) => {
    const severityOrder = {
      [AlertSeverity.CRITICAL]: 0,
      [AlertSeverity.HIGH]: 1,
      [AlertSeverity.MEDIUM]: 2,
      [AlertSeverity.LOW]: 3
    };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  if (detection.alerts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-green-50 border border-green-200 rounded-xl p-6 text-center"
      >
        <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <CheckCircle className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-green-900 mb-2">
          ¡Todo en orden!
        </h3>
        <p className="text-sm text-green-700">
          No se detectaron problemas que requieran tu atención.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Detección Proactiva
            </h3>
            <p className="text-xs text-gray-600">
              {detection.alerts.length} problema(s) detectado(s)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {detection.summary.critical > 0 && (
            <div className="bg-red-50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-red-600">
                {detection.summary.critical}
              </div>
              <div className="text-xs text-red-600">Crítico</div>
            </div>
          )}
          {detection.summary.high > 0 && (
            <div className="bg-orange-50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-orange-600">
                {detection.summary.high}
              </div>
              <div className="text-xs text-orange-600">Alto</div>
            </div>
          )}
          {detection.summary.medium > 0 && (
            <div className="bg-yellow-50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-yellow-600">
                {detection.summary.medium}
              </div>
              <div className="text-xs text-yellow-600">Medio</div>
            </div>
          )}
          {detection.summary.low > 0 && (
            <div className="bg-blue-50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-blue-600">
                {detection.summary.low}
              </div>
              <div className="text-xs text-blue-600">Bajo</div>
            </div>
          )}
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {sortedAlerts.map((alert) => (
            <ProactiveAlertCard
              key={alert.id}
              alert={alert}
              onAction={onAlertAction ? () => onAlertAction(alert.id) : undefined}
              onDismiss={onAlertDismiss ? () => onAlertDismiss(alert.id) : undefined}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
