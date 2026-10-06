# Recording a take

_For Michael. One page. No engineering required._

Each episode has a beat list in its `script.approved.txt`: four or five beats, one spoken line per beat. You dictate the lines in your own words, record them, and type what you said. The engine does the rest: it finds where each line falls in the recording, times the animation and the captions to it, and renders the episode.

## 1. Read the beat list

Open the episode folder, for example `episodes/003-unanimous/`, and read `script.approved.txt`. The lines beginning with `#` are the beats. They are not dialogue. They say what each line has to do; you say how.

The one rule that cannot bend: every fact you state has to match the record in `config/canon.json`. The date is March 27, 2000. The vote was unanimous. The Court said it should have been impossible to convict you. Ninety-three days from the order to the remittitur; seventy-seven from the opinion to the refiled opinion. Three years and eleven months. Twenty-six on the Cadillac floor. Role labels for officials, not names, until counsel clears them. Dan's words are the one line he said. If a line you dictate contradicts the record, the build stops and tells you which line.

## 2. Record

- **One take per episode, one file.** All the lines, in order, in one recording.
- **Pause a full second between lines.** Silence between lines is how the engine finds them. Breathe, count one, then speak.
- **A quiet room.** No music, no television, no air conditioner if you can help it. A closet full of clothes is a good booth.
- **Phone or USB microphone, either is fine.** Hold the phone about a hand's width from your mouth. Do not move it while you speak.
- **Format: WAV, 48 kHz, mono** if your recorder lets you choose. If it only makes an M4A or MP3, that is all right; convert it to WAV with any free tool, or send it to David and he will.
- **Speak plainly.** The series plays it straight. No performance; say the true thing the way you would say it to one person across a table.
- If you stumble, stop, pause, and start the line again. Keep going; do not restart the whole take. Then, when you type the words in step 4, type only the clean version, and tell David which line has a false start so he can trim it.

## 3. Name it and drop it in

Name the file **`take.wav`** and put it in the episode's `audio/` folder:

```
episodes/003-unanimous/audio/take.wav
```

That is the only place it goes. Nothing else in the folder changes.

## 4. Type the words, exactly as spoken

Open `script.approved.txt` in the same folder. Leave the `#` lines alone. Below them, type each line you spoke, **one line per spoken line, in order, exactly as you said it**. Contractions as you said them. Numbers written as words, the way you spoke them. Punctuation as you like; it will show in the captions.

```
# 003 — Unanimous
# AWAITING MICHAEL'S DICTATED TAKE
# …beat list…

Pickens County, South Carolina. The courtroom where they convicted me.
The case was State versus Martin.
The Supreme Court of South Carolina said it should have been impossible to convict me.
Unanimous.
Nobody in that room said a word.
```

The captions are built from these lines and from nothing else. If a word is not here, it is not on screen. The engine never guesses at what you said.

## 5. That's it

Tell David the take is in. He runs one command and the episode re-times itself to your voice. If the engine cannot line up a typed line with the recording, it stops and names the line, usually because a pause was missing or a typed word differs from the spoken one. Fix the one line and it runs again.

Until counsel opens the release gate, every render carries the INTERNAL REVIEW COPY slate and watermark. That is by design. Nothing goes out until Alexa says so.
