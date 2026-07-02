# StructAgent — project page

Static site (GitHub Pages). Serve over HTTP (`python -m http.server`) — the Skill
Library and Trajectory galleries `fetch()` local JSON.

## Heavy assets live on Hugging Face
To keep this repo light, the trajectory step-images and the demo video are hosted on
[`WenyiWU0111/structagent-page-assets`](https://huggingface.co/datasets/WenyiWU0111/structagent-page-assets)
and loaded by URL at runtime (see `HF` in `static/js/main.js` and the hero `<video>` src):
- `traj/<taskid>_<backbone>/s<n>.jpg` — per-step screenshots for the 373 playable runs
- `aether_demo.mp4` — the full demo video

`static/data/trajectories*.json` (the index + captions) stay in-repo.

## Layout
```
index.html            # page
static/css/style.css  # violet brand system
static/js/main.js     # nav, reveal, skill gallery, demo carousel, trajectory player
static/data/          # skills.json, trajectories.json, trajectories_play.json
static/images/        # figures, charts, demo-carousel slides, hero_poster
static/videos/        # minecraft clips (aether_demo.mp4 is on HF)
```

## Deploy
Push and enable GitHub Pages on the default branch (root). `.nojekyll` is present.
