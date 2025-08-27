import React from 'react';

interface PeriodHeaderProps {
  period: string;
  dateRange: string;
}

export const PeriodHeader = ({ period, dateRange }: PeriodHeaderProps) => {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-foreground mb-2">
        {period}
      </h1>
      <p className="text-muted-foreground">
        {dateRange}
      </p>
    </div>
  );
};