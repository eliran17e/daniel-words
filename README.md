# Daniel Words

A voice-first word practice game for kids, in English and Hebrew. I built it for my nephew so he could practice saying words at home, in either language, with instant feedback. It's also a personal full-stack learning project — recording media in the browser, streaming it to a Python API, scoring it with a hosted Whisper model, and putting it all behind a real production deployment.

**Live**: https://daniel-words.vercel.app

## What it does

The kid sees a picture and a word, holds the microphone button, says the word, releases. The app transcribes what it heard and tells them if they got it right.

- **Bilingual EN ↔ HE** with full RTL support for Hebrew, one-tap language toggle
- **100+ pre-seeded Hebrew words** plus English equivalents auto-linked
- **Random 10-word rounds** with a 🏆 *Round Complete!* celebration and reshuffle
- **Fuzzy matching** up to 2 character edits, plus cross-language transliteration handling (so `סלט` said in Hebrew but transcribed as `salat` still counts)
- **`/manage` page** for parents: browse, search, star, edit, delete
- **Auto-visuals**: new words get an emoji from a built-in dictionary (English + Hebrew→English translation), or fall back to a Pixabay image search if no emoji matches
- **Custom visuals**: per-word edit modal lets you swap to a different emoji, upload a picture from disk, or pick one from Pixabay search
- **Star to curate**: starred words become the practice pool; un-starred deck is the fallback
- **PWA**: Android Chrome's *Add to home screen* installs it like a native app

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Tailwind CSS + Framer Motion + React Router |
| Backend | FastAPI + SQLAlchemy + Pydantic v2 |
| Database | PostgreSQL |
| Speech-to-text | Whisper via Groq (production) / `faster-whisper` on-device (dev) |
| Image search | Pixabay API |
| Local dev | Docker Compose |

| Hosting | Role |
|---|---|
| Vercel | Frontend static hosting + CDN |
| Railway | Backend container |
| Supabase | Hosted PostgreSQL (Frankfurt) |
| Groq | Whisper inference |

## Run locally

```bash
git clone https://github.com/eliran17e/daniel-words.git
cd daniel-words
cp .env.example .env
# edit .env — add at minimum PIXABAY_API_KEY (free at https://pixabay.com/api/docs)
docker compose up --build
```

- App: http://localhost:3000
- API docs: http://localhost:8000/docs
- DB: `localhost:5432` (`daniel` / `daniel` / `daniel_words`)

Local mode uses `faster-whisper` in the backend container. The `small` model (~466 MB) downloads once into a Docker volume, then persists across rebuilds. To use Groq instead, add `GROQ_API_KEY` to your `.env`.

## Project layout

```
daniel-words/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI + lifespan (seed, migrate, model init)
│   │   ├── config.py          # env vars
│   │   ├── database.py        # engine + get_db dependency
│   │   ├── models.py          # Word, AttemptLog
│   │   ├── schemas.py         # Pydantic request/response shapes
│   │   ├── routers/
│   │   │   ├── audio.py       # /api/evaluate-audio, /api/health, /api/capabilities
│   │   │   └── words.py       # /api/words CRUD + bulk-select + /api/pixabay/search
│   │   └── services/
│   │       ├── audio_service.py   # Whisper provider abstraction + fuzzy match
│   │       ├── emoji_service.py   # word → emoji dictionary + HE↔EN translation
│   │       ├── image_service.py   # Pixabay client
│   │       ├── upload_service.py  # local file uploads
│   │       └── seed.py            # idempotent seed + repair + bilingual backfill
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── public/                # PWA manifest + SVG icon
│   ├── src/
│   │   ├── App.jsx
│   │   └── components/
│   │       ├── AudioRecorder.jsx     # the kid view
│   │       ├── ManageWords.jsx       # parent dashboard
│   │       └── EditVisualModal.jsx   # emoji / upload / Pixabay picker
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml
```

## Notable design choices

- **Backend XOR for emoji vs image**: a word has either an emoji or an image URL, never both. Picking one clears the other.
- **Mutually exclusive bilingual auto-linking**: adding a word in one language auto-creates the counterpart in the other (when the dictionary has a translation), sharing the same emoji.
- **Additive migrations without Alembic**: a small `_ensure_word_columns` helper in `app/main.py` runs `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` on startup so schema can grow without a migration framework. Good enough for a hobby scale; would graduate to Alembic at scale.
- **Cross-language fuzzy matching**: Whisper occasionally transliterates Hebrew speech into Latin script. Matching falls back to the English counterpart from the dictionary so transliterations like `salat` ≈ `salad` still count.
- **PWA-installable**: a single SVG icon + manifest is enough for Chrome on Android to offer *Add to home screen*.

## Acknowledgments

- Whisper by OpenAI
- Pixabay for the image search backing the auto-visual fallback
- Built with [Claude Code](https://claude.com/claude-code) as my pair programmer
- For my nephew 💙
