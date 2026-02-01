import os
import json
import fitz # PyMuPDF
from pypdf import PdfReader

LIBRARY_DIR = r"c:\Users\nunom\Documents\EU-Projects-generator-5.0\Global Library"
OUTPUT_FILE = r"c:\Users\nunom\Documents\EU-Projects-generator-5.0\extracted_schemes.json"

def extract_text_from_pdf(file_path):
    text = ""
    try:
        # Try PyMuPDF first (often better)
        doc = fitz.open(file_path)
        for page in doc:
            text += page.get_text()
        doc.close()
    except Exception as e:
        print(f"PyMuPDF failed for {file_path}: {e}")
        try:
            # Fallback to pypdf
            reader = PdfReader(file_path)
            for page in reader.pages:
                text += page.extract_text()
        except Exception as e2:
            print(f"pypdf failed for {file_path}: {e2}")
    return text

def analyze_scheme(filename, text):
    # This is a heuristic analysis to extract key details
    # In a real scenario, I'd send this text to an LLM, but here I'll do best-effort extraction
    # and then I (as the AI assistant) will refine the results.
    
    scheme = {
        "file": filename,
        "name": filename.replace(".pdf", "").replace("_", " "),
        "acronym": "",
        "description": "",
        "logic_mode": "standard",
        "expert_rules": [],
        "budget_rules": {},
        "template_json": {"sections": []},
        "standardized_activities": [],
        "evaluation_criteria": {}
    }
    
    # Heuristic for logic_mode
    if "KA122" in text or "KA121" in text or "KA131" in text or "short-term mobility" in text:
        scheme["logic_mode"] = "mobility"
        scheme["acronym"] = "KA122" # Default to 122 if found
    
    # Just grab first 2000 chars for initial description
    scheme["description"] = text[:1000].strip().replace("\n", " ")
    
    return scheme

def main():
    results = []
    files = [f for f in os.listdir(LIBRARY_DIR) if f.endswith(".pdf")]
    
    for filename in files:
        print(f"Processing {filename}...")
        path = os.path.join(LIBRARY_DIR, filename)
        text = extract_text_from_pdf(path)
        
        # We'll save the raw text chunks to a temp file for the AI assistant to process
        # because the AI assistant (Me) can read this file and then generate the SQL.
        scheme_data = analyze_scheme(filename, text)
        scheme_data["raw_excerpt"] = text[:10000] # Grab first 10k chars for analysis
        results.append(scheme_data)
        
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    main()
