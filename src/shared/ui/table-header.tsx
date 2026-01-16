import React, { type ReactNode } from "react";

interface TableHeaderProps {
  title: string;
  subtitle?: string;
  total?: number;
  action?: ReactNode;
}

const TableHeader: React.FC<TableHeaderProps> = ({
  title,
  subtitle,
  total,
  action,
}) => {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-black">{title}</h2>
        <p className="text-sm font-semibold text-gray-600">
          {subtitle}: {total}
        </p>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};
export default TableHeader;
