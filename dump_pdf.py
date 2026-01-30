
from pypdf import PdfReader

def dump_text():
    pdf_path = "KA122-SCH-25B623B6 (1).pdf"
    reader = PdfReader(pdf_path)
    with open("pdf_dump.txt", "w", encoding="utf-8") as f:
        for i, page in enumerate(reader.pages):
            f.write(f"\n\n--- PAGE {i+1} ---\n\n")
            f.write(page.extract_text())

if __name__ == "__main__":
    dump_text()
