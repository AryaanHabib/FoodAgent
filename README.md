# FoodAgent

**FoodAgent** is an AI-powered meal-ordering assistant that helps you pick a cuisine, choose your service type, and suggests nearby restaurants.

---

##  Prerequisites

- **Node.js** v16+ (includes `npm`)
- **Git** (for cloning the repo)
- **Google Places API key** (for backend restaurant lookups)
- **OpenAI API key** (for frontend AI prompts)

---

## Setup

- Clone the Repository.
- Open 2 terminal windows.
- On one window run ``cd frontend`` and then run ``npm install``.
- On the other window run ``cd backend`` and then run ``npm install``.
- Once that is done, create 2 ``.env`` for both frontend and backend folders.
- ``./frontend/.env``: VITE_OPENAI_API_KEY="YOUR API KEY"
- ``./backend/.env``: GOOGLE_PLACES_API_KEY= "YOUR API KEY"
- Now run npm dev on both the terminal windows: one in frontend and one in backend.

