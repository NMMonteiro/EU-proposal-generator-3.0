
from pypdf import PdfReader
import re

def extract_budget():
    pdf_path = "KA122-SCH-25B623B6 (1).pdf"
    reader = PdfReader(pdf_path)
    
    all_text = ""
    for page in reader.pages[20:]: # Start from page 21
        all_text += page.extract_text()
    
    # Try to find currency patterns (number + " EUR")
    # And keywords
    categories = [
        "Organisational support",
        "Travel",
        "Individual support",
        "Inclusion support",
        "Preparatory visits",
        "Course fees",
        "Linguistic support",
        "Exceptional costs",
        "Total grant"
    ]
    
    print("--- EXTRACTED BUDGET DATA ---")
    for cat in categories:
        # Search for the category and the next number following it or near it
        # This is a bit rough but it might work
        pattern = re.compile(f"{cat}.*?([0-9.,]+)", re.IGNORECASE | re.DOTALL)
        match = pattern.search(all_text)
        if match:
            print(f"{cat}: {match.group(1)}")
        else:
            print(f"{cat}: Not found")

    # Also print any lines that look like budget lines
    print("\n--- POSSIBLE BUDGET LINES ---")
    lines = all_text.split('\n')
    for line in lines:
        if "EUR" in line or any(cat.lower() in line.lower() for cat in categories):
            if len(line.strip()) > 5:
                print(line.strip())

if __name__ == "__main__":
    extract_budget()
