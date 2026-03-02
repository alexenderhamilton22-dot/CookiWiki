import { HelpCircle } from 'lucide-react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function HelpMenu() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full border border-amber-300/70 bg-amber-50/60 text-amber-700 shadow-sm hover:bg-amber-100 hover:text-amber-800"
          aria-label="Aide CookiWiki"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-2xl border border-amber-100 bg-[#fffdf8] shadow-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl tracking-[0.14em] uppercase text-amber-700">
            📔 Aide & Astuces CookiWiki
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Bienvenue dans votre grimoire numérique MAMIFA.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-3 space-y-4 text-sm leading-relaxed text-foreground">
          <section className="space-y-1.5">
            <h2 className="font-serif text-sm font-semibold tracking-[0.12em] uppercase text-amber-600">
              📖 Ajouter une recette
            </h2>
            <p>
              Vous pouvez enrichir CookiWiki de plusieurs façons&nbsp;:
            </p>
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <span className="font-medium">Glisser un PDF</span> dans l&apos;onglet <span className="italic">Texte</span> pour
                que MAMIFA lise et structure automatiquement la recette.
              </li>
              <li>
                <span className="font-medium">Coller une URL</span> de site de cuisine (Marmiton, Cuisine AZ, etc.) dans
                l&apos;onglet <span className="italic">Lien Web</span> pour extraire ingrédients et étapes.
              </li>
              <li>
                <span className="font-medium">Utiliser Ctrl+V / Cmd+V</span> pour coller une capture d&apos;écran ou une image&nbsp;:
                elle devient automatiquement la photo de couverture de la recette.
              </li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-serif text-sm font-semibold tracking-[0.12em] uppercase text-amber-600">
              🔍 Recherche MAMIFA
            </h2>
            <p>
              La recherche accepte plusieurs critères en même temps, comme un petit langage culinaire&nbsp;:
            </p>
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <span className="font-medium">Recherche simple</span>&nbsp;: tapez un nom ou un ingrédient
                (<span className="italic">Chocolat</span>).
              </li>
              <li>
                <span className="font-medium">Ingrédients multiples</span>&nbsp;: séparez-les par une virgule pour les
                combiner (<span className="italic">Pâte, Fromage</span>).
              </li>
              <li>
                <span className="font-medium">Exclure un aliment</span>&nbsp;: utilisez le signe
                {' '}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">-</code>
                {' '}
                devant un mot (<span className="italic">Pâtes, -Tomate</span>).
              </li>
              <li>
                <span className="font-medium">Par tags</span>&nbsp;: recherchez par type de plat ou régime
                (<span className="italic">Végétarien</span>, <span className="italic">Dessert</span>).
              </li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-serif text-sm font-semibold tracking-[0.12em] uppercase text-amber-600">
              ✨ Astuce Image
            </h2>
            <p>
              Si vous n&apos;avez pas de photo pour une recette, MAMIFA choisit automatiquement une
              belle illustration depuis Unsplash, en se basant sur le type de plat et vos tags
              (par exemple <span className="italic">dessert</span>, <span className="italic">salade</span>,{' '}
              <span className="italic">poisson</span>...).
            </p>
          </section>
        </div>

        <div className="mt-4 flex justify-end sticky bottom-0 bg-[#fffdf8] pt-3 border-t border-amber-100">
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-amber-200 text-amber-800 hover:bg-amber-50"
            >
              Fermer
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

