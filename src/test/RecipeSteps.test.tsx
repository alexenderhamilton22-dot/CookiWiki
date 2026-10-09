import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import RecipeStepsEditor from '@/components/RecipeStepsEditor';
import RecipeInstructions from '@/components/RecipeInstructions';
afterEach(cleanup);
function Editor() { const [text, setText] = useState('1. Couper.\n\n2. Cuire.'); return <><RecipeStepsEditor value={text} onChange={setText} /><output data-testid="saved">{text}</output></>; }
describe('Étapes de recette', () => {
  it('réordonne et ajoute des étapes en conservant le stockage texte', () => {
    render(<Editor />);
    fireEvent.click(screen.getByText('Éditer par étapes'));
    fireEvent.click(screen.getByLabelText('Monter l’étape 2'));
    expect(screen.getByTestId('saved')).toHaveTextContent('1. Cuire. 2. Couper.');
    fireEvent.click(screen.getByText('Ajouter une étape'));
    fireEvent.change(screen.getByLabelText('Étape 3'), {target:{value:'Servir.'}});
    fireEvent.click(screen.getByText('Afficher le texte complet'));
    expect(screen.getByLabelText('Instructions')).toHaveValue('1. Cuire.\n\n2. Couper.\n\n3. Servir.');
  });
  it('conserve la progression en quittant temporairement le mode cuisine', () => {
    const view = render(<RecipeInstructions instructions={'1. Couper.\n2. Cuire.'} cookingMode />);
    fireEvent.click(screen.getByLabelText('Étape 1 terminée'));
    expect(screen.getByRole('status')).toHaveTextContent('1 / 2');
    view.rerender(<RecipeInstructions instructions={'1. Couper.\n2. Cuire.'} cookingMode={false} />);
    view.rerender(<RecipeInstructions instructions={'1. Couper.\n2. Cuire.'} cookingMode />);
    expect(screen.getByLabelText('Étape 1 terminée')).toBeChecked();
    fireEvent.click(screen.getByText('Recommencer'));
    expect(screen.getByRole('status')).toHaveTextContent('0 / 2');
  });
});
