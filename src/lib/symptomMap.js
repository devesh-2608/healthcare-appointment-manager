// Maps common symptom/disease/condition keywords to the specialisation(s)
// that typically treat them. Used by /api/doctors so a patient can search
// "chest pain" or "skin rash" and get relevant doctors, not just an exact
// specialisation name match.
//
// Keys are lowercase keywords checked as substrings against the patient's
// search text. Add more entries here as your clinic adds specialisations —
// no code changes needed elsewhere.
const SYMPTOM_TO_SPECIALISATION = {
  // Cardiology
  "chest pain": ["Cardiology"],
  "heart": ["Cardiology"],
  "palpitation": ["Cardiology"],
  "blood pressure": ["Cardiology"],
  "hypertension": ["Cardiology"],
  "cholesterol": ["Cardiology"],

  // Dermatology
  "skin": ["Dermatology"],
  "rash": ["Dermatology"],
  "acne": ["Dermatology"],
  "eczema": ["Dermatology"],
  "psoriasis": ["Dermatology"],
  "itch": ["Dermatology"],
  "mole": ["Dermatology"],

  // Pediatrics
  "child": ["Pediatrics"],
  "kid": ["Pediatrics"],
  "infant": ["Pediatrics"],
  "baby": ["Pediatrics"],
  "vaccination": ["Pediatrics"],
  "vaccine": ["Pediatrics"],

  // General Medicine
  "fever": ["General Medicine"],
  "cold": ["General Medicine"],
  "flu": ["General Medicine"],
  "cough": ["General Medicine"],
  "headache": ["General Medicine"],
  "body ache": ["General Medicine"],
  "fatigue": ["General Medicine"],
  "sore throat": ["General Medicine"],
  "checkup": ["General Medicine"],
  "check-up": ["General Medicine"],

  // Orthopedics
  "bone": ["Orthopedics"],
  "fracture": ["Orthopedics"],
  "joint": ["Orthopedics"],
  "back pain": ["Orthopedics"],
  "knee pain": ["Orthopedics"],
  "arthritis": ["Orthopedics"],
  "sprain": ["Orthopedics"],

  // Neurology
  "migraine": ["Neurology"],
  "seizure": ["Neurology"],
  "numbness": ["Neurology"],
  "dizziness": ["Neurology"],
  "memory loss": ["Neurology"],

  // Gastroenterology
  "stomach": ["Gastroenterology"],
  "abdominal pain": ["Gastroenterology"],
  "acidity": ["Gastroenterology"],
  "constipation": ["Gastroenterology"],
  "diarrhea": ["Gastroenterology"],
  "diarrhoea": ["Gastroenterology"],
  "nausea": ["Gastroenterology"],
  "vomiting": ["Gastroenterology"],

  // ENT
  "ear": ["ENT"],
  "nose": ["ENT"],
  "throat": ["ENT"],
  "sinus": ["ENT"],
  "hearing": ["ENT"],

  // Ophthalmology
  "eye": ["Ophthalmology"],
  "vision": ["Ophthalmology"],
  "blurry": ["Ophthalmology"],

  // Gynecology
  "pregnancy": ["Gynecology"],
  "menstrual": ["Gynecology"],
  "period pain": ["Gynecology"],

  // Psychiatry
  "anxiety": ["Psychiatry"],
  "depression": ["Psychiatry"],
  "stress": ["Psychiatry"],
  "sleep": ["Psychiatry"],
  "insomnia": ["Psychiatry"],

  // Endocrinology
  "diabetes": ["Endocrinology"],
  "thyroid": ["Endocrinology"],
  "sugar level": ["Endocrinology"],

  // Pulmonology
  "asthma": ["Pulmonology"],
  "breathing": ["Pulmonology"],
  "shortness of breath": ["Pulmonology"],
  "lung": ["Pulmonology"],

  // Urology
  "kidney stone": ["Urology"],
  "urinary": ["Urology"],
  "bladder": ["Urology"],

  // Dentistry
  "tooth": ["Dentistry"],
  "teeth": ["Dentistry"],
  "gum": ["Dentistry"],
  "dental": ["Dentistry"],
};

/**
 * Given free-text search input, returns the set of specialisations that
 * are relevant matches — either because the specialisation name itself
 * contains the text, or because the text matches a known symptom/disease
 * keyword mapped to that specialisation.
 */
export function specialisationsForQuery(query) {
  const q = query.toLowerCase().trim();
  if (!q) return null; // null means "no filter, show everyone"

  const matched = new Set();
  for (const [keyword, specialisations] of Object.entries(SYMPTOM_TO_SPECIALISATION)) {
    if (keyword.includes(q) || q.includes(keyword)) {
      specialisations.forEach((s) => matched.add(s));
    }
  }
  return matched; // may be empty — caller should also try a direct substring match as fallback
}
