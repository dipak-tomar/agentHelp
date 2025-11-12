import { FormField, FieldMapping } from '../shared/types';
import { getUniqueSelector, findLabel } from '../shared/utils';

// Detect all form fields on the page
export function detectFormFields(): FormField[] {
  const fields: FormField[] = [];
  const elements = document.querySelectorAll('input, textarea, select');

  elements.forEach((element) => {
    // Skip certain field types
    const el = element as HTMLInputElement;
    const type = el.type?.toLowerCase();

    if (
      type === 'hidden' ||
      type === 'password' ||
      type === 'submit' ||
      type === 'button' ||
      type === 'image' ||
      type === 'reset' ||
      el.disabled ||
      el.readOnly
    ) {
      return;
    }

    const field: FormField = {
      selector: getUniqueSelector(element),
      type: type || element.tagName.toLowerCase(),
      label: findLabel(element),
      name: el.name,
      placeholder: el.placeholder,
      value: el.value,
    };

    fields.push(field);
  });

  return fields;
}

// Check if there are forms on the page
export function hasFormsOnPage(): boolean {
  const forms = document.querySelectorAll('form');
  const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="password"])');
  return forms.length > 0 || inputs.length > 5; // At least 5 input fields
}

// Fill form fields with provided mappings
export function fillFormFields(mappings: FieldMapping[]): void {
  let filledCount = 0;

  mappings.forEach((mapping) => {
    try {
      const element = document.querySelector(mapping.selector) as HTMLInputElement;

      if (element) {
        // Set value
        element.value = mapping.value;

        // Trigger events for frameworks (React, Vue, etc.)
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true }));

        // Add visual feedback
        element.style.backgroundColor = '#d4edda';
        setTimeout(() => {
          element.style.backgroundColor = '';
        }, 2000);

        filledCount++;
      }
    } catch (error) {
      console.error('Failed to fill field:', mapping.selector, error);
    }
  });

  console.log(`Filled ${filledCount} out of ${mappings.length} fields`);
}
