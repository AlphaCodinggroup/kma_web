"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@shared/lib/cn";

export interface PaginationProps {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    pageSizeOptions?: number[];
    className?: string;
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/**
 * Componente reutilizable de paginación.
 * Incluye navegación entre páginas, selector de tamaño de página, e indicadores de totales.
 */
const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
    className,
}) => {
    // No mostrar paginación si no hay items
    if (totalItems === 0) {
        return null;
    }

    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    const canGoPrevious = currentPage > 1;
    const canGoNext = currentPage < totalPages;

    return (
        <div
            className={cn(
                "flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3",
                className
            )}
        >
            {/* Left side: Item count */}
            <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{startItem}</span> to{" "}
                <span className="font-medium">{endItem}</span> of{" "}
                <span className="font-medium">{totalItems}</span> results
            </div>

            {/* Right side: Navigation and page size selector */}
            <div className="flex items-center gap-6">
                {/* Page size selector */}
                <div className="flex items-center gap-2">
                    <label htmlFor="pageSize" className="text-sm text-gray-700 whitespace-nowrap">
                        Items per page:
                    </label>
                    <select
                        id="pageSize"
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                        className="h-9 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                    >
                        {pageSizeOptions.map((size) => (
                            <option key={size} value={size}>
                                {size}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Page navigation */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={!canGoPrevious}
                        className={cn(
                            "inline-flex items-center justify-center h-9 px-4 rounded-md border text-sm font-medium transition-all duration-200",
                            "border-gray-300 bg-white text-gray-700",
                            "hover:bg-gray-50 hover:border-gray-400",
                            "focus:outline-none focus:ring-2 focus:ring-blue-200",
                            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-300"
                        )}
                        aria-label="Previous page"
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                    </button>

                    <div className="text-sm text-gray-700 px-3 min-w-[100px] text-center">
                        Page <span className="font-medium">{currentPage}</span> of{" "}
                        <span className="font-medium">{totalPages}</span>
                    </div>

                    <button
                        type="button"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={!canGoNext}
                        className={cn(
                            "inline-flex items-center justify-center h-9 px-4 rounded-md border text-sm font-medium transition-all duration-200",
                            "border-gray-300 bg-white text-gray-700",
                            "hover:bg-gray-50 hover:border-gray-400",
                            "focus:outline-none focus:ring-2 focus:ring-blue-200",
                            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-300"
                        )}
                        aria-label="Next page"
                    >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Pagination;
