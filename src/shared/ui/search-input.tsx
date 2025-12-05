import * as React from "react";
import { Search as SearchIcon } from "lucide-react";
import { Input, type InputProps } from "./controls";
import { cn } from "@shared/lib/cn";

export interface SearchInputProps extends Omit<InputProps, "type"> {
  containerClassName?: string;
}

/**
 * Campo de búsqueda con ícono embebido.
 * Reutilizable en Audits, Reports, Users, etc.
 */
const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    { className, containerClassName, placeholder = "Search…", ...props },
    ref
  ) => {
    return (
      <div className={cn("relative", containerClassName)}>
        <SearchIcon
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500"
        />
        <Input
          ref={ref}
          type="search"
          placeholder={placeholder}
          className={cn("pl-10", className)}
          {...props}
        />
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";

export default SearchInput;
