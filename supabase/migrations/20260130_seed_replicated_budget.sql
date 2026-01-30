-- SQL Script to seed the replicated KA122 budget data
-- Instructions: 
-- 1. Replace 'YOUR_PROPOSAL_ID' with the actual UUID of your proposal.
-- 2. Run this in the Supabase SQL Editor.

UPDATE public.proposals
SET budget = '[
  {
    "item": "Organisational Support",
    "cost": 2625,
    "description": "Support for 21 participants and 2 accompanying persons across 3 activities.",
    "breakdown": [
      {"item": "SHORT-01 (Spain)", "quantity": 15, "unitCost": 125, "total": 1875},
      {"item": "COURS-01 (Finland)", "quantity": 3, "unitCost": 125, "total": 375},
      {"item": "COURS-02 (Finland)", "quantity": 3, "unitCost": 125, "total": 375}
    ]
  },
  {
    "item": "Travel",
    "cost": 7107,
    "description": "Standard travel grants based on distance bands.",
    "breakdown": [
      {"item": "SHORT-01 (Spain, 500-1999km)", "quantity": 17, "unitCost": 309, "total": 5253},
      {"item": "COURS-01 (Finland, 500-1999km)", "quantity": 3, "unitCost": 309, "total": 927},
      {"item": "COURS-02 (Finland, 500-1999km)", "quantity": 3, "unitCost": 309, "total": 927}
    ]
  },
  {
    "item": "Individual Support (Subsistence)",
    "cost": 18822,
    "description": "Subsistence costs for participants and accompanying persons including travel days.",
    "breakdown": [
      {"item": "SHORT-01 Participants (12 days)", "quantity": 15, "unitCost": 660, "total": 9900},
      {"item": "SHORT-01 Accompanying (12 days)", "quantity": 2, "unitCost": 1500, "total": 3000},
      {"item": "COURS-01 Staff (7 days)", "quantity": 3, "unitCost": 987, "total": 2961},
      {"item": "COURS-02 Staff (7 days)", "quantity": 3, "unitCost": 987, "total": 2961}
    ]
  },
  {
    "item": "Linguistic Support",
    "cost": 1800,
    "description": "Language training for participants where OLS is not available.",
    "breakdown": [
      {"item": "SHORT-01 (English)", "quantity": 12, "unitCost": 150, "total": 1800}
    ]
  },
  {
    "item": "Course Fees",
    "cost": 2400,
    "description": "Enrolment fees for staff training courses.",
    "breakdown": [
      {"item": "COURS-01 (15 unit days total)", "quantity": 15, "unitCost": 80, "total": 1200},
      {"item": "COURS-02 (15 unit days total)", "quantity": 15, "unitCost": 80, "total": 1200}
    ]
  },
  {
    "item": "Preparatory Visits",
    "cost": 2040,
    "description": "Visits to hosting partners to prepare for mobility activities.",
    "breakdown": [
      {"item": "SHORT-01 (Spain)", "quantity": 3, "unitCost": 680, "total": 2040}
    ]
  },
  {
    "item": "Inclusion Support",
    "cost": 1250,
    "description": "Fixed sum per participant with fewer opportunities.",
    "breakdown": [
      {"item": "SHORT-01 (4 participants)", "quantity": 4, "unitCost": 125, "total": 500},
      {"item": "COURS-01 (3 participants)", "quantity": 3, "unitCost": 125, "total": 375},
      {"item": "COURS-02 (3 participants)", "quantity": 3, "unitCost": 125, "total": 375}
    ]
  }
]'::jsonb
WHERE id = 'YOUR_PROPOSAL_ID';

-- Optional: If you want to apply it to the LATEST proposal automatically, uncomment the line below and comment the WHERE line above.
-- WHERE id = (SELECT id FROM public.proposals ORDER BY updated_at DESC LIMIT 1);
