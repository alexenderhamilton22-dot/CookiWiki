import { useState } from 'react';
import { splitRecipeSteps } from '@/lib/recipeSteps';
import { Button } from './ui/button';
export default function RecipeInstructions({ instructions, cookingMode }: { instructions: string; cookingMode: boolean }) {
  const steps = splitRecipeSteps(instructions);
  const [done, setDone] = useState<number[]>([]);
  return <section className="space-y-3">
    <h3 className="font-serif text-lg font-semibold">Instructions</h3>
    {cookingMode ? <>
      <div className="flex flex-wrap items-center gap-3"><p role="status">{done.length} / {steps.length} étapes terminées</p><Button variant="ghost" size="sm" onClick={() => setDone([])}>Recommencer</Button></div>
      <ol className="space-y-4">{steps.map((step, index) => <li key={index} className={`rounded-xl border p-4 ${done.includes(index) ? 'bg-muted' : 'bg-card'}`}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" className="mt-1 h-6 w-6 shrink-0" aria-label={`Étape ${index + 1} terminée`} checked={done.includes(index)} onChange={() => setDone(done.includes(index) ? done.filter((i) => i !== index) : [...done, index])} />
          <span className="text-xl leading-relaxed whitespace-pre-wrap"><strong className="block text-sm text-muted-foreground">Étape {index + 1}</strong>{step}</span>
        </label>
      </li>)}</ol>
    </> : <div className="whitespace-pre-wrap text-foreground text-sm leading-relaxed">{instructions}</div>}
  </section>;
}
