"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SeverityBadge } from "@/components/badges/SeverityBadge";
import { ClassificationBadge } from "@/components/badges/ClassificationBadge";
import {
  Search,
  FileText,
  ChevronRight,
  ChevronDown,
  Loader2,
  X,
} from "lucide-react";
import type { DefectSeverity, DefectClass } from "@prisma/client";

interface DefectTemplate {
  id: string;
  name: string;
  category: string;
  title: string;
  description: string;
  classification: DefectClass;
  severity: DefectSeverity;
  observationTemplate: string;
  analysisTemplate?: string;
  opinionTemplate?: string;
  codeReference?: string;
  copReference?: string;
  probableCauseTemplate?: string;
  recommendationTemplate?: string;
  priorityLevel?: string;
  tags: string[];
}

interface DefectTemplateSelectorProps {
  onSelect: (template: DefectTemplate) => void;
  onClose: () => void;
}

export function DefectTemplateSelector({
  onSelect,
  onClose,
}: DefectTemplateSelectorProps) {
  const [templates, setTemplates] = useState<DefectTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/defect-templates");
      if (!response.ok) throw new Error("Failed to fetch templates");
      const data = await response.json();
      setTemplates(data.templates);
      setCategories(data.categories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const filteredTemplates = templates.filter((template) => {
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        template.name.toLowerCase().includes(query) ||
        template.title.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }
    // Filter by selected category
    if (selectedCategory) {
      return template.category === selectedCategory;
    }
    return true;
  });

  const getTemplatesByCategory = (category: string) => {
    return filteredTemplates.filter((t) => t.category === category);
  };

  const handleSelectTemplate = (template: DefectTemplate) => {
    onSelect(template);
    onClose();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-md">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Select Defect Template</h3>
          <p className="text-sm text-muted-foreground">
            Choose a pre-defined template to quickly add common defects
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setSelectedCategory(null);
          }}
          className="pl-9"
        />
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setSelectedCategory(null);
            setSearchQuery("");
          }}
        >
          All
        </Button>
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSelectedCategory(category);
              setSearchQuery("");
            }}
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Templates list */}
      <div className="max-h-[400px] overflow-y-auto space-y-2">
        {searchQuery ? (
          // Show flat list when searching
          filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="mx-auto h-8 w-8 mb-2" />
              <p>No templates found for "{searchQuery}"</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleSelectTemplate}
                />
              ))}
            </div>
          )
        ) : selectedCategory ? (
          // Show templates for selected category
          <div className="space-y-2">
            {getTemplatesByCategory(selectedCategory).map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={handleSelectTemplate}
              />
            ))}
          </div>
        ) : (
          // Show grouped by category
          categories.map((category) => {
            const categoryTemplates = getTemplatesByCategory(category);
            if (categoryTemplates.length === 0) return null;

            const isExpanded = expandedCategories.has(category);

            return (
              <div key={category} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span className="font-medium">{category}</span>
                    <Badge variant="secondary" className="text-xs">
                      {categoryTemplates.length}
                    </Badge>
                  </div>
                </button>
                {isExpanded && (
                  <div className="border-t divide-y">
                    {categoryTemplates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onSelect={handleSelectTemplate}
                        compact
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

interface TemplateCardProps {
  template: DefectTemplate;
  onSelect: (template: DefectTemplate) => void;
  compact?: boolean;
}

function TemplateCard({ template, onSelect, compact }: TemplateCardProps) {
  return (
    <div
      onClick={() => onSelect(template)}
      className={`cursor-pointer hover:bg-muted/50 transition-colors ${
        compact ? "p-3" : "p-4 border rounded-lg"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{template.name}</span>
            <SeverityBadge severity={template.severity} />
            <ClassificationBadge classification={template.classification} />
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {template.description}
          </p>
          {template.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {template.tags.slice(0, 4).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {template.tags.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{template.tags.length - 4}
                </Badge>
              )}
            </div>
          )}
        </div>
        <Button variant="ghost" size="sm" className="shrink-0">
          Use
        </Button>
      </div>
    </div>
  );
}
