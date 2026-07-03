"use client";

import { Button } from "@/components/ui/button";

export function AssistantSuggestionChips({
  items,
  onSelect,
  disabled = false,
}: {
  items: string[];
  onSelect: (value: string) => void;
  disabled?: boolean;
}) {
  if (!items.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Button
          key={item}
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => onSelect(item)}
          className="rounded-full"
        >
          {item}
        </Button>
      ))}
    </div>
  );
}
