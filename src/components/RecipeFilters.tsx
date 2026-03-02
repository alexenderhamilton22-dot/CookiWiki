import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import type { Recipe } from '@/types/recipe';

interface Props {
  recipes: Recipe[];
  onFiltered: (filtered: Recipe[]) => void;
}

export default function RecipeFilters({ recipes, onFiltered }: Props) {
  const [search, setSearch] = useState('');
  const [maxTime, setMaxTime] = useState(180);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    recipes.forEach((r) => r.tags?.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [recipes]);

  const maxTotalTime = useMemo(() => {
    return Math.max(...recipes.map((r) => (r.prep_time || 0) + (r.cook_time || 0)), 180);
  }, [recipes]);

  useMemo(() => {
    const searchLower = search.toLowerCase();
    // Parse exclusions (words starting with -)
    const terms = searchLower.split(/\s+/).filter(Boolean);
    const excludes = terms.filter((t) => t.startsWith('-')).map((t) => t.slice(1)).filter(Boolean);
    const includes = terms.filter((t) => !t.startsWith('-'));

    const filtered = recipes.filter((r) => {
      const totalTime = (r.prep_time || 0) + (r.cook_time || 0);
      if (totalTime > maxTime) return false;

      if (selectedTags.length > 0 && !selectedTags.every((tag) => r.tags?.includes(tag))) return false;

      const ingredientNames = r.ingredients?.map((i) => i.name.toLowerCase()) ?? [];
      
      // Check exclusions
      if (excludes.some((ex) => ingredientNames.some((n) => n.includes(ex)))) return false;

      // Check includes
      if (includes.length > 0) {
        const titleLower = r.title.toLowerCase();
        const matchesAny = includes.some(
          (term) => titleLower.includes(term) || ingredientNames.some((n) => n.includes(term))
        );
        if (!matchesAny) return false;
      }

      return true;
    });

    onFiltered(filtered);
  }, [search, maxTime, selectedTags, recipes, onFiltered]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder='Rechercher... (ex: "-oignon" pour exclure)'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-9 bg-card"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-muted-foreground">
          Temps total : ≤ {maxTime} min
        </label>
        <Slider
          value={[maxTime]}
          onValueChange={([v]) => setMaxTime(v)}
          max={maxTotalTime}
          min={0}
          step={5}
          className="py-2"
        />
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allTags.map((tag) => (
            <Badge
              key={tag}
              variant={selectedTags.includes(tag) ? 'default' : 'outline'}
              className={`cursor-pointer transition-colors text-xs ${
                selectedTags.includes(tag)
                  ? 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                  : 'bg-card hover:bg-accent'
              }`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
