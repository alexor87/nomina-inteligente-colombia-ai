
interface TimeOffCalculatorProps {
  startDate: string;
  endDate: string;
  calculatedDays: number | null;
}

export const TimeOffCalculator = ({ startDate, endDate, calculatedDays }: TimeOffCalculatorProps) => {
  if (!startDate || !endDate || calculatedDays === null) {
    return null;
  }

  return (
    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <p className="text-sm font-medium text-blue-800">
        Días hábiles calculados: {calculatedDays}
      </p>
      <p className="text-xs text-blue-600 mt-1">
        (Se excluyen fines de semana)
      </p>
    </div>
  );
};
