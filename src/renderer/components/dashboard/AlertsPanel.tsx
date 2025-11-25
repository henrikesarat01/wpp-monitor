/**
 * AlertsPanel Component
 *
 * Painel de alertas e notificações
 */

import React from "react";
import { AlertCircle, Clock, Wifi, Snowflake } from "lucide-react";

interface Alert {
  type: "no_response" | "disconnected" | "cold_conversation";
  message: string;
  accountId?: string;
  contactNumber?: string;
}

interface AlertsPanelProps {
  alerts: Alert[];
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts }) => {
  const getAlertIcon = (type: Alert["type"]) => {
    switch (type) {
      case "no_response":
        return <Clock className="w-5 h-5" />;
      case "disconnected":
        return <Wifi className="w-5 h-5" />;
      case "cold_conversation":
        return <Snowflake className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getAlertColor = (type: Alert["type"]) => {
    switch (type) {
      case "no_response":
        return {
          bg: "bg-yellow-50",
          border: "border-yellow-200",
          icon: "text-yellow-600",
          text: "text-yellow-800",
        };
      case "disconnected":
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          icon: "text-red-600",
          text: "text-red-800",
        };
      case "cold_conversation":
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          icon: "text-blue-600",
          text: "text-blue-800",
        };
      default:
        return {
          bg: "bg-gray-50",
          border: "border-gray-200",
          icon: "text-gray-600",
          text: "text-gray-800",
        };
    }
  };

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="w-5 h-5 text-orange-600" />
        <h3 className="text-lg font-semibold text-gray-800">
          Alertas ({alerts.length})
        </h3>
      </div>

      <div className="space-y-3">
        {alerts.map((alert, index) => {
          const colors = getAlertColor(alert.type);
          return (
            <div
              key={index}
              className={`flex items-start gap-3 p-4 rounded-lg border ${colors.bg} ${colors.border}`}
            >
              <div className={colors.icon}>{getAlertIcon(alert.type)}</div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${colors.text}`}>
                  {alert.message}
                </p>
                {alert.contactNumber && (
                  <p className="text-xs text-gray-600 mt-1">
                    Contato: {alert.contactNumber}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AlertsPanel;
