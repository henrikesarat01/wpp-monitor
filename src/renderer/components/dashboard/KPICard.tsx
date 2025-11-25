/**
 * KPICard Component
 *
 * Card para exibir um KPI individual
 */

import React from "react";

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: "blue" | "green" | "purple" | "orange" | "indigo" | "teal" | "pink";
  isText?: boolean;
}

const colorClasses = {
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-200",
  },
  green: {
    bg: "bg-green-50",
    text: "text-green-600",
    border: "border-green-200",
  },
  purple: {
    bg: "bg-purple-50",
    text: "text-purple-600",
    border: "border-purple-200",
  },
  orange: {
    bg: "bg-orange-50",
    text: "text-orange-600",
    border: "border-orange-200",
  },
  indigo: {
    bg: "bg-indigo-50",
    text: "text-indigo-600",
    border: "border-indigo-200",
  },
  teal: {
    bg: "bg-teal-50",
    text: "text-teal-600",
    border: "border-teal-200",
  },
  pink: {
    bg: "bg-pink-50",
    text: "text-pink-600",
    border: "border-pink-200",
  },
};

const KPICard: React.FC<KPICardProps> = ({ icon, label, value, color }) => {
  const colors = colorClasses[color];

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-3 rounded-lg ${colors.bg} ${colors.text}`}>
          {icon}
        </div>
        <div className={`text-3xl font-bold ${colors.text}`}>{value}</div>
      </div>
      <p className="text-sm text-gray-600 font-medium">{label}</p>
    </div>
  );
};

export default KPICard;
