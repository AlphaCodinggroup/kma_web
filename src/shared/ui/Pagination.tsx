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
                "flex flex-wrap items-center justify-between gap-3 border-t border-[var(--kma-border)] bg-[var(--kma-surface)] px-4 py-3",
                className
            )}
        >
            {/* Left side: Item count */}
            <div className="text-sm text-[var(--kma-muted)] ">
                Showing <span className="font-medium">{startItem}</span> to{" "}
                <span className="font-medium">{endItem}</span> of{" "}
                <span className="font-medium">{totalItems}</span> results
            </div>

            {/* Right side: Navigation and page size selector */}
            <div className="flex flex-wrap items-center gap-4">
                {/* Page size selector */}
                <div className="flex items-center gap-2">
                    <label htmlFor="pageSize" className="text-sm text-[var(--kma-muted)] whitespace-nowrap">
                        Items per page:
                    </label>
                    <select
                        id="pageSize"
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                        className="min-h-10 rounded-lg border border-[var(--kma-border)] bg-[var(--kma-surface)] px-3 py-1.5 text-sm text-[var(--kma-muted)] hover:border-[var(--kma-border)] focus:border-[var(--kma-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--kma-primary)]/25 transition-all duration-200"
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
                            "inline-flex items-center justify-center min-h-10 px-3 rounded-lg border text-sm font-medium transition-all duration-200",
                            "border-[var(--kma-border)] bg-[var(--kma-surface)] text-[var(--kma-muted)] ",
                            "hover:bg-[var(--kma-subtle)] hover:border-[var(--kma-border)] ",
                            "focus:outline-none focus:ring-2 focus:ring-[var(--kma-primary)]/25",
                            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--kma-surface)] disabled:hover:border-[var(--kma-border)] "
                        )}
                        aria-label="Previous page"
                    >
                        <ChevronLeft aria-hidden="true" className="h-4 w-4 mr-1" />
                        Previous
                    </button>

                    <div className="text-sm text-[var(--kma-muted)] px-1 min-w-[85px] text-center">
                        Page <span className="font-medium">{currentPage}</span> of{" "}
                        <span className="font-medium">{totalPages}</span>
                    </div>

                    <button
                        type="button"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={!canGoNext}
                        className={cn(
                            "inline-flex items-center justify-center min-h-10 px-3 rounded-lg border text-sm font-medium transition-all duration-200",
                            "border-[var(--kma-border)] bg-[var(--kma-surface)] text-[var(--kma-muted)] ",
                            "hover:bg-[var(--kma-subtle)] hover:border-[var(--kma-border)] ",
                            "focus:outline-none focus:ring-2 focus:ring-[var(--kma-primary)]/25",
                            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--kma-surface)] disabled:hover:border-[var(--kma-border)] "
                        )}
                        aria-label="Next page"
                    >
                        Next
                        <ChevronRight aria-hidden="true" className="h-4 w-4 ml-1" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Pagination;
