import React from "react";

interface TableHeaderProps {
  title: string;
  subtitle?: string;
  total?: number;
}

const TableHeader: React.FC<TableHeaderProps> = ({
  title,
  subtitle,
  total,
}) => {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-black">{title}</h2>
      <p className="text-sm font-semibold text-gray-600">
        {subtitle}: {total}
      </p>
    </div>
  );
};
export default TableHeader;
