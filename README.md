<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# EU Projects Generator V4.0 🚀

**The next generation of AI-powered EU Funding Proposal generation.**

V4.0 introduces a modular backend architecture, optimized relational hydration, and a high-performance React UI refactor.

- **Repository**: [https://github.com/NMMonteiro/EU-Projects-Generator-V4.0](https://github.com/NMMonteiro/EU-Projects-Generator-V4.0)
- **Status**: Production Ready / Optimized

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Run Supabase Functions Locally

1. Ensure you have the [Supabase CLI](https://supabase.com/docs/guides/cli) installed.
2. Make sure your `.env.local` file contains the following keys:
   ```
   GEMINI_API_KEY=...
   SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```
3. Start the Supabase functions:
   ```bash
   supabase functions serve --env-file .env.local --no-verify-jwt
   ```
