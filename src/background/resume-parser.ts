import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createLLMClient } from './llm';
import { ParsedResume, ResumeData } from '../shared/types';
import { saveResumeData } from '../shared/storage';

// Parse resume text and extract structured data
export async function parseResume(text: string): Promise<ResumeData> {
  try {
    const llm = await createLLMClient();

    const systemPrompt = `You are an expert at parsing resumes and extracting structured information.

Extract the following information from the resume:
- name: Full name
- email: Email address
- phone: Phone number
- summary: Professional summary or objective (keep it concise)
- experience: Array of work experiences with company, role, duration, and description
- education: Array of education entries with school, degree, and year
- skills: Array of skills

Return ONLY a valid JSON object with this exact structure:
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "summary": "string",
  "experience": [
    {"company": "string", "role": "string", "duration": "string", "description": "string"}
  ],
  "education": [
    {"school": "string", "degree": "string", "year": "string"}
  ],
  "skills": ["string"]
}

Do not include any additional text, explanation, or markdown formatting.`;

    const userPrompt = `Parse this resume:\n\n${text}`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ];

    const response = await llm.invoke(messages);
    const content = response.content.toString();

    // Parse the response
    const parsed = parseResumeResponse(content);

    // Create resume data object
    const resumeData: ResumeData = {
      raw: text,
      parsed,
    };

    // Save to storage
    await saveResumeData(resumeData);

    return resumeData;
  } catch (error) {
    console.error('Resume parsing error:', error);
    throw error;
  }
}

// Parse the LLM response
function parseResumeResponse(content: string): ParsedResume {
  try {
    // Remove markdown code blocks if present
    let cleaned = content.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
    }

    // Parse JSON
    const parsed = JSON.parse(cleaned);

    // Validate required fields
    if (!parsed.name || !parsed.email) {
      throw new Error('Missing required fields (name, email)');
    }

    // Ensure arrays exist
    parsed.experience = parsed.experience || [];
    parsed.education = parsed.education || [];
    parsed.skills = parsed.skills || [];

    return parsed as ParsedResume;
  } catch (error) {
    console.error('Failed to parse resume response:', error);
    throw new Error('Failed to parse resume. Please check the format and try again.');
  }
}

// Extract text from file (supporting plain text and basic PDF parsing)
export async function extractTextFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text || text.trim().length === 0) {
        reject(new Error('File is empty or unreadable'));
      } else {
        resolve(text);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    // For now, only support plain text
    // TODO: Add PDF.js support for PDF files
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      reader.readAsText(file);
    } else {
      reject(new Error('Only .txt files are supported in this version. PDF support coming soon.'));
    }
  });
}
