import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createLLMClient } from './llm';
import { getResumeData } from '../shared/storage';
import { FormField, FieldMapping } from '../shared/types';

// Handle form autofill request
export async function handleAutofillForm(formFields: FormField[]): Promise<FieldMapping[]> {
  try {
    const resumeData = await getResumeData();

    if (!resumeData) {
      throw new Error('No resume data found. Please upload your resume in the Options page.');
    }

    // Create LLM client
    const llm = await createLLMClient();

    // Build autofill prompt
    const systemPrompt = `You are an expert at filling job application forms intelligently.

Your task is to map resume data to form fields. For each field, provide an appropriate value from the resume.

For essay questions or open-ended fields, write brief, professional responses (2-3 sentences).

Return ONLY a valid JSON array with this exact format:
[
  {"selector": "field-selector", "value": "field value"},
  {"selector": "another-selector", "value": "another value"}
]

Do not include any additional text, explanation, or markdown formatting.`;

    const userPrompt = `Resume Data:
${JSON.stringify(resumeData.parsed, null, 2)}

Form Fields to Fill:
${formFields.map((f, i) => `${i + 1}. Selector: ${f.selector}
   Type: ${f.type}
   Label: ${f.label || f.name || 'Unknown'}
   Placeholder: ${f.placeholder || 'None'}
   Current Value: ${f.value || 'Empty'}`).join('\n\n')}

Provide the filled values as a JSON array.`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ];

    // Get AI response
    const response = await llm.invoke(messages);
    const content = response.content.toString();

    // Parse JSON response
    const mappings = parseAutofillResponse(content);

    return mappings;
  } catch (error) {
    console.error('Autofill handler error:', error);
    throw error;
  }
}

// Parse the LLM response and extract field mappings
function parseAutofillResponse(content: string): FieldMapping[] {
  try {
    // Remove markdown code blocks if present
    let cleaned = content.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
    }

    // Parse JSON
    const mappings = JSON.parse(cleaned);

    if (!Array.isArray(mappings)) {
      throw new Error('Response is not an array');
    }

    // Validate structure
    for (const mapping of mappings) {
      if (!mapping.selector || typeof mapping.value === 'undefined') {
        throw new Error('Invalid mapping structure');
      }
    }

    return mappings;
  } catch (error) {
    console.error('Failed to parse autofill response:', error);
    throw new Error('Failed to parse AI response. Please try again.');
  }
}
