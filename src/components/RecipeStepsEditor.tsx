import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { splitRecipeSteps, joinRecipeSteps } from '@/lib/recipeSteps';

export default function RecipeStepsEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [structured, setStructured] = useState(false);
  const [steps, setSteps] = useState<string[]>(() => splitRecipeSteps(value));
  const lastValue = useRef(value);
  useEffect(() => {
    if (lastValue.current !== value) { setSteps(splitRecipeSteps(value)); lastValue.current = value; }
  }, [value]);
  const update = (next: string[]) => { setSteps(next); lastValue.current = joinRecipeSteps(next); onChange(lastValue.current); };
  const move = (index: number, delta: number) => {
    const next = [...steps]; [next[index], next[index + delta]] = [next[index + delta], next[index]]; update(next);
  };
  return <section className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      <Label htmlFor="recipe-instructions">Instructions</Label>
      <Button type="button" size="sm" variant="outline" aria-pressed={structured} onClick={() => {
        if (!structured) setSteps(splitRecipeSteps(value).length ? splitRecipeSteps(value) : ['']);
        setStructured(!structured);
      }}>{structured ? 'Afficher le texte complet' : 'Éditer par étapes'}</Button>
    </div>
    {!structured ? <Textarea id="recipe-instructions" value={value} onChange={(e) => onChange(e.target.value)} required rows={8} placeholder="1. Préchauffer le four à 180°C…" /> : <>
      <p className="text-sm text-muted-foreground">Ajoutez une étape par bloc. Les flèches changent leur ordre.</p>
      {steps.map((step, index) => <div key={index} className="rounded-lg border p-3 space-y-2">
        <Label htmlFor={`instruction-${index}`}>Étape {index + 1}</Label>
        <Textarea id={`instruction-${index}`} value={step} rows={3} onChange={(e) => update(steps.map((s, i) => i === index ? e.target.value : s))} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="min-h-11" disabled={index === 0} aria-label={`Monter l’étape ${index + 1}`} onClick={() => move(index, -1)}>↑ Monter</Button>
          <Button type="button" variant="outline" className="min-h-11" disabled={index === steps.length - 1} aria-label={`Descendre l’étape ${index + 1}`} onClick={() => move(index, 1)}>↓ Descendre</Button>
          <Button type="button" variant="ghost" className="min-h-11" aria-label={`Supprimer l’étape ${index + 1}`} onClick={() => update(steps.filter((_, i) => i !== index))}>Supprimer</Button>
        </div>
      </div>)}
      <Button type="button" variant="outline" onClick={() => setSteps([...steps, ''])}>Ajouter une étape</Button>
    </>}
  </section>;
}
