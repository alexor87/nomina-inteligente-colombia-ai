
interface PayrollSummaryProps {
  title: string;
  icon: string;
  children: React.ReactNode;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

export const PayrollSummary = ({ 
  title, 
  icon, 
  children, 
  bgColor, 
  borderColor, 
  textColor 
}: PayrollSummaryProps) => {
  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg p-4`}>
      <h3 className={`text-lg font-semibold ${textColor} mb-3`}>
        {icon} {title}
      </h3>
      {children}
    </div>
  );
};
