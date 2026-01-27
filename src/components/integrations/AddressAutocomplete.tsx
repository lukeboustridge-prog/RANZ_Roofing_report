"use client";

/**
 * Address Autocomplete Component
 * NZ address search with autocomplete suggestions
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddressSuggestion {
  id: string;
  address: string;
  highlight?: string;
  metadata?: {
    suburb?: string;
    city?: string;
    postcode?: string;
  };
}

interface NZAddress {
  id: string;
  fullAddress: string;
  streetNumber: string;
  streetName: string;
  streetType: string;
  suburb: string;
  city: string;
  region: string;
  postcode: string;
  lat: number;
  lng: number;
}

interface AddressAutocompleteProps {
  value?: string;
  onChange?: (address: string) => void;
  onAddressSelect?: (address: NZAddress) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function AddressAutocomplete({
  value = "",
  onChange,
  onAddressSelect,
  placeholder = "Start typing an address...",
  label,
  required,
  error,
  disabled,
  className,
}: AddressAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<NZAddress | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync input value with prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        listRef.current &&
        !listRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search for addresses
  const searchAddresses = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/integrations/address?q=${encodeURIComponent(query)}&limit=5`
      );

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
        setHighlightedIndex(-1);
      }
    } catch (err) {
      console.error("Address search error:", err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get full address details
  const getAddressDetails = useCallback(async (placeId: string) => {
    try {
      const response = await fetch(
        `/api/integrations/address?placeId=${encodeURIComponent(placeId)}`
      );

      if (response.ok) {
        const data = await response.json();
        return data.address as NZAddress;
      }
    } catch (err) {
      console.error("Address details error:", err);
    }
    return null;
  }, []);

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange?.(newValue);
    setSelectedAddress(null);

    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (newValue.length >= 3) {
      setOpen(true);
      debounceRef.current = setTimeout(() => {
        searchAddresses(newValue);
      }, 300);
    } else {
      setSuggestions([]);
      setOpen(false);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        setOpen(false);
        break;
    }
  };

  // Handle suggestion selection
  const handleSelect = async (suggestion: AddressSuggestion) => {
    setInputValue(suggestion.address);
    onChange?.(suggestion.address);
    setOpen(false);

    // Get full details
    const details = await getAddressDetails(suggestion.id);
    if (details) {
      setSelectedAddress(details);
      onAddressSelect?.(details);
    }
  };

  // Clear selection
  const handleClear = () => {
    setInputValue("");
    onChange?.("");
    setSelectedAddress(null);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor="address-input">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}

      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
        <Input
          ref={inputRef}
          id="address-input"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "pl-10 pr-10",
            error && "border-red-500",
            selectedAddress && "pr-16"
          )}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {!loading && inputValue && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={handleClear}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
        {selectedAddress && (
          <Check className="absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
        )}

        {/* Dropdown suggestions */}
        {open && (suggestions.length > 0 || inputValue.length >= 3) && (
          <div
            ref={listRef}
            className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border bg-popover p-1 shadow-md"
          >
            {suggestions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {loading ? "Searching..." : "No addresses found"}
              </div>
            ) : (
              suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  type="button"
                  onClick={() => handleSelect(suggestion)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none",
                    "hover:bg-accent hover:text-accent-foreground",
                    index === highlightedIndex && "bg-accent text-accent-foreground"
                  )}
                >
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="truncate">{suggestion.address}</p>
                    {suggestion.metadata?.city && (
                      <p className="text-xs text-muted-foreground">
                        {[suggestion.metadata.suburb, suggestion.metadata.city]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Display parsed address details */}
      {selectedAddress && (
        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {selectedAddress.suburb && (
              <>
                <span>Suburb:</span>
                <span>{selectedAddress.suburb}</span>
              </>
            )}
            {selectedAddress.city && (
              <>
                <span>City:</span>
                <span>{selectedAddress.city}</span>
              </>
            )}
            {selectedAddress.postcode && (
              <>
                <span>Postcode:</span>
                <span>{selectedAddress.postcode}</span>
              </>
            )}
            {selectedAddress.lat && selectedAddress.lng && (
              <>
                <span>Coordinates:</span>
                <span>
                  {selectedAddress.lat.toFixed(4)}, {selectedAddress.lng.toFixed(4)}
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AddressAutocomplete;
