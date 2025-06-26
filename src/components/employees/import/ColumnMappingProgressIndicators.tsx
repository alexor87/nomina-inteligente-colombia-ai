
interface ColumnMappingProgressIndicatorsProps {
  totalColumns: number;
  requiredMappedCount: number;
  totalRequiredFields: number;
  totalMappedFields: number;
}

export const ColumnMappingProgressIndicators = ({
  totalColumns,
  requiredMappedCount,
  totalRequiredFields,
  totalMappedFields
}: ColumnMappingProgressIndicatorsProps) => {
  return (
    <div className="grid grid-cols-3 gap-4 text-center">
      <div className="p-3 bg-blue-50 rounded-lg">
        <div className="text-2xl font-bold text-blue-600">{totalColumns}</div>
        <div className="text-sm text-blue-600">Columnas detectadas</div>
      </div>
      <div className="p-3 bg-green-50 rounded-lg">
        <div className="text-2xl font-bold text-green-600">
          {requiredMappedCount}/{totalRequiredFields}
        </div>
        <div className="text-sm text-green-600">Campos requeridos</div>
      </div>
      <div className="p-3 bg-gray-50 rounded-lg">
        <div className="text-2xl font-bold text-gray-600">{totalMappedFields}</div>
        <div className="text-sm text-gray-600">Total mapeados</div>
      </div>
    </div>
  );
};
