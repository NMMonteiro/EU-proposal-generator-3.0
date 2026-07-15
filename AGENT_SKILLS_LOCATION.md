# Agent Skills Location

This document serves as a reference for where the "Agent Skills" are located on your local machine. These skills are specialized instruction sets that the AI agent uses to perform complex tasks like generating DOCX files or designing UI/UX.

## 📍 Path
**`C:\Users\nunom\.agent\skills\skills`**

## 📂 Available Skills
The following skills were identified in this directory:

*   **`docx-official`**: 
    *   **Purpose**: specialized instructions for building high-quality Microsoft Word documents (.docx) using the `docx` library.
    *   **Features**: Formatting, tables, images, TOC, headers/footers.
*   **`ui-ux-designer`**: 
    *   **Purpose**: Guidelines and patterns for creating premium, accessible, and responsive user interfaces.
    *   **Features**: Color palettes, glassmorphism, accessibility (WCAG), animation patterns.
*   **`pdf-official`**: 
    *   **Purpose**: Instructions for PDF generation and manipulation.

## 💡 How the Agent Uses These
When you request a task (e.g., "Make the report look professional"), the agent checks these folders for "official" best practices before writing code. This ensures that the code adheres to tested patterns and doesn't rely on guesswork.
