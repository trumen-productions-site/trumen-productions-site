.PHONY: all reel-1 reel-2 reel-3 qc test clean install help
.DEFAULT_GOAL := help

PY ?= python3

help:  ## Show this help
	@grep -E '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) | \
	  awk 'BEGIN{FS=":.*?## "}{printf "  \033[1m%-12s\033[0m %s\n", $$1, $$2}'

install:  ## System packages and Python deps (needs apt; run once)
	apt-get update -q && apt-get install -y -q ffmpeg espeak-ng tesseract-ocr fonts-ebgaramond
	$(PY) -m pip install -r requirements.txt

all:  ## Render all three reels, then QC
	$(PY) -m src.build --reel all

reel-1:  ## Render reel 1 only
	$(PY) -m src.build --reel 1

reel-2:  ## Render reel 2 only
	$(PY) -m src.build --reel 2

reel-3:  ## Render reel 3 only
	$(PY) -m src.build --reel 3

qc:  ## Re-run QC against whatever is already in out/
	$(PY) -m src.qc_cli

test:  ## Run the test suite
	$(PY) -m pytest -q tests/

clean:  ## Remove renders, thumbnails and synthesised voiceover
	rm -f out/*.mp4 out/*.srt out/*.wav out/QC_REPORT.md
	rm -rf out/thumbnails audio/vo/_scenes
	@echo "cleaned. Supplied voiceover in audio/vo/*.wav is left alone."
